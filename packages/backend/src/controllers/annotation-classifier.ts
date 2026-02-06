import { logger } from '@/config/logger';
import { generateTextWithJsonParsing } from '@/controllers/generate';
import type { NormalizedAnnotation, CommentForLLM, HighlightForLLM, TrackChangeForLLM, FullSentenceDeletionForLLM, FullSentenceInsertionForLLM } from '@/types/playbook-generation';
import type { PrimaryCategory, Stage1Result, AnnotationForClassifier, ClassifierOutput, ClassifiedAnnotation, RoutingConfig, FullClassificationResult, FullClassificationOutput } from '@/types/annotation-classifier';
import { getStage1ClassifierPrompt, STAGE1_BATCH_CONFIG, formatAnnotationForClassifier, formatAnnotationWithCategory, calculateCategory, type BooleanAnswers } from '@/controllers/annotation-classifier-prompts';
import { detectAnnotationConditions } from '@/controllers/annotation-condition-detector';
import type { ConditionDetectionOutput } from '@/types/annotation-condition';
import { buildFullSectionText, findTopLevelSection } from '@/services/sentence-extractor';
import type { SectionNode } from '@/types/documents';


export function toClassifierFormat(annotation: NormalizedAnnotation, index: number): AnnotationForClassifier | null {
  const base = { index };

  switch (annotation.type) {
    case 'comment': {
      const data = annotation.data as CommentForLLM;
      return { 
        ...base, 
        type: 'comment', 
        comment: data.commentContent, 
        selectedText: data.selectedText, 
        replies: data.replies,
        affectedSentences: data.affectedSentences,
      };
    }
    case 'highlight': {
      // Highlights are always S - skip LLM classification
      return null;
    }
    case 'wordLevelTrackchange': {
      const data = annotation.data as TrackChangeForLLM;
      return { 
        ...base, 
        type: 'trackChange', 
        deleted: data.deleted.map(d => d.text),  
        added: data.added.map(a => a.text),      
        originalSentence: data.originalSentence, 
        amendedSentence: data.amendedSentence 
      };
    }
    case 'fullSentenceDeletion': {
      const data = annotation.data as FullSentenceDeletionForLLM;
      return { ...base, type: 'fullSentenceDeletion', deletedText: data.deletedText };
    }
    case 'fullSentenceInsertion': {
      const data = annotation.data as FullSentenceInsertionForLLM;
      return { ...base, type: 'fullSentenceInsertion', insertedText: data.insertedText };
    }
    default:
      return null;
  }
}

function parseAnswers(raw: any): BooleanAnswers {
  const defaults: BooleanAnswers = {
    Q1: false, Q2: false, Q3: false, Q4: false, Q5: false, Q6: false,
    E1: false, E2: false, E3: false, E4: false, E5: false, E6: false,
    S1: false, S2: false, S3: false, 
  };
  if (!raw || typeof raw !== 'object') return defaults;
  const answers = raw.answers || raw;
  for (const key of Object.keys(defaults) as (keyof BooleanAnswers)[]) {
    if (answers[key] === true || answers[key] === 'yes' || answers[key] === 'true') {
      defaults[key] = true;
    }
  }
  return defaults;
}

async function classifyBatch(annotations: AnnotationForClassifier[], jobId: string): Promise<Stage1Result[]> {
  const prompt = getStage1ClassifierPrompt(annotations);

  logger.info(
    {
      jobId,
      batchSize: annotations.length,
      prompt,
    },
    'Annotation Classifier: Full prompt to LLM'
  );

  try {
    const result = await generateTextWithJsonParsing('', prompt, { model: STAGE1_BATCH_CONFIG.model });

    logger.info(
      {
        jobId,
        rawResponse: result,
      },
      'Annotation Classifier: Full LLM response'
    );

    if (!Array.isArray(result)) {
      return annotations.map((a) => ({ index: a.index, category: 'S' as PrimaryCategory, scores: { Q: 0, E: 0, S: 0 }, matchedQuestions: [] }));
    }

    // Map by position - LLM returns in same order as input
    return annotations.map((annotation, i) => {
      const llmResult = result[i];
      if (!llmResult) {
        return { index: annotation.index, category: 'S' as PrimaryCategory, scores: { Q: 0, E: 0, S: 0 }, matchedQuestions: [] };
      }
      
      const answers = parseAnswers(llmResult);
      const scoring = calculateCategory(answers);
      return { 
        index: annotation.index,
        category: scoring.category, 
        scores: scoring.scores, 
        matchedQuestions: scoring.matchedQuestions,
      };
    });
  } catch (error) {
    logger.error({ jobId, error: error instanceof Error ? error.message : error }, 'Annotation Classifier: Batch failed');
    return annotations.map((a) => ({ index: a.index, category: 'S' as PrimaryCategory, scores: { Q: 0, E: 0, S: 0 }, matchedQuestions: [], reason: 'Error occurred' }));
  }
}

export async function classifyAnnotationsStage1(
  annotations: NormalizedAnnotation[],
  jobId: string,
  options?: { logResults?: boolean }
): Promise<ClassifierOutput> {
  const logResults = options?.logResults ?? true;

  logger.info({ jobId, totalAnnotations: annotations.length }, 'Annotation Classifier: Starting');

  if (annotations.length === 0) {
    return { results: [], summary: { total: 0, byCategory: { S: 0, Q: 0, E: 0 } } };
  }

  const allResults: Stage1Result[] = [];
  const classifierAnnotations: AnnotationForClassifier[] = [];
  const annotationIndexMap: number[] = []; // Maps classifier index to original index

  // Separate highlights (always S) from others (need LLM)
  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i];
    
    if (!annotation) continue;  // ADD THIS CHECK
    
    if (annotation.type === 'highlight') {
      // Highlights are always S - no LLM needed
      allResults.push({
        index: i + 1,
        category: 'S',
        scores: { Q: 0, E: 0, S: 0 },
        matchedQuestions: [],
      });
    } else {
      const formatted = toClassifierFormat(annotation, i + 1);
      if (formatted) {
        classifierAnnotations.push(formatted);
        annotationIndexMap.push(i + 1);
      }
    }
  }

  // Process non-highlight annotations through LLM
  if (classifierAnnotations.length > 0) {
    const batches: AnnotationForClassifier[][] = [];
    for (let i = 0; i < classifierAnnotations.length; i += STAGE1_BATCH_CONFIG.maxAnnotationsPerBatch) {
      batches.push(classifierAnnotations.slice(i, i + STAGE1_BATCH_CONFIG.maxAnnotationsPerBatch));
    }

    for (const batch of batches) {
      const batchResults = await classifyBatch(batch, jobId);
      allResults.push(...batchResults);
    }
  }

  // Sort results by index
  allResults.sort((a, b) => a.index - b.index);

  const summary = {
    total: allResults.length,
    byCategory: {
      S: allResults.filter((r) => r.category === 'S').length,
      Q: allResults.filter((r) => r.category === 'Q').length,
      E: allResults.filter((r) => r.category === 'E').length,
    },
  };

  if (logResults) {
    console.log('\n========== ANNOTATION CLASSIFICATION ==========');
    // Use a Set to track logged indices and avoid duplicates
    const loggedIndices = new Set<number>();
    
    for (const result of allResults) {
      if (loggedIndices.has(result.index)) continue;  // Skip if already logged
      loggedIndices.add(result.index);
      
      const annotation = annotations[result.index - 1];
      if (!annotation) continue;
      
      if (annotation.type === 'highlight') {
        const data = annotation.data as HighlightForLLM;
        console.log(`[${result.index}] Type: HIGHLIGHT\n    Highlighted: "${data.selectedText}"\n    → S [] - Highlight (always S)`);
      } else {
        const formatted = toClassifierFormat(annotation, result.index);
        if (formatted) {
          console.log(formatAnnotationWithCategory(
            formatted,
            result.index,
            result.category,
            result.matchedQuestions,
          ));
        }
      }
      console.log('');
    }
    console.log(`SUMMARY: S=${summary.byCategory.S}, Q=${summary.byCategory.Q}, E=${summary.byCategory.E}`);
    console.log('========== END CLASSIFICATION ==========\n');
  }
  
  logger.info({ jobId, summary }, 'Annotation Classifier: Complete');
  return { results: allResults, summary };
}

function getRoutingForStage1(category: PrimaryCategory): RoutingConfig {
  switch (category) {
    case 'Q': return { outstandingList: true, summary: false, playbook: false };
    case 'E': return { outstandingList: false, summary: false, playbook: false };
    case 'S': return { outstandingList: false, summary: true, playbook: true };
  }
}

export function filterByCategory<T extends NormalizedAnnotation>(
  annotations: T[],
  classifierOutput: ClassifierOutput,
  categories: PrimaryCategory[]
): ClassifiedAnnotation<T>[] {
  const categorySet = new Set(categories);
  return annotations
    .map((annotation, index) => {
      const result = classifierOutput.results.find((r) => r.index === index + 1);
      if (!result || !categorySet.has(result.category)) return null;
      return { annotation, stage1: result, routing: getRoutingForStage1(result.category) };
    })
    .filter((item): item is ClassifiedAnnotation<T> => item !== null);
}

export function getSubstantiveAnnotations<T extends NormalizedAnnotation>(annotations: T[], classifierOutput: ClassifierOutput): T[] {
  return filterByCategory(annotations, classifierOutput, ['S']).map((c) => c.annotation);
}

export function getQueryAnnotations<T extends NormalizedAnnotation>(annotations: T[], classifierOutput: ClassifierOutput): T[] {
  return filterByCategory(annotations, classifierOutput, ['Q']).map((c) => c.annotation);
}

export function getEditorialAnnotations<T extends NormalizedAnnotation>(annotations: T[], classifierOutput: ClassifierOutput): T[] {
  return filterByCategory(annotations, classifierOutput, ['E']).map((c) => c.annotation);
}

// ============================================
// COMBINED CLASSIFICATION + CONDITION DETECTION
// ============================================

/**
 * Run S/Q/E classification and condition detection in parallel
 */
export async function classifyAnnotationsFull(
  annotations: NormalizedAnnotation[],
  structure: SectionNode[],
  jobId: string
): Promise<FullClassificationOutput> {
  // Build context map for condition detection
  const contexts = new Map<number, string>();
  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i];
    if (!annotation) continue;
    
    const topLevelSection = findTopLevelSection(annotation.topLevelSectionNumber, structure);
    const context = topLevelSection
      ? buildFullSectionText(topLevelSection)
      : `Section ${annotation.topLevelSectionNumber}`;
    contexts.set(i + 1, context);
  }

  // Run in parallel
  const [categoryOutput, conditionOutput] = await Promise.all([
    classifyAnnotationsStage1(annotations, jobId, { logResults: false }),
    detectAnnotationConditions(annotations, contexts, jobId),
  ]);

  // Combine results
  const results: FullClassificationResult[] = [];

  for (let i = 0; i < annotations.length; i++) {
    const index = i + 1;
    const categoryResult = categoryOutput.results.find((r) => r.index === index);
    const conditionResult = conditionOutput.results.find((r) => r.index === index);

    results.push({
      index,
      category: categoryResult?.category ?? 'S',
      isConditional: conditionResult?.isConditional ?? false,
      condition: conditionResult?.conditionText,
      categoryScores: categoryResult?.scores ?? { Q: 0, E: 0, S: 0 },
      conditionScores: conditionResult?.scores ?? { C: 0, U: 0 },
      matchedCategoryQuestions: categoryResult?.matchedQuestions ?? [],
      matchedConditionQuestions: conditionResult?.matchedQuestions ?? [],
    });
  }

  const summary = {
    total: results.length,
    byCategory: categoryOutput.summary.byCategory,
    conditional: conditionOutput.summary.conditional,
    unconditional: conditionOutput.summary.withConditions - conditionOutput.summary.conditional,
  };

  // Log combined results with full annotation details
  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i];
    const result = results[i];
    if (!annotation || !result) continue;

    const baseLog: Record<string, any> = {
      jobId,
      index: result.index,
      category: result.category,
      isConditional: result.isConditional,
      condition: result.condition || null,
    };

    switch (annotation.type) {
      case 'comment': {
        const data = annotation.data as CommentForLLM;
        logger.info(
          {
            ...baseLog,
            type: 'COMMENT',
            section: annotation.sectionNumber,
            selectedText: data.selectedText,
            comment: data.commentContent,
            affectedSentences: data.affectedSentences?.length || 0,
          },
          `Classification Result: Annotation ${result.index}`
        );
        break;
      }
      case 'highlight': {
        const data = annotation.data as HighlightForLLM;
        logger.info(
          {
            ...baseLog,
            type: 'HIGHLIGHT',
            section: annotation.sectionNumber,
            selectedText: data.selectedText,
          },
          `Classification Result: Annotation ${result.index}`
        );
        break;
      }
      case 'wordLevelTrackchange': {
        const data = annotation.data as TrackChangeForLLM;
        logger.info(
          {
            ...baseLog,
            type: 'TRACKCHANGE',
            section: annotation.sectionNumber,
            deleted: data.deleted.map(d => d.text),
            added: data.added.map(a => a.text),
            originalSentence: data.originalSentence?.substring(0, 100) + (data.originalSentence?.length > 100 ? '...' : ''),
            amendedSentence: data.amendedSentence?.substring(0, 100) + (data.amendedSentence?.length > 100 ? '...' : ''),
          },
          `Classification Result: Annotation ${result.index}`
        );
        break;
      }
      case 'fullSentenceDeletion': {
        const data = annotation.data as FullSentenceDeletionForLLM;
        logger.info(
          {
            ...baseLog,
            type: 'FULL_SENTENCE_DELETION',
            section: annotation.sectionNumber,
            deletedText: data.deletedText?.substring(0, 100) + (data.deletedText?.length > 100 ? '...' : ''),
          },
          `Classification Result: Annotation ${result.index}`
        );
        break;
      }
      case 'fullSentenceInsertion': {
        const data = annotation.data as FullSentenceInsertionForLLM;
        logger.info(
          {
            ...baseLog,
            type: 'FULL_SENTENCE_INSERTION',
            section: annotation.sectionNumber,
            insertedText: data.insertedText?.substring(0, 100) + (data.insertedText?.length > 100 ? '...' : ''),
          },
          `Classification Result: Annotation ${result.index}`
        );
        break;
      }
    }
  }

  // Log summary
  logger.info(
    {
      jobId,
      summary,
    },
    'Full Classification: Summary'
  );

  return { results, summary };
}