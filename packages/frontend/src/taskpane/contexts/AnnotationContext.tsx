import * as React from 'react';
import { documentCache } from '@/src/services/documentCache';
import type { ReconciliationResult } from '@/src/services/documentCache';
import { validateAnnotationsExist } from '@/src/utils/annotationOrchestrator';
import type { FilterableAnnotations } from '@/src/utils/annotationFilter';
import type { DocumentNodeWithRange } from '@/src/types/documents';
import type { FullClassificationOutput } from '@/src/types/annotation-classifier';
import type { AnnotationScope } from '@/src/types/annotationScope';

interface ExtractedPosition {
  party: string;
  position: string;
}

interface DocumentAnnotationsContextValue {
  /** Extracted annotations (null if not yet extracted) */
  annotations: FilterableAnnotations | null;
  /** Extracted positions from recitals */
  positions: { positions: ExtractedPosition[]; normalized: string[] } | null;
  /** Parsed document structure */
  combinedStructure: DocumentNodeWithRange[] | null;
  /** Recitals/preamble text */
  recitals: string;
  /** Classification result (S/Q/E + conditions) */
  classificationResult: FullClassificationOutput | null;
  /** Whether extraction is in progress */
  isLoading: boolean;
  /** Whether classification is in progress */
  isClassifying: boolean;
  /** Extraction error if any */
  error: string | null;
  /** Trigger extraction + classification */
  extract: () => Promise<void>;
  /** Force refresh (re-extract and re-classify) */
  refresh: () => Promise<void>;
  /** Refresh with reconciliation - preserves user selections where possible */
  refreshWithReconciliation: (currentScope: AnnotationScope) => Promise<ReconciliationResult | null>;
  /** Clear cached data */
  clear: () => void;
}

const DocumentAnnotationsContext = React.createContext<DocumentAnnotationsContextValue | null>(null);

export const DocumentAnnotationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [annotations, setAnnotations] = React.useState<FilterableAnnotations | null>(null);
  const [combinedStructure, setCombinedStructure] = React.useState<DocumentNodeWithRange[] | null>(null);
  const [recitals, setRecitals] = React.useState<string>('');
  const [classificationResult, setClassificationResult] = React.useState<FullClassificationOutput | null>(null);
  const [positions, setPositions] = React.useState<{ positions: ExtractedPosition[]; normalized: string[] } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isClassifying, setIsClassifying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const extractInternal = React.useCallback(async (force: boolean) => {
    // Skip if already loaded and not forcing refresh
    if (!force && annotations !== null && classificationResult !== null) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Get orchestration result (parsing + extraction)
      const orchestrationResult = await documentCache.getOrchestrationResult({
        forceRefresh: force,
      });
      validateAnnotationsExist(orchestrationResult);

      setAnnotations({
        comments: orchestrationResult.filtered.comments,
        highlights: orchestrationResult.filtered.highlights,
        trackChanges: orchestrationResult.filtered.trackChanges,
      });
      setCombinedStructure(orchestrationResult.combinedStructure);
      setRecitals(orchestrationResult.recitals);
      
      setIsLoading(false);
      setIsClassifying(true);

      // Step 2: Get classification result (S/Q/E + conditions)
      const classification = await documentCache.getClassificationResult({
        forceRefresh: force,
      });
      setClassificationResult(classification);
      
      // Get cached positions (extracted during classification)
      const cachedPositions = documentCache.getCachedPositions();
      setPositions(cachedPositions);

    } catch (err: any) {
      console.error('[AnnotationContext] Extraction failed:', err);
      setError(err.message || 'Failed to extract annotations');
    } finally {
      setIsLoading(false);
      setIsClassifying(false);
    }
  }, [annotations, classificationResult]);

  const extract = React.useCallback(() => extractInternal(false), [extractInternal]);
  const refresh = React.useCallback(() => extractInternal(true), [extractInternal]);

  /**
   * Refresh annotations and reconcile user selections.
   * Returns reconciliation result with updated scope and summary of changes.
   */
  const refreshWithReconciliation = React.useCallback(async (currentScope: AnnotationScope): Promise<ReconciliationResult | null> => {
    console.log('[AnnotationContext] refreshWithReconciliation called');
    console.log('[AnnotationContext] Current scope ranges:', currentScope.ranges.length);
    setIsLoading(true);
    setError(null);

    try {
      const result = await documentCache.refreshWithReconciliation(currentScope);

      // Log what we got from the cache
      console.log('[AnnotationContext] Got orchestration result:');
      console.log('[AnnotationContext]   Comments:', result.orchestrationResult.filtered.comments.length);
      console.log('[AnnotationContext]   Highlights:', result.orchestrationResult.filtered.highlights.length);
      console.log('[AnnotationContext]   Word-level TCs:', result.orchestrationResult.filtered.trackChanges.wordLevelTrackChanges.length);
      console.log('[AnnotationContext]   FSDs:', result.orchestrationResult.filtered.trackChanges.fullSentenceDeletions.length);
      console.log('[AnnotationContext]   FSIs:', result.orchestrationResult.filtered.trackChanges.fullSentenceInsertions.length);

      // Update state with new annotations
      const newAnnotations = {
        comments: result.orchestrationResult.filtered.comments,
        highlights: result.orchestrationResult.filtered.highlights,
        trackChanges: result.orchestrationResult.filtered.trackChanges,
      };
      setAnnotations(newAnnotations);
      setCombinedStructure(result.orchestrationResult.combinedStructure);
      setRecitals(result.orchestrationResult.recitals);

      console.log('[AnnotationContext] State updated with new annotations');

      setIsLoading(false);
      setIsClassifying(true);

      // Re-run classification (this should NOT re-extract annotations)
      const classification = await documentCache.getClassificationResult({
        forceRefresh: true,
      });
      setClassificationResult(classification);

      const cachedPositions = documentCache.getCachedPositions();
      setPositions(cachedPositions);

      console.log('[AnnotationContext] Reconciliation result:', result.reconciliation ? 'has reconciliation' : 'no reconciliation needed');
      if (result.reconciliation) {
        console.log('[AnnotationContext] Reconciled ranges:', result.reconciliation.reconciledScope.ranges.length);
      }

      return result.reconciliation;
    } catch (err: any) {
      console.error('[AnnotationContext] refreshWithReconciliation failed:', err);
      setError(err.message || 'Failed to refresh annotations');
      return null;
    } finally {
      setIsLoading(false);
      setIsClassifying(false);
    }
  }, []);

  const clear = React.useCallback(() => {
    setAnnotations(null);
    setCombinedStructure(null);
    setRecitals('');
    setClassificationResult(null);
    setPositions(null);
    setError(null);
    documentCache.invalidate();
  }, []);

  const value = React.useMemo(
    () => ({
      annotations,
      combinedStructure,
      recitals,
      classificationResult,
      positions,
      isLoading,
      isClassifying,
      error,
      extract,
      refresh,
      refreshWithReconciliation,
      clear,
    }),
    [annotations, combinedStructure, recitals, classificationResult, positions, isLoading, isClassifying, error, extract, refresh, refreshWithReconciliation, clear]
  );

  return (
    <DocumentAnnotationsContext.Provider value={value}>
      {children}
    </DocumentAnnotationsContext.Provider>
  );
};

export function useDocumentAnnotations() {
  const context = React.useContext(DocumentAnnotationsContext);
  if (!context) {
    throw new Error('useDocumentAnnotations must be used within DocumentAnnotationsProvider');
  }
  return context;
}

export default DocumentAnnotationsContext;