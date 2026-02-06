import type { SectionNode } from '@/types/documents';
import {
  getJurisdictionRequirements,
  getClausesToRemove,
  getClausesToAdd,
} from '@/services/jurisdictionConfig';

// ============================================
// STEP 1: ANALYSIS PROMPTS
// ============================================

export function buildRedomicileAnalysisPrompt(
  structure: SectionNode[],
  sourceJurisdiction: string,
  targetJurisdiction: string,
  documentType: string
): { systemPrompt: string; userPrompt: string } {
  const sourceRequirements = getJurisdictionRequirements(sourceJurisdiction, documentType);
  const targetRequirements = getClausesToAdd(targetJurisdiction, documentType);
  const clausesToRemove = getClausesToRemove(sourceJurisdiction, targetJurisdiction);

  const systemPrompt = `You are a legal document analysis assistant specializing in cross-jurisdictional document transformation.

TASK: Analyze the original document from ${sourceJurisdiction} and identify what needs to be changed to transform it to ${targetJurisdiction} law.

ANALYSIS CRITERIA:

1. SECTIONS TO REMOVE:
   - Clauses specific to ${sourceJurisdiction} that don't apply to ${targetJurisdiction}
   - Prohibited clauses in ${targetJurisdiction}
   - Outdated or incompatible legal concepts
   
   Examples of clauses to remove:
   ${clausesToRemove.map(c => `- ${c}`).join('\n   ')}

2. SECTIONS TO ADAPT:
   - Sections that exist in both jurisdictions but need modification
   - Clauses that reference ${sourceJurisdiction}-specific laws or regulations
   - Terms that need to be updated for ${targetJurisdiction} legal framework
   
   Examples:
   - Employment terms (notice periods, leave entitlements)
   - Statutory compliance references
   - Dispute resolution mechanisms
   - Governing law clauses

3. SECTIONS TO ADD:
   - Required clauses for ${targetJurisdiction} that are missing
   - Statutory requirements specific to ${targetJurisdiction}
   
   Required clauses for ${targetJurisdiction}:
   ${targetRequirements.map(r => `- ${r.description}${r.required ? ' (REQUIRED)' : ''}`).join('\n   ')}

OUTPUT REQUIREMENTS:
- Respond with JSON only, no markdown, no explanation
- Be specific about section numbers and reasons
- Focus on legal compliance and jurisdiction-specific requirements`;

  const sectionList = structure
    .filter(n => n.level === 1)
    .map(n => {
      const heading = n.text || '';
      const preview = n.additionalParagraphs?.slice(0, 2).join(' ').substring(0, 150) || '';
      return `${n.sectionNumber} | ${heading}${preview ? ` | ${preview}...` : ''}`;
    })
    .join('\n');

  const userPrompt = `<original_document_structure>
${sectionList}
</original_document_structure>

Analyze this document and provide a JSON response:
{
  "sectionsToRemove": ["Section 5 (CPF contributions)", "Section 8 (Singapore-specific tax clauses)"],
  "sectionsToAdapt": [
    {
      "sectionNumber": "3",
      "reason": "Notice period needs to be updated from Singapore standard to China labor law requirements"
    }
  ],
  "sectionsToAdd": [
    {
      "sectionHeading": "Social Insurance Contributions",
      "reason": "Required by PRC Labor Law for all employment contracts"
    }
  ]
}`;

  return { systemPrompt, userPrompt };
}

// ============================================
// STEP 2: DRAFTING PROMPTS
// ============================================

export function buildRedomicileDraftPrompt(
  originalSection: SectionNode | null,
  sourceJurisdiction: string,
  targetJurisdiction: string,
  documentType: string,
  reason: string,
  additionalGuidance?: string,
  isNewSection: boolean = false
): { systemPrompt: string; userPrompt: string } {
  const targetRequirements = getClausesToAdd(targetJurisdiction, documentType);

  const systemPrompt = `You are drafting a legal document section for a ${targetJurisdiction}-law governed ${documentType}.

${isNewSection 
  ? `TASK: Draft a new section that is required for ${targetJurisdiction} compliance but was missing from the original ${sourceJurisdiction} document.`
  : `TASK: Adapt an existing section from ${sourceJurisdiction} law to ${targetJurisdiction} law, preserving business intent while updating legal framework.`
}

DRAFTING PRINCIPLES:

1. LEGAL COMPLIANCE:
   - Ensure all ${targetJurisdiction} statutory requirements are met
   - Use correct legal terminology for ${targetJurisdiction}
   - Reference appropriate ${targetJurisdiction} laws and regulations

2. PRESERVE BUSINESS INTENT:
   ${isNewSection 
     ? '- Create a section that serves the same business purpose as similar sections in the original'
     : '- Maintain the commercial terms and business logic from the original section'
   }
   - Adapt only the legal framework, not the business relationship

3. JURISDICTION-SPECIFIC REQUIREMENTS:
   ${targetRequirements.map(r => `- ${r.description}${r.example ? `\n  Example: ${r.example}` : ''}`).join('\n   ')}

4. LANGUAGE AND STYLE:
   - Use formal legal language appropriate for ${targetJurisdiction}
   - Follow ${targetJurisdiction} contract drafting conventions
   - Ensure clarity and enforceability

${additionalGuidance ? `ADDITIONAL GUIDANCE:\n${additionalGuidance}` : ''}

OUTPUT REQUIREMENTS:
- Respond with JSON only, no markdown, no explanation
- Include section number, heading, and full content
- Content should be complete and ready to use`;

  if (isNewSection) {
    const userPrompt = `Draft a new section for: ${reason}

Provide JSON response:
{
  "sectionNumber": "X",
  "sectionHeading": "[Appropriate heading]",
  "content": "[Complete section text with proper formatting]",
  "notes": "[Brief explanation of why this section was added]"
}`;

    return { systemPrompt, userPrompt };
  }

  const originalText = originalSection
    ? `${originalSection.sectionNumber}. ${originalSection.text || ''}\n${originalSection.additionalParagraphs?.join('\n') || ''}`
    : '';

  const userPrompt = `Adapt this section from ${sourceJurisdiction} to ${targetJurisdiction}:

<original_section>
${originalText}
</original_section>

Reason for adaptation: ${reason}

Provide JSON response:
{
  "sectionNumber": "${originalSection?.sectionNumber || 'X'}",
  "sectionHeading": "[Updated heading if needed]",
  "content": "[Complete adapted section text]",
  "sourceSectionRef": "${originalSection?.sectionNumber || ''}",
  "notes": "[Brief explanation of changes made]"
}`;

  return { systemPrompt, userPrompt };
}

