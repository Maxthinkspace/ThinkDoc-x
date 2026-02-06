/**
 * Prompt templates for the complex (plan-then-execute) walkthrough workflow.
 *
 * Phase 0 — Comprehension: the LLM reads the full document and instruction,
 *   reasons about what the instruction means in context, and rewrites it
 *   using the document's own defined terms and terminology.
 *
 * Phase 1 — Planning: the LLM sees the full document and the rewritten
 *   instruction, then outputs a structured plan identifying every section
 *   that needs changes and a specific sub-instruction for each.
 *
 * Phase 2 — Execution: each planned section is amended individually
 *   using its per-section sub-instruction.
 */

/**
 * Builds the Phase-0 comprehension prompt.
 *
 * The LLM reads the full document and user instruction, reasons about
 * what the instruction means in the document's context, and rewrites
 * it using the document's own terminology and defined terms.
 */
export function getComplexComprehensionPrompt(
  fullDocumentText: string,
  instruction: string,
  definitionSection?: string,
  conversationContext?: string,
): string {
  const definitionBlock = definitionSection
    ? `# DEFINITIONS (use these to understand the document's defined terms)\n${definitionSection}\n\n`
    : '';

  const conversationBlock = conversationContext
    ? `# CONVERSATION CONTEXT\n${conversationContext}\n\n`
    : '';

  return `You are a senior legal drafting assistant. You will be given a full legal agreement and a user instruction. Before any changes are made, you must first UNDERSTAND what the instruction means in the context of this specific document.

${definitionBlock}${conversationBlock}# FULL DOCUMENT
${fullDocumentText}

# USER INSTRUCTION
${instruction}

# YOUR TASK
Read the document carefully and reason about what the user's instruction actually means in the context of this agreement. Consider:

1. **Defined terms**: Does the instruction reference a concept that already has a defined term in the agreement? For example, if the user says "Target Company" but the agreement already defines that entity as "the Company", recognize they are the same thing.
2. **Existing structure**: What parties, obligations, and mechanisms already exist? How does the instruction relate to them?
3. **Scope of changes**: What type of changes are really needed — adding new language, modifying existing language, or both?
4. **Implicit requirements**: What related changes does the instruction imply even if not stated? (e.g., adding a party implies adding signature blocks, representations, etc.)

Then rewrite the instruction using the document's own terminology so that there is zero ambiguity about what needs to change.

# OUTPUT FORMAT
Return ONLY valid JSON in this exact format:
{
  "thinking": [
    "Step-by-step reasoning about what the instruction means in context...",
    "Each entry should be a complete thought...",
    "Map user's terms to the document's defined terms...",
    "Identify what changes are implied..."
  ],
  "rewrittenInstruction": "The instruction rewritten using the document's exact defined terms and terminology, making the intent fully explicit and unambiguous."
}

# IMPORTANT
- The "thinking" array should contain 3-8 reasoning steps, each a complete sentence.
- The "rewrittenInstruction" must use the document's own defined terms (e.g. if the agreement says "the Company", use "the Company" not "Target Company").
- The rewritten instruction should be specific enough that a drafter unfamiliar with the user's original phrasing would know exactly what to do.
- Return ONLY the JSON, no markdown, no explanations.`;
}

/**
 * Builds the Phase-1 planning prompt.
 *
 * The LLM receives the full document text and must return a JSON plan
 * listing every section that needs changes.
 */
export function getComplexPlanningPrompt(
  fullDocumentText: string,
  instruction: string,
  definitionSection?: string,
  conversationContext?: string,
  rewrittenInstruction?: string,
): string {
  const definitionBlock = definitionSection
    ? `# DEFINITIONS (read-only context — do NOT amend, but use to understand defined terms)\n${definitionSection}\n\n`
    : '';

  const conversationBlock = conversationContext
    ? `# CONVERSATION CONTEXT\n${conversationContext}\n\n`
    : '';

  const instructionBlock = rewrittenInstruction
    ? `# INSTRUCTION (as understood in context of this document)
${rewrittenInstruction}

# ORIGINAL USER INSTRUCTION (for reference)
${instruction}`
    : `# INSTRUCTION
${instruction}`;

  return `You are a senior legal drafting assistant. You will be given a full legal agreement and a complex instruction that requires coordinated changes across multiple sections.

${definitionBlock}${conversationBlock}# FULL DOCUMENT
${fullDocumentText}

${instructionBlock}

# YOUR TASK
Analyze the instruction and identify EVERY section in the document that needs to be changed to fully implement it. Think comprehensively — complex instructions like adding a party, converting a deal structure, or adding a new mechanism typically require changes across many sections, including:

- Preamble / recitals (party introductions, defined terms)
- Defined terms / definitions section
- Representations and warranties
- Covenants / obligations
- Closing conditions / conditions precedent
- Indemnification
- Signature blocks
- Notices section
- Cross-references to other sections
- Any other sections that reference the affected concepts

For each section, write a specific, actionable sub-instruction describing exactly what to change in that section.

If the instruction requires adding an entirely new section that does not currently exist, use "NEW-after-X." as the sectionNumber, where X. is the section number after which the new section should be inserted.

# OUTPUT FORMAT
Return ONLY valid JSON in this exact format:
{
  "summary": "Brief description of the overall plan",
  "entries": [
    {
      "sectionNumber": "1.",
      "subInstruction": "Specific instruction for what to change in this section",
      "rationale": "Brief explanation of why this section needs changes"
    }
  ]
}

# IMPORTANT
- Include ALL sections that need changes — missing a section means the instruction will be incompletely implemented.
- Each subInstruction must be specific enough that an editor could apply it without seeing the overall instruction.
- Section numbers must match exactly as they appear in the document (e.g. "1.", "2.1.", "5.3.2.").
- Return ONLY the JSON, no markdown, no explanations.`;
}

/**
 * Builds the Phase-2 per-section amendment prompt.
 *
 * The LLM receives one section's text plus its specific sub-instruction
 * (from the plan) and the original user instruction (for context).
 */
export function getComplexSectionAmendmentPrompt(
  sectionNumber: string,
  sectionText: string,
  subInstruction: string,
  originalInstruction: string,
  definitionSection?: string,
  conversationContext?: string,
): string {
  const definitionBlock = definitionSection
    ? `# DEFINITIONS (read-only context — do NOT amend this section, but use it to understand defined terms)\n${definitionSection}\n\n`
    : '';

  const conversationBlock = conversationContext
    ? `# CONVERSATION CONTEXT\n${conversationContext}\n\n`
    : '';

  return `You are amending a single section of a legal agreement as part of a coordinated multi-section change.

${definitionBlock}${conversationBlock}# SECTION TO AMEND
Section ${sectionNumber}:
${sectionText}

# SPECIFIC INSTRUCTION FOR THIS SECTION
${subInstruction}

# ORIGINAL USER INSTRUCTION (for context)
${originalInstruction}

# YOUR TASK
1. Apply the specific instruction to this section's text.
2. ONLY make changes required by the instruction — do NOT make any other edits.
3. Preserve the original language as much as possible — do not rephrase, restructure, or "improve" wording beyond what the instruction requires.
4. Do not change formatting such as "1%" to "one percent" or "written" to "in writing".

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
