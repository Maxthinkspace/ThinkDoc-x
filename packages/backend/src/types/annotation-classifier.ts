/**
 * Annotation Classifier Types
 */

export type PrimaryCategory = 'S' | 'Q' | 'E';

export interface Stage1Result {
  index: number;
  category: PrimaryCategory;
  scores: { Q: number; E: number; S: number };
  matchedQuestions: string[];
}

export interface ClassifierOutput {
  results: Stage1Result[];
  summary: {
    total: number;
    byCategory: Record<PrimaryCategory, number>;
  };
}

export interface AnnotationForClassifier {
  index: number;
  type: 'comment' | 'highlight' | 'trackChange' | 'fullSentenceDeletion' | 'fullSentenceInsertion';
  comment?: string;
  selectedText?: string;
  replies?: string[];
  highlightedText?: string;
  affectedSentences?: string[];
  deleted?: string[];
  added?: string[];
  originalSentence?: string;
  amendedSentence?: string;
  deletedText?: string;
  insertedText?: string;
}

export interface RoutingConfig {
  outstandingList: boolean;
  summary: boolean;
  playbook: boolean;
}

export interface ClassifiedAnnotation<T = unknown> {
  annotation: T;
  stage1: Stage1Result;
  routing: RoutingConfig;
}

export interface FullClassificationResult {
  index: number;
  category: PrimaryCategory;
  isConditional: boolean;
  condition: string | undefined;
  categoryScores: { Q: number; E: number; S: number };
  conditionScores: { C: number; U: number };
  matchedCategoryQuestions: string[];
  matchedConditionQuestions: string[];
}

export interface FullClassificationOutput {
  results: FullClassificationResult[];
  summary: {
    total: number;
    byCategory: { S: number; Q: number; E: number };
    conditional: number;
    unconditional: number;
  };
}