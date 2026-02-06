import { generateTextWithJsonParsing } from '@/controllers/generate';
import { logger } from '@/config/logger';

export interface ExtractedPosition {
  party: string;      // e.g., "Party A", "ABC Company"
  position: string;   // e.g., "Buyer", "Seller", "Licensor"
}

export interface PositionExtractionResult {
  positions: ExtractedPosition[];
  normalized: string[];  // Deduplicated position names for dropdown
}

const extractPositionsPrompt = (recitals: string) => `
You are a legal expert extracting party positions from contract recitals.

## RECITALS
${recitals}

## TASK
Extract all parties mentioned and their positions/roles in the contract.

## EXAMPLES
- "ABC Corp (the 'Buyer')" → { "party": "ABC Corp", "position": "Buyer" }
- "XYZ Ltd, as Seller" → { "party": "XYZ Ltd", "position": "Seller" }
- "The Licensor" → { "party": "The Licensor", "position": "Licensor" }

## OUTPUT FORMAT
Return a JSON array:
\`\`\`json
[
  { "party": "[Party name]", "position": "[Position/role]" }
]
\`\`\`

If no clear positions are found, return an empty array: []

Do not include any additional analysis or text.
`;

export async function extractPositionsFromRecitals(
  recitals: string
): Promise<PositionExtractionResult> {
  if (!recitals || recitals.trim().length < 20) {
    logger.info('Position extraction: Recitals too short, skipping');
    return { positions: [], normalized: [] };
  }

  try {
    const prompt = extractPositionsPrompt(recitals);
    
    logger.info(
      { prompt },
      'POSITION EXTRACTION: Full prompt to LLM'
    );

    const result = await generateTextWithJsonParsing(
      '',
      prompt,
      { model: 'gpt-4o' }
    );

    logger.info(
      { response: result },
      'POSITION EXTRACTION: Full LLM response'
    );

    const positions: ExtractedPosition[] = Array.isArray(result) ? result : [];

    // Normalize and deduplicate position names
    const normalizedSet = new Set<string>();
    for (const p of positions) {
      if (p.position) {
        const normalized = p.position.trim();
        const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
        normalizedSet.add(capitalized);
      }
    }

    const normalized = Array.from(normalizedSet).sort();

    logger.info(
      { normalized },
      'Position extraction: Complete'
    );

    return { positions, normalized };
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : error },
      'Position extraction: Failed'
    );
    return { positions: [], normalized: [] };
  }
}