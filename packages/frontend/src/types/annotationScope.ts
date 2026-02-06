import type {
  CommentExtractionResult,
  HighlightExtractionResult,
  WordLevelTrackChangeResults,
  FullSentenceDeletion,
  FullSentenceInsertion,
  StructuralChange,
} from './documents';

/**
 * Information about a section's text within a selection
 * Used for displaying cross-section selections with "..." markers
 */
export interface SectionDisplayInfo {
  /** Section number (e.g., "3.3") */
  sectionNumber: string;
  /** The selected text within this section */
  text: string;
  /** Start offset of selection within this section (0-indexed) */
  startInSection: number;
  /** End offset of selection within this section (0-indexed, exclusive) */
  endInSection: number;
  /** Total length of the section */
  sectionLength: number;
  /** Whether there's unselected text before the selection in this section */
  hasEllipsisBefore: boolean;
  /** Whether there's unselected text after the selection in this section */
  hasEllipsisAfter: boolean;
  /** Annotations specific to this section (with section-relative offsets) */
  annotations: {
    comments: CommentExtractionResult[];
    highlights: HighlightExtractionResult[];
    wordLevelTrackChanges: WordLevelTrackChangeResults[];
    fullSentenceDeletions: FullSentenceDeletion[];
    fullSentenceInsertions: FullSentenceInsertion[];
  };
}

/**
 * Preview of matched annotations for display
 */
export interface AnnotationPreview {
  comments: CommentExtractionResult[];
  highlights: HighlightExtractionResult[];
  wordLevelTrackChanges: WordLevelTrackChangeResults[];
  fullSentenceDeletions: FullSentenceDeletion[];
  fullSentenceInsertions: FullSentenceInsertion[];
  structuralChanges?: StructuralChange[];
  /** Section display info for cross-section selections */
  sectionDisplayInfo?: SectionDisplayInfo[];
  /** Top-level sections covered by this selection */
  topLevelSections?: number[];
}

/**
 * Represents a selection range defined by the annotations it contains
 */
export interface SelectionRange {
  id: string;
  label: string;
  /** The actual text user selected in Word (for inline preview display) */
  selectedText: string;
  /** Top-level section numbers (e.g., [8, 9] means sections 8.x and 9.x) */
  topLevelSections: number[];
  /** Granular section numbers for precise filtering (e.g., ["8.2.2.1"]) */
  sectionNumbers?: string[];
  /** Preview of what's in this range */
  annotationCounts: {
    comments: number;
    highlights: number;
    trackChanges: number;
  };
  /** The actual annotations matched (for display) */
  matchedAnnotations: AnnotationPreview;
}

/**
 * User-defined scope for filtering annotations
 */
export interface AnnotationScope {
  /** Filter mode */
  mode: 'all' | 'include-only' | 'exclude';
  /** Selection ranges to include/exclude */
  ranges: SelectionRange[];
  /** Which annotation types to include */
  types: {
    comments: boolean;
    trackChanges: boolean;
    highlights: boolean;
  };
}

/**
 * Default scope - include all annotations
 */
export const DEFAULT_ANNOTATION_SCOPE: AnnotationScope = {
  mode: 'all',
  ranges: [],
  types: {
    comments: true,
    trackChanges: true,
    highlights: true,
  },
};