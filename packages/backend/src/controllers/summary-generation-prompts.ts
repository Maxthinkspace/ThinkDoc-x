const ANNOTATION_TYPE_DESCRIPTIONS = {
  comment: `**Comments:**
- Selected Text: The exact portion of language the comment is anchored to
- Comment: The user's expectation, requirement, or instruction
- Affected Sentence(s): The full sentence(s) containing the selected text (provides broader context)
- Use "Affected Sentence(s)" to understand the full context when analyzing the change`,

  trackChange: `**Track Changes:**
- Original: The full sentence/paragraph before any changes
- Amended: The full sentence/paragraph after all changes applied
- Deleted: List of specific text segments that were removed
- Added: List of specific text segments that were inserted
- Analyze the relationship between deletions and additions to understand intent:
  - A deletion paired with a similar addition indicates a replacement (e.g., "shall" → "must")
  - Standalone deletions indicate language to remove entirely
  - Standalone additions indicate new language to insert`,

  highlight: `**Highlights:**
- Highlighted Text: Text manually highlighted by the user
- Affected Sentence(s): The full sentence(s) containing the highlighted text (provides broader context)
- Treat highlighted language as flagged for attention
- Use "Affected Sentence(s)" to understand the full context when analyzing`,
};

function buildAnnotationTypeDescriptions(types: ('comment' | 'trackChange' | 'highlight')[]): string {
  return types.map(type => ANNOTATION_TYPE_DESCRIPTIONS[type]).join('\n\n');
}

import type { PrimaryCategory } from '@/types/annotation-classifier';

/**
 * Build category assignments section for prompt
 */
function buildCategoryAssignments(categoryMap: Map<number, PrimaryCategory>): string {
  const categoryLabels: Record<PrimaryCategory, string> = {
    S: 'Substantive',
    Q: 'Query', 
    E: 'Editorial',
  };

  return Array.from(categoryMap.entries())
    .map(([idx, cat]) => `- Annotation ${idx}: **${categoryLabels[cat]}**`)
    .join('\n');
}

/**
 * Build output format instructions based on categories present
 */
function buildOutputInstructions(categoryMap: Map<number, PrimaryCategory>, userPosition?: string): string {
  const categories = new Set(categoryMap.values());
  const instructions: string[] = [];

  if (categories.has('S')) {
    instructions.push(`**For Substantive (S) annotations:**
Return an object with change_description, implication, and recommendation.
- change_description: Plain-language description of what changed
- implication: Legal/commercial impact analysis
- recommendation: ${userPosition ? `Recommendation from ${userPosition}'s perspective` : 'Balanced recommendation for both parties'}`);
  }

  if (categories.has('Q')) {
    instructions.push(`**For Query (Q) annotations:**
Return an object with items array listing the questions/issues raised.
- items: Array of strings describing each question or flag`);
  }

  if (categories.has('E')) {
    instructions.push(`**For Editorial (E) annotations:**
Return an object with items array listing the minor changes.
- items: Array of strings describing each editorial fix`);
  }

  return instructions.join('\n\n');
}

export function generateSummaryPrompt(
  sectionContext: string,
  formattedAnnotations: string,
  annotationTypes: ('comment' | 'trackChange' | 'highlight')[],
  categoryMap: Map<number, PrimaryCategory>,
  userPosition?: string
): string {
  const positionGuidance = userPosition
    ? `The user's position is: **${userPosition}**. Provide recommendations from this party's perspective, highlighting pros, cons, and risks.`
    : `No user position specified. Provide balanced analysis for both parties using format: "For [Party A]: [analysis]. For [Party B]: [analysis]."`;

  const categoryAssignments = buildCategoryAssignments(categoryMap);
  const outputInstructions = buildOutputInstructions(categoryMap, userPosition);

  return `You are a legal expert summarizing changes in a contract document.

## INPUT

### Context (Full Section)
${sectionContext}

### Annotations
${formattedAnnotations}

## ANNOTATION TYPES
${buildAnnotationTypeDescriptions(annotationTypes)}

## PRE-DETERMINED CATEGORIES

Each annotation has been pre-classified into one of three categories. **Do not re-categorize** - use the assigned category:

${categoryAssignments}

**Category Definitions:**
- **Substantive (S)**: Changes affecting rights, obligations, liability, or risk allocation
- **Query (Q)**: Questions, clarification requests, or items flagged for attention (no document change intended)
- **Editorial (E)**: Formatting, grammar, spelling, or clerical corrections with no legal effect

## USER POSITION
${positionGuidance}

## OUTPUT FORMAT

Generate a summary for each annotation based on its pre-assigned category.

${outputInstructions}

**IMPORTANT for Track Changes:** When a sentence has BOTH deletions AND additions, determine if they form a REPLACEMENT PAIR:
- "possible" deleted + "reasonably practicable" added = Replacement ("Changed 'possible' to 'reasonably practicable'")
- Do NOT describe replacements as separate unrelated changes

Return a JSON array with one object per annotation:

\`\`\`json
[
  {
    "annotation_index": 1,
    "sentence": "The affected sentence text",
    "category": "S",
    "substantive": {
      "change_description": "Plain-language description of the change",
      "implication": "Legal/commercial impact analysis",
      "recommendation": "Position-aware recommendation"
    }
  },
  {
    "annotation_index": 2,
    "sentence": "Another sentence",
    "category": "Q",
    "query": {
      "items": ["Question raised by reviewer"]
    }
  }
]
\`\`\`

**Rules:**
- Include exactly ONE category-specific field per annotation (substantive, query, OR editorial)
- Use the pre-assigned category - do not re-categorize
- "annotation_index" must match the annotation number from the input

Do not include any additional text outside the JSON array.
`;
}

export function rerunSummaryPrompt(
  sectionContext: string,
  formattedAnnotation: string,
  previousSummaries: string,
  category: PrimaryCategory,
  userPosition?: string
): string {
  const categoryLabel = category === 'S' ? 'Substantive' : category === 'Q' ? 'Query' : 'Editorial';
  
  const outputFormat = category === 'S' 
    ? `{
  "sentence": "[The sentence being summarized]",
  "category": "S",
  "substantive": {
    "change_description": "[What changed - DIFFERENT from previous]",
    "implication": "[Business/legal implication - DIFFERENT perspective]",
    "recommendation": "[Action recommendation${userPosition ? ` for ${userPosition}` : ''}]"
  }
}`
    : category === 'Q'
    ? `{
  "sentence": "[The sentence being summarized]",
  "category": "Q",
  "query": {
    "items": ["[Question/issue - DIFFERENT interpretation from previous]"]
  }
}`
    : `{
  "sentence": "[The sentence being summarized]",
  "category": "E",
  "editorial": {
    "items": ["[Editorial change - DIFFERENT interpretation from previous]"]
  }
}`;

  return `You are a legal expert re-generating a summary of a contract annotation.

## BACKGROUND

A user previously generated a summary from an annotation, but is not satisfied with the interpretation. They want you to try a DIFFERENT interpretation.

This annotation has been pre-classified as: **${categoryLabel}**

${userPosition ? `## USER POSITION\nThe user is acting as: ${userPosition}\n` : ''}

## INPUT

### Context (Full Section)
${sectionContext}

### Annotation
${formattedAnnotation}

### Previous Summaries Generated (User is NOT satisfied with these)
${previousSummaries}

## TASK

Generate a NEW summary with a DIFFERENT interpretation of the annotation. Consider:

1. **Different focus**: What other aspects of the change could be emphasized?
2. **Different implications**: Are there alternative business/legal implications?
3. **Different level of detail**: Should the summary be more specific or more general?
4. **Different perspective**: How might the other party view this change?

## OUTPUT FORMAT

Return a JSON object:
\`\`\`json
${outputFormat}
\`\`\`

IMPORTANT:
- You MUST provide a different interpretation than the previous summaries
- Keep the same category (${categoryLabel}) - do not re-categorize
- Focus on aspects not covered in previous attempts

Do not include any additional analysis or text.
`;
}