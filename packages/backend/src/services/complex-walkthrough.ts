import type { SectionNode } from '../types/documents';
import type { DraftingFormattedResults } from './drafting';
import { logger } from '../config/logger';
import { generateTextWithJsonParsing } from '../controllers/generate';
import {
  getComplexComprehensionPrompt,
  getComplexPlanningPrompt,
  getComplexSectionAmendmentPrompt,
} from '../controllers/complex-walkthrough-prompts';
import { buildSectionTree } from '../controllers/contract-review-prompts';
import { findSectionInOutline, buildSectionTextWithChildren } from './contract-review';
import { compareSectionNumbers } from './drafting';

// ============================================
// HELPERS
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// TYPES
// ============================================

interface ComprehensionResult {
  thinking: string[];
  rewrittenInstruction: string;
}

interface PlanEntry {
  sectionNumber: string;
  subInstruction: string;
  rationale: string;
}

interface ComplexPlan {
  summary: string;
  entries: PlanEntry[];
}

// ============================================
// PHASE 0: COMPREHENSION (INSTRUCTION REWRITING)
// ============================================

async function comprehendInstruction(
  structure: SectionNode[],
  instructionText: string,
  definitionSection?: string,
  conversationContext?: string,
): Promise<ComprehensionResult> {
  const fullDocumentText = buildSectionTree(structure);

  const prompt = getComplexComprehensionPrompt(
    fullDocumentText,
    instructionText,
    definitionSection,
    conversationContext,
  );

  logger.info(
    { prompt },
    'Complex walkthrough comprehension - Full prompt'
  );

  const result = await generateTextWithJsonParsing('', prompt, { model: 'o3-mini' });

  logger.info(
    { response: result },
    'Complex walkthrough comprehension - Full LLM response'
  );

  if (!result || !result.rewrittenInstruction) {
    throw new Error('Complex comprehension returned invalid result');
  }

  return {
    thinking: Array.isArray(result.thinking) ? result.thinking : [],
    rewrittenInstruction: result.rewrittenInstruction,
  };
}

// ============================================
// PHASE 1: GENERATE COMPLEX PLAN
// ============================================

async function generateComplexPlan(
  structure: SectionNode[],
  instructionText: string,
  definitionSection?: string,
  conversationContext?: string,
  rewrittenInstruction?: string,
): Promise<ComplexPlan> {
  const fullDocumentText = buildSectionTree(structure);

  const prompt = getComplexPlanningPrompt(
    fullDocumentText,
    instructionText,
    definitionSection,
    conversationContext,
    rewrittenInstruction,
  );

  logger.info(
    { prompt },
    'Complex walkthrough planning - Full prompt'
  );

  const result = await generateTextWithJsonParsing('', prompt, { model: 'o3-mini' });

  logger.info(
    { response: result },
    'Complex walkthrough planning - Full LLM response'
  );

  if (
    !result ||
    !Array.isArray(result.entries) ||
    result.entries.length === 0
  ) {
    throw new Error('Complex planning returned empty or invalid plan');
  }

  // Validate each entry has the required fields
  const validEntries: PlanEntry[] = [];
  for (const entry of result.entries) {
    if (entry.sectionNumber && entry.subInstruction) {
      validEntries.push({
        sectionNumber: entry.sectionNumber,
        subInstruction: entry.subInstruction,
        rationale: entry.rationale || '',
      });
    } else {
      logger.warn(
        { entry },
        'Complex planning: skipping plan entry with missing fields'
      );
    }
  }

  if (validEntries.length === 0) {
    throw new Error('Complex planning: no valid entries after validation');
  }

  return {
    summary: result.summary || '',
    entries: validEntries,
  };
}

// ============================================
// PHASE 2: PROCESS A SINGLE PLANNED SECTION
// ============================================

async function processComplexSection(
  sectionNumber: string,
  sectionText: string,
  subInstruction: string,
  originalInstruction: string,
  instructionId: string,
  definitionSection?: string,
  conversationContext?: string,
): Promise<{
  sectionNumber: string;
  amended: boolean;
  original: string;
  amendedText?: string;
} | null> {
  const prompt = getComplexSectionAmendmentPrompt(
    sectionNumber,
    sectionText,
    subInstruction,
    originalInstruction,
    definitionSection,
    conversationContext,
  );

  logger.info(
    { sectionNumber, prompt },
    'Complex walkthrough section amendment - Full prompt'
  );

  try {
    const result = await generateTextWithJsonParsing('', prompt, { model: 'o3-mini' });

    logger.info(
      { sectionNumber, response: result },
      'Complex walkthrough section amendment - Full LLM response'
    );

    if (result?.noChanges === true) {
      return {
        sectionNumber,
        amended: false,
        original: sectionText,
      };
    }

    if (result?.amendment) {
      return {
        sectionNumber,
        amended: true,
        original: sectionText,
        amendedText: result.amendment.amended,
      };
    }

    logger.warn(
      { sectionNumber, result },
      'Complex walkthrough: unexpected LLM response shape'
    );
    return {
      sectionNumber,
      amended: false,
      original: sectionText,
    };
  } catch (error) {
    logger.error(
      {
        sectionNumber,
        error: error instanceof Error ? error.message : error,
      },
      'Complex walkthrough: section processing failed'
    );
    return null;
  }
}

// ============================================
// PHASE 2: EXECUTE THE COMPLEX PLAN
// ============================================

async function executeComplexPlan(
  plan: ComplexPlan,
  structure: SectionNode[],
  instructionText: string,
  instructionId: string,
  definitionSection?: string,
  maxConcurrent: number = 3,
  conversationContext?: string,
): Promise<DraftingFormattedResults> {
  // Resolve each plan entry to its section text + sub-instruction
  const tasks: Array<{
    sectionNumber: string;
    sectionText: string;
    subInstruction: string;
    isNewSection: boolean;
  }> = [];

  for (const entry of plan.entries) {
    const isNewSection = entry.sectionNumber.startsWith('NEW-after-');

    if (isNewSection) {
      tasks.push({
        sectionNumber: entry.sectionNumber,
        sectionText: '',
        subInstruction: entry.subInstruction,
        isNewSection: true,
      });
    } else {
      const node = findSectionInOutline(entry.sectionNumber, structure);
      if (!node) {
        logger.warn(
          {
            sectionNumber: entry.sectionNumber,
            subInstruction: entry.subInstruction,
            availableSections: collectSectionNumbers(structure),
          },
          'Complex walkthrough: planned section not found in document, skipping'
        );
        continue;
      }
      const sectionText = buildSectionTextWithChildren(node);
      tasks.push({
        sectionNumber: entry.sectionNumber,
        sectionText,
        subInstruction: entry.subInstruction,
        isNewSection: false,
      });
    }
  }

  logger.info(
    {
      instructionId,
      resolvedTasks: tasks.length,
      skipped: plan.entries.length - tasks.length,
      taskSections: tasks.map(t => t.sectionNumber),
    },
    'Complex walkthrough: plan entries resolved to sections'
  );

  // Process in parallel batches
  const results: Array<{
    sectionNumber: string;
    amended: boolean;
    original: string;
    amendedText?: string;
    isNewSection: boolean;
  }> = [];

  for (let i = 0; i < tasks.length; i += maxConcurrent) {
    const batch = tasks.slice(i, i + maxConcurrent);

    const batchResults = await Promise.all(
      batch.map(async (task) => {
        const result = await processComplexSection(
          task.sectionNumber,
          task.sectionText,
          task.subInstruction,
          instructionText,
          instructionId,
          definitionSection,
          conversationContext,
        );
        if (result) {
          return { ...result, isNewSection: task.isNewSection };
        }
        return null;
      })
    );

    for (const r of batchResults) {
      if (r !== null) {
        results.push(r);
      }
    }
  }

  // Build DraftingFormattedResults
  const formatted: DraftingFormattedResults = {};
  const amendedResults = results.filter(r => r.amended);

  if (amendedResults.length === 0) {
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
      status: (r.isNewSection ? 'new-section' : 'amended') as 'amended' | 'new-section',
      original_language: r.original,
      amended_language: r.amendedText ?? '',
      section_number: r.sectionNumber,
    }));

    entries.sort((a, b) =>
      compareSectionNumbers(a.section_number, b.section_number)
    );

    formatted[instructionId] = entries;
  }

  return formatted;
}

// ============================================
// HELPER: COLLECT ALL SECTION NUMBERS (FOR LOGGING)
// ============================================

function collectSectionNumbers(nodes: SectionNode[]): string[] {
  const numbers: string[] = [];
  function traverse(nodeList: SectionNode[]): void {
    for (const node of nodeList) {
      numbers.push(node.sectionNumber);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  traverse(nodes);
  return numbers;
}

// ============================================
// MAIN: COMPLEX WALKTHROUGH (PARALLEL)
// ============================================

/**
 * Plan-then-execute workflow for complex instructions that require
 * coordinated changes across multiple sections.
 *
 * Phase 0: LLM comprehends the instruction in context and rewrites it.
 * Phase 1: LLM generates a plan identifying all sections to change.
 * Phase 2: Each planned section is amended individually in parallel batches.
 *
 * Uses findSectionInOutline + buildSectionTextWithChildren to resolve
 * section numbers to full subtree text (same as the targeted workflow).
 */
export async function complexWalkthroughParallel(
  structure: SectionNode[],
  instructionText: string,
  instructionId: string,
  definitionSection?: string,
  maxConcurrent: number = 3,
  conversationContext?: string,
  onThinking?: (step: string) => void,
): Promise<DraftingFormattedResults> {
  // Phase 0: Comprehension — understand the instruction in document context
  logger.info(
    { instructionId },
    'Complex walkthrough: comprehending instruction'
  );

  let rewrittenInstruction: string | undefined;
  try {
    const comprehension = await comprehendInstruction(
      structure,
      instructionText,
      definitionSection,
      conversationContext,
    );

    rewrittenInstruction = comprehension.rewrittenInstruction;

    logger.info(
      {
        instructionId,
        thinking: comprehension.thinking,
        rewrittenInstruction: comprehension.rewrittenInstruction,
      },
      'Complex walkthrough: comprehension complete'
    );

    // Drip-feed thinking steps to the frontend
    if (onThinking && comprehension.thinking.length > 0) {
      for (const step of comprehension.thinking) {
        onThinking(step);
        await sleep(500);
      }
    }
  } catch (error) {
    logger.warn(
      {
        instructionId,
        error: error instanceof Error ? error.message : error,
      },
      'Complex walkthrough: comprehension failed, proceeding with original instruction'
    );
    // Continue with original instruction — comprehension is best-effort
  }

  // Phase 1: Generate the plan
  logger.info(
    { instructionId },
    'Complex walkthrough: generating plan'
  );

  const plan = await generateComplexPlan(
    structure,
    instructionText,
    definitionSection,
    conversationContext,
    rewrittenInstruction,
  );

  logger.info(
    {
      instructionId,
      summary: plan.summary,
      plannedSections: plan.entries.length,
      entries: plan.entries.map(e => ({
        sectionNumber: e.sectionNumber,
        subInstruction: e.subInstruction,
        rationale: e.rationale,
      })),
    },
    'Complex walkthrough: plan generated'
  );

  // Phase 2: Execute the plan
  // Use the rewritten instruction for downstream context if available
  const effectiveInstruction = rewrittenInstruction || instructionText;

  logger.info(
    {
      instructionId,
      plannedSections: plan.entries.length,
    },
    'Complex walkthrough: executing plan'
  );

  const formattedResults = await executeComplexPlan(
    plan,
    structure,
    effectiveInstruction,
    instructionId,
    definitionSection,
    maxConcurrent,
    conversationContext,
  );

  const resultEntries = formattedResults[instructionId] || [];
  const amendedCount = resultEntries.filter(
    e => e.status === 'amended' || e.status === 'new-section'
  ).length;

  logger.info(
    {
      instructionId,
      plannedSections: plan.entries.length,
      amendedCount,
    },
    'Complex walkthrough: processing complete'
  );

  return formattedResults;
}
