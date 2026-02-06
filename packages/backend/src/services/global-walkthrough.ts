import type { SectionNode } from '../types/documents';
import type { DraftingFormattedResults } from './drafting';
import { logger } from '../config/logger';
import { generateTextWithJsonParsing } from '../controllers/generate';
import { getGlobalWalkthroughAmendmentPrompt } from '../controllers/global-walkthrough-prompts';
import { compareSectionNumbers } from './drafting';

// ============================================
// TYPES
// ============================================

export interface FlatSection {
  sectionNumber: string;
  ownText: string; // Only this node's text (not children's)
}

// ============================================
// COLLECT ALL SECTIONS
// ============================================

/**
 * Recursively collects ALL sections (leaf and parent) from the document tree.
 * For each section, builds only its OWN text (node.text + additionalParagraphs)
 * so that every paragraph is processed exactly once — children are processed
 * separately as their own entries.
 */
export function collectAllSections(nodes: SectionNode[]): FlatSection[] {
  const sections: FlatSection[] = [];

  function traverse(nodeList: SectionNode[]): void {
    for (const node of nodeList) {
      let ownText = node.text || '';
      if (node.additionalParagraphs && node.additionalParagraphs.length > 0) {
        ownText += '\n' + node.additionalParagraphs.join('\n');
      }

      // Only include sections that have some text to process
      if (ownText.trim()) {
        sections.push({
          sectionNumber: node.sectionNumber,
          ownText,
        });
      }

      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(nodes);
  return sections;
}

// ============================================
// PROCESS SINGLE SECTION
// ============================================

async function processSection(
  section: FlatSection,
  instruction: string,
  instructionId: string,
  definitionSection?: string,
  conversationContext?: string,
): Promise<{
  sectionNumber: string;
  amended: boolean;
  original: string;
  amendedText?: string;
} | null> {
  const prompt = getGlobalWalkthroughAmendmentPrompt(
    section.sectionNumber,
    section.ownText,
    instruction,
    definitionSection,
    conversationContext,
  );

  try {
    const result = await generateTextWithJsonParsing('', prompt, { model: 'o3-mini' });

    if (result?.noChanges === true) {
      return {
        sectionNumber: section.sectionNumber,
        amended: false,
        original: section.ownText,
      };
    }

    if (result?.amendment) {
      return {
        sectionNumber: section.sectionNumber,
        amended: true,
        original: section.ownText,
        amendedText: result.amendment.amended,
      };
    }

    // Unexpected shape — treat as no changes
    logger.warn(
      { sectionNumber: section.sectionNumber, result },
      'Global walkthrough: unexpected LLM response shape'
    );
    return {
      sectionNumber: section.sectionNumber,
      amended: false,
      original: section.ownText,
    };
  } catch (error) {
    logger.error(
      {
        sectionNumber: section.sectionNumber,
        error: error instanceof Error ? error.message : error,
      },
      'Global walkthrough: section processing failed'
    );
    return null; // Skip failed sections
  }
}

// ============================================
// MAIN: GLOBAL WALKTHROUGH (PARALLEL)
// ============================================

/**
 * Processes every section in the document against a single global instruction,
 * in parallel batches. Returns `DraftingFormattedResults` in the same shape
 * as the targeted workflow so the frontend can render results identically.
 */
export async function globalWalkthroughParallel(
  structure: SectionNode[],
  instructionText: string,
  instructionId: string,
  definitionSection?: string,
  maxConcurrent: number = 3,
  conversationContext?: string,
): Promise<DraftingFormattedResults> {
  // Step 1: Collect all sections
  const allSections = collectAllSections(structure);

  logger.info(
    { totalSections: allSections.length, instructionId },
    'Global walkthrough: starting parallel processing'
  );

  // Step 2: Process in parallel batches
  const results: Array<{
    sectionNumber: string;
    amended: boolean;
    original: string;
    amendedText?: string;
  }> = [];

  for (let i = 0; i < allSections.length; i += maxConcurrent) {
    const batch = allSections.slice(i, i + maxConcurrent);

    const batchResults = await Promise.all(
      batch.map(section =>
        processSection(
          section,
          instructionText,
          instructionId,
          definitionSection,
          conversationContext,
        )
      )
    );

    for (const r of batchResults) {
      if (r !== null) {
        results.push(r);
      }
    }
  }

  // Step 3: Build DraftingFormattedResults
  const formatted: DraftingFormattedResults = {};

  const amendedResults = results.filter(r => r.amended);

  if (amendedResults.length === 0) {
    // No sections were amended — return a single not-found entry
    formatted[instructionId] = [
      {
        status: 'not-found',
        section_number: 'N/A',
        original_language:
          'No sections required changes for this instruction.',
      },
    ];
  } else {
    const entries = amendedResults.map(r => ({
      status: 'amended' as const,
      original_language: r.original,
      amended_language: r.amendedText ?? '',
      section_number: r.sectionNumber,
    }));

    // Sort by section number
    entries.sort((a, b) =>
      compareSectionNumbers(a.section_number, b.section_number)
    );

    formatted[instructionId] = entries;
  }

  logger.info(
    {
      totalSections: allSections.length,
      amendedCount: amendedResults.length,
      instructionId,
    },
    'Global walkthrough: processing complete'
  );

  return formatted;
}
