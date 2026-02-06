import type { SectionNode } from '@/types/documents';
import type { Rule, NewSectionLocation } from '@/types/contract-review';
import type { FlatSection } from '@/types/review-with-precedents';
import { 
  getRuleMappingPrompt, 
  getAmendmentsPrompt 
} from '@/controllers/contract-review-prompts';

// =====================================================================
// STEP 1: SECTION MAPPING 
// =====================================================================

export function buildSectionMappingSystemPrompt(targetType: 'original' | 'reference'): string {
  const targetName = targetType === 'original' ? 'original agreement' : 'reference agreement';
  
  return `You are an expert contract lawyer specialized in comparing legal documents.

Your task is to identify sections in the ${targetName} that have comparable language to a given section - both in wording and underlying meaning.

Rules:
1. Look for semantic similarity, not just exact wording matches
2. Consider the PURPOSE and INTENT of clauses, not just keywords
3. Use only the HIGHEST LEVEL section numbers (e.g., "1", "2", not "1.1" or "1.2.3")
4. If multiple sections are similar, cite ALL of them
5. If NO similar language exists, respond with "NOT FOUND"

Output format (EXACT format required):
${targetName} section number: Section X
${targetName} section number: Section Y
...

Or if no match:
${targetName} section number: NOT FOUND

Do not include any additional analysis or text.`;
}

export function buildSectionMappingUserPrompt(
  sourceSection: FlatSection,
  fullTargetText: string,
  targetType: 'original' | 'reference'
): string {
  const sourceName = targetType === 'original' ? 'reference agreement' : 'original agreement';
  const targetName = targetType === 'original' ? 'original agreement' : 'reference agreement';

  return `Section from ${sourceName}:

${sourceSection.fullText}

---

Full ${targetName}:

${fullTargetText}

---

Review the section from the ${sourceName} against the ${targetName}. Check if there is comparable language in the ${targetName} – not only in wording, but also in underlying meaning. Use the highest level of the section number in the ${targetName} (for example, section 1 rather than section 1.1).

If multiple sections in the ${targetName} contain language similar to the section from the ${sourceName}, cite all relevant sections.

Output format:
${targetName} section number: (Insert "Section xxx" only. If there is no similar language, insert "NOT FOUND")
${targetName} section number: (Optional – to add only when multiple sections contain similar language. Insert "Section xxx" only.)
...

Do not include any additional analysis or other text.`;
}

// ========================================
// STEP 2: PROCESS ADDITIONS
// ========================================

export function identifyPotentialAdditionsPrompt(
  referenceSentence: string,
  originalSectionText: string
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Compare "original agreement language" and "reference agreement language". Identify the additional points in the "reference agreement language" as points to be added to the original agreement.

Output format:
Point to be added #1: (Include a summary of the additional point in the reference agreement language. One point only)
Language to be added #1: (Cite the corresponding additional language in the reference agreement verbatim. Cite in full without any omission.)
Point to be added #2: (Include a summary of the additional point in the reference agreement language. One point only)
Language to be added #2: (Cite the corresponding additional language in the reference agreement verbatim. Cite in full without any omission.)
...

If there is no additional point, return "SAME".
Do not include any additional analysis or other text.`;

  const userPrompt = `Reference agreement language:
${referenceSentence}

---

Original agreement language:
${originalSectionText}

---

Compare the reference agreement language against the original agreement language. Identify any additional points in the reference agreement language that should be added to the original agreement.`;

  return { systemPrompt, userPrompt };
}

export function validatePotentialAdditionsPrompt(
  referenceSentence: string,
  originalFullText: string
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Review the section in the reference agreement against the original agreement. Check if there is comparable language in the original agreement – not only in wording, but also in underlying meaning. Use the highest level of the section number in the original agreement (for example, section 1 rather than section 1.1).

If multiple sections in the original agreement contain language similar to the section in the reference agreement, cite all relevant sections in the original agreement.

Output format:
Original agreement section number: (Insert "Section xxx" only. If there is no similar language in the original agreement, insert "NOT FOUND")
Original agreement section number: (Optional – to add only when multiple sections in the original agreement contain language similar to the section in the reference agreement under review. Insert "Section xxx" only.)
...

Do not include any additional analysis or other text.`;

  const userPrompt = `Reference agreement language:
${referenceSentence}

---

Original agreement:
${originalFullText}

---

Review the reference agreement language against the original agreement. Identify which sections in the original agreement contain comparable language.`;

  return { systemPrompt, userPrompt };
}

export function reverifyPotentialAdditionsPrompt(
  referenceSentence: string,
  mappedSectionsText: string
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Compare "original agreement language" and "reference agreement language". Identify the additional points in the "reference agreement language" as points to be added to the original agreement.

Output format:
Point to be added #1: (Include a summary of the additional point in the reference agreement language. One point only)
Language to be added #1: (Cite the corresponding additional language in the reference agreement verbatim. Cite in full without any omission.)
Point to be added #2: (Include a summary of the additional point in the reference agreement language. One point only)
Language to be added #2: (Cite the corresponding additional language in the reference agreement verbatim. Cite in full without any omission.)
...

If there is no additional point, return "SAME".
Do not include any additional analysis or other text.`;

  const userPrompt = `Reference agreement language:
${referenceSentence}

---

Original agreement language (mapped sections):
${mappedSectionsText}

---

Compare the reference agreement language against the original agreement language. Identify any additional points in the reference agreement language that should be added to the original agreement.`;

  return { systemPrompt, userPrompt };
}

// ========================================
// STEP 3: PROCESS DELETIONS
// ========================================

export function identifyPotentialDeletionsPrompt(
  originalSentence: string,
  referenceSectionsText: string
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Compare "reference agreement language" and "original agreement language". Identify the additional points in the "original agreement language" as points to be deleted from the original agreement.

Output format:
Point to be deleted #1: (Include a summary of the additional point in the original agreement language. One point only)
Language to be amended #1: (Cite the corresponding language in the original agreement verbatim that should be amended. Cite in full without any omission.)
Point to be deleted #2: (Include a summary of the additional point in the original agreement language. One point only)
Language to be amended #2: (Cite the corresponding language in the original agreement verbatim that should be amended. Cite in full without any omission.)
...

If there is no additional point, return "SAME".
Do not include any additional analysis or other text.`;

  const userPrompt = `Original agreement language:
${originalSentence}

---

Reference agreement language:
${referenceSectionsText}

---

Compare the original agreement language against the reference agreement language. Identify any additional points in the original agreement language that are NOT in the reference agreement and should be amended.`;

  return { systemPrompt, userPrompt };
}

export function validatePotentialDeletionsPrompt(
  originalSentence: string,
  referenceFullText: string
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Review the section in the original agreement against the reference agreement. Check if there is comparable language in the reference agreement – not only in wording, but also in underlying meaning. Use the highest level of the section number in the reference agreement (for example, section 1 rather than section 1.1).

If multiple sections in the reference agreement contain language similar to the section in the original agreement, cite all relevant sections in the reference agreement.

Output format:
Reference agreement section number: (Insert "Section xxx" only. If there is no similar language in the reference agreement, insert "NOT FOUND")
Reference agreement section number: (Optional – to add only when multiple sections in the reference agreement contain language similar to the section in the original agreement under review. Insert "Section xxx" only.)
...

Do not include any additional analysis or other text.`;

  const userPrompt = `Original agreement language:
${originalSentence}

---

Reference agreement:
${referenceFullText}

---

Review the original agreement language against the reference agreement. Identify which sections in the reference agreement contain comparable language.`;

  return { systemPrompt, userPrompt };
}

export function reverifyPotentialDeletionsPrompt(
  originalSentence: string,
  mappedSectionsText: string
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Compare "reference agreement language" and "original agreement language". Identify the additional points in the "original agreement language" as points to be amended in the original agreement.

Output format:
Point to be amended #1: (Include a summary of the additional point in the original agreement language. One point only)
Language to be amended #1: (Cite the corresponding language in the original agreement verbatim that should be amended. Cite in full without any omission.)
Point to be amended #2: (Include a summary of the additional point in the original agreement language. One point only)
Language to be amended #2: (Cite the corresponding language in the original agreement verbatim that should be amended. Cite in full without any omission.)
...

If there is no additional point, return "SAME".
Do not include any additional analysis or other text.`;

  const userPrompt = `Original agreement language:
${originalSentence}

---

Reference agreement language (mapped sections):
${mappedSectionsText}

---

Compare the original agreement language against the reference agreement language. Identify any additional points in the original agreement language that should be amended.`;

  return { systemPrompt, userPrompt };
}

// ========================================
// STEP 5: MAP TO SECTIONS (RETRY ONLY)
// ========================================

export function enhancedGetRuleMappingPrompt(
  outline: SectionNode[],
  rules: Rule[]
): string {

  const originalPrompt = getRuleMappingPrompt(outline, rules);
  const retryInstructions = `

--- RETRY INSTRUCTION ---

IMPORTANT: You did NOT provide mapping for these rules in your previous response. Please reconsider them carefully:

These rules represent actual differences found through precedent comparison, so they MUST be mapped:
- Even minor or subtle relevance counts (30% similarity is enough)
- Consider indirect relationships to sections
- Look for any section that could potentially be modified to accommodate this rule
- If you genuinely cannot find ANY relevant section after thorough review, mark as "needs_new_section"

Be significantly more permissive than your first attempt. Every rule should receive either "mapped" or "needs_new_section" status.`;

  return originalPrompt + retryInstructions;
}