import type { SectionNode } from '../types/documents';
import type { Rule } from '../types/contract-review';
import { logger } from '../config/logger';
import { updateJobProgress, addJobThinkingStep } from '@/utils/jobStore';
import {
  mapRulesParallel,
  extractSectionsWithRules,
  generateAmendmentsParallel,
  generateNewSections,
  findSectionInOutline,
} from './contract-review';
import { triageInstruction } from './instruction-triage';
import { globalWalkthroughParallel } from './global-walkthrough';
import { complexWalkthroughParallel } from './complex-walkthrough';

// ============================================
// TYPES
// ============================================

export interface PromptSuggestion {
  id: string;
  prompt: string;
}

export interface ConversationHistoryEntry {
  instructions: string;
  amendedSections: Array<{
    sectionNumber: string;
    status: 'amended' | 'not-amended' | 'new-section' | 'not-found';
  }>;
}

export interface DraftWithInstructionsBody {
  structure: SectionNode[];
  instructions: string;
  selectedPrompts: PromptSuggestion[];
  conversationHistory?: ConversationHistoryEntry[];
  definitionSection?: string;
}

interface DraftingSectionChange {
  status: 'amended' | 'not-amended' | 'new-section' | 'not-found';
  original_language: string;
  amended_language?: string;
  section_number: string;
  isFullDeletion?: boolean;
}

export interface DraftingFormattedResults {
  [instructionId: string]: DraftingSectionChange[];
}

// ============================================
// PARSE INSTRUCTIONS TO RULES
// ============================================

export function parseInstructionsToRules(
  instructionText: string,
  selectedPrompts: PromptSuggestion[]
): Rule[] {
  const rules: Rule[] = [];

  // Split instructions by newlines and filter empty lines
  const lines = instructionText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line) {
      rules.push({
        id: `inst-${i + 1}`,
        content: line,
        example: '',
      });
    }
  }

  // Append selected prompt suggestions as additional rules
  for (const prompt of selectedPrompts) {
    rules.push({
      id: `prompt-${prompt.id}`,
      content: prompt.prompt,
      example: '',
    });
  }

  return rules;
}

// ============================================
// FORMAT RESULTS FOR UI
// ============================================

function formatResultsForUI(
  amendmentResults: Array<{ sectionNumber: string; result: any; success: boolean; error?: string }>,
  newSectionResults: Array<{ sectionNumber: string; result: any; success: boolean; error?: string }>,
  ruleStatus: any[],
  rules: Rule[],
  annotatedOutline: SectionNode[]
): DraftingFormattedResults {
  const formatted: DraftingFormattedResults = {};

  // Build a map of rule -> locations
  const mappedRuleLocations: { [ruleId: string]: string[] } = {};
  for (const status of ruleStatus) {
    if (status.status === 'mapped' && status.locations) {
      mappedRuleLocations[status.ruleId] = status.locations;
    }
  }

  // Process amendment results
  for (const result of amendmentResults) {
    if (!result.success) continue;

    const sectionNumber = result.sectionNumber;
    if (result.result?.amendment) {
      const amendment = result.result.amendment;
      const appliedRules = amendment.appliedRules || [];

      for (const ruleId of appliedRules) {
        if (!formatted[ruleId]) formatted[ruleId] = [];
        formatted[ruleId].push({
          status: 'amended',
          original_language: amendment.original,
          amended_language: amendment.amended,
          section_number: sectionNumber,
          isFullDeletion: amendment.isFullDeletion,
        });
      }

      // Rules mapped but not applied to this section
      const rulesForThisSection = Object.entries(mappedRuleLocations)
        .filter(([_, locations]) => locations.includes(sectionNumber))
        .map(([ruleId]) => ruleId);

      const unusedRules = rulesForThisSection.filter(
        ruleId => !appliedRules.includes(ruleId)
      );

      for (const ruleId of unusedRules) {
        if (!formatted[ruleId]) formatted[ruleId] = [];
        const section = findSectionInOutline(sectionNumber, annotatedOutline);
        const sectionText = section ? section.text : 'Section text not available.';
        formatted[ruleId].push({
          status: 'not-amended',
          section_number: sectionNumber,
          original_language: sectionText,
        });
      }
    } else if (result.result?.noChanges === true) {
      const rulesForThisSection = Object.entries(mappedRuleLocations)
        .filter(([_, locations]) => locations.includes(sectionNumber))
        .map(([ruleId]) => ruleId);

      for (const ruleId of rulesForThisSection) {
        if (!formatted[ruleId]) formatted[ruleId] = [];
        const section = findSectionInOutline(sectionNumber, annotatedOutline);
        const sectionText = section ? section.text : 'Section text not available.';
        formatted[ruleId].push({
          status: 'not-amended',
          section_number: sectionNumber,
          original_language: sectionText,
        });
      }
    }
  }

  // Process new section results
  for (const result of newSectionResults) {
    if (!result.success) continue;

    if (result.result?.amendment) {
      const amendment = result.result.amendment;
      const appliedRules = amendment.appliedRules || [];

      for (const ruleId of appliedRules) {
        if (!formatted[ruleId]) formatted[ruleId] = [];
        formatted[ruleId].push({
          status: 'new-section',
          original_language: amendment.original,
          amended_language: amendment.amended,
          section_number: result.sectionNumber,
        });
      }
    }
  }

  // Rules with no applicable language found
  for (const status of ruleStatus) {
    if (status.status === 'not_applicable') {
      formatted[status.ruleId] = [{
        status: 'not-found',
        section_number: 'NOT FOUND',
        original_language: 'The relevant language cannot be found. Please consider whether similar language should be added to your agreement.',
      }];
    }
  }

  // Safety check: ensure every rule has results
  for (const rule of rules) {
    if (!formatted[rule.id]) {
      const statusEntry = ruleStatus.find((s: any) => s.ruleId === rule.id);
      if (!statusEntry) {
        formatted[rule.id] = [{
          status: 'not-found',
          section_number: 'ERROR',
          original_language: 'Internal error: This instruction was not processed. Please try again.',
        }];
      } else if (statusEntry.status === 'mapped') {
        const sectionNumber = statusEntry.locations?.[0] || 'Unknown';
        const section = findSectionInOutline(sectionNumber, annotatedOutline);
        const sectionText = section ? section.text : 'Section text not available.';
        formatted[rule.id] = [{
          status: 'not-amended',
          section_number: sectionNumber,
          original_language: sectionText,
        }];
      }
    }
  }

  // Sort results by section number
  for (const ruleId of Object.keys(formatted)) {
    if (formatted[ruleId]) {
      formatted[ruleId].sort((a, b) => compareSectionNumbers(a.section_number, b.section_number));
    }
  }

  return formatted;
}

export function compareSectionNumbers(a: string, b: string): number {
  const parseSection = (s: string): { base: number[]; isAfter: boolean } => {
    const afterMatch = s.match(/After Section ([\d.]+)/i);
    if (afterMatch && afterMatch[1]) {
      const parts = afterMatch[1].replace(/\.$/, '').split('.').map(Number);
      return { base: parts, isAfter: true };
    }
    const parts = s.replace(/\.$/, '').split('.').map(Number);
    return { base: parts, isAfter: false };
  };

  const aParsed = parseSection(a);
  const bParsed = parseSection(b);

  const maxLen = Math.max(aParsed.base.length, bParsed.base.length);
  for (let i = 0; i < maxLen; i++) {
    const aNum = aParsed.base[i] || 0;
    const bNum = bParsed.base[i] || 0;
    if (aNum !== bNum) return aNum - bNum;
  }

  if (aParsed.isAfter !== bParsed.isAfter) {
    return aParsed.isAfter ? 1 : -1;
  }

  return 0;
}

// ============================================
// MAIN WORKFLOW
// ============================================

function buildConversationContext(history: ConversationHistoryEntry[]): string {
  if (!history || history.length === 0) return '';

  const turns = history.map((entry, i) => {
    const amended = entry.amendedSections
      .filter(s => s.status === 'amended' || s.status === 'new-section')
      .map(s => `Section ${s.sectionNumber} (${s.status === 'new-section' ? 'new' : 'amended'})`)
      .join(', ');
    const summary = amended || 'no sections changed';
    return `Turn ${i + 1}: "${entry.instructions}" → ${summary}`;
  });

  return `[CONVERSATION HISTORY - The user has previously given the following drafting instructions in this session. Take them into account to maintain consistency and avoid contradicting previous changes.\n${turns.join('\n')}\n]\n\n`;
}

export async function draftWithInstructions(
  structure: SectionNode[],
  instructions: string,
  selectedPrompts: PromptSuggestion[],
  jobId: string,
  conversationHistory?: ConversationHistoryEntry[],
  definitionSection?: string,
): Promise<{ success: true; formattedResults: DraftingFormattedResults }> {
  const TOTAL_STEPS = 5;

  // Step 1: Parse instructions to rules
  updateJobProgress(jobId, 1, TOTAL_STEPS, 'Parsing instructions');

  const rules = parseInstructionsToRules(instructions, selectedPrompts);

  // Build conversation context for the amendment step (not mapping — mapping
  // should be purely based on the instruction text to avoid wrong section matches)
  const conversationContext = buildConversationContext(conversationHistory || []) || undefined;

  logger.info({
    jobId,
    rulesCount: rules.length,
    structureSections: structure.length,
  }, 'Drafting: Instructions parsed to rules');

  // Step 2: Triage — classify instruction as global or targeted
  updateJobProgress(jobId, 2, TOTAL_STEPS, 'Classifying instruction type');

  let instructionType: 'global' | 'targeted' | 'complex' = 'targeted';
  try {
    instructionType = await triageInstruction(instructions);
  } catch (error) {
    logger.warn(
      { jobId, error: error instanceof Error ? error.message : error },
      'Drafting: Triage failed, defaulting to targeted'
    );
  }

  logger.info(
    { jobId, instructionType, instructions },
    `Drafting: Triage classified instruction as "${instructionType}" → using ${instructionType === 'global' ? 'GLOBAL WALKTHROUGH workflow (process every section)' : instructionType === 'complex' ? 'COMPLEX WALKTHROUGH workflow (plan then execute)' : 'TARGETED workflow (map rules to specific sections)'}`
  );

  // Branch: global walkthrough vs. targeted (existing) workflow
  if (instructionType === 'global') {
    // Step 3: Global walkthrough — process every section
    updateJobProgress(jobId, 3, TOTAL_STEPS, 'Processing all sections (global walkthrough)');

    // Use the first rule's id as the instruction id for result grouping
    const instructionId = (rules.length > 0 && rules[0]) ? rules[0].id : 'inst-1';

    const formattedResults = await globalWalkthroughParallel(
      structure,
      instructions,
      instructionId,
      definitionSection,
      3,
      conversationContext,
    );

    updateJobProgress(jobId, 5, TOTAL_STEPS, 'Complete');

    logger.info({ jobId }, 'Drafting: Global walkthrough completed successfully');

    return {
      success: true,
      formattedResults,
    };
  }

  // Branch: complex walkthrough (plan-then-execute)
  if (instructionType === 'complex') {
    updateJobProgress(jobId, 3, TOTAL_STEPS, 'Analyzing instruction and planning multi-section changes');

    const instructionId = (rules.length > 0 && rules[0]) ? rules[0].id : 'inst-1';

    try {
      const onThinking = (step: string) => addJobThinkingStep(jobId, step);

      const formattedResults = await complexWalkthroughParallel(
        structure,
        instructions,
        instructionId,
        definitionSection,
        3,
        conversationContext,
        onThinking,
      );

      updateJobProgress(jobId, 5, TOTAL_STEPS, 'Complete');

      logger.info({ jobId }, 'Drafting: Complex walkthrough completed successfully');

      return {
        success: true,
        formattedResults,
      };
    } catch (error) {
      logger.warn(
        { jobId, error: error instanceof Error ? error.message : error },
        'Drafting: Complex walkthrough failed, falling back to targeted workflow'
      );
      // Fall through to targeted workflow
    }
  }

  // ---- Targeted workflow (existing) ----

  // Step 3: Map rules to sections
  updateJobProgress(jobId, 3, TOTAL_STEPS, 'Mapping instructions to document sections');

  const mappingResult = await mapRulesParallel(
    structure,
    rules,
    10,   // batchSize
    3,    // maxConcurrent
    undefined,  // context
    false,      // useEnhancedPrompts - not needed for drafting
    false       // enableSecondPass - not needed for drafting
  );

  const sectionsWithRules = extractSectionsWithRules(mappingResult.annotatedOutline);

  logger.info({
    jobId,
    mappedRules: mappingResult.summary.mappedRules,
    notApplicable: mappingResult.summary.notApplicableRules,
    needsNewSection: mappingResult.summary.needsNewSection,
    sectionsToProcess: sectionsWithRules.length,
  }, 'Drafting: Rule mapping complete');

  // Step 4: Generate amendments
  updateJobProgress(jobId, 4, TOTAL_STEPS, 'Generating amendments');

  const [amendmentResults, newSectionResults] = await Promise.all([
    sectionsWithRules.length > 0
      ? generateAmendmentsParallel(
          sectionsWithRules,
          rules,
          mappingResult.processingOrder,
          structure,
          3,
          undefined,  // context (Hono)
          conversationContext
        )
      : Promise.resolve([]),

    mappingResult.newSections.length > 0
      ? generateNewSections(
          mappingResult.newSections,
          rules,
          structure,
          3,
          undefined,  // context (Hono)
          conversationContext
        )
      : Promise.resolve([]),
  ]);

  // Step 5: Format results
  updateJobProgress(jobId, 5, TOTAL_STEPS, 'Formatting results');

  const formattedResults = formatResultsForUI(
    amendmentResults,
    newSectionResults,
    mappingResult.ruleStatus,
    rules,
    mappingResult.annotatedOutline
  );

  logger.info({ jobId }, 'Drafting: Workflow completed successfully');

  return {
    success: true,
    formattedResults,
  };
}
