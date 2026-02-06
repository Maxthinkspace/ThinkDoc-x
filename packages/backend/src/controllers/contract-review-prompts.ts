import type { SectionNode } from '@/types/documents';
import type { Rule, NewSectionLocation } from '@/types/contract-review';
import { 
  findTopLevelSection, 
  buildFullSectionText 
} from '@/services/sentence-extractor';

export function getRuleMappingPrompt(
  outline: SectionNode[],
  rules: Rule[]
): string {
  const outlineText = buildSectionTree(outline)
  const rulesText = rules
    .map((rule) => `Rule ${rule.id}: ${rule.content}${rule.example ? `\nExample: ${rule.example}` : ''}`)
    .join('\n\n')

  return `You are analyzing an agreement to map compliance rules to relevant sections.

# DOCUMENT OUTLINE
${outlineText}

# RULES TO MAP 
${rulesText}

# YOUR TASK
For each rule, determine:
1. **MAPPED**: If ANY existing section relates to the rule's topic (can be multiple sections). Mark as "mapped" when: (i) the wording needs changes; or (ii) the wording does not need changes but is relevant to the rule
2. **NEEDS_NEW_SECTION**: If the rule requires including certain language in the agreement, but it is not appropriate to add that language to any existing section

**CRITICAL: When marking NEEDS_NEW_SECTION:**
- suggestedLocation MUST use this format:
"After Section X" (e.g., "After Section 12.5.")

# OUTPUT FORMAT (JSON)
Return ONLY valid JSON in this exact format:

{
  "ruleStatus": [
    {
      "ruleId": "25",
      "status": "mapped",
      "locations": ["8.1.", "8.2."]
    },
    {
      "ruleId": "27",
      "status": "needs_new_section",
      "suggestedLocation": "After Section 12.5.",
      "suggestedHeading": "Force Majeure"
    }
  ],
}

# IMPORTANT RULES
- Use EXACT section numbers from the outline (with periods: "8.1." not "8.1")
- For "applied" status, you MUST list at least one location in "locations" array
- For "needs_new_section", suggestedLocation must be EXACTLY "After Section X" format
- processingOrder should list sections with applied rules, in document order
- Be thorough: one rule can apply to multiple sections
- Return ONLY the JSON, no markdown, no explanations`
}

export function buildSectionTree(nodes: SectionNode[], indent = 0): string {
  let result = ''
  for (const node of nodes) {
    const indentStr = '  '.repeat(indent)
    result += `${indentStr}${node.sectionNumber} ${node.text}\n`
    if (node.additionalParagraphs && node.additionalParagraphs.length > 0) {
      for (const para of node.additionalParagraphs) {
        result += `${indentStr}  ${para}\n`
      }
    }
    if (node.children && node.children.length > 0) {
      result += buildSectionTree(node.children, indent + 1)
    }
  }
  return result
}

export function getIRRuleMappingPrompt(
  outline: SectionNode[],
  rules: Rule[]
): string {
  const outlineText = buildSectionTree(outline)
  const rulesText = rules
    .map((rule, idx) => `Rule ${idx + 1}: ${rule.content}${rule.example ? `\nExample: ${rule.example}` : ''}`)
    .join('\n\n')

  return `You are analyzing an agreement to map instruction request rules to relevant sections.

# DOCUMENT OUTLINE
${outlineText}

# RULES TO MAP 
${rulesText}

# YOUR TASK
For each rule, determine which sections (if any) relate to the rule's topic.

# CRITICAL RULES
- DO NOT use "After Section X" or "Before Section X" formats
- Map rules directly to section numbers (e.g., "8.1.", "8.2.")
- Use EXACT section numbers from the outline (with trailing periods: "8.1." not "8.1")

# OUTPUT FORMAT (JSON)
Return a JSON object with a "results" array containing exactly ${rules.length} element(s), one for each rule IN THE SAME ORDER as listed above:

{
  "results": [
    { "status": "mapped", "locations": ["8.1.", "8.2."] },
    { "status": "not_applicable" }
  ]
}

- First element = result for Rule 1, second element = result for Rule 2, etc.
- Use "mapped" with locations array if rule applies to any section(s)
- Use "not_applicable" if rule doesn't apply to any section
- Return ONLY the JSON, no markdown, no explanations`
}

export function getEnhancedRuleMappingPrompt(
  outline: SectionNode[],
  rules: Rule[],
  initialMappingResults: Array<{ ruleId: string; status: string; locations?: string[] }>
): string {
  const outlineText = buildSectionTree(outline);
  
  const rulesWithInitialMapping = rules.map((rule) => {
    const initial = initialMappingResults.find(r => r.ruleId === rule.id);
    const mappedTo = initial?.locations?.length 
      ? `Initially mapped to: ${initial.locations.join(', ')}`
      : initial?.status === 'needs_new_section'
        ? 'Initially marked as: needs_new_section'
        : 'Initially marked as: not mapped';
    
    return `Rule ${rule.id}: ${rule.content}${rule.example ? `\nExample: ${rule.example}` : ''}\n[${mappedTo}]`;
  }).join('\n\n');

  return `You are performing a SECOND-PASS review of rule-to-section mapping for an agreement.

# DOCUMENT OUTLINE
${outlineText}

# RULES WITH INITIAL MAPPING RESULTS
${rulesWithInitialMapping}

# YOUR TASK

The initial mapping has been completed. Your job is to find ANY ADDITIONAL sections that were MISSED.

For each rule:
1. Review the initial mapping shown in brackets
2. Carefully scan ALL sections in the outline
3. Identify any ADDITIONAL sections that also relate to this rule
4. Many rules legitimately apply to 3-5+ sections (e.g., notice requirements, consent clauses, liability caps)

# OUTPUT FORMAT (JSON)

Return ONLY the additional mappings found. If a rule has no additional sections, omit it.

{
  "additionalMappings": [
    {
      "ruleId": "25",
      "additionalLocations": ["12.3.", "15.1."]
    },
    {
      "ruleId": "27", 
      "additionalLocations": ["8.4."]
    }
  ]
}

# IMPORTANT
- Only return NEWLY FOUND sections, not the ones from initial mapping
- Use EXACT section numbers from the outline (with periods)
- If no additional sections found for any rule, return: {"additionalMappings": []}
- Return ONLY the JSON, no markdown, no explanations`;
}

export function getEnhancedIRRuleMappingPrompt(
  outline: SectionNode[],
  rules: Rule[],
  initialMappingResults: Array<{ ruleId: string; status: string; locations?: string[] }>
): string {
  const outlineText = buildSectionTree(outline);
  
  const rulesWithInitialMapping = rules.map((rule, idx) => {
    const initial = initialMappingResults[idx];
    const mappedTo = initial?.locations?.length 
      ? `Initially mapped to: ${initial.locations.join(', ')}`
      : 'Initially marked as: not_applicable';
    
    return `Rule ${idx + 1}: ${rule.content}${rule.example ? `\nExample: ${rule.example}` : ''}\n[${mappedTo}]`;
  }).join('\n\n');

  return `You are performing a SECOND-PASS review of instruction request rule mapping for an agreement.

# DOCUMENT OUTLINE
${outlineText}

# RULES WITH INITIAL MAPPING RESULTS
${rulesWithInitialMapping}

# YOUR TASK

The initial mapping has been completed. Your job is to find ANY ADDITIONAL sections that were MISSED.

For each rule:
1. Review the initial mapping shown in brackets
2. Carefully scan ALL sections in the outline
3. Identify any ADDITIONAL sections that also relate to this rule

# OUTPUT FORMAT (JSON)

Return ONLY the additional mappings found (by rule index, 0-based). If a rule has no additional sections, omit it.

{
  "additionalMappings": [
    {
      "ruleIndex": 0,
      "additionalLocations": ["12.3.", "15.1."]
    },
    {
      "ruleIndex": 2, 
      "additionalLocations": ["8.4."]
    }
  ]
}

# IMPORTANT
- Use rule INDEX (0-based), not rule ID
- Only return NEWLY FOUND sections, not the ones from initial mapping
- Use EXACT section numbers from the outline (with periods)
- DO NOT use "After Section X" format - map directly to section numbers
- If no additional sections found for any rule, return: {"additionalMappings": []}
- Return ONLY the JSON, no markdown, no explanations`;
}

export function getAmendmentsPrompt(
  sectionText: string,
  lockedParents: string[],
  rules: Rule[],
  conversationContext?: string
): string {
  const lockedParentsText = lockedParents.length > 0
    ? `# Below are the parent sections of the sections to be amended. They are provided for context only. Do not amend them.\n${lockedParents.map((p, i) => `Parent ${i + 1}:\n${p}`).join('\n\n')}\n\n`
    : ''

  const conversationContextText = conversationContext
    ? `# CONVERSATION CONTEXT\n${conversationContext}\n\n`
    : ''

  const rulesText = rules
    .map((rule) => `Rule ${rule.id}: ${rule.content}${rule.example ? `\nExample: ${rule.example}` : ''}`)
    .join('\n\n')

  return `You are amending certain sections in an agreement to comply with the rules to apply which are quoted below.

${lockedParentsText}${conversationContextText}
# SECTIONS TO BE AMENDED
${sectionText}

# RULES TO APPLY
${rulesText}

# YOUR TASK
1. Review the section text and all rules
2. Determine which rules can be applied to this section
3. If ANY rules can be applied, create amended language that incorporates them
4. If NO rules can be applied (for example, if section already compliant), indicate no changes
5. If a rule requires DELETING the entire section, return "[DELETED]" as the amended text

Important: Respect the original agreement language to the extent possible. If the example language differs in wording but convey the same substantive meaning, do not alter the original agreement language. For example, do not change “1%” to “one percent”. Do not change “written” to “in writing”.

# OUTPUT FORMAT 
Return ONLY valid JSON in ONE of these two formats:

**If changes needed:**
{
  "amendment": {
    "amended": "modified text with rules incorporated here",
    "appliedRules": ["25", "26"]
  }
}

**If entire section should be deleted:**
{
  "amendment": {
    "amended": "[DELETED]",
    "appliedRules": ["25"]
  }
}

**If no changes needed:**
{
  "noChanges": true
}

# IMPORTANT RULES
- DO NOT include section numbers in the amended text
- Return ONLY the JSON, no markdown, no explanations`
}

export function getNewSectionsPrompt(
  newSections: NewSectionLocation[],
  previousSection: SectionNode,
  rules: Rule[],
  previousSectionNum: string,
  structure: SectionNode[],
  conversationContext?: string
): string {

  const topLevelSection = findTopLevelSection(previousSectionNum, structure);
  const contextText = topLevelSection
    ? buildFullSectionText(topLevelSection)
    : `${previousSection.sectionNumber} ${previousSection.text}`;

  const conversationContextText = conversationContext
    ? `\n# CONVERSATION CONTEXT\n${conversationContext}\n`
    : '';

  const rulesText = newSections.map((ns) => {
    const rule = rules.find(r => r.id === ns.ruleId);
    if (!rule) return '';
    return `Rule ${rule.id}: ${rule.content}
   Suggested Heading: "${ns.suggestedHeading}"
   ${rule.example ? `Example: ${rule.example}` : ''}`;
  }).filter(text => text !== '').join('\n\n');

  return `You are drafting ${newSections.length} new section(s) for an agreement to comply with the rules to apply which are quoted below.
${conversationContextText}
# CONTEXT: Below is the section proceeding the new sections to be inserted. It is provided for context only. Do not amend it.
${contextText}

# INSERTION POINT
After Section ${previousSectionNum}

# NEW SECTIONS TO BE INSERTED 
${rulesText}

# YOUR TASK
Draft ${newSections.length} consecutive new sections that use numbering: ${previousSectionNum}A, ${previousSectionNum}B, ${previousSectionNum}C, etc.

# OUTPUT FORMAT
Return ONLY valid JSON in this format:

{
  "amended": "${previousSectionNum}A [Heading 1]\n[Content 1]\n\n${previousSectionNum}B [Heading 2]\n[Content 2]..."
}

# IMPORTANT RULES
- Create ALL ${newSections.length} sections in sequence (A, B, C...)
- Return ONLY the JSON, no markdown, no explanations`;
}

export const getInstructionRequestPrompt = (
  sectionNumber: string,
  sectionText: string,
  rules: { id: string; content: string }[]
): string => {
  const rulesText = rules
    .map((r, idx) => `Rule ${idx + 1}: ${r.content}`)
    .join('\n');

  return `You are a legal expert reviewing a contract section against instruction request rules.

## SECTION
Section Number: ${sectionNumber}

Section Text:
${sectionText}

## INSTRUCTION REQUEST RULES
${rulesText}

## TASK
For each rule, generate a clear, professional instruction request (the "Issue") that should be sent to the client or relevant party for confirmation or clarification.

## GUIDELINES
1. Maintain a polite and professional tone without unnecessary verbosity.
2. Ask for confirmation or instruction directly.
3. Do not ask recipients to amend the text - their role is solely to provide confirmation or instruction.
4. The Issue should be specific to the contract language found in this section.
5. You MUST generate an instruction request for every rule.

## OUTPUT FORMAT
Return a JSON array with exactly ${rules.length} element(s), one for each rule IN THE SAME ORDER as listed above:

[
  { "issue": "...", "relevant_language": "..." },
  { "issue": "...", "relevant_language": "..." }
]

- First element = instruction request for Rule 1, second = Rule 2, etc.
- Return ONLY the JSON, no markdown, no explanations
`;
};

export function getEnhancedAmendmentsPrompt(
  sectionText: string,
  lockedParents: string[],
  rules: Rule[],
  previousAttempts: string[]
): string {
  const lockedParentsText = lockedParents.length > 0
    ? `# PARENT SECTIONS (for context only - do not amend)\n${lockedParents.map((p, i) => `Parent ${i + 1}:\n${p}`).join('\n\n')}\n\n`
    : '';

  const rulesText = rules
    .map((rule) => `Rule ${rule.id}: ${rule.content}${rule.example ? `\nExample: ${rule.example}` : ''}`)
    .join('\n\n');

  const previousAttemptsText = previousAttempts
    .map((attempt, i) => {
      const displayText = attempt === 'noChanges: true' 
        ? '(No changes were made - LLM determined section was already compliant)'
        : attempt;
      return `Attempt ${i + 1}:\n${displayText}`;
    })
    .join('\n\n');

  return `You are re-amending a section in an agreement. The user was NOT satisfied with previous attempt(s) and wants a DIFFERENT interpretation.

${lockedParentsText}
# SECTION TO BE AMENDED
${sectionText}

# RULES TO APPLY
${rulesText}

# PREVIOUS ATTEMPTS (user is NOT satisfied with these)
${previousAttemptsText}

# YOUR TASK
Generate a NEW amendment with a DIFFERENT interpretation. Consider:

1. **If previous attempts made minimal changes:**
   - Consider more substantive rewording
   - Consider restructuring the clause

2. **If previous attempts made significant changes:**
   - Consider a more conservative approach
   - Consider preserving more original language

3. **Alternative interpretations:**
   - Is there a different way to satisfy the rule?
   - Could the amendment be positioned differently in the section?
   - Are there alternative phrasings that achieve the same goal?

4. **If a rule requires DELETING the entire section:**
   - Return "[DELETED]" as the amended text

Important: 
- You MUST provide a DIFFERENT result than ALL previous attempts
- Respect the original agreement language where possible
- Do not change "1%" to "one percent" or "written" to "in writing"

# OUTPUT FORMAT 
Return ONLY valid JSON in ONE of these formats:

**If changes needed:**
{
  "amendment": {
    "amended": "modified text with rules incorporated here",
    "appliedRules": ["25", "26"]
  }
}

**If entire section should be deleted:**
{
  "amendment": {
    "amended": "[DELETED]",
    "appliedRules": ["25"]
  }
}

# IMPORTANT RULES
- DO NOT include section numbers in the amended text
- DO NOT repeat any previous attempt
- Return ONLY the JSON, no markdown, no explanations`;
}

export function getRerunMappingCheckPrompt(
  outline: SectionNode[],
  rule: Rule,
  currentMappedSections: string[]
): string {
  const outlineText = buildSectionTree(outline);
  
  const currentMappingText = currentMappedSections.length > 0
    ? `Currently mapped to: ${currentMappedSections.join(', ')}`
    : 'Currently mapped to: (none)';

  return `You are checking if a rule should be mapped to ADDITIONAL sections in an agreement.

# DOCUMENT OUTLINE
${outlineText}

# RULE TO CHECK
Rule ${rule.id}: ${rule.content}${rule.example ? `\nExample: ${rule.example}` : ''}

# CURRENT MAPPING
${currentMappingText}

# YOUR TASK
Carefully scan ALL sections in the outline and identify any ADDITIONAL sections that:
1. Are NOT already in the current mapping
2. Relate to this rule's topic
3. May need amendments to comply with this rule

# OUTPUT FORMAT (JSON)
{
  "additionalSections": ["8.3.", "12.1."]
}

If no additional sections found:
{
  "additionalSections": []
}

# IMPORTANT
- Only return sections NOT in the current mapping
- Use EXACT section numbers from the outline (with periods)
- Return ONLY the JSON, no markdown, no explanations`;
}

export function getRerunIRMappingCheckPrompt(
  outline: SectionNode[],
  rule: { id: string; content: string },
  currentMappedSections: string[]
): string {
  const outlineText = buildSectionTree(outline);
  
  const currentMappingText = currentMappedSections.length > 0
    ? `Currently mapped to: ${currentMappedSections.join(', ')}`
    : 'Currently mapped to: (none)';

  return `You are checking if an instruction request rule should be mapped to ADDITIONAL sections in an agreement.

# DOCUMENT OUTLINE
${outlineText}

# RULE TO CHECK
Rule ${rule.id}: ${rule.content}

# CURRENT MAPPING
${currentMappingText}

# YOUR TASK
Carefully scan ALL sections in the outline and identify any ADDITIONAL sections that:
1. Are NOT already in the current mapping
2. Relate to this rule's topic
3. May need instruction requests for confirmation or clarification

# OUTPUT FORMAT (JSON)
{
  "additionalSections": ["8.3.", "12.1."]
}

If no additional sections found:
{
  "additionalSections": []
}

# IMPORTANT
- Only return sections NOT in the current mapping
- Use EXACT section numbers from the outline (with periods)
- DO NOT use "After Section X" format - map directly to section numbers
- Return ONLY the JSON, no markdown, no explanations`;
}

export function getEnhancedInstructionRequestPrompt(
  sectionNumber: string,
  sectionText: string,
  rules: { id: string; content: string }[],
  previousAttempts: string[]
): string {
  const rulesText = rules
    .map((r, idx) => `Rule ${idx + 1}: ${r.content}`)
    .join('\n');

  const previousAttemptsText = previousAttempts
    .map((attempt, i) => `Attempt ${i + 1}:\n${attempt}`)
    .join('\n\n');

  return `You are re-generating instruction requests for a contract section. The user was NOT satisfied with previous attempt(s) and wants a DIFFERENT interpretation.

## SECTION
Section Number: ${sectionNumber}

Section Text:
${sectionText}

## INSTRUCTION REQUEST RULES
${rulesText}

## PREVIOUS ATTEMPTS (user is NOT satisfied with these)
${previousAttemptsText}

## TASK
Generate NEW instruction requests with DIFFERENT interpretations. Consider:

1. **If previous attempts were too specific:**
   - Consider a broader question that captures the essence
   - Ask about the general principle rather than specific wording

2. **If previous attempts were too general:**
   - Consider more targeted, specific questions
   - Reference specific clauses or terms in the section

3. **Alternative interpretations:**
   - Is there a different aspect of the rule to focus on?
   - Could the question be framed from a different perspective?
   - Are there related concerns not addressed in previous attempts?

## GUIDELINES
1. Maintain a polite and professional tone without unnecessary verbosity.
2. Ask for confirmation or instruction directly.
3. Do not ask recipients to amend the text - their role is solely to provide confirmation or instruction.
4. The Issue should be specific to the contract language found in this section.
5. You MUST generate a DIFFERENT instruction request than ALL previous attempts.

## OUTPUT FORMAT
Return a JSON array with exactly ${rules.length} element(s), one for each rule IN THE SAME ORDER as listed above:

[
  { "issue": "...", "relevant_language": "..." },
  { "issue": "...", "relevant_language": "..." }
]

- First element = instruction request for Rule 1, second = Rule 2, etc.
- Return ONLY the JSON, no markdown, no explanations
- DO NOT repeat any previous attempt`;
}

export function getExplanationPrompt(sectionText: string, rule: Rule): string {
  const displayNumber = rule.id.match(/\d+$/)?.[0] || rule.id;
  return `Explain in 1-2 sentences why the following rule does NOT apply to this section:

**Section Text:**
${sectionText}

**Rule ${rule.id}:**
${rule.content}
${rule.example ? `\nExample: ${rule.example}` : ''}

Be concise and specific about why theres a mismatch.`
}

export function getInsertionLocationPrompt(
  outlineText: string,
  suggestedHeading: string,
  proposedLanguage: string
): string {
  return `You are determining where to insert new content into an agreement.

**DOCUMENT OUTLINE (headings only):**
${outlineText}

**PROPOSED CONTENT:**
Heading: ${suggestedHeading}
Content: ${proposedLanguage}

**YOUR TASK:**
Determine which existing section this content should be inserted AFTER. Consider:
- Thematic relationship to existing sections
- Logical flow of the document
- Standard contract organization

**CRITICAL NUMBERING RULE:** 
The new section number MUST be the afterSection number plus an "A" suffix.
- Example 1: If inserting after "9.1.", the new section is "9.1A" (NOT "9.2" or "9.1.1")
- Example 2: If inserting after "10.", the new section is "10A" (NOT "11")

Return ONLY valid JSON in this format:
{
  "afterSection": "X.X." (the section to insert after, e.g., "9.1."),
  "newSectionNumber": "X.XA" (afterSection with 'A' suffix, e.g., "9.1A")
}

Do not include any additional analysis.`
}

export function getMissingLanguagePrompt(
  rule: string,
  exampleLanguage: string
): string {
  return `Review the following playbook rule and example language that should be included in an agreement but is currently missing.

**Playbook Rule:**
${rule}

**Example Language:**
${exampleLanguage}

Based on this rule and example, draft appropriate language that could be inserted into the agreement.

Return ONLY valid JSON in this format:
{
  "proposedLanguage": "The full text of the proposed clause or paragraph",
  "suggestedHeading": "A brief heading for this content"
}

Do not include any additional analysis or explanations.`
}