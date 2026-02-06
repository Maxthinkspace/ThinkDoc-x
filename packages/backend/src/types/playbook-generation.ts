import type { SectionNode } from '@/types/documents';
import type { FullClassificationOutput } from '@/types/annotation-classifier';

// ============================================
// PARSED DOCUMENT
// ============================================

export interface ParsedDocument {
  recitals: string;
  structure: SectionNode[];
  closing?: string;
  badFormatSections?: string[];
}

// ============================================
// FRONTEND EXTRACTOR OUTPUTS (received from frontend)
// ============================================

export interface AffectedSentence {
  sentenceId: string;
  sentence: string;
  sourceComponents?: SentenceSourceComponent[];
}

export interface CommentReply {
  content: string;
  author: string;
  date: Date;
}

export interface CommentExtractionResult {
  commentId: string;
  sectionNumbers: string[];
  topLevelSectionNumbers: string[];
  sectionNumber: string;
  commentContent: string;
  replies: CommentReply[];
  selectedText: string;
  affectedSentences: AffectedSentence[];
  author: string;
  date: Date;
  startOffset: number;
  endOffset: number;
}

export interface HighlightExtractionResult {
  highlightId: string;
  sectionNumbers: string[];
  topLevelSectionNumbers: string[];
  sectionNumber: string;
  selectedText: string;
  highlightColor: string;
  startOffset: number;
  endOffset: number;
  affectedSentences: AffectedSentence[];
}

export interface WordLevelTrackChangeResult {
  sentenceId: string;
  sectionNumber: string;
  topLevelSectionNumber: string;
  originalSentence: string;
  amendedSentence: string;
  deleted: ChangeWithSection[];
  added: ChangeWithSection[];
  sentenceFragments?: SentenceSourceComponent[];
}

export interface FullSentenceDeletion {
  id: string;
  deletedText: string;
  sectionNumber: string;
  topLevelSectionNumber: string;
  startOffset: number;
  endOffset: number;
}

export interface FullSentenceInsertion {
  id: string;
  insertedText: string;
  sectionNumber: string;              
  inferredTopLevelSection: string;
  startOffset: number;               
  endOffset: number;                 
}

export interface FullSentenceDeletionForLLM {
  id?: string;
  deletedText: string;
}

export interface FullSentenceInsertionForLLM {
  id?: string;
  insertedText: string;
}

export interface StructuralChange {
  type: 'section-deleted' | 'section-inserted';
  sectionNumber: string;
  sectionTitle: string;
  fullContent: string;
  subsections: string[];
}

export interface TrackChangeExtractionResults {
  wordLevelTrackChanges: WordLevelTrackChangeResult[];
  fullSentenceDeletions: FullSentenceDeletion[];
  fullSentenceInsertions: FullSentenceInsertion[];
  structuralChanges: StructuralChange[];
  summary: {
    totalSentencesWithChanges: number;
    totalFullSentenceDeletions: number;
    totalFullSentenceInsertions: number;
    totalDeletions: number;
    totalInsertions: number;
    totalSectionsDeleted: number;
    totalSectionsInserted: number;
  };
}

export interface CommentExtractionResults {
  comments: CommentExtractionResult[];
  summary: {
    totalComments: number;
    totalReplies: number;
    totalAffectedSentences: number;
  };
}

export interface HighlightExtractionResults {
  highlights: HighlightExtractionResult[];
  summary: {
    totalHighlights: number;
    totalAffectedSentences: number;
  };
}

export interface ChangeWithSection {
  text: string;
  sectionNumber: string;
  topLevelSectionNumber: string;
  startOffset: number;
  endOffset: number;
}

// ============================================
// NORMALIZED ANNOTATIONS (for internal processing)
// ============================================

export interface CommentForLLM {
  commentId?: string;
  commentContent: string;
  replies: string[];
  selectedText: string;
  affectedSentences: string[];
  affectedSentenceFragments?: SentenceSourceComponent[][];  // Parallel to affectedSentences — one fragment array per sentence
  affectedSentencesWithOffsets?: AffectedSentenceWithOffsets[];
  startOffset?: number;    // Section-relative
  endOffset?: number;      // Section-relative
  sectionNumber?: string;  // Which section the annotation is in
}

export interface HighlightForLLM {
  highlightId?: string;
  selectedText: string;
  affectedSentences: string[];
  affectedSentenceFragments?: SentenceSourceComponent[][];  // Parallel to affectedSentences — one fragment array per sentence
}

export interface TrackChangeForLLM {
  sentenceId?: string;
  originalSentence: string;
  amendedSentence: string;
  added: Array<{ 
    text: string; 
    startOffset?: number;      // Sentence-relative (already converted)
    endOffset?: number;        // Sentence-relative (already converted)
    sectionNumber?: string;    // Which section this change is in
  }>;
  deleted: Array<{ 
    text: string; 
    startOffset?: number;      // Sentence-relative (already converted)
    endOffset?: number;        // Sentence-relative (already converted)
    sectionNumber?: string;    // Which section this change is in
  }>;
  sentenceFragments?: SentenceSourceComponent[];  // For reference/debugging
}

/**
 * Represents a fragment of a sentence from a specific section.
 * Used for offset conversion between section-relative and sentence-relative coordinates.
 */
export interface SentenceSourceComponent {
  sectionNumber: string;
  level: number;
  textFragment: string;
  isFromParent: boolean;
  cumulativeStartOffset: number;     // Where this section's text starts in the full sentence
  sectionStartOffset: number;        // Where the fragment starts within the section
  sectionEndOffset: number;          // Where the fragment ends within the section
}

export type AnnotationType = 'comment' | 'highlight' | 'wordLevelTrackchange' | 'fullParagraphDeletion' | 'fullSentenceInsertion';

export type SourceAnnotationType = 'comment' | 'highlight' | 'trackChange' | 'unknown';

export interface NormalizedAnnotation {
  type: 'comment' | 'highlight' | 'wordLevelTrackchange' | 'fullSentenceDeletion' | 'fullSentenceInsertion';
  sentenceIds: string[];
  sectionNumber: string;           // Deepest level (e.g., "8.2.3")
  topLevelSectionNumber: string;   // Top level (e.g., "8")
  sourceAnnotationType: 'comment' | 'trackChange' | 'highlight';
  data: CommentForLLM | HighlightForLLM | TrackChangeForLLM | FullSentenceDeletionForLLM | FullSentenceInsertionForLLM;
  originalIndex?: number;  
}

// ============================================
// SENTENCE OFFSET TRACKING
// ============================================

/**
 * Represents a fragment of a sentence that comes from a specific section.
 * A sentence can span multiple sections (parent → child hierarchy).
 */
export interface SentenceSectionFragment {
  sectionNumber: string;
  textLength: number;                    // Length of text contributed by this section
  cumulativeStartOffset: number;         // Where this section's text starts in the full sentence
  sectionStartOffset: number;            // Where the fragment starts in the section (usually 0)
  sectionEndOffset: number;              // Where the fragment ends in the section
}

/**
 * A sentence with full offset tracking for multi-section spans.
 */
export interface SentenceWithFragments {
  sentenceId: string;
  text: string;                          // Full sentence text (combined, without section numbers)
  originalText?: string;                 // For track changes: unchanged + deleted
  amendedText?: string;                  // For track changes: unchanged + inserted
  deepestSectionNumber: string;          // For display attribution
  topLevelSectionNumber: string;
  fragments: SentenceSectionFragment[];  // One per section the sentence spans
}

/**
 * Affected sentence with offset tracking (for comments/highlights)
 */
export interface AffectedSentenceWithOffsets {
  sentenceId: string;
  text: string;
  fragments: SentenceSectionFragment[];
}

// ============================================
// SENTENCE GROUPS & BATCHES
// ============================================

export interface SentenceGroup {
  groupId: string;
  sentenceIds: string[];
  sentences: Map<string, string>;
  sentencesWithFragments?: Map<string, SentenceWithFragments>;  // New field
  annotations: NormalizedAnnotation[];
  topLevelSectionNumber: string;
}

export interface Batch {
  batchId: string;
  topLevelSectionNumber: string;
  context: string;
  sentences: string[];
  annotations: NormalizedAnnotation[];
}

// ============================================
// RULE GENERATION
// ============================================

export interface GeneratedRule {
  id: string;
  rule_number: string;
  brief_name: string;
  instruction: string;
  example_language?: string;
  location_text?: string;      // Full sentence for locating (unique context)
  selected_text?: string;      // Specific text to highlight within location_text
  sourceAnnotationType?: SourceAnnotationType;
  topLevelSectionNumber?: string;
  sectionNumber?: string;
  sourceAnnotationKey?: string;  // e.g., "batch-0:ann-2"
  source_annotation?: number | undefined;
  condition: string | undefined;
}

export type RuleCategoryType = 
  | 'Rules for Instruction Requests' 
  | 'Rules for Contract Amendments'
  | 'Conditional Rules for Contract Amendments';

export interface RuleCategory {
  type: RuleCategoryType;
  rules: GeneratedRule[];
}

// ============================================
// CLASSIFICATION RESULT
// ============================================

export interface ClassifiedRules {
  instructionRequestRules: GeneratedRule[];
  alwaysAppliedAmendmentRules: GeneratedRule[];
  conditionalAmendmentRules: GeneratedRule[];
}

// ============================================
// RE-RUN
// ============================================

/**
 * Stores context needed to re-run rule generation for a specific annotation.
 * Stored in localStorage only (not DB) - only available before playbook is saved.
 */
export interface RuleRerunContext {
  sourceAnnotationKey: string;      // e.g., "batch-0:ann-2"
  batchId: string;
  topLevelSectionNumber: string;
  context: string;                  // Full section text
  sentences: string[];              // Affected sentences
  formattedAnnotation: string;      // The annotation as formatted for the prompt
  annotation: NormalizedAnnotation; // The original annotation object
  ruleType?: 'CA' | 'IR';
  // Location data for Locate button (stored from initial generation)
  location_text?: string;           // Full section text for locating in document
  selected_text?: string;           // Specific text to highlight within location_text
}

/**
 * Map of sourceAnnotationKey -> RuleRerunContext
 * Stored alongside rules in localStorage for re-run capability
 */
export interface RuleRerunContextMap {
  [sourceAnnotationKey: string]: RuleRerunContext;
}

export interface RuleRerunRequest {
  generationContext: RuleRerunContext;
  previousRules: GeneratedRule[];           // Rules being replaced
  originalExampleLanguage?: string;         // Preserve from first generation
}

export interface RuleRerunResult {
  success: true;
  newRules: GeneratedRule[];                // Replacement rules (may be 1 rule, 2 rules, or different interpretation)
  updatedContext: RuleRerunContext;    // Updated context with new rule IDs
}

// ============================================
// API REQUEST/RESPONSE
// ============================================

export interface GeneratePlaybookBody {
  parsedDocument: ParsedDocument;
  comments: CommentExtractionResult[];
  highlights: HighlightExtractionResult[];
  trackChanges: TrackChangeExtractionResults;
  classificationResult?: FullClassificationOutput;
}

export interface GeneratePlaybookResult {
  success: true;
  playbook: {
    instructionRequestRules: GeneratedRule[];
    alwaysAppliedRules: GeneratedRule[];
    conditionalRules: GeneratedRule[];
  };
  rerunContexts: RuleRerunContextMap;  // For re-run
}