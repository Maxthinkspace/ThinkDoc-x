// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export interface DocumentNode {
  sectionNumber: string;           // Internal section number (unique, for tree building)
  originalDisplayNumber?: string | null;  // Display number in original version
  amendedDisplayNumber?: string | null;   // Display number in amended version
  sectionHeading?: string;         // Detected heading 
  originalSectionHeading?: string; // Heading in original version (for track changes)
  combinedSectionHeading?: string; // Heading with both insertions and deletions
  text: string;                    // Content text (heading excluded)
  originalText?: string;
  combinedText?: string;
  level: number;
  additionalParagraphs: string[];
  originalAdditionalParagraphs?: string[];
  combinedAdditionalParagraphs?: string[];
  children: DocumentNode[];
  wordIndices?: number[];
  ooxmlIndices?: number[];
  paragraphStatus?: 'unchanged' | 'inserted' | 'deleted';
  additionalParagraphStatuses?: ('unchanged' | 'inserted' | 'deleted')[];
}

export interface DocumentNodeWithRange {
  sectionNumber: string;
  originalDisplayNumber?: string | null;
  amendedDisplayNumber?: string | null;
  sectionHeading?: string;          
  originalSectionHeading?: string; // Heading in original version (for track changes)
  combinedSectionHeading?: string; // Heading with both insertions and deletions
  text: string;                    // Content text (heading excluded)
  originalText?: string;
  combinedText?: string;
  level: number;
  additionalParagraphs: string[];
  originalAdditionalParagraphs?: string[];
  combinedAdditionalParagraphs?: string[];
  additionalParagraphStatuses?: ('unchanged' | 'inserted' | 'deleted')[];
  children: DocumentNodeWithRange[];
  levelRange?: Word.Range;
  wordIndices: number[];
  ooxmlIndices: number[];
  paragraphStatus?: 'unchanged' | 'inserted' | 'deleted';
}

export interface SectionNode {
  sectionNumber: string
  sectionHeading?: string          
  text: string                     // Content text (heading excluded)
  level: number
  additionalParagraphs?: string[] | undefined
  children?: SectionNode[] | undefined
  rules?: string[] | undefined
}

export interface ParagraphMapping {
  paragraphIndex: number;
  sectionNumber: string | null;
  level: number;
  range: Word.Range;
}

export interface AppendixItem {
  title: string;   // e.g. "Schedule 1 - Definitions"
  content: string; // The body text of this appendix
  structure: DocumentNode[];  // Parsed sections within this appendix
  recitals?: string;               // Intro text before numbered sections
  signatures?: string;             // Closing/signature text within the appendix
  subAppendices?: AppendixItem[];  // Nested appendices (recursive)
  documentType?: 'tree' | 'flat';  // How LLM classified this appendix
  language?: string;               // Detected language
}

export interface ParsedDocument {
  recitals: string;
  structure: DocumentNode[];
  signatures: string;
  appendices: AppendixItem[];
  badFormatSections?: string[];
  documentName?: string;
  definitionSection?: string;
  documentType?: 'tree' | 'flat';
}

export interface ParsedDocumentWithRanges {
  recitals: string;
  structure: DocumentNodeWithRange[];
  originalStructure: DocumentNodeWithRange[];
  combinedStructure: DocumentNodeWithRange[];
  signatures: string;
  appendices: AppendixItem[];
  badFormatSections: string[];
  paragraphMappings: ParagraphMapping[];
  originalParagraphMappings: ParagraphMapping[];
  sectionTrackChangeMap: SectionTrackChangeMap;
  documentName?: string;
  definitionSection?: string;
  documentType?: 'tree' | 'flat';
}

// ============================================================================
// SENTENCE EXTRACTION TYPES
// ============================================================================

/**
 * Tracks which levels contributed to a sentence
 * Used for mapping changes back to sentences
 */
export interface SentenceSourceComponent {
  sectionNumber: string;
  level: number;
  textFragment: string;
  isFromParent: boolean;
  // Offset tracking for multi-section sentences
  cumulativeStartOffset: number;     // Where this section's text starts in the full sentence
  sectionStartOffset: number;        // Where the fragment starts within the section
  sectionEndOffset: number;          // Where the fragment ends within the section
}

/**
 * Sentence with full source tracking
 */
export interface SentenceWithSource {
  id: string;                   // e.g., "1-s3" (top-level section 1, sentence 3)
  sentence: string;
  sectionNumber: string;        // Deepest level that contributed
  topLevelSectionNumber: string;      // e.g., "1."
  sourceComponents: SentenceSourceComponent[];
}

/**
 * Token representing a text fragment with its track change status.
 * Used for parsing OOXML content while preserving change information.
 */
export interface TextToken {
  text: string;
  status: 'unchanged' | 'inserted' | 'deleted';
  startOffset?: number;
  endOffset?: number;
}

/**
 * Sentence extracted with embedded track change information.
 * Derived from token-based parsing - no reconstruction needed.
 */
export interface SentenceWithChanges {
  id: string;                        // e.g., "1-s3"
  originalSentence: string;          // unchanged + deleted tokens
  amendedSentence: string;           // unchanged + inserted tokens
  deletions: string[];               // deleted token texts
  insertions: string[];              // inserted token texts
  sectionNumber: string;
  topLevelSectionNumber: string;
}

export type AffectedSentence = {
  sentenceId: string;
  sentence: string;
  sourceComponents?: SentenceSourceComponent[];
};

// ============================================================================
// TYPES FOR TRACK CHANGES
// ============================================================================

export interface TrackChangeInfo {
  id: string;
  type: 'insertion' | 'deletion';
  text: string;
  range: Word.Range;
  author?: string;
  date?: Date;
  paragraphIndex?: number;
}

export interface ChangesMappedToLevel {
  change: TrackChangeInfo;
  sectionNumber: string;
  level: number;
  topLevelSectionNumber: string;
}

/**
 * Track changes mapped to a specific sentence
 * Deletions and additions are consolidated within the sentence
 */
export interface WordLevelTrackChangeResults {
  sentenceId: string;           // e.g., "1-s3"
  sectionNumber: string;        // Deepest section in the sentence
  topLevelSectionNumber: string;      // e.g., "1."
  originalSentence: string;     // Sentence before changes
  amendedSentence: string;      // Sentence after changes
  deleted: ChangeWithSection[]; // Consolidated deletions with section info
  added: ChangeWithSection[];   // Consolidated insertions with section info
  sentenceFragments?: SentenceSourceComponent[];  // For multi-section offset conversion
}

/**
 * Track change extracted from OOXML
 */
export interface OOXMLTrackChange {
  id: string;
  type: 'insertion' | 'deletion';
  text: string;
  ooxmlParagraphIndex: number;
  author?: string;
  date?: Date;
  positionInParagraph: number;
  originalParagraphText: string;
  amendedParagraphText: string;
}

/**
 * Track change mapped to section via OOXML index
 */
export interface OoxmlMappedChange {
  change: OOXMLTrackChange;
  sectionNumber: string;
  effectiveSectionNumber: string;
  level: number;
  topLevelSectionNumber: string;
}

export interface FullSentenceInsertion {
  id: string;
  insertedText: string;
  sectionNumber: string;
  inferredTopLevelSection: string;
  startOffset?: number;
  endOffset?: number;
}

export interface FullSentenceDeletion {
  id: string;
  deletedText: string;
  sectionNumber: string;
  topLevelSectionNumber: string;
  startOffset?: number;
  endOffset?: number;
}

export interface StructuralChange {
  type: 'section-deleted' | 'section-inserted';
  sectionNumber: string;
  sectionTitle: string;
  fullContent: string;
  subsections: string[];
}

export interface SectionMatchResult {
  structuralChanges: StructuralChange[];
  matchedPairs: Map<string, string>;  // originalSectionNum -> amendedSectionNum
  unmatchedOriginalSections: Set<string>;
  unmatchedAmendedSections: Set<string>;
}

export interface ChangeWithSection {
  text: string;
  sectionNumber: string;
  topLevelSectionNumber: string;
  /** Absolute character offset from document start */
  startOffset: number;
  /** Absolute character offset where this change ends */
  endOffset: number;
}

/**
 * Complete result of track change analysis
 */
export interface TrackChangeExtractionResults {
  wordLevelTrackChanges: WordLevelTrackChangeResults[];
  fullSentenceInsertions: FullSentenceInsertion[];
  fullSentenceDeletions: FullSentenceDeletion[];
  structuralChanges: StructuralChange[];  
  summary: {
    totalSentencesWithChanges: number;
    totalFullSentenceInsertions: number;
    totalFullSentenceDeletions: number;  
    totalDeletions: number;
    totalInsertions: number;
    totalSectionsDeleted: number;
    totalSectionsInserted: number;
  };
}

/**
 * Track change with per-section offset information
 */
export interface TrackChangeWithOffset {
  type: 'insertion' | 'deletion';
  text: string;
  sectionNumber: string;
  topLevelSectionNumber: string;
  startOffset: number;  // 0-indexed, within section
  endOffset: number;    // exclusive, within section
  author?: string;
  date?: Date;
}

/**
 * Track changes aggregated by section with per-section offsets
 */
export interface SectionTrackChanges {
  sectionNumber: string;
  topLevelSectionNumber: string;
  combinedText: string;  // Full combined text of section (header + additional paragraphs)
  trackChanges: TrackChangeWithOffset[];
}

/**
 * Map of section numbers to their track changes
 */
export type SectionTrackChangeMap = Map<string, SectionTrackChanges>;

// ============================================================================
// TYPES FOR COMMENTS
// ============================================================================

/**
 * Reply to a comment with author metadata
 */
export interface CommentReply {
  content: string;
  author: string;
  date: Date;
}

export interface CommentInfo {
  id: string;
  content: string;
  selectedText: string;
  range: Word.Range;
  author: string;
  date: Date;
  replies: CommentReply[];
  paragraphIndices: number[];
}

export interface CommentsMappedToLevel {
  comment: CommentInfo;
  sectionNumbers: string[];
  levels: number[];
  topLevelSectionNumbers: string[];
}

/**
 * Final extraction result for a single comment
 */
export interface CommentExtractionResult {
  commentId: string;
  sectionNumbers: string[];
  topLevelSectionNumbers: string[];
  sectionNumber: string;        // Primary section for offset matching
  commentContent: string;
  replies: CommentReply[];
  selectedText: string;
  affectedSentences: AffectedSentence[];
  author: string;
  date: Date;
  startOffset: number;          // Section-relative
  endOffset: number;            // Section-relative
}

/**
 * Complete result of comment extraction
 */
export interface CommentExtractionResults {
  comments: CommentExtractionResult[];
  summary: {
    totalComments: number;
    totalReplies: number;
    totalAffectedSentences: number;
  };
}

// ============================================================================
// TYPES FOR HIGHLIGHTS
// ============================================================================

export interface HighlightInfo {
  id: string;
  selectedText: string;
  highlightColor: string;
  range: Word.Range;
  paragraphIndices: number[];
}

export interface HighlightMappedToLevel {
  highlight: HighlightInfo;
  sectionNumbers: string[];
  levels: number[];
  topLevelSectionNumbers: string[];
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

export interface HighlightExtractionResults {
  highlights: HighlightExtractionResult[];
  summary: {
    totalHighlights: number;
  };
}

// ============================================================================
// TYPES FOR DOCUMENT PARSER
// ============================================================================

export interface ClassifyDocumentResponse {
  documentType: 'tree' | 'flat';
  documentName: string | null;
  firstMainBodyText: string;
  definitionSectionText: string | null;
  closingStartText: string | null;
  appendixStartTexts: string[];
  language: string;
}
