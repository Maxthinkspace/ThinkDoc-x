/**
 * Selection Context Types
 * 
 * Defines the context sent to LLM based on what the user has selected.
 * Follows the 4 scenarios:
 * (i) Question only - no selection
 * (ii) Text selected, no annotations
 * (iii) Text with track changes
 * (iv) Text with comments
 */

// ============================================================================
// BASE TYPES
// ============================================================================

/**
 * Track change data formatted for LLM prompting
 * Mirrors the structure from playbook-generation.ts
 */
export interface TrackChangeForLLM {
  /** The sentence before changes */
  originalSentence: string;
  /** The sentence after changes */
  amendedSentence: string;
  /** Text segments that were added */
  added: string[];
  /** Text segments that were deleted */
  deleted: string[];
  /** Section number where this change occurs */
  sectionNumber: string;
  /** Top-level section (e.g., "8" from "8.2.1") */
  topLevelSection: string;
}

/**
 * Comment data formatted for LLM prompting
 */
export interface CommentForLLM {
  /** The text the comment is anchored to */
  selectedText: string;
  /** The comment content */
  commentContent: string;
  /** Replies to the comment */
  replies: string[];
  /** Section number where this comment appears */
  sectionNumber: string;
  /** Top-level section */
  topLevelSection: string;
}

/**
 * Full sentence deletion for LLM
 */
export interface FullSentenceDeletionForLLM {
  deletedText: string;
  sectionNumber: string;
  topLevelSection: string;
}

/**
 * Full sentence insertion for LLM
 */
export interface FullSentenceInsertionForLLM {
  insertedText: string;
  sectionNumber: string;
  topLevelSection: string;
}

// ============================================================================
// SELECTION CONTEXT VARIANTS
// ============================================================================

/**
 * Scenario (i): Question only, no selection
 */
export interface NoSelectionContext {
  type: 'none';
}

/**
 * Scenario (ii): Text selected without annotations
 */
export interface PlainTextSelectionContext {
  type: 'plain-text';
  /** The selected text */
  selectedText: string;
  /** Top-level section number (e.g., "8") */
  topLevelSection: string;
  /** Full section text for context */
  sectionContext: string;
}

/**
 * Scenario (iii): Text selected with track changes
 */
export interface TrackChangeSelectionContext {
  type: 'track-changes';
  /** The selected text (combined view) */
  selectedText: string;
  /** Top-level section number */
  topLevelSection: string;
  /** Full section text for context */
  sectionContext: string;
  /** Word-level track changes in selection */
  trackChanges: TrackChangeForLLM[];
  /** Full sentence deletions in selection */
  fullSentenceDeletions: FullSentenceDeletionForLLM[];
  /** Full sentence insertions in selection */
  fullSentenceInsertions: FullSentenceInsertionForLLM[];
}

/**
 * Scenario (iv): Text selected with comments
 */
export interface CommentSelectionContext {
  type: 'comments';
  /** The selected text */
  selectedText: string;
  /** Top-level section number */
  topLevelSection: string;
  /** Full section text for context */
  sectionContext: string;
  /** Comments in selection */
  comments: CommentForLLM[];
}

/**
 * Combined context when selection has both track changes AND comments
 */
export interface MixedAnnotationContext {
  type: 'mixed';
  /** The selected text */
  selectedText: string;
  /** Top-level section number */
  topLevelSection: string;
  /** Full section text for context */
  sectionContext: string;
  /** Track changes */
  trackChanges: TrackChangeForLLM[];
  fullSentenceDeletions: FullSentenceDeletionForLLM[];
  fullSentenceInsertions: FullSentenceInsertionForLLM[];
  /** Comments */
  comments: CommentForLLM[];
}

/**
 * Union type for all selection contexts
 */
export type SelectionContext =
  | NoSelectionContext
  | PlainTextSelectionContext
  | TrackChangeSelectionContext
  | CommentSelectionContext
  | MixedAnnotationContext;

// ============================================================================
// SESSION TYPES
// ============================================================================

/**
 * Document context sent once per session
 */
export interface SessionDocumentContext {
  /** Session identifier */
  sessionId: string;
  /** Whether document has been sent to backend */
  documentSent: boolean;
  /** Full document text (for first request) */
  fullDocumentText?: string;
  /** Document structure outline */
  documentOutline?: string[];
  /** Document title if available */
  documentTitle?: string;
}

/**
 * Complete request context for general questions
 */
export interface GeneralQuestionContext {
  /** The user's question */
  question: string;
  /** Selection context (one of the 4 scenarios) */
  selectionContext: SelectionContext;
  /** Session info for document caching */
  session: {
    sessionId: string;
    /** True if this is the first request in session (send full doc) */
    isFirstRequest: boolean;
  };
}
