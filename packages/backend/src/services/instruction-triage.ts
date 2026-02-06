import { generateTextWithJsonParsing } from '../controllers/generate';
import { logger } from '../config/logger';

/**
 * Classifies a user instruction as 'global' (affects language throughout the
 * document), 'complex' (requires coordinated changes across many sections),
 * or 'targeted' (affects specific sections/clauses).
 *
 * Falls back to 'targeted' on any error so existing behaviour is preserved.
 */
export async function triageInstruction(
  instructionText: string
): Promise<'global' | 'targeted' | 'complex'> {
  if (!instructionText || !instructionText.trim()) {
    return 'targeted';
  }

  const systemPrompt = `You are a legal document editing assistant. Your job is to classify a user's drafting instruction into one of three categories:

1. "global" – The instruction requires changing language that may appear THROUGHOUT the entire document. Examples:
   - Changing a party name everywhere (e.g. "change Underwriter to Underwriters")
   - Changing a defined term everywhere (e.g. "replace Agent with Administrative Agent")
   - Changing singular to plural or vice-versa throughout
   - Changing pronouns, verb agreement, or possessives throughout
   - Any find-and-replace style instruction that affects many sections

2. "complex" – The instruction requires coordinated changes across MANY different sections of the document, but each section needs DIFFERENT changes (not the same change repeated). Examples:
   - "Make the Target Company a party to this agreement"
   - "Add a new lender as a party with its own obligations"
   - "Convert this from an asset purchase to a stock purchase"
   - "Add an escrow mechanism for the purchase price"
   - Adding or removing a party (requires changes to preamble, reps & warranties, covenants, closing conditions, signature blocks, etc.)
   - Restructuring a deal mechanism that touches definitions, obligations, conditions, and procedures

3. "targeted" – The instruction targets specific sections, clauses, or topics. Examples:
   - "Change the governing law to Delaware"
   - "Add a force majeure clause"
   - "Remove the non-compete provision"
   - "Increase the indemnification cap to $5M"
   - Any instruction that only affects one or a few known sections

Return ONLY valid JSON: {"classification": "global"}, {"classification": "complex"}, or {"classification": "targeted"}`;

  try {
    const result = await generateTextWithJsonParsing(
      systemPrompt,
      `Classify this instruction:\n\n"${instructionText}"`,
      { model: 'gpt-4o-mini' }
    );

    const classification = result?.classification;
    if (classification === 'global' || classification === 'targeted' || classification === 'complex') {
      logger.info({ instructionText, classification }, 'Instruction triage result');
      return classification;
    }

    logger.warn({ instructionText, result }, 'Instruction triage returned unexpected value, defaulting to targeted');
    return 'targeted';
  } catch (error) {
    logger.error(
      { instructionText, error: error instanceof Error ? error.message : error },
      'Instruction triage failed, defaulting to targeted'
    );
    return 'targeted';
  }
}
