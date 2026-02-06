import { generateTextWithJsonParsing } from '../controllers/generate';
import { logger } from '../config/logger';

// ========================================
// INTERFACES
// ========================================

export interface ClassifyDocumentRequest {
  paragraphs: string[]; // Full document paragraphs for boundary detection
}

export interface ClassifyDocumentResponse {
  documentType: 'tree' | 'flat';
  language: string;
  documentName: string | null;
  firstMainBodyText: string;
  closingStartText: string | null;
  appendixStartTexts: string[];
  definitionSectionText: string | null;
}

// ========================================
// MAIN BODY CANDIDATE VALIDATION
// ========================================

export interface MainBodyCandidate {
  gapText: string;      // Text from the non-numbered paragraph before candidate
  candidateText: string; // Text from candidate + next 2 paragraphs
}

export interface ValidateMainBodyCandidatesRequest {
  candidateA: MainBodyCandidate;
  candidateB: MainBodyCandidate;
}

export interface ValidateMainBodyCandidatesResponse {
  winner: 'A' | 'B';
}

export interface ParseFlatDocumentRequest {
  paragraphs: string[];
}

export interface FlatDocumentSection {
  sectionNumber: string;
  text: string;
  level: number;
  startParagraphIndex: number;
  endParagraphIndex: number;
  children: FlatDocumentSection[];
}

export interface ParseFlatDocumentResponse {
  recitalsEndIndex: number;
  signaturesStartIndex: number;
  appendicesStartIndex: number;
  structure: FlatDocumentSection[];
}

// ========================================
// PROMPTS
// ========================================

const CLASSIFY_DOCUMENT_PROMPT = `You are a legal document analyzer. Analyze the provided document paragraphs and return a JSON object.

DOCUMENT PARAGRAPHS:
{paragraphs}

Legal documents typically have this structure:
   (a) Title/Document Name - usually at the very top, often in bold or caps
   (b) Parties - identification of the parties to the agreement
   (c) Recitals/preamble - may contain numbered items, but these are NOT the main body
   (d) Main body - the actual contract terms, typically numbered
   (e) Closing/Signatures - execution blocks (IN WITNESS WHEREOF, signature lines, party names)
   (f) Appendices - schedules, exhibits, annexes, attachments and their content

Your task is to identify the BOUNDARIES and key elements:

1. DOCUMENT NAME: Find the document title/name at the beginning. This is typically in the first 1-3 paragraphs.
   Return the exact title text as "documentName"
   Examples: "SHARE PURCHASE AGREEMENT", "FRANCHISE AGREEMENT", "NON-DISCLOSURE AGREEMENT"
   Return null if no clear document title exists.

2. MAIN BODY START: Find where the main body begins. Return the TEXT CONTENT (without section number) of the first paragraph as "firstMainBodyText"
   This marks the END of the recitals/preamble section.
   Example: If main body starts with "1. The Agent agrees to act...", return "The Agent agrees to act..."

3. DEFINITION SECTION: Find where the definitions section begins. This is typically a section containing a list of defined terms.
   Definition format examples:
   - "Business Day" means a day (other than a Saturday, Sunday or public holiday) on which commercial banks are open for business in Singapore;
   - "Agreement" means this share purchase agreement;
   - "Completion Date" has the meaning given in Clause 5.1;
   Look for sections titled "DEFINITIONS", "INTERPRETATION", "DEFINITIONS AND INTERPRETATION", or sections that start with a list of quoted terms followed by "means" or "has the meaning".
   Return the TEXT CONTENT (without section number) of the FIRST definition in the list as "definitionSectionText"
   Example: If definitions start with '1.1 "Agreement" means this...', return '"Agreement" means this...'
   Return "NONE" if no definition section exists.

4. CLOSING START: Find where signature pages begin. Return the EXACT TEXT of the first line as "closingStartText"
   Look for: "IN WITNESS WHEREOF", "EXECUTED AS OF", "AGREED AND ACCEPTED", party signature blocks, witness lines, any sentences leading to signature blocks
   Return null if no signature block exists.

5. APPENDICES: Find ALL individual schedules/exhibits/annexes/attachments/appendices.
   For EACH one, return the EXACT TEXT of its heading line.
   Look for standalone headings like: "SCHEDULE A", "SCHEDULE 1", "EXHIBIT 1", "ANNEX A", "ATTACHMENT 1", "APPENDIX A", etc.
   Do NOT include references to schedules within body text — only standalone headings that start a new appendix section.
   Return as "appendixStartTexts": an array of strings, one per appendix, in document order.
   Return an empty array [] if no appendices exist.

6. DOCUMENT TYPE: Detect if the main body is numbered ("tree") or unnumbered ("flat")

7. LANGUAGE: Detect the primary language

Return ONLY the JSON object:

{
  "documentName": "<document title>" or null,
  "documentType": "tree" or "flat",
  "firstMainBodyText": "<text without section number>",
  "definitionSectionText": "<text of first definition>" or "NONE",
  "closingStartText": "<exact first line of signatures>" or null,
  "appendixStartTexts": ["<exact heading of first appendix>", "<exact heading of second appendix>", ...] or [],
  "language": "<detected language>"
}

Do not return other text.`;

const VALIDATE_MAIN_BODY_CANDIDATES_PROMPT = `You are a legal document analyzer. You are given two candidate positions for where the main body (operative provisions) of a legal document begins.

Legal documents typically have this structure:
1. Title/Parties - document name and party identification
2. Recitals/Preamble - background, "WHEREAS" clauses, may have numbered items like A., B., C. or (1), (2)
3. Transitional phrase - "NOW IT IS HEREBY AGREED", "IT IS AGREED", "THE PARTIES AGREE" etc.
4. Main Body - the actual operative provisions, typically starting with "1. DEFINITIONS" or similar
5. Closing/Signatures

Your task is to determine which candidate marks the TRUE start of the main body.

CANDIDATE A:
[Text before A]: {gapTextA}
[A + following paragraphs]: {candidateTextA}

CANDIDATE B:
[Text before B]: {gapTextB}
[B + following paragraphs]: {candidateTextB}

Consider:
- Transitional phrases like "NOW IT IS HEREBY AGREED" strongly indicate the main body follows
- Sections titled "DEFINITIONS", "INTERPRETATION", "DEFINITIONS AND INTERPRETATION" typically start the main body
- Recitals often use letters (A, B, C) or parenthesized numbers ((1), (2)) and describe background facts
- The main body uses numbered clauses (1., 2., 3. or 1.1, 1.2) with operative language

Which candidate marks the true start of the main body?
Return ONLY a JSON object: {"winner": "A"} or {"winner": "B"}`;

// ========================================
// SERVICE FUNCTIONS
// ========================================

export async function classifyDocument(
  request: ClassifyDocumentRequest
): Promise<ClassifyDocumentResponse> {
  const { paragraphs } = request;

  if (!paragraphs || paragraphs.length === 0) {
    logger.warn('No paragraphs provided for classification');
    return {
      documentType: 'flat',
      language: 'english',
      documentName: null,
      firstMainBodyText: '',
      definitionSectionText: null,
      closingStartText: null,
      appendixStartTexts: [],
    };
  }

  // Format ALL paragraphs for boundary detection
  // Truncate individual paragraphs but include full document structure
  const formattedParagraphs = paragraphs
    .map((p, i) => {
      const truncated = p.length > 200 ? p.substring(0, 200) + '...' : p;
      return `[${i}] ${truncated}`;
    })
    .join('\n\n');

  const prompt = CLASSIFY_DOCUMENT_PROMPT.replace('{paragraphs}', formattedParagraphs);

  logger.info({ paragraphCount: paragraphs.length }, 'Starting document classification with boundary detection');

  try {
    // Use gpt-4o for better boundary detection accuracy (analyzing full document)
    const response = await generateTextWithJsonParsing('', prompt, { model: 'gpt-4o', temperature: 0 });

    // DEBUG: Log raw LLM response
    logger.info({
      rawResponse: response,
      documentName: response.documentName,
      firstMainBodyText: response.firstMainBodyText,
      definitionSectionText: response.definitionSectionText,
      closingStartText: response.closingStartText,
      appendixStartTexts: response.appendixStartTexts,
    }, '[DEBUG 1.1] LLM classification raw response');

    // Normalize definitionSectionText: "NONE", null, undefined, empty string all become null
    let definitionSectionText: string | null = response.definitionSectionText || null;
    if (definitionSectionText && definitionSectionText.toUpperCase().trim() === 'NONE') {
      definitionSectionText = null;
    }

    // Normalize appendixStartTexts: ensure it's always an array
    const rawAppendixTexts = response.appendixStartTexts;
    const appendixStartTexts: string[] = Array.isArray(rawAppendixTexts)
      ? rawAppendixTexts.filter((t: unknown) => typeof t === 'string' && t.trim() !== '')
      : [];

    const result: ClassifyDocumentResponse = {
      documentType: response.documentType === 'tree' ? 'tree' : 'flat',
      language: response.language || 'english',
      documentName: response.documentName || null,
      firstMainBodyText: response.firstMainBodyText || '',
      definitionSectionText,
      closingStartText: response.closingStartText || null,
      appendixStartTexts,
    };

    logger.info(result, 'Document classification with boundaries completed');
    return result;
  } catch (error) {
    logger.error({ error }, 'Error in document classification');
    return {
      documentType: 'flat',
      language: 'english',
      documentName: null,
      firstMainBodyText: '',
      definitionSectionText: null,
      closingStartText: null,
      appendixStartTexts: [],
    };
  }
}

/**
 * Validate two main body candidates using LLM.
 * Returns which candidate (A or B) is the true start of the main body.
 */
export async function validateMainBodyCandidates(
  request: ValidateMainBodyCandidatesRequest
): Promise<ValidateMainBodyCandidatesResponse> {
  const { candidateA, candidateB } = request;

  // Build the prompt
  const prompt = VALIDATE_MAIN_BODY_CANDIDATES_PROMPT
    .replace('{gapTextA}', candidateA.gapText || '(none)')
    .replace('{candidateTextA}', candidateA.candidateText)
    .replace('{gapTextB}', candidateB.gapText || '(none)')
    .replace('{candidateTextB}', candidateB.candidateText);

  // Debug log: full prompt
  logger.info({
    prompt,
    candidateA,
    candidateB,
  }, '[DEBUG validateMainBodyCandidates] Full prompt to LLM');

  try {
    const response = await generateTextWithJsonParsing('', prompt, {
      model: 'gpt-4o-mini',  // Use faster model for binary choice
      temperature: 0
    });

    // Debug log: full response
    logger.info({
      rawResponse: response,
      winner: response.winner,
    }, '[DEBUG validateMainBodyCandidates] Full LLM response');

    const winner = response.winner === 'A' ? 'A' : 'B';

    return { winner };
  } catch (error) {
    logger.error({ error }, 'Error in validateMainBodyCandidates');
    // Default to B (the later candidate) if LLM fails
    return { winner: 'B' };
  }
}
