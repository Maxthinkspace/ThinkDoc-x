// ============================================
// SUMMARY GENERATION TYPES
// ============================================

import type { SectionNode } from './documents';
import type {
  CommentExtractionResult,
  HighlightExtractionResult,
  TrackChangeExtractionResults,
  NormalizedAnnotation,
} from './playbook-generation';
import type { FullClassificationOutput, PrimaryCategory } from './annotation-classifier';

// ============================================
// SOURCE ANNOTATION TYPES (for UI display & export)
// ============================================

export interface SourceAnnotationTrackChange {
  type: 'trackChange';
  annotationId: string;
  sectionNumber: string;
  originalSentence: string;
  amendedSentence: string;
  deleted: Array<{ 
    text: string; 
    startOffset: number;   // Section-relative (from frontend extraction)
    endOffset: number;     // Section-relative (from frontend extraction)
  }>;
  added: Array<{ 
    text: string; 
    startOffset: number;   // Section-relative (from frontend extraction)
    endOffset: number;     // Section-relative (from frontend extraction)
  }>;
}

export interface SourceAnnotationComment {
  type: 'comment';
  annotationId: string;
  sectionNumber: string;
  selectedText: string;
  commentContent: string;
  author?: string;
  startOffset: number;
  endOffset: number;
}

export interface SourceAnnotationFullSentenceDeletion {
  type: 'fullSentenceDeletion';
  annotationId: string;
  sectionNumber: string;
  deletedText: string;
  startOffset: number;
  endOffset: number;
}

export interface SourceAnnotationFullSentenceInsertion {
  type: 'fullSentenceInsertion';
  annotationId: string;
  sectionNumber: string;
  insertedText: string;
  startOffset: number;
  endOffset: number;
}

export type SourceAnnotation =
  | SourceAnnotationTrackChange
  | SourceAnnotationComment
  | SourceAnnotationFullSentenceDeletion
  | SourceAnnotationFullSentenceInsertion;

// ============================================
// INPUT TYPES
// ============================================

export interface SummaryGenerationInput {
  parsedDocument: { structure: SectionNode[] };
  comments: CommentExtractionResult[];
  highlights: HighlightExtractionResult[];
  trackChanges: TrackChangeExtractionResults;
  userPosition?: string;
  includeRecommendations?: boolean;
  sourceAnnotations?: Record<string, SourceAnnotation>;
  classificationResult?: FullClassificationOutput;
}

// ============================================
// OUTPUT TYPES - Per Sentence
// ============================================

export interface SubstantiveChange {
  change_description: string;
  implication: string;
  recommendation: string;
}

export interface EditorialChange {
  items: string[];
}

export interface QueryChange {
  items: string[];
}

export interface SentenceSummary {
  id: string;
  sentence: string;
  // Minimal annotation reference - frontend merges full data
  annotationId: string;
  annotationType: 'trackChange' | 'comment' | 'fullSentenceDeletion' | 'fullSentenceInsertion';
  sectionNumber: string;
  // Summary content from LLM
  category: PrimaryCategory;
  substantive?: SubstantiveChange;
  editorial?: EditorialChange;
  query?: QueryChange;
}

// ============================================
// OUTPUT TYPES - Grouped by Section
// ============================================

export interface SectionSummary {
  sectionNumber: string;
  sectionTitle: string;
  sentences: SentenceSummary[];
}

// ============================================
// API RESPONSE
// ============================================

export interface SummaryGenerationResult {
  success: boolean;
  summary: {
    sections: SectionSummary[];
  };
  metadata: {
    totalSentences: number;
    processingTimeMs: number;
  };
  classificationResult?: FullClassificationOutput;
}

export interface SummaryRerunContext {
  sourceAnnotationKey: string;
  batchId: string;
  topLevelSectionNumber: string;
  context: string;
  formattedAnnotation: string;
  annotation: SourceAnnotation;
  userPosition?: string;
  category?: PrimaryCategory;
}

export interface SummaryRerunRequest {
  generationContext: SummaryRerunContext;
  previousSummaries: Array<{
    attempt: number;
    changeDescription: string;
    implication: string;
    recommendation?: string;
  }>;
  sourceAnnotations?: Record<string, SourceAnnotation>;  
}

export interface SummaryRerunResult {
  success: boolean;
  newSummary: SentenceSummary;
}