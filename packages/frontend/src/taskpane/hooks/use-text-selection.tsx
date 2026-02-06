import { useState, useEffect, useCallback } from 'react';
import {
  getSelectionWithCoordinates,
  findAnnotationsInSelection,
  type FilterableAnnotations,
} from '../../utils/annotationFilter';
import type { DocumentNodeWithRange } from '../../types/documents';
import type { AnnotationPreview } from '../../types/annotationScope';

// ============================================================================
// TYPES
// ============================================================================

export interface UseTextSelectionResult {
  /** The selected text */
  selectedText: string | null;
  /** Whether there is a non-empty selection */
  hasSelection: boolean;
  /** Whether currently loading */
  isLoading: boolean;
  /** Rich annotations matched in the selection */
  annotations: AnnotationPreview | undefined;
  /** Selection coordinates (absolute character offsets) */
  selectionCoords: { startOffset: number; endOffset: number } | undefined;
  /** Top-level sections covered by selection */
  topLevelSections: number[];
  /** Manually refresh the selection */
  refresh: () => Promise<void>;
}

export interface UseTextSelectionOptions {
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
  /** Pre-extracted document annotations (required for annotation matching) */
  documentAnnotations?: FilterableAnnotations | null;
  /** Parsed document structure (for section-position mapping) */
  combinedStructure?: DocumentNodeWithRange[] | null;
  /** Recitals text (preamble before first numbered section) */
  recitals?: string;
  /** Polling interval in ms (default: 500) */
  pollInterval?: number;
}

export function useTextSelection(
  optionsOrEnabled: UseTextSelectionOptions | boolean = true
): UseTextSelectionResult {
  const options: UseTextSelectionOptions =
    typeof optionsOrEnabled === 'boolean'
      ? { enabled: optionsOrEnabled }
      : optionsOrEnabled;

  const {
    enabled = true,
    documentAnnotations = null,
    combinedStructure = null,
    recitals,
    pollInterval = 500,
  } = options;

  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [annotations, setAnnotations] = useState<AnnotationPreview | undefined>(undefined);
  const [selectionCoords, setSelectionCoords] = useState<
    { startOffset: number; endOffset: number } | undefined
  >(undefined);
  const [topLevelSections, setTopLevelSections] = useState<number[]>([]);

  const checkSelection = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsLoading(true);

      const coordsResult = await getSelectionWithCoordinates();

      if (!coordsResult || !coordsResult.text.trim()) {
        setSelectedText(null);
        setAnnotations(undefined);
        setSelectionCoords(undefined);
        setTopLevelSections([]);
        setIsLoading(false);
        return;
      }

      const newText = coordsResult.text;
      const newCoords = {
        startOffset: coordsResult.startOffset,
        endOffset: coordsResult.endOffset,
      };

      // Skip if selection hasn't changed
      if (newText === selectedText) {
        setIsLoading(false);
        return;
      }

      setSelectedText(newText);
      setSelectionCoords(newCoords);

      // Match annotations if document annotations are available
      if (documentAnnotations) {
        const matches = findAnnotationsInSelection(
          newText,
          documentAnnotations,
          newCoords,
          combinedStructure || undefined,
          recitals
        );

        setAnnotations(matches);
        setTopLevelSections(matches.topLevelSections);
      } else {
        // No document annotations - return empty preview
        setAnnotations({
          comments: [],
          highlights: [],
          wordLevelTrackChanges: [],
          fullSentenceDeletions: [],
          fullSentenceInsertions: [],
          structuralChanges: [],
        });
        setTopLevelSections([]);
      }
    } catch (error) {
      console.error('[useTextSelection] Error checking selection:', error);
      setSelectedText(null);
      setAnnotations(undefined);
      setSelectionCoords(undefined);
      setTopLevelSections([]);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, documentAnnotations, combinedStructure, recitals, selectedText]);

  // Polling effect
  useEffect(() => {
    if (!enabled) {
      setSelectedText(null);
      setAnnotations(undefined);
      setSelectionCoords(undefined);
      setTopLevelSections([]);
      return undefined;
    }

    // Initial check
    checkSelection();

    // Poll at interval
    const interval = setInterval(checkSelection, pollInterval);

    return () => clearInterval(interval);
  }, [enabled, checkSelection, pollInterval]);

  return {
    selectedText,
    hasSelection: !!selectedText && selectedText.trim().length > 0,
    isLoading,
    annotations,
    selectionCoords,
    topLevelSections,
    refresh: checkSelection,
  };
}

export default useTextSelection;
