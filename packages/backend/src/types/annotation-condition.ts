export interface ConditionDetectionResult {
  index: number;
  hasCondition: boolean;
  conditionText: string | undefined;
  scores: { C: number; U: number };
  matchedQuestions: string[];
  isConditional: boolean;
}

export interface ConditionBooleanAnswers {
  C1: boolean; // Condition CANNOT be determined from context
  C2: boolean; // Transaction-specific
  C3: boolean; // Company-specific
  C4: boolean; // Industry-specific
  U1: boolean; // Condition CAN be determined from context
}

export interface ConditionDetectionOutput {
  results: ConditionDetectionResult[];
  summary: {
    total: number;
    withConditions: number;
    conditional: number;
    unconditional: number;
  };
}

export interface AnnotationMarker {
  index: number;
  type: 'comment' | 'trackChange';
  marker: string; // commentContent or added text
}