// ============================================
// PRIMARY CATEGORY
// ============================================

export type PrimaryCategory = 'S' | 'Q' | 'E';

// ============================================
// STAGE 1 CLASSIFICATION (S/Q/E only)
// ============================================

export interface Stage1Result {
  index: number;
  category: PrimaryCategory;
  scores: { Q: number; E: number; S: number };
  matchedQuestions: string[];
  reason: string;
}

export interface ClassifierOutput {
  results: Stage1Result[];
  summary: {
    total: number;
    byCategory: { S: number; Q: number; E: number };
  };
}

// ============================================
// FULL CLASSIFICATION (S/Q/E + Condition Detection)
// ============================================

export interface FullClassificationResult {
  index: number;
  category: PrimaryCategory;
  isConditional: boolean;
  condition?: string;
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