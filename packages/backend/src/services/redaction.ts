import { logger } from '@/config/logger';
import { generateTextWithJsonParsing } from '@/controllers/generate';
import type { SectionNode } from '@/types/documents';
import { buildFullSectionText } from '@/services/sentence-extractor';

// ============================================
// TYPES
// ============================================

export interface RedactionTerm {
  term: string;
  category: string;
}

export interface SuggestRedactionTermsInput {
  documentText: string;
}

export interface SuggestRedactionTermsResult {
  terms: RedactionTerm[];
}

// ============================================
// HELPERS
// ============================================

/**
 * Build plain text from parsed document structure for LLM analysis.
 * Includes recitals + all sections.
 */
export function buildDocumentText(
  structure: SectionNode[],
  recitals?: string,
): string {
  let text = '';

  if (recitals && recitals.trim().length > 0) {
    text += recitals.trim() + '\n\n';
  }

  for (const section of structure) {
    text += buildFullSectionText(section) + '\n\n';
  }

  return text.trim();
}

// ============================================
// LLM PROMPT
// ============================================

const SYSTEM_PROMPT = `You are a legal document redaction assistant. Your task is to identify deal-specific and sensitive information in a legal document that should be redacted before the document can be shared or used as a template.

Identify ALL instances of the following categories of sensitive terms. Be thorough — scan every clause, recital, schedule and definition:

1. **Party Names**: Full legal names and abbreviations of all parties (e.g. "Acme Corporation", "Acme", "the Seller")
2. **Individual Names**: Names of people (directors, signatories, authorized representatives, witnesses)
3. **ID Numbers**: Company registration numbers, tax IDs, VAT numbers, social security numbers, passport numbers
4. **Registration Numbers**: License numbers, permit numbers, filing references
5. **Addresses**: Registered offices, principal places of business, postal addresses, email addresses
6. **Prices & Amounts**: Purchase price, consideration, fees, penalties, liquidated damages amounts, percentages tied to specific deals
7. **Dates**: Execution date, effective date, expiry date, milestone dates, deadline dates
8. **Bank & Financial Details**: Bank names, account numbers, SWIFT/BIC codes, IBAN
9. **Jurisdiction-Specific References**: Court names, specific governing law jurisdictions where they reveal deal identity
10. **Project / Deal Names**: Code names, project names, property names, asset descriptions that identify the specific deal
11. **Contact Details**: Phone numbers, fax numbers, email addresses of individuals
12. **Proprietary Terms**: Confidential product names, trade secrets, proprietary technology names

Return a JSON array of objects. Each object must have:
- "term": the exact text as it appears in the document (case-sensitive)
- "category": one of the categories above (e.g. "Party Names", "Dates", "Addresses")

Important rules:
- Return ONLY the JSON array, no other text.
- Each term should appear only once in the array (no duplicates).
- Use the EXACT text from the document, preserving original casing and formatting.
- Do NOT include generic legal terms (e.g. "Party", "Agreement", "Effective Date" when used generically).
- Only include terms that are deal-specific and would need to be removed for the document to be used as a template.`;

// ============================================
// MAIN SERVICE FUNCTION
// ============================================

/**
 * Call LLM to suggest deal-specific terms that should be redacted.
 */
export async function suggestRedactionTerms(
  input: SuggestRedactionTermsInput
): Promise<SuggestRedactionTermsResult> {
  logger.info('Redaction: Starting term suggestion...');

  const { documentText } = input;

  if (!documentText || documentText.trim().length === 0) {
    logger.warn('Redaction: Empty document text provided');
    return { terms: [] };
  }

  // Truncate very long documents to avoid token limits
  const maxChars = 80000;
  const truncatedText = documentText.length > maxChars
    ? documentText.slice(0, maxChars) + '\n\n[Document truncated for analysis]'
    : documentText;

  logger.info({
    documentLength: documentText.length,
    truncated: documentText.length > maxChars,
  }, 'Redaction: Sending document to LLM for term extraction');

  try {
    const rawResult = await generateTextWithJsonParsing(
      SYSTEM_PROMPT,
      truncatedText,
      {
        provider: 'azure',
        model: 'gpt-4o',
        temperature: 0.1,
        maxTokens: 4000,
      }
    );

    // The LLM should return an array, but handle the case where it returns an object wrapper
    let terms: RedactionTerm[];
    if (Array.isArray(rawResult)) {
      terms = rawResult;
    } else if (rawResult && Array.isArray(rawResult.terms)) {
      terms = rawResult.terms;
    } else {
      logger.warn({ rawResult }, 'Redaction: Unexpected LLM response shape');
      terms = [];
    }

    // Validate and normalize terms
    const validTerms = terms
      .filter((t: any) => t && typeof t.term === 'string' && t.term.trim().length > 0)
      .map((t: any) => ({
        term: t.term.trim(),
        category: typeof t.category === 'string' ? t.category.trim() : 'Other',
      }));

    // Deduplicate by exact term text
    const seen = new Set<string>();
    const deduped = validTerms.filter((t) => {
      if (seen.has(t.term)) return false;
      seen.add(t.term);
      return true;
    });

    logger.info({
      rawCount: terms.length,
      validCount: deduped.length,
    }, 'Redaction: Term extraction complete');

    return { terms: deduped };
  } catch (error) {
    logger.error({ error }, 'Redaction: LLM term extraction failed');
    throw error;
  }
}
