import type { SectionNode } from '@/types/documents';
import type { SkeletonSection } from '@/services/redraft';

// ============================================
// STEP 1: SKELETON GENERATION PROMPTS
// ============================================

export function buildSkeletonPrompt(
  structure: SectionNode[],
  instructions: {
    targetJurisdiction: string;
    targetLegalSystem: string;
    preserveBusinessTerms: boolean;
    additionalGuidance?: string;
  }
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are a legal document restructuring assistant specializing in cross-jurisdictional contract adaptation.

TASK: Analyze the original agreement and create a restructuring skeleton for converting to ${instructions.targetJurisdiction} law under ${instructions.targetLegalSystem} conventions.

CATEGORIZATION RULES:
- Business-focused sections (isLegalSection: false):
  • Purpose/Background/Recitals
  • Definitions of subject matter (e.g., "Confidential Information" in NDAs)
  • Scope of obligations and restrictions
  • Operational procedures and requirements
  • Management and administration provisions
  • Return/destruction obligations
  • Duration of obligations (commercial aspects)

- Legal sections (isLegalSection: true):
  • Intellectual property ownership and licensing
  • Warranties, representations, disclaimers
  • Indemnification and hold harmless
  • Limitation of liability
  • Remedies and breach consequences
  • Boilerplate: waiver, severability, entire agreement, assignment, amendments
  • Notices (procedural/legal)
  • Governing law and jurisdiction
  • Dispute resolution (arbitration/litigation)

RESTRUCTURING PRINCIPLES:
1. Preserve original section order where possible
2. Consolidate fragmented boilerplate into "General Provisions"
3. Add "Interpretation" sub-clause to Definitions (${instructions.targetLegalSystem} convention)
4. Separate "Governing Law" and "Dispute Resolution" if combined
5. Add section for "Injunctive Relief" under Remedies if missing (${instructions.targetLegalSystem} standard)

${instructions.additionalGuidance ? `ADDITIONAL GUIDANCE:\n${instructions.additionalGuidance}` : ''}

OUTPUT REQUIREMENTS:
- Respond with JSON array ONLY, no markdown, no explanation
- Each object must have all required fields
- oldSectionNumbers array may contain multiple sections if consolidating
- Use empty array [] for oldSectionNumbers if creating entirely new section`;

  const sectionList = structure
    .filter(n => n.level === 1)
    .map(n => {
      const heading = n.text || '';
      const preview = n.additionalParagraphs?.slice(0, 2).join(' ').substring(0, 100) || '';
      return `${n.sectionNumber} | ${heading}${preview ? ` | Preview: ${preview}...` : ''}`;
    })
    .join('\n');

  const userPrompt = `<original_agreement_structure>
${sectionList}
</original_agreement_structure>

Create the restructuring skeleton as a JSON array:
[
  {
    "newSectionNumber": "1",
    "newSectionHeading": "DEFINITIONS AND INTERPRETATION",
    "oldSectionNumbers": ["二"],
    "oldSectionHeadings": ["定义"],
    "isLegalSection": false,
    "restructuringNotes": "Add interpretation clause"
  }
]`;

  return { systemPrompt, userPrompt };
}

// ============================================
// STEP 2: SECTION DRAFTING PROMPTS
// ============================================

export function buildDraftSectionPrompt(
  skeletonSection: SkeletonSection,
  originalTexts: { sectionNumber: string; text: string }[],
  instructions: {
    targetJurisdiction: string;
    targetLegalSystem: string;
    preserveBusinessTerms: boolean;
  }
): { systemPrompt: string; userPrompt: string } {
  const sectionType = skeletonSection.isLegalSection ? 'Legal' : 'Business-focused';

  const systemPrompt = `You are drafting Section ${skeletonSection.newSectionNumber}: ${skeletonSection.newSectionHeading} of a ${instructions.targetJurisdiction}-law governed agreement.

SECTION TYPE: ${sectionType}

DRAFTING INSTRUCTIONS:
${skeletonSection.isLegalSection
    ? `This is a LEGAL section. Apply ${instructions.targetLegalSystem} conventions:
- Use standard ${instructions.targetLegalSystem} drafting style and defined terms
- Include standard protective language expected in ${instructions.targetJurisdiction}
- Add common law formulations (e.g., "reasonable endeavours", "without prejudice to")
- Ensure enforceability under ${instructions.targetJurisdiction} law
- Add standard clauses if missing (e.g., "no waiver" language, severability mechanics)`
    : `This is a BUSINESS-FOCUSED section. Preserve commercial intent:
- Stay faithful to original meaning and obligations
- Adapt language and structure only, not commercial substance
- Maintain all numerical values, timeframes, and specific requirements
- Use clear English but preserve technical/business terminology`}

FOOTNOTE REQUIREMENTS (CRITICAL):
Every sentence MUST have a footnote with either:

1. footnoteType: "original" - For sentences derived from source text
   - footnoteContent: Quote the original text (Chinese or source language)
   - originalSectionRef: Reference to source section (e.g., "四(5)(1)")

2. footnoteType: "addition" - For newly added sentences
   - footnoteContent: Brief reason for addition (e.g., "Standard common law carve-out for prohibited notice")
   - originalSectionRef: omit this field

QUALITY STANDARDS:
- Use defined terms consistently (e.g., "Receiving Party", "Confidential Information")
- Number clauses hierarchically (${skeletonSection.newSectionNumber}.1, ${skeletonSection.newSectionNumber}.1.1)
- Each clause should be a complete, standalone provision
- Avoid run-on sentences; break complex provisions into sub-clauses

OUTPUT FORMAT (strict JSON, no markdown):
{
  "sectionNumber": "${skeletonSection.newSectionNumber}",
  "sectionHeading": "${skeletonSection.newSectionHeading}",
  "clauses": [
    {
      "clauseNumber": "${skeletonSection.newSectionNumber}.1",
      "clauseHeading": "Compulsory Disclosure",
      "sentences": [
        {
          "text": "The Receiving Party may disclose Confidential Information where required by applicable law.",
          "footnoteType": "original",
          "footnoteContent": "适用法律、法规、法院命令或任何证券交易所规则而进行的披露",
          "originalSectionRef": "四(5)(1)"
        },
        {
          "text": "Such disclosure shall be limited to the minimum extent necessary.",
          "footnoteType": "addition",
          "footnoteContent": "Standard common law proportionality requirement"
        }
      ]
    }
  ]
}`;

  const originalTextBlock = originalTexts.length > 0
    ? originalTexts.map(t => `<source_section ref="${t.sectionNumber}">\n${t.text}\n</source_section>`).join('\n\n')
    : '<source_section>\nNo original text available. Draft based on standard provisions.\n</source_section>';

  const userPrompt = `<original_text>
${originalTextBlock}
</original_text>

${skeletonSection.restructuringNotes ? `<restructuring_guidance>\n${skeletonSection.restructuringNotes}\n</restructuring_guidance>\n` : ''}
Draft Section ${skeletonSection.newSectionNumber}: ${skeletonSection.newSectionHeading}

Respond with JSON only.`;

  return { systemPrompt, userPrompt };
}

// ============================================
// OPTIONAL: PRECEDENT-ENHANCED DRAFTING PROMPT
// ============================================

export function buildDraftSectionWithPrecedentPrompt(
  skeletonSection: SkeletonSection,
  originalTexts: { sectionNumber: string; text: string }[],
  precedentText: string | null,
  instructions: {
    targetJurisdiction: string;
    targetLegalSystem: string;
    preserveBusinessTerms: boolean;
  }
): { systemPrompt: string; userPrompt: string } {
  // Get base prompts
  const { systemPrompt: baseSystem, userPrompt: baseUser } = buildDraftSectionPrompt(
    skeletonSection,
    originalTexts,
    instructions
  );

  // Enhance system prompt with precedent guidance
  const systemPrompt = baseSystem + `

PRECEDENT REFERENCE:
${precedentText
    ? `A precedent clause is provided below. Use it as stylistic guidance for:
- Clause structure and organization
- Language formulations and defined terms
- Level of detail and specificity
Do NOT copy verbatim; adapt the style to the original content.`
    : 'No precedent provided. Draft using standard conventions.'}`;

  // Enhance user prompt with precedent
  const userPrompt = precedentText
    ? `${baseUser}

<precedent_reference>
${precedentText}
</precedent_reference>

Use the precedent as a style guide, but draft based on the original text content.`
    : baseUser;

  return { systemPrompt, userPrompt };
}

// ============================================
// VALIDATION PROMPT (for quality checking)
// ============================================

export function buildValidationPrompt(
  draftedSection: string,
  originalTexts: string
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are a legal quality assurance reviewer. Check the drafted section for:

1. COMPLETENESS: All substantive points from original are covered
2. ACCURACY: No meaning has been changed or lost
3. FOOTNOTES: Every sentence has appropriate footnote
4. CONSISTENCY: Defined terms used correctly throughout
5. ENFORCEABILITY: No obviously unenforceable provisions

Respond with JSON:
{
  "isValid": true/false,
  "issues": ["issue 1", "issue 2"],
  "suggestions": ["suggestion 1"]
}`;

  const userPrompt = `<original_text>
${originalTexts}
</original_text>

<drafted_section>
${draftedSection}
</drafted_section>

Validate the drafted section.`;

  return { systemPrompt, userPrompt };
}