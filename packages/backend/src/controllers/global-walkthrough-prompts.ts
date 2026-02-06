/**
 * Prompt template for the global walkthrough amendment workflow.
 *
 * Each section is processed individually against a single global instruction
 * (e.g. "change Underwriter to Underwriters"). The definition section is
 * supplied as read-only context so the LLM can handle defined terms correctly.
 */
export function getGlobalWalkthroughAmendmentPrompt(
  sectionNumber: string,
  sectionText: string,
  instruction: string,
  definitionSection?: string,
  conversationContext?: string,
): string {
  const definitionBlock = definitionSection
    ? `# DEFINITIONS (read-only context — do NOT amend this section, but use it to understand defined terms)\n${definitionSection}\n\n`
    : '';

  const conversationBlock = conversationContext
    ? `# CONVERSATION CONTEXT\n${conversationContext}\n\n`
    : '';

  return `You are amending a single section of a legal agreement to comply with a global instruction that applies throughout the document.

${definitionBlock}${conversationBlock}# SECTION TO AMEND
Section ${sectionNumber}:
${sectionText}

# INSTRUCTION
${instruction}

# YOUR TASK
1. Apply the instruction to this section's text.
2. Consider ALL forms that may need updating:
   - Singular / plural (e.g. "Underwriter" → "Underwriters")
   - Possessive forms (e.g. "Underwriter's" → "Underwriters'")
   - Pronouns and determiners (e.g. "it" → "they", "its" → "their", "has" → "have")
   - Verb agreement (e.g. "the Underwriter agrees" → "the Underwriters agree")
   - Articles (e.g. "the Underwriter" → "the Underwriters" — remove "an" where appropriate)
3. ONLY make changes required by the instruction — do NOT make any other edits.
4. Preserve the original language as much as possible — do not rephrase, restructure, or "improve" wording beyond what the instruction requires.
5. Do not change formatting such as "1%" to "one percent" or "written" to "in writing".

# OUTPUT FORMAT
Return ONLY valid JSON in one of these two formats:

**If changes are needed:**
{
  "amendment": {
    "amended": "the full amended section text here",
    "appliedRules": ["inst-1"]
  }
}

**If NO changes are needed (the instruction does not affect this section):**
{
  "noChanges": true
}

# IMPORTANT
- Do NOT include the section number in the amended text.
- Return ONLY the JSON, no markdown, no explanations.`;
}
