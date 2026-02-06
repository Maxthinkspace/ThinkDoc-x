import { documentCache } from '@/src/services/documentCache';
import type { OrchestrationResult } from '@/src/utils/annotationOrchestrator';
import { backendApi } from '@/src/services/api';
import type { 
  JobProgress, 
  GenerateSummaryResponse, 
  SectionSummary,
  SourceAnnotation,
  SourceAnnotationTrackChange,
} from '@/src/services/api';
import type { AnnotationScope } from '@/src/types/annotationScope';
import { DEFAULT_ANNOTATION_SCOPE } from '@/src/types/annotationScope';
import type {
  WordLevelTrackChangeResults,
  CommentExtractionResult,
  FullSentenceDeletion,
  FullSentenceInsertion,
} from '@/src/types/documents';

export type { 
  GenerateSummaryResponse, 
  SectionSummary, 
  SentenceSummary,
  SubstantiveChange,
  EditorialChange,
  QueryChange,
} from '@/src/services/api';

// ============================================================================
// TYPES
// ============================================================================

interface OriginalAnnotationData {
  type: 'trackChange' | 'comment' | 'fullSentenceDeletion' | 'fullSentenceInsertion';
  data: WordLevelTrackChangeResults | CommentExtractionResult | FullSentenceDeletion | FullSentenceInsertion;
}

// ============================================================================
// ORIGINAL ANNOTATION MAP BUILDERS
// ============================================================================

/**
 * Build a map from annotation ID to original frontend extraction data.
 * This preserves sentenceFragments and correct offsets that the backend doesn't return.
 */
function buildOriginalAnnotationsMap(
  filtered: {
    comments: CommentExtractionResult[];
    trackChanges: {
      wordLevelTrackChanges: WordLevelTrackChangeResults[];
      fullSentenceDeletions: FullSentenceDeletion[];
      fullSentenceInsertions: FullSentenceInsertion[];
    };
  }
): Map<string, OriginalAnnotationData> {
  const map = new Map<string, OriginalAnnotationData>();

  // Track changes (word-level)
  for (const tc of filtered.trackChanges.wordLevelTrackChanges) {
    map.set(tc.sentenceId, { type: 'trackChange', data: tc });
  }

  // Full sentence deletions
  for (const fsd of filtered.trackChanges.fullSentenceDeletions) {
    map.set(fsd.id, { type: 'fullSentenceDeletion', data: fsd });
  }

  // Full sentence insertions
  for (const fsi of filtered.trackChanges.fullSentenceInsertions) {
    map.set(fsi.id, { type: 'fullSentenceInsertion', data: fsi });
  }

  // Comments
  for (const comment of filtered.comments) {
    map.set(comment.commentId, { type: 'comment', data: comment });
  }

  console.log(`[summaryGeneration] Built originalAnnotationsMap with ${map.size} entries`);
  
  // [DEBUG] Log all keys in the map
  console.log(`[DEBUG summaryGeneration] Map keys:`);
  for (const [key, value] of Array.from(map.entries())) {
    console.log(`[DEBUG summaryGeneration]   key="${key}" type=${value.type}`);
    if (value.type === 'trackChange') {
      const tc = value.data as WordLevelTrackChangeResults;
      console.log(`[DEBUG summaryGeneration]     deleted: ${tc.deleted?.length ?? 0}, added: ${tc.added?.length ?? 0}`);
      console.log(`[DEBUG summaryGeneration]     sentenceFragments: ${tc.sentenceFragments?.length ?? 0}`);
    }
    if (value.type === 'comment') {
      const c = value.data as CommentExtractionResult;
      console.log(`[DEBUG summaryGeneration]     selectedText: "${c.selectedText?.substring(0, 30)}..."`);
      console.log(`[DEBUG summaryGeneration]     startOffset: ${c.startOffset}, endOffset: ${c.endOffset}`);
    }
  }
  
  return map;
}

/**
 * Build SourceAnnotation from original frontend data.
 * This ensures sentenceFragments and correct offsets are preserved.
 */
function buildSourceAnnotationFromOriginal(
  original: OriginalAnnotationData
): SourceAnnotation {
  if (original.type === 'trackChange') {
    const tc = original.data as WordLevelTrackChangeResults;
    return {
      type: 'trackChange',
      annotationId: tc.sentenceId,
      sectionNumber: tc.sectionNumber,
      originalSentence: tc.originalSentence || '',
      amendedSentence: tc.amendedSentence || '',
      deleted: tc.deleted.map(d => ({
        text: d.text,
        startOffset: d.startOffset,
        endOffset: d.endOffset,
        sectionNumber: d.sectionNumber,
      })),
      added: tc.added.map(a => ({
        text: a.text,
        startOffset: a.startOffset,
        endOffset: a.endOffset,
        sectionNumber: a.sectionNumber,
      })),
      sentenceFragments: tc.sentenceFragments?.map(f => ({
        sectionNumber: f.sectionNumber,
        textFragment: f.textFragment,
        cumulativeStartOffset: f.cumulativeStartOffset,
        sectionStartOffset: f.sectionStartOffset,
        sectionEndOffset: f.sectionEndOffset,
      })),
    };
  }

  if (original.type === 'comment') {
    const c = original.data as CommentExtractionResult;
    // Get the first affected sentence (from the deepest section level) for locate functionality
    const affectedSentence = c.affectedSentences?.[0]?.sentence || '';
    return {
      type: 'comment',
      annotationId: c.commentId,
      sectionNumber: c.sectionNumber || '',
      selectedText: c.selectedText || '',
      commentContent: c.commentContent || '',
      startOffset: c.startOffset ?? 0,
      endOffset: c.endOffset ?? 0,
      affectedSentence,
    };
  }

  if (original.type === 'fullSentenceDeletion') {
    const fsd = original.data as FullSentenceDeletion;
    return {
      type: 'fullSentenceDeletion',
      annotationId: fsd.id,
      sectionNumber: fsd.sectionNumber || '',
      deletedText: fsd.deletedText || '',
      startOffset: fsd.startOffset ?? 0,
      endOffset: fsd.endOffset ?? 0,
    };
  }

  if (original.type === 'fullSentenceInsertion') {
    const fsi = original.data as FullSentenceInsertion;
    return {
      type: 'fullSentenceInsertion',
      annotationId: fsi.id,
      sectionNumber: fsi.sectionNumber || fsi.inferredTopLevelSection || '',
      insertedText: fsi.insertedText || '',
      startOffset: fsi.startOffset ?? 0,
      endOffset: fsi.endOffset ?? 0,
    };
  }

  // Should never reach here
  throw new Error(`Unknown annotation type: ${original.type}`);
}

/**
 * Build minimal fallback SourceAnnotation from backend's reference data.
 * Used when frontend doesn't have the original annotation (edge case).
 */
function buildFallbackSourceAnnotation(sentence: any): SourceAnnotation {
  const type = sentence.annotationType || 'comment';
  const sectionNumber = sentence.sectionNumber || '';

  if (type === 'trackChange') {
    return {
      type: 'trackChange',
      annotationId: sentence.annotationId || sentence.id || '',
      sectionNumber,
      originalSentence: '',
      amendedSentence: sentence.sentence || '',
      deleted: [],
      added: [],
    };
  }

  if (type === 'fullSentenceDeletion') {
    return {
      type: 'fullSentenceDeletion',
      annotationId: sentence.annotationId || sentence.id || '',
      sectionNumber,
      deletedText: sentence.sentence || '',
      startOffset: 0,
      endOffset: 0,
    };
  }

  if (type === 'fullSentenceInsertion') {
    return {
      type: 'fullSentenceInsertion',
      annotationId: sentence.annotationId || sentence.id || '',
      sectionNumber,
      insertedText: sentence.sentence || '',
      startOffset: 0,
      endOffset: 0,
    };
  }

  // Default: comment
  return {
    type: 'comment',
    annotationId: sentence.annotationId || sentence.id || '',
    sectionNumber,
    selectedText: sentence.sentence || '',
    commentContent: '',
    startOffset: 0,
    endOffset: 0,
  };
}

// ============================================================================
// MERGE BACKEND RESPONSE WITH FRONTEND DATA
// ============================================================================

/**
 * Extract annotation ID from backend's sourceAnnotation.
 * Backend includes annotationId in the sourceAnnotation.
 */

function getAnnotationIdFromSentence(sentence: any): string | null {
  // New format: annotationId is directly on sentence
  if (sentence.annotationId) {
    return sentence.annotationId;
  }
  // Legacy format: annotationId is in sourceAnnotation
  if (sentence.sourceAnnotation?.annotationId) {
    return sentence.sourceAnnotation.annotationId;
  }
  return null;
}

/**
 * Merge backend summary response with original frontend annotation data.
 * 
 * Backend provides: summary text (change_description, implication, recommendation)
 * Frontend provides: sourceAnnotation with correct offsets and sentenceFragments
 */
function mergeBackendResponseWithOriginalAnnotations(
  sections: SectionSummary[],
  originalMap: Map<string, OriginalAnnotationData>
): SectionSummary[] {
  return sections.map(section => ({
    ...section,
    sentences: section.sentences.map(sentence => {
      // Try to find original annotation by ID from backend response
      const annotationId = getAnnotationIdFromSentence(sentence);
       
      console.log(`[DEBUG summaryGeneration] Merging sentence:`);
      console.log(`[DEBUG summaryGeneration]   sentence.id: ${sentence.id}`);
      console.log(`[DEBUG summaryGeneration]   annotationId from backend: "${annotationId}"`);
      console.log(`[DEBUG summaryGeneration]   annotationType: ${(sentence as any).annotationType}`);
      console.log(`[DEBUG summaryGeneration]   exists in map: ${annotationId ? originalMap.has(annotationId) : false}`);
      
      const original = annotationId ? originalMap.get(annotationId) : null;

      if (original) {
        // Build sourceAnnotation from frontend's original data
        const sourceAnnotation = buildSourceAnnotationFromOriginal(original);
        
        // [DEBUG] Log the built sourceAnnotation
        console.log(`[DEBUG summaryGeneration] Built sourceAnnotation:`);
        console.log(`[DEBUG summaryGeneration]   type: ${sourceAnnotation.type}`);
        if (sourceAnnotation.type === 'trackChange') {
          console.log(`[DEBUG summaryGeneration]   deleted:`, sourceAnnotation.deleted);
          console.log(`[DEBUG summaryGeneration]   added:`, sourceAnnotation.added);
          console.log(`[DEBUG summaryGeneration]   sentenceFragments:`, sourceAnnotation.sentenceFragments);
        }
        if (sourceAnnotation.type === 'comment') {
          console.log(`[DEBUG summaryGeneration]   selectedText: "${sourceAnnotation.selectedText}"`);
          console.log(`[DEBUG summaryGeneration]   startOffset: ${sourceAnnotation.startOffset}`);
          console.log(`[DEBUG summaryGeneration]   endOffset: ${sourceAnnotation.endOffset}`);
        }
        
        console.log(`[summaryGeneration] Merged annotation ${annotationId}`);
        console.log(`[summaryGeneration]   type: ${original.type}`);
        if (original.type === 'trackChange') {
          const tc = original.data as WordLevelTrackChangeResults;
          console.log(`[summaryGeneration]   sentenceFragments: ${tc.sentenceFragments?.length ?? 0}`);
        }

        // Return sentence with full sourceAnnotation from frontend
        return {
          ...sentence,
          sourceAnnotation,
        };
      }

      // Fallback: no original annotation found - create minimal sourceAnnotation
      console.warn(`[summaryGeneration] No original annotation found for ID: ${annotationId}`);
      console.warn(`[summaryGeneration]   Using minimal fallback from backend`);
      
      // Build minimal fallback from backend's reference data
      const fallbackAnnotation = buildFallbackSourceAnnotation(sentence);
      return {
        ...sentence,
        sourceAnnotation: fallbackAnnotation,
      };
    }),
  }));
}

// ============================================================================
// SENTENCE-RELATIVE OFFSET CONVERSION
// ============================================================================

/**
 * Convert section-relative offsets to sentence-relative offsets for track changes.
 * After merging, offsets are section-relative; for display we need sentence-relative.
 */
function convertTrackChangeOffsetsToSentenceRelative(
  sourceAnnotation: SourceAnnotationTrackChange
): SourceAnnotationTrackChange {
  const { sentenceFragments, deleted, added } = sourceAnnotation;

  // If no sentenceFragments, offsets are already usable (single-section sentence)
  if (!sentenceFragments || sentenceFragments.length === 0) {
    return sourceAnnotation;
  }

  const convertOffset = (changeSectionNumber: string | undefined, sectionRelativeOffset: number): number => {
    // Use the change's section number, or fall back to parent's section number
    const sectionNumber = changeSectionNumber || sourceAnnotation.sectionNumber;
    const normalizedSection = sectionNumber.replace(/\.+$/, '');

    for (const fragment of sentenceFragments) {
      const fragmentSection = fragment.sectionNumber.replace(/\.+$/, '');

      if (fragmentSection === normalizedSection) {
        if (
          sectionRelativeOffset >= fragment.sectionStartOffset &&
          sectionRelativeOffset <= fragment.sectionEndOffset
        ) {
          const offsetWithinFragment = sectionRelativeOffset - fragment.sectionStartOffset;
          return fragment.cumulativeStartOffset + offsetWithinFragment;
        }
      }
    }

    // Fallback: return original offset
    console.warn(`[summaryGeneration] No fragment found for section ${sectionNumber} offset ${sectionRelativeOffset}`);
    return sectionRelativeOffset;
  };

  return {
    ...sourceAnnotation,
    deleted: deleted.map(d => ({
      ...d,
      startOffset: convertOffset((d as any).sectionNumber, d.startOffset),
      endOffset: convertOffset((d as any).sectionNumber, d.endOffset),
    })),
    added: added.map(a => ({
      ...a,
      startOffset: convertOffset((a as any).sectionNumber, a.startOffset),
      endOffset: convertOffset((a as any).sectionNumber, a.endOffset),
    })),
  };
}

/**
 * Convert all sourceAnnotation offsets in the summary response to sentence-relative.
 * This is needed because extraction produces section-relative offsets,
 * but the Summary UI renders relative to the sentence text.
 */
function convertSummaryOffsetsToSentenceRelative(
  sections: SectionSummary[]
): SectionSummary[] {
  return sections.map(section => ({
    ...section,
    sentences: section.sentences.map(sentence => {
      const { sourceAnnotation } = sentence;

      // Only convert track changes (they have sentenceFragments)
      if (sourceAnnotation.type === 'trackChange') {
        return {
          ...sentence,
          sourceAnnotation: convertTrackChangeOffsetsToSentenceRelative(sourceAnnotation),
        };
      }

      // Comments, fullSentenceDeletion, fullSentenceInsertion don't need conversion
      return sentence;
    }),
  }));
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Summary generation only needs comments and track changes
const SUMMARY_EXTRACTION_OPTIONS = {
  includeComments: true,
  includeHighlights: false,
  includeTrackChanges: true,
};

/**
 * Validate that there are annotations to process.
 */
function validateAnnotationsExist(result: OrchestrationResult): void {
  if (result.summary.totalAnnotations === 0) {
    throw new Error('No annotations found after filtering. Please add comments, highlights, or track changes.');
  }
}

export interface GenerateSummaryOptions {
  scope?: AnnotationScope;
  userPosition?: string;
  includeRecommendations?: boolean;
  onProgress?: (progress: JobProgress) => void;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate a summary of all changes in the document.
 * Excludes highlights - only processes comments and track changes.
 */
export const generateSummary = async (
  options: GenerateSummaryOptions = {}
): Promise<GenerateSummaryResponse> => {
  const {
    scope = DEFAULT_ANNOTATION_SCOPE,
    userPosition,
    includeRecommendations = true,
    onProgress,
  } = options;

  console.log('[summaryGeneration] Starting summary generation...');
  console.log('[summaryGeneration] Options:', { userPosition, includeRecommendations });

  // Step 1: Get cached orchestration result (or parse if needed)
  const result = await documentCache.getOrchestrationResult({
    scope,
    extractionOptions: SUMMARY_EXTRACTION_OPTIONS,
  });
  
  // Step 2: Validate
  validateAnnotationsExist(result);

  // Step 3: Get cached classification (or fetch if not cached)
  let classificationToUse = documentCache.getCachedClassification();
  
  console.log('[summaryGeneration] Cached classification check:');
  console.log('[summaryGeneration]   cached:', classificationToUse ? 'available' : 'not available');
  
  if (!classificationToUse) {
    console.warn('[summaryGeneration] Classification not cached - calling prepareAnnotations...');
    
    // Fallback: call prepare endpoint if not cached
    try {
      const prepareResponse = await backendApi.prepareAnnotations({
        parsedDocument: result.parsedDocument,
        comments: result.filtered.comments,
        highlights: result.filtered.highlights,
        trackChanges: result.filtered.trackChanges,
      });
      
      if (prepareResponse.success && prepareResponse.classificationResult) {
        documentCache.setClassificationResult(prepareResponse.classificationResult);
        classificationToUse = prepareResponse.classificationResult;
        console.log('[summaryGeneration] Classification completed and cached');
      }
    } catch (err) {
      console.error('[summaryGeneration] prepareAnnotations failed:', err);
    }
  }

  // Step 4: Build map of original annotations for merging with backend response
  const originalAnnotationsMap = buildOriginalAnnotationsMap(result.filtered);

  // Step 5: Store config for frontend use
  localStorage.setItem('summaryConfig', JSON.stringify({
    includeRecommendations,
    userPosition,
  }));

  // Step 6: Send to backend for LLM processing
  console.log('[summaryGeneration] Sending to backend...');
  const response = await backendApi.generateSummary(
    {
      parsedDocument: result.parsedDocument,
      comments: result.filtered.comments,
      highlights: [],  // Always empty for summary
      trackChanges: result.filtered.trackChanges,
      userPosition,
      includeRecommendations,
      classificationResult: classificationToUse || undefined,
    },
    onProgress
  );

  // Cache classification result from backend 
  if (response.classificationResult && !classificationToUse) {
    documentCache.setClassificationResult(response.classificationResult);
  }
  
  console.log('[summaryGeneration] Backend response received:', response);
  console.log('[summaryGeneration] Success:', response.success);
  console.log('[summaryGeneration] Sections:', response.summary?.sections?.length);

  // Step 6: Post-process response
  if (response.success && response.summary?.sections) {
    // Step 6a: Merge backend response with frontend's original annotation data
    // This replaces backend's sourceAnnotation with frontend's data (has sentenceFragments)
    response.summary.sections = mergeBackendResponseWithOriginalAnnotations(
      response.summary.sections,
      originalAnnotationsMap
    );
    console.log('[summaryGeneration] Merged with original frontend annotations');

    // Step 6b: Convert offsets to sentence-relative for UI display
    response.summary.sections = convertSummaryOffsetsToSentenceRelative(
      response.summary.sections
    );
    console.log('[summaryGeneration] Converted offsets to sentence-relative');

    // Clear old carousel state when generating fresh summary
    localStorage.removeItem('summaryCarouselVersions');
    localStorage.removeItem('summaryCarouselActiveFor');
    localStorage.removeItem('summaryCarouselCurrentIndex');
    console.log('[summaryGeneration] Cleared old carousel state');
    
    // [DEBUG] Log final data being returned to UI
    console.log('[DEBUG summaryGeneration] Final response data:');
    for (const section of response.summary.sections) {
      for (const sentence of section.sentences) {
        console.log(`[DEBUG summaryGeneration] Sentence id: ${sentence.id}`);
        console.log(`[DEBUG summaryGeneration]   sentence text: "${sentence.sentence?.substring(0, 50)}..."`);
        console.log(`[DEBUG summaryGeneration]   sourceAnnotation type: ${sentence.sourceAnnotation?.type}`);
        
        if (sentence.sourceAnnotation?.type === 'trackChange') {
          const sa = sentence.sourceAnnotation;
          console.log(`[DEBUG summaryGeneration]   deleted: ${sa.deleted?.length ?? 0} items`);
          console.log(`[DEBUG summaryGeneration]   added: ${sa.added?.length ?? 0} items`);
          console.log(`[DEBUG summaryGeneration]   sentenceFragments: ${sa.sentenceFragments?.length ?? 0} items`);
          if (sa.sentenceFragments && sa.sentenceFragments.length > 0) {
            console.log(`[DEBUG summaryGeneration]   sentenceFragments[0].textFragment: "${sa.sentenceFragments[0].textFragment?.substring(0, 50)}..."`);
          }
        }
        
        if (sentence.sourceAnnotation?.type === 'comment') {
          const sa = sentence.sourceAnnotation;
          console.log(`[DEBUG summaryGeneration]   selectedText: "${sa.selectedText}"`);
          console.log(`[DEBUG summaryGeneration]   commentContent: "${sa.commentContent}"`);
        }
      }
    }
  }
  
  return response;
};