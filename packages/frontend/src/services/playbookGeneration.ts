import { documentCache } from '@/src/services/documentCache';
import type { OrchestrationResult } from '@/src/utils/annotationOrchestrator';
import { backendApi, JobProgress } from '@/src/services/api';
import type { AnnotationScope } from '@/src/types/annotationScope';
import { DEFAULT_ANNOTATION_SCOPE } from '@/src/types/annotationScope';
import { filterAnnotations } from '@/src/utils/annotationFilter';
import type { FilterableAnnotations, FilteredAnnotations } from '@/src/utils/annotationFilter';
import type { DocumentNodeWithRange } from '@/src/types/documents';

/**
 * Validate that there are annotations to process.
 */
function validateAnnotationsExist(result: OrchestrationResult): void {
  if (result.summary.totalAnnotations === 0) {
    throw new Error('No annotations found after filtering. Please add comments, highlights, or track changes.');
  }
}

/**
 * Generate playbook from document annotations.
 * Uses shared cache for extraction, sends to backend for rule generation.
 */
export const generatePlaybook = async (
  scope: AnnotationScope = DEFAULT_ANNOTATION_SCOPE,
  onProgress?: (progress: JobProgress) => void,
  preExtracted?: {
    annotations: FilterableAnnotations;
    combinedStructure: DocumentNodeWithRange[];
    recitals: string;
  }
) => {
  console.log('[playbookGeneration] Starting playbook generation...');

  let parsedDocument: any;
  let filtered: FilteredAnnotations;

  if (preExtracted) {
    // Use pre-extracted annotations (avoids double extraction)
    console.log('[playbookGeneration] Using pre-extracted annotations');
    filtered = filterAnnotations(preExtracted.annotations, scope);
    parsedDocument = {
      recitals: preExtracted.recitals,
      structure: preExtracted.combinedStructure,
      signatures: '',
      appendices: [],
    };
  } else {
    // Get from cache (or parse if needed)
    const result = await documentCache.getOrchestrationResult({ scope });
    validateAnnotationsExist(result);
    filtered = result.filtered;
    parsedDocument = result.parsedDocument;
  }

  // Step 3: Get cached classification (if available)
  const cachedClassification = documentCache.getCachedClassification();
  console.log('[playbookGeneration] Cached classification:', cachedClassification ? 'available' : 'not available');

  // Step 4: Log payload sizes for debugging
  const payload = {
    parsedDocument,
    comments: filtered.comments,
    highlights: filtered.highlights,
    trackChanges: filtered.trackChanges,
  };
  console.log('[playbookGeneration] Total payload:', (JSON.stringify(payload).length / 1024).toFixed(1), 'KB');
  console.log('[playbookGeneration] Structure size:', (JSON.stringify(parsedDocument.structure).length / 1024).toFixed(1), 'KB');
  console.log('[playbookGeneration] Recitals size:', (JSON.stringify(parsedDocument.recitals).length / 1024).toFixed(1), 'KB');
  console.log('[playbookGeneration] Comments size:', (JSON.stringify(filtered.comments).length / 1024).toFixed(1), 'KB');
  console.log('[playbookGeneration] Highlights size:', (JSON.stringify(filtered.highlights).length / 1024).toFixed(1), 'KB');
  console.log('[playbookGeneration] TrackChanges size:', (JSON.stringify(filtered.trackChanges).length / 1024).toFixed(1), 'KB');

  // Step 4: Send to backend
  console.log('[playbookGeneration] Sending to backend...');
  const response = await backendApi.generatePlaybook(
    {
      ...payload,
      classificationResult: cachedClassification || undefined,
    },
    onProgress
  );

  // Cache classification result from backend (if returned and not already cached)
  if (response.classificationResult && !cachedClassification) {
    documentCache.setClassificationResult(response.classificationResult);
    console.log('[playbookGeneration] Cached classification from backend');
  }

  return response;
};

/**
 * Extract annotations without sending to backend.
 * Used for the scope selector UI.
 */
export async function extractAnnotationsOnly() {
  console.log('[playbookGeneration] Extracting annotations for scope selector...');
  
  const result = await documentCache.getOrchestrationResult();
  validateAnnotationsExist(result);

  return {
    annotations: result.filtered,
    combinedStructure: result.combinedStructure,
    recitals: result.recitals,
  };
}