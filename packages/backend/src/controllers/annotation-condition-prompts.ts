/**
 * Annotation Condition Detection Prompts
 */

import type { AnnotationMarker } from '@/types/annotation-condition';

// ============================================
// CONDITION KEYWORDS
// ============================================

export const CONDITION_KEYWORDS = [
  'if',
  'when',
  'where',
  'unless',
  'subject to',
  'provided that',
  'on the condition that',
  'assuming that',
  'as long as',
  'in the event that',
  'contingent upon',
  'in case',
  'depending on',
  'for [type] companies',
  'in [type] transactions',
  'should [condition] exist',
];

// ============================================
// STEP 1: DETECT CONDITIONS
// ============================================

export function formatMarkersForDetection(markers: AnnotationMarker[]): string {
  return markers
    .map((m) => `[${m.index}] Type: ${m.type.toUpperCase()}\n    Marker: "${m.marker}"`)
    .join('\n\n');
}

export function getConditionDetectionPrompt(markers: AnnotationMarker[]): string {
  const formattedMarkers = formatMarkersForDetection(markers);

  return `Detect conditional language in annotation markers.

## MARKERS

${formattedMarkers}

## TASK

For each marker, determine if it contains conditional language.

**Conditional indicators include:**
- "if", "when", "where", "unless"
- "subject to", "provided that", "on the condition that"
- "assuming that", "as long as", "in the event that"
- "contingent upon", "in case", "depending on"
- "for [type of] companies" (e.g., "for technology companies")
- "in [type of] transactions" (e.g., "in M&A transactions")
- "should [X condition] exist"

## OUTPUT FORMAT

Return a JSON array with one object per marker, in the same order:

\`\`\`json
[
  {
    "index": 1,
    "hasCondition": true,
    "conditionText": "<extracted condition from marker>"
  },
  {
    "index": 2,
    "hasCondition": false,
    "conditionText": null
  }
]
\`\`\`

**Rules:**
- hasCondition: true if conditional language is present, false otherwise
- conditionText: Extract the conditional clause verbatim if present, null otherwise
- Extract ONLY the condition part, not the entire marker

Return ONLY the JSON array.`;
}

// ============================================
// STEP 3: CLASSIFY CONDITION (C vs U)
// ============================================

export const CONDITION_QUESTIONS = {
  C1: 'Can the condition NOT be determined from the context provided?',
  C2: 'Is the condition transaction-specific (e.g., depends on deal type, equity percentage, acquisition structure)?',
  C3: 'Is the condition company-specific (e.g., depends on company characteristics, audit requirements, size)?',
  C4: 'Is the condition industry-specific (e.g., depends on whether company is in tech, healthcare, finance)?',
  U1: 'Can the condition be determined from the context provided?',
};

export const CONDITION_QUESTION_WEIGHTS: Record<string, number> = {
  C1: 2,
  C2: 2,
  C3: 2,
  C4: 2,
  U1: 2,
};

export function getConditionClassificationPrompt(
  conditions: Array<{ index: number; conditionText: string; marker: string }>,
  context: string
): string {
  const formattedConditions = conditions
    .map((c) => `[${c.index}] Condition: "${c.conditionText}"\n    Full marker: "${c.marker}"`)
    .join('\n\n');

  return `Classify conditions as determinable or context-dependent.

## CONTEXT (Contract Section)

${context}

## CONDITIONS TO CLASSIFY

${formattedConditions}

## QUESTIONS

For each condition, answer Yes/No to each question:

**Type C (Conditional indicators):**
C1: Can the condition NOT be determined from the context provided?
C2: Is the condition transaction-specific (e.g., depends on deal type, equity percentage, acquisition structure)?
C3: Is the condition company-specific (e.g., depends on company characteristics, audit requirements, size)?
C4: Is the condition industry-specific (e.g., depends on whether company is in tech, healthcare, finance)?

**Type U (Unconditional indicators):**
U1: Can the condition be determined from the context provided?

## OUTPUT FORMAT

Return a JSON array with one object per condition:

\`\`\`json
[
  {
    "index": 1,
    "answers": {
      "C1": true,
      "C2": false,
      "C3": false,
      "C4": true,
      "U1": false
    }
  }
]
\`\`\`

Return ONLY the JSON array.`;
}

// ============================================
// SCORING FUNCTION
// ============================================

export interface ConditionScoringResult {
  isConditional: boolean;
  scores: { C: number; U: number };
  matchedQuestions: string[];
}

export function calculateConditionCategory(answers: Record<string, boolean>): ConditionScoringResult {
  let cScore = 0;
  let uScore = 0;
  const matchedQuestions: string[] = [];

  for (const key of ['C1', 'C2', 'C3', 'C4'] as const) {
    if (answers[key]) {
      cScore += CONDITION_QUESTION_WEIGHTS[key] ?? 2;
      matchedQuestions.push(key);
    }
  }

  if (answers['U1']) {
    uScore += CONDITION_QUESTION_WEIGHTS['U1'] ?? 2;
    matchedQuestions.push('U1');
  }

  const isConditional = cScore > uScore;

  return {
    isConditional,
    scores: { C: cScore, U: uScore },
    matchedQuestions,
  };
}

// ============================================
// BATCH CONFIG
// ============================================

export const CONDITION_DETECTION_CONFIG = {
  step1Model: 'gpt-4o-mini' as const,
  step3Model: 'gpt-4o' as const,
  maxMarkersPerBatch: 20,
};