import { logger } from '@/config/logger';
import { generateTextWithJsonParsing } from '@/controllers/generate';
import {
  groupAnnotationsBySentence,
  createBatches,
  splitAnnotationsByCategoryFull,
  SUMMARY_BATCH_CONFIG,
} from '@/services/annotation-batcher';
import { normalizeAnnotations, formatAnnotationsForPrompt } from '@/services/playbook-generation';
import { generateSummaryPrompt, rerunSummaryPrompt } from '@/controllers/summary-generation-prompts';
import type {
  NormalizedAnnotation,
  Batch,
} from '@/types/playbook-generation';
import type { FullClassificationOutput, PrimaryCategory } from '@/types/annotation-classifier';

import type {
  SentenceSummary,
  SummaryGenerationInput,
  SummaryGenerationResult,
  SectionSummary,
  SummaryRerunRequest,
  SummaryRerunResult,
} from '@/types/summary-generation';

export type SummaryRerunContextMap = Record<string, {
  sourceAnnotationKey: string;
  batchId: string;
  topLevelSectionNumber: string;
  context: string;
  formattedAnnotation: string;
  annotation: any;
  category: 'S' | 'Q' | 'E';
  userPosition?: string;
}>;


/**
 * Get annotation ID for matching with frontend data.
 * Frontend will use this to merge its original annotation data.
 */
function getAnnotationId(annotation: NormalizedAnnotation): string {
  const data = annotation.data as any;
  return data.sentenceId || data.commentId || data.id || '';
}

/**
 * Get annotation type for the response.
 */
function getAnnotationType(annotation: NormalizedAnnotation): 'trackChange' | 'comment' | 'fullSentenceDeletion' | 'fullSentenceInsertion' {
  switch (annotation.type) {
    case 'wordLevelTrackchange':
      return 'trackChange';
    case 'comment':
      return 'comment';
    case 'fullSentenceDeletion':
      return 'fullSentenceDeletion';
    case 'fullSentenceInsertion':
      return 'fullSentenceInsertion';
    default:
      return 'comment';
  }
}

/**
 * Build minimal annotation reference for backend response.
 * Frontend will replace this with full annotation data including offsets and sentenceFragments.
 */
function buildAnnotationReference(annotation: NormalizedAnnotation): {
  annotationId: string;
  type: 'trackChange' | 'comment' | 'fullSentenceDeletion' | 'fullSentenceInsertion';
  sectionNumber: string;
} {
  return {
    annotationId: getAnnotationId(annotation),
    type: getAnnotationType(annotation),
    sectionNumber: annotation.sectionNumber || '',
  };
}

/**
 * Build annotation reference from SourceAnnotation (used in rerun context).
 * SourceAnnotation has a different structure than NormalizedAnnotation.
 */
function buildAnnotationReferenceFromSource(annotation: any): {
  annotationId: string;
  type: 'trackChange' | 'comment' | 'fullSentenceDeletion' | 'fullSentenceInsertion';
  sectionNumber: string;
} {
  // SourceAnnotation has 'type' directly on it
  const type = annotation.type as string;
  
  let annotationType: 'trackChange' | 'comment' | 'fullSentenceDeletion' | 'fullSentenceInsertion';
  let annotationId = '';
  
  switch (type) {
    case 'trackChange':
      annotationType = 'trackChange';
      annotationId = annotation.sentenceId || '';
      break;
    case 'comment':
      annotationType = 'comment';
      annotationId = annotation.commentId || '';
      break;
    case 'fullSentenceDeletion':
      annotationType = 'fullSentenceDeletion';
      annotationId = annotation.id || '';
      break;
    case 'fullSentenceInsertion':
      annotationType = 'fullSentenceInsertion';
      annotationId = annotation.id || '';
      break;
    default:
      annotationType = 'comment';
      annotationId = '';
  }
  
  return {
    annotationId,
    type: annotationType,
    sectionNumber: annotation.sectionNumber || '',
  };
}

// Re-export types for consumers
export type { 
  SummaryGenerationInput, 
  SummaryGenerationResult, 
  SentenceSummary, 
  SectionSummary 
} from '@/types/summary-generation';

// ============================================
// MAIN FUNCTION
// ============================================

export async function generateSummaryFromAnnotations(
  input: SummaryGenerationInput,
  jobId: string
): Promise<SummaryGenerationResult & { rerunContexts?: SummaryRerunContextMap }> {
  const startTime = Date.now();
  const { parsedDocument, comments, highlights, trackChanges, userPosition, classificationResult } = input;

  logger.info(
    {
      jobId,
      comments: comments.length,
      highlights: highlights.length,
      trackChanges: trackChanges.wordLevelTrackChanges.length,
      userPosition: userPosition || 'not specified',
      hasClassification: !!classificationResult,
    },
    'Summary Generation: Starting'
  );

  const annotations = normalizeAnnotations(comments, highlights, trackChanges);

  if (annotations.length === 0) {
    return {
      success: true,
      summary: { sections: [] },
      rerunContexts: {},
      metadata: { totalSentences: 0, processingTimeMs: Date.now() - startTime },
    };
  }

  // Assign original indices if not already set
  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i];
    if (annotation && !annotation.originalIndex) {
      annotation.originalIndex = i + 1;
    }
  }

  // Use classification to determine how to process each annotation
  if (!classificationResult) {
    throw new Error('Classification result is required for summary generation');
  }

  // Split annotations by category
  const { substantive, query, editorial } = splitAnnotationsByCategoryFull(
    annotations,
    classificationResult
  );

  // Only process S and Q annotations (E are discarded from summaries)
  const annotationsToProcess = [...substantive, ...query];

  if (annotationsToProcess.length === 0) {
    return {
      success: true,
      summary: { sections: [] },
      rerunContexts: {},
      metadata: { totalSentences: 0, processingTimeMs: Date.now() - startTime },
    };
  }

  const sentenceGroups = groupAnnotationsBySentence(annotationsToProcess);
  const batches = createBatches(sentenceGroups, parsedDocument.structure, SUMMARY_BATCH_CONFIG);
  
  // Build rerun contexts map
  const rerunContexts: SummaryRerunContextMap = {};
  
  for (const batch of batches) {
    const batchAnnotations = batch.annotations.map((ann, idx) => {
      const data = ann.data as any;
      
      if (ann.type === 'comment') {
        return {
          index: idx + 1,
          type: ann.type,
          sectionNumber: ann.sectionNumber,
          commentId: data.commentId,
          selectedText: data.selectedText,
          commentContent: data.commentContent,
          affectedSentences: data.affectedSentences,
        };
      } else if (ann.type === 'wordLevelTrackchange') {
        return {
          index: idx + 1,
          type: ann.type,
          sectionNumber: ann.sectionNumber,
          sentenceId: data.sentenceId,
          originalSentence: data.originalSentence,
          amendedSentence: data.amendedSentence,
          deleted: data.deleted?.map((d: any) => d.text),
          added: data.added?.map((a: any) => a.text),
        };
      } else if (ann.type === 'fullSentenceDeletion') {
        return {
          index: idx + 1,
          type: ann.type,
          sectionNumber: ann.sectionNumber,
          deletedText: data.deletedText,
        };
      } else if (ann.type === 'fullSentenceInsertion') {
        return {
          index: idx + 1,
          type: ann.type,
          sectionNumber: ann.sectionNumber,
          insertedText: data.insertedText,
        };
      }
      return { index: idx + 1, type: ann.type, sectionNumber: ann.sectionNumber };
    });

    logger.info(
      {
        jobId,
        batchId: batch.batchId,
        topLevelSection: batch.topLevelSectionNumber,
        annotationCount: batch.annotations.length,
        annotations: batchAnnotations,
      },
      'Summary Generation: Batch details'
    );
    
    // Build rerun context for each annotation in this batch
    for (let idx = 0; idx < batch.annotations.length; idx++) {
      const ann = batch.annotations[idx];
      if (!ann) continue;
      
      const annotationId = getAnnotationId(ann);
      if (!annotationId) continue;
      
      // Get category from classification
      const originalIndex = ann.originalIndex || (idx + 1);
      const classResult = classificationResult.results.find(r => r.index === originalIndex);
      const category = classResult?.category || 'S';
      
      rerunContexts[annotationId] = {
        sourceAnnotationKey: annotationId,
        batchId: batch.batchId,
        topLevelSectionNumber: batch.topLevelSectionNumber,
        context: batch.context,
        formattedAnnotation: formatAnnotationsForPrompt([ann]),
        annotation: ann,
        category,
        ...(userPosition && { userPosition }),
      };
    }
  }

  const allSentences: { sectionNumber: string; summary: SentenceSummary }[] = [];

  for (const batch of batches) {
    const batchSentences = await generateSummaryForBatch(batch, jobId, classificationResult, userPosition);
    for (const sentence of batchSentences) {
      allSentences.push({ sectionNumber: batch.topLevelSectionNumber, summary: sentence });
    }
  }

  // Group by section
  const sectionMap = new Map<string, SentenceSummary[]>();
  for (const { sectionNumber, summary } of allSentences) {
    if (!sectionMap.has(sectionNumber)) {
      sectionMap.set(sectionNumber, []);
    }
    sectionMap.get(sectionNumber)!.push(summary);
  }

  const sections: SectionSummary[] = Array.from(sectionMap.entries()).map(
    ([sectionNumber, sentences]) => ({
      sectionNumber,
      sectionTitle: `Section ${sectionNumber}`,
      sentences,
    })
  );

  const finalResult: SummaryGenerationResult & { rerunContexts?: SummaryRerunContextMap } = {
    success: true,
    summary: { sections },
    rerunContexts,
    metadata: {
      totalSentences: allSentences.length,
      processingTimeMs: Date.now() - startTime,
    },
  };

  // Log exact data sent to frontend
  logger.info(
    {
      jobId,
      frontendResponse: finalResult,
    },
    'SUMMARY GENERATION: Response to frontend'
  );

  logger.info(
    { jobId, totalSentences: allSentences.length, sections: sections.length, rerunContextsCount: Object.keys(rerunContexts).length },
    'Summary Generation: Complete'
  );

  return finalResult;
}

async function generateSummaryForBatch(
  batch: Batch,
  jobId: string,
  classificationResult: FullClassificationOutput,
  userPosition?: string,
): Promise<SentenceSummary[]> {
  const formattedAnnotations = formatAnnotationsForPrompt(batch.annotations);
  const annotationTypes = [...new Set(
    batch.annotations.map(a => a.sourceAnnotationType)
  )] as ('comment' | 'trackChange' | 'highlight')[];

  // Build category map for this batch
  const categoryMap = new Map<number, PrimaryCategory>();
  for (const annotation of batch.annotations) {
    const originalIndex = annotation.originalIndex;
    if (originalIndex) {
      const classResult = classificationResult.results.find(r => r.index === originalIndex);
      if (classResult) {
        categoryMap.set(originalIndex, classResult.category);
      }
    }
  }

  const prompt = generateSummaryPrompt(
    batch.context,
    formattedAnnotations,
    annotationTypes,
    categoryMap,
    userPosition
  );

  // Log full prompt
  logger.info(
    {
      jobId,
      batchId: batch.batchId,
      section: batch.topLevelSectionNumber,
      annotationCount: batch.annotations.length,
      prompt,
    },
    'SUMMARY GENERATION: Full prompt to LLM'
  );

  try {
    const result = await generateTextWithJsonParsing('', prompt, { model: 'o3-mini' });

    // Log full LLM response
    logger.info(
      {
        jobId,
        batchId: batch.batchId,
        response: result,
      },
      'SUMMARY GENERATION: Full LLM response'
    );

    if (Array.isArray(result)) {
      return result.map((item: any, index: number) => {
        const sourceAnnotationData = batch.annotations[index] ?? batch.annotations[0];
        if (!sourceAnnotationData) {
          throw new Error(`No annotation found for index ${index} in batch ${batch.batchId}`);
        }
        
        const annotationRef = buildAnnotationReference(sourceAnnotationData);

        // Log annotation with classification
        logger.info(
          {
            jobId,
            batchId: batch.batchId,
            annotationId: annotationRef.annotationId,
            annotationType: annotationRef.type,
            sectionNumber: annotationRef.sectionNumber,
            annotationData: sourceAnnotationData.data,
            classification: {
              hasSubstantive: !!item.substantive,
              hasEditorial: !!item.editorial?.items?.length,
              hasQuery: !!item.query?.items?.length,
            },
          },
          'SUMMARY GENERATION: Annotation classification'
        );

        // Get category from classification
        const originalIndex = sourceAnnotationData.originalIndex || (index + 1);
        const classResult = classificationResult.results.find(r => r.index === originalIndex);
        const category = classResult?.category || 'S';

        const summary: SentenceSummary = {
          id: `${batch.batchId}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          sentence: item.sentence || '',
          annotationId: annotationRef.annotationId,
          annotationType: annotationRef.type,
          sectionNumber: annotationRef.sectionNumber,
          category,
        };

        // Apply category-specific content
        if (category === 'S' && item.substantive) {
          summary.substantive = {
            change_description: item.substantive.change_description || '',
            implication: item.substantive.implication || '',
            recommendation: item.substantive.recommendation || '',
          };
        }

        if (category === 'Q' && item.query?.items?.length > 0) {
          summary.query = { items: item.query.items };
        }

        // Editorial annotations are filtered out before batching, but just in case:
        if (category === 'E' && item.editorial?.items?.length > 0) {
          summary.editorial = { items: item.editorial.items };
        }

        return summary;
      });
    }

    return [];
  } catch (error) {
    logger.error(
      { jobId, batchId: batch.batchId, error },
      'Summary Generation: Failed to process batch'
    );
    return [];
  }
}

// ============================================
// RE-RUN SUMMARY
// ============================================

export async function rerunSummary(
  request: SummaryRerunRequest,
  jobId: string
): Promise<SummaryRerunResult> {
  const { generationContext, previousSummaries } = request;

  logger.info(
    {
      jobId,
      sourceAnnotationKey: generationContext.sourceAnnotationKey,
      previousAttempts: previousSummaries.length,
    },
    'Summary Generation: Re-running summary'
  );

  // Format previous summaries grouped by attempt
  const previousSummariesText = previousSummaries
    .sort((a, b) => a.attempt - b.attempt)
    .map((s) => {
      const attemptLabel = s.attempt === 0 ? 'Original' : `Attempt ${s.attempt}`;
      return `**${attemptLabel}:**
- Change: ${s.changeDescription}
- Implication: ${s.implication}${s.recommendation ? `\n- Recommendation: ${s.recommendation}` : ''}`;
    })
    .join('\n\n');

  // Get category from generation context (default to 'S' for backward compatibility)
  const category: PrimaryCategory = generationContext.category || 'S';

  const prompt = rerunSummaryPrompt(
    generationContext.context,
    generationContext.formattedAnnotation,
    previousSummariesText,
    category,
    generationContext.userPosition
  );

  // Log full prompt for re-run
  logger.info(
    {
      jobId,
      sourceAnnotationKey: generationContext.sourceAnnotationKey,
      category,
      previousAttempts: previousSummaries.length,
      prompt,
    },
    'SUMMARY GENERATION (re-run): Full prompt to LLM'
  );

  try {
    const result = await generateTextWithJsonParsing('', prompt, { model: 'o3-mini' });

    // Log full LLM response for re-run
    logger.info(
      {
        jobId,
        sourceAnnotationKey: generationContext.sourceAnnotationKey,
        response: result,
      },
      'SUMMARY GENERATION (re-run): Full LLM response'
    );

    // Build minimal annotation reference - frontend will merge full data
    const annotationRef = buildAnnotationReferenceFromSource(generationContext.annotation);

    const newSummary: SentenceSummary = {
      id: `rerun-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sentence: result.sentence || '',
      // Minimal annotation reference - frontend replaces with full data
      annotationId: annotationRef.annotationId,
      annotationType: annotationRef.type,
      sectionNumber: annotationRef.sectionNumber,
      category,
    };

    if (result.substantive) {
      newSummary.substantive = {
        change_description: result.substantive.change_description || '',
        implication: result.substantive.implication || '',
        recommendation: result.substantive.recommendation || '',
      };
    }

    if (result.query?.items?.length > 0) {
      newSummary.query = { items: result.query.items };
    }

    logger.info(
      { jobId, sourceAnnotationKey: generationContext.sourceAnnotationKey },
      'Summary Generation: Re-run complete'
    );

    return {
      success: true,
      newSummary,
    };
  } catch (error) {
    logger.error(
      {
        jobId,
        sourceAnnotationKey: generationContext.sourceAnnotationKey,
        error: error instanceof Error ? error.message : error,
      },
      'Summary Generation: Re-run failed'
    );
    throw error;
  }
}
