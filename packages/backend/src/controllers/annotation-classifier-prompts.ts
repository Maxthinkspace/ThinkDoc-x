/**
 * Annotation Classifier Prompts - Boolean Questions
 */

import type { AnnotationForClassifier } from '@/types/annotation-classifier';

export const CLASSIFIER_QUESTIONS = {
  // Q: Third party involvement
  Q1: 'Is the mark ending with an explicit or omitted question mark?',
  Q2: 'Is the mark phrased as "[PARTY\'S NAME] to confirm", "Confirm with [PARTY\'S NAME]" or similar language?',
  Q3: 'Is the mark phrased as "[PARTY\'S NAME] to provide", "Ask [PARTY\'S NAME]", "Obtain from [PARTY\'S NAME]" or similar language?',
  Q4: 'Is the mark phrased as "Seek instruction/approval from [PARTY\'S NAME]", "Ask [PARTY\'S NAME] for instruction/approval" or similar language?',
  Q5: 'Is the mark phrased as "[PARTY\'S NAME] to advise", "[PARTY\'S NAME] to provide opinion", "Seek advice/opinion from [PARTY\'S NAME]", "Ask [PARTY\'S NAME] for advice/opinion" or similar language?',
  Q6: 'Is the mark phrased as "[PARTY\'S NAME] to clarify", "Ask [PARTY\'S NAME] to clarify" or similar language?',
  // E: Editorial
  E1: 'Does the mark change punctuation marks only?',
  E2: 'Does the added text and deleted text in the mark have the same literal meaning?',
  E3: 'Does the mark change section numbers only?',
  E4: 'Does the mark change a year, month or day only?',
  E5: 'Does the mark change party names only?',
  E6: 'Does the mark change formatting (e.g. font, spacing, capitalization) only?',
  // S: Substantive
  S1: 'Does the mark change the rights or obligations of the parties?',
  S2: 'Does the mark add/include/delete/remove/modify/amend/revise/change certain text, or require to do so',
  S3: 'Does the mark remove a placeholder in the text?',
};

export const QUESTION_WEIGHTS: Record<string, number> = {
  Q1: 1, Q2: 3, Q3: 3, Q4: 3, Q5: 3, Q6: 3,
  E1: 3, E2: 1, E3: 3, E4: 3, E5: 3, E6: 3,
  S1: 2, S2: 2, S3: 2, 
};

export const CLASSIFICATION_THRESHOLDS = {
  Q_MIN: 1,
  E_MIN: 1,
  S_MIN: 1,
};

export function formatAnnotationForClassifier(
  annotation: AnnotationForClassifier,
  index: number
): string {
  let formatted = `[${index}] Type: ${annotation.type.toUpperCase()}`;

  switch (annotation.type) {
    case 'comment':
      formatted += `\n    Mark: "${annotation.comment || ''}"`;
      if (annotation.replies && annotation.replies.length > 0) {
        formatted += `\n    Replies: ${annotation.replies.map(r => `"${r}"`).join(', ')}`;
      }
      formatted += `\n    ---`;
      formatted += `\n    Selected Text: "${annotation.selectedText || ''}"`;
      if (annotation.affectedSentences && annotation.affectedSentences.length > 0) {
        formatted += `\n    Affected Sentence(s): ${annotation.affectedSentences.map(s => `"${s}"`).join(', ')}`;
      }
      break;
    case 'trackChange':
      formatted += `\n    Mark (Deleted): ${annotation.deleted && annotation.deleted.length > 0 ? annotation.deleted.map(d => `"${d}"`).join(', ') : '(none)'}`;
      formatted += `\n    Mark (Added): ${annotation.added && annotation.added.length > 0 ? annotation.added.map(a => `"${a}"`).join(', ') : '(none)'}`;
      formatted += `\n    ---`;
      formatted += `\n    Original Sentence: "${annotation.originalSentence || ''}"`;
      formatted += `\n    Amended Sentence: "${annotation.amendedSentence || ''}"`;
      break;
    case 'fullSentenceDeletion':
      formatted += `\n    Mark (Deleted): "${annotation.deletedText || ''}"`;
      break;
    case 'fullSentenceInsertion':
      formatted += `\n    Mark (Added): "${annotation.insertedText || ''}"`;
      break;
  }
  return formatted;
}

export function formatAnnotationWithCategory(
  annotation: AnnotationForClassifier,
  index: number,
  category: string,
  matchedQuestions: string[],
): string {
  const base = formatAnnotationForClassifier(annotation, index);
  const questionsStr = matchedQuestions.length > 0 ? ` [${matchedQuestions.join(', ')}]` : '';
  return `${base}\n    → ${category}${questionsStr}`;
}

export function getStage1ClassifierPrompt(annotations: AnnotationForClassifier[]): string {
  const formattedAnnotations = annotations
    .map((a) => formatAnnotationForClassifier(a, a.index))
    .join('\n\n');

  return `Answer yes/no questions about each contract annotation.

## ANNOTATIONS

${formattedAnnotations}

## QUESTIONS

Answer based on the "Mark" field only (not the Selected Text, Affected Sentences, or Original/Amended Sentences).

For comments: the Mark is the comment text.
For track changes: the Mark is the Added and/or Deleted text.

**Type Q (Third Party)**
Q1: Is the mark ending with an explicit or omitted question mark?
Q2: Is the mark phrased as "[PARTY'S NAME] to confirm", "Confirm with [PARTY'S NAME]" or similar language?
Q3: Is the mark phrased as "[PARTY'S NAME] to provide", "Ask [PARTY'S NAME]", "Obtain from [PARTY'S NAME]" or similar language?
Q4: Is the mark phrased as "Seek instruction/approval from [PARTY'S NAME]", "Ask [PARTY'S NAME] for instruction/approval" or similar language?
Q5: Is the mark phrased as "[PARTY'S NAME] to advise", "[PARTY'S NAME] to provide opinion", "Seek advice/opinion from [PARTY'S NAME]", "Ask [PARTY'S NAME] for advice/opinion" or similar language?
Q6: Is the mark phrased as "[PARTY'S NAME] to clarify", "Ask [PARTY'S NAME] to clarify" or similar language?

**Type E (Editorial)**
E1: Does the mark change punctuation marks only?
E2: Does the added text and deleted text in the mark have the same literal meaning?
E3: Does the mark change section numbers only?
E4: Does the mark change a year, month or day only?
E5: Does the mark change party names only?
E6: Does the mark change formatting (e.g. font, spacing, capitalization) only?

**Type S (Substantive)**
S1: Does the mark change the rights or obligations of the parties?
S2: Does the mark add/include/delete/remove/modify/amend/revise/change certain text, or require to do so?
S3: Does the mark remove a placeholder in the text?

## INSTRUCTIONS

- Answer "yes" or "no" for each question
- IMPORTANT: Only evaluate the Mark, not the underlying sentences
- For E2: "possible" → "reasonably practicable" has semantic impact. Be conservative.
- [PARTY'S NAME] means any party name like "Client", "Company", "Seller", "Buyer", "Partner", etc.

## OUTPUT FORMAT

Return a JSON array with one object per annotation, in the same order as the annotations above:

\`\`\`json
[
  {
    "answers": {
      "Q1": false, "Q2": false, "Q3": false, "Q4": false, "Q5": false, "Q6": false,
      "E1": false, "E2": false, "E3": false, "E4": false, "E5": false, "E6": false,
      "S1": false, "S2": false, "S3": false, 
    },
    "reason": "Brief explanation (10 words max)"
  }
]
\`\`\`

Return ONLY the JSON array. Return one object per annotation in the same order.`;
}

export interface BooleanAnswers {
  Q1: boolean; Q2: boolean; Q3: boolean; Q4: boolean; Q5: boolean; Q6: boolean;
  E1: boolean; E2: boolean; E3: boolean; E4: boolean; E5: boolean; E6: boolean;
  S1: boolean; S2: boolean; S3: boolean; 
}

export interface ScoringResult {
  category: 'S' | 'Q' | 'E';
  scores: { Q: number; E: number; S: number };
  matchedQuestions: string[];
}

export function calculateCategory(answers: BooleanAnswers): ScoringResult {
  let qScore = 0;
  let eScore = 0;
  let sScore = 0;
  const matchedQuestions: string[] = [];

  for (const key of ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'] as const) {
    if (answers[key]) {
      qScore += QUESTION_WEIGHTS[key] ?? 1;
      matchedQuestions.push(key);
    }
  }

  for (const key of ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'] as const) {
    if (answers[key]) {
      eScore += QUESTION_WEIGHTS[key] ?? 1;
      matchedQuestions.push(key);
    }
  }

  for (const key of ['S1', 'S2', 'S3'] as const) {
    if (answers[key]) {
      sScore += QUESTION_WEIGHTS[key] ?? 1;
      matchedQuestions.push(key);
    }
  }

  // If nothing matches, default to S
  if (matchedQuestions.length === 0) {
    return { category: 'S', scores: { Q: 0, E: 0, S: 0 }, matchedQuestions: [] };
  }

  // Highest score wins. Ties: S > Q > E (S is safest)
  let category: 'S' | 'Q' | 'E' = 'S';
  
  if (sScore >= qScore && sScore >= eScore && sScore >= CLASSIFICATION_THRESHOLDS.S_MIN) {
    category = 'S';
  } else if (qScore > sScore && qScore >= eScore && qScore >= CLASSIFICATION_THRESHOLDS.Q_MIN) {
    category = 'Q';
  } else if (eScore > sScore && eScore > qScore && eScore >= CLASSIFICATION_THRESHOLDS.E_MIN) {
    category = 'E';
  }

  return { category, scores: { Q: qScore, E: eScore, S: sScore }, matchedQuestions };
}

export const STAGE1_BATCH_CONFIG = {
  maxAnnotationsPerBatch: 20,
  model: 'gpt-4o' as const,
};