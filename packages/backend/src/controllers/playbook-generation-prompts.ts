import type { AnnotationForClassifier } from '@/types/annotation-classifier';

// ============================================
// CA PROMPT - Contract Amendment Rules
// ============================================

const CA_ANNOTATION_TYPE_DESCRIPTIONS = {
  comment: `**Comments:**
- Selected Text: The exact portion of language the comment is anchored to
- Comment: The user's instruction for text changes
- Affected Sentence(s): The full sentence(s) containing the selected text
- Derive rules from "Selected Text" and "Comment". Use "Affected Sentence(s)" for context.`,

  trackChange: `**Track Changes:**
- Original: The full sentence before changes
- Amended: The full sentence after changes
- Deleted: Text segments removed
- Added: Text segments inserted
- Analyze deletions/additions: paired = replacement; standalone = remove/insert`,

  highlight: `**Highlights:**
- Highlighted Text: Text highlighted by user (preferred clause language)
- Affected Sentence(s): Full sentence(s) for context`,
};

// ============================================
// IR PROMPT - Instruction Request Rules
// ============================================

const IR_ANNOTATION_TYPE_DESCRIPTIONS = {
  comment: `**Comments:**
- Selected Text: The exact portion of language the comment is anchored to
- Comment: The user's request for confirmation/instruction from a third party
- Affected Sentence(s): The full sentence(s) containing the selected text
- Derive rules from the "Comment" field. The comment asks for confirmation, instruction, or clarification.`,
};

function buildCAAnnotationTypeDescriptions(types: ('comment' | 'trackChange' | 'highlight')[]): string {
  return types
    .map(type => CA_ANNOTATION_TYPE_DESCRIPTIONS[type])
    .filter(Boolean)
    .join('\n\n');
}

export const generateCARulesPrompt = (
  context: string,
  annotation: string,
  annotationTypes: ('comment' | 'trackChange' | 'highlight')[]
) => `
You are a legal expert generating contract amendment rules from contract annotations.

## INPUT

### Context (Full Section)
${context}

### Annotation
${annotation}

## TASK

Generate clear, actionable, and reusable CONTRACT AMENDMENT rules based on the annotation, written in imperative form.

## ANNOTATION TYPES
${buildCAAnnotationTypeDescriptions(annotationTypes)}

## RULE GUIDELINES

1. Each rule should be a proper sentence starting with a capital letter and ending with a period
2. Each rule contains only one imperative
3. Each rule should be derived from exactly one annotation
4. Rules must be specific enough to locate relevant text in ANY contract
5. Do not use vague references like "this clause" or "the same clause"
6. Do not use capitalized defined terms — convert to lowercase
7. Do not mention square brackets or placeholders
8. Do not use quotation marks around clause language

**For context specificity:** Describe where a rule applies by:
- (i) referring to the content it relates to; OR
- (ii) providing a summary of the clause where the rule applies

Do NOT state headings or positions relative to other contract parts.

## OUTPUT FORMAT

Return a valid JSON array:

\`\`\`json
[
  {
    "rule_number": "CA1",
    "brief_name": "[Short descriptive name, 3-8 words]",
    "instruction": "[Rule instruction]",
    "source_annotation": 1
  }
]
\`\`\`

IMPORTANT:
- Each rule references exactly one source_annotation (1-indexed)
- One annotation MAY generate multiple rules if it implies multiple distinct actions
- If a track change deletion+addition is a REPLACEMENT, generate ONE rule

Do not include any additional analysis or text.
`;

export const generateIRRulesPrompt = (
  context: string,
  annotation: string
) => `
You are a legal expert generating instruction request rules from contract annotations.

## INPUT

### Context (Full Section)
${context}

### Annotation
${annotation}

## TASK

Generate clear, actionable INSTRUCTION REQUEST rules. These are requests for confirmation, instruction, or clarification from a third party (client, counterparty, etc.).

## ANNOTATION TYPE
${IR_ANNOTATION_TYPE_DESCRIPTIONS.comment}

## RULE GUIDELINES

1. Each rule should be a proper sentence starting with a capital letter and ending with a period
2. Each rule contains only one imperative
3. Generate rules in imperative form
4. Do not specify WHO provides confirmation/instruction (e.g., say "Confirm the number of shares" not "Ask client to confirm...")
5. Replace specific numbers with descriptions (e.g., "Confirm the number of shares" not "Confirm if there are 100 shares")
6. Do not use vague references like "this clause"
7. Do not use capitalized defined terms — convert to lowercase

**For context specificity:** Describe where the instruction relates by:
- (i) referring to the content it relates to; OR
- (ii) providing a summary of the clause

## OUTPUT FORMAT

Return a valid JSON array:

\`\`\`json
[
  {
    "rule_number": "IR1",
    "brief_name": "[Short descriptive name, 3-8 words]",
    "instruction": "[Rule instruction]",
    "source_annotation": 1
  }
]
\`\`\`

IMPORTANT:
- Each rule references exactly one source_annotation (1-indexed)
- IR rules do NOT have example_language

Do not include any additional analysis or text.
`;

export const expandRulePrompt = (context: string, rules: string) => `
You are a legal expert refining playbook rules to make them more specific and locatable.

## CONTEXT (Top-Level Section)
${context}

## RULES TO EXPAND
${rules}

## TASK
Expand each rule so junior lawyers can locate the relevant text in ANY contract (not just this one).

## GUIDELINES

**Specificity requirements:**
- Each rule must describe WHERE it applies using one of two methods:
  (i) Refer to the content it relates to (e.g., "In the clause providing for confidentiality obligations...")
  (ii) Provide a summary of the clause where the rule applies

**Do NOT:**
- State the heading under which a rule applies
- Describe position relative to other contract parts
- Use capitalized defined terms (convert to lowercase)
- Alter the imperative of the original rule or add new imperatives
- Use vague references like "this clause" or "the same clause"
- Mention square brackets or placeholders
- Use quotation marks around clause language
- Include section/paragraph numbers from the provided contract

**CRITICAL: PRESERVE ALL CONDITIONAL LANGUAGE**
Do not remove ANY conditional words or phrases, including:
- Hard conditions: "if [specific condition]", "when [specific condition]", "where [specific condition]"
- Soft qualifiers: "if necessary", "if appropriate", "if applicable", "where applicable", "as needed"
- Judgment calls: "if required", "when needed", "where relevant"

Conditional language must appear in the EXACT same position (beginning, middle, or end) as in the original rule.

## EXAMPLES

Original: "Ensure that disclosures to third parties require the prior written consent of the disclosing party"
Expanded: "In the clause providing for the confidentiality obligations of the parties, ensure that disclosures to third parties require the prior written consent of the disclosing party."

Original: "Add disclosure qualifier if necessary"
Expanded: "Add a disclosure qualifier (e.g., 'except as disclosed in Schedule [●]') to the representation regarding licenses, permits, and approvals if necessary."

Original: "When the company is a technology company, include software in the definition"
Expanded: "When the company is a technology company, include research, development, software, source code, algorithms in the definition of confidential information."

## OUTPUT FORMAT
Return ONLY rules that were amended. JSON array:
[
  {
    "original_rule_number": "[Original rule number]",
    "amended_instruction": "[Expanded instruction with ALL conditional language preserved]"
  }
]

Do not include any additional analysis or text.
`;

/**
 * Prompt for re-running rule generation with a different interpretation
 */
export const rerunRulesPrompt = (
  context: string,
  annotation: string,
  previousRules: string,
  ruleType: 'CA' | 'IR'
) => `
You are a legal expert re-generating ${ruleType === 'CA' ? 'contract amendment' : 'instruction request'} rules from a contract annotation.

## BACKGROUND

A user previously generated rules from an annotation, but is not satisfied with the interpretation. They want you to try a DIFFERENT interpretation.

## INPUT

### Context (Full Section)
${context}

### Annotation
${annotation}

### Previous Rules Generated (User is NOT satisfied with these)
${previousRules}

## TASK

Generate NEW rules with a DIFFERENT interpretation of the annotation. Consider:

1. **If previous rules were split** (e.g., separate "delete X" and "add Y" rules):
   - Consider if they should be COMBINED into a single replacement rule

2. **If previous rule was combined**:
   - Consider if it should be SPLIT into separate rules

3. **Alternative interpretations**:
   - Is there a different way to understand the user's intent?
   - Could the rule be more specific or more general?

${ruleType === 'CA' ? `
## CONTRACT AMENDMENT RULES

Generate rules for text changes.

## OUTPUT FORMAT

\`\`\`json
[
  {
    "type": "Rules for Contract Amendments",
    "rules": [
      {
        "rule_number": "CA1",
        "brief_name": "[Short descriptive name]",
        "instruction": "[Rule instruction]",
        "source_annotation": 1
      }
    ]
  }
]
\`\`\`
` : `
## INSTRUCTION REQUEST RULES

Generate rules for confirmation/instruction requests. No example_language needed.

## OUTPUT FORMAT

\`\`\`json
[
  {
    "type": "Rules for Instruction Requests",
    "rules": [
      {
        "rule_number": "IR1",
        "brief_name": "[Short descriptive name]",
        "instruction": "[Rule instruction]",
        "source_annotation": 1
      }
    ]
  }
]
\`\`\`
`}

IMPORTANT:
- You MUST provide a different interpretation than the previous rules
- source_annotation should always be 1 (single annotation in re-run)

Do not include any additional analysis or text.
`;

/**
 * Remove conditions from rules when user confirms they apply
 */
export const removeConditionPrompt = `
In the sentences, eliminate conditional clauses (e.g., "if..." or "when...") in instruction. Keep the remaining part verbatim, subject to grammatical changes.

Do not include any additional analysis or other text.

The final output format: combine rules in a valid JSON Array Object
`;

