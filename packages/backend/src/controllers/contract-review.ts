import type { Context } from 'hono';
import { logger } from '../config/logger';
import { createJob, setJobResult, setJobError, updateJobProgress } from '@/utils/jobStore';
import { mapRulesParallel, mapIRRulesParallel, extractSectionsWithRules, generateAmendmentsParallel, generateNewSections, generateInstructionRequestsParallel, findSectionInOutline, rerunAmendments, rerunInstructionRequests } from '../services/contract-review';
import { getExplanationPrompt, getInsertionLocationPrompt, getMissingLanguagePrompt, } from './contract-review-prompts';
import { generateTextWithJsonParsing, generateTextDirect } from './generate';
import type { SectionNode } from '@/types/documents';
import type { ReviewWithPlaybooksBody } from '@/types/contract-review';

interface RerunAmendmentRequestBody {
  sections: Array<{
    sectionNumber: string;
    sectionText: string;
    lockedParents: string[];
    rules: Array<{
      id: string;
      content: string;
      example?: string;
    }>;
    previousAttempts: string[];      // Section-level history
    currentMappedSections: string[]; // All sections these rules currently map to
  }>;
  structure: SectionNode[];
}

// ============================================
// REQUEST PARSER / VALIDATOR
// ============================================

function parseReviewWithPlaybooksRequest(body: any): ReviewWithPlaybooksBody {
  const { structure, rules } = body;

  if (!structure || !rules) {
    throw new Error('Missing required fields: structure, rules');
  }

  return { structure, rules };
}

// ============================================
// WORKFLOW FUNCTION 
// ============================================

async function runReviewWithPlaybooksWorkflow(
  body: ReviewWithPlaybooksBody,
  jobId: string
): Promise<{ success: true; formattedResults: any }> {
  const { structure, rules } = body;

  // Separate IR rules from CA rules
  const irRules = rules.filter(r => r.id.startsWith('IR'));
  const caRules = rules.filter(r => !r.id.startsWith('IR'));

  const TOTAL_STEPS = 5;

  logger.info({ 
    jobId,
    structureSections: structure.length, 
    rulesCount: rules.length 
  }, 'Review with Playbooks: Workflow started');

  // ========================================
  // STEP 1: MAP RULES TO SECTIONS (both CA and IR)
  // ========================================
  updateJobProgress(jobId, 1, TOTAL_STEPS, 'Mapping rules to sections');

  // Map CA rules
  const caMappingResult = caRules.length > 0 
    ? await mapRulesParallel(structure, caRules, 10, 3)
    : { annotatedOutline: structure, ruleStatus: [], newSections: [], processingOrder: [], summary: {} };
  
  const caSectionsWithRules = extractSectionsWithRules(caMappingResult.annotatedOutline);

  // Map IR rules (use IR-specific mapping that doesn't allow new sections)
  const irMappingResult = irRules.length > 0
    ? await mapIRRulesParallel(structure, irRules, 10, 3)
    : { annotatedOutline: structure, ruleStatus: [], newSections: [], processingOrder: [], summary: {} };
  
  const irSectionsWithRules = extractSectionsWithRules(irMappingResult.annotatedOutline);

  // ========================================
  // STEP 2: GENERATE AMENDMENTS (CA rules only)
  // ========================================
  updateJobProgress(jobId, 2, TOTAL_STEPS, 'Generating amendments');

  const [amendmentResults, newSectionResults] = await Promise.all([
    caSectionsWithRules.length > 0
      ? generateAmendmentsParallel(
          caSectionsWithRules, 
          caRules, 
          caMappingResult.processingOrder,
          structure,
          3
        )
      : Promise.resolve([]),
    
    caMappingResult.newSections.length > 0
      ? generateNewSections(
          caMappingResult.newSections,
          caRules,
          structure,
          3
        )
      : Promise.resolve([])
  ]);

  // ========================================
  // STEP 3: GENERATE INSTRUCTION REQUESTS (IR rules only)
  // ========================================
  updateJobProgress(jobId, 3, TOTAL_STEPS, 'Generating instruction requests');

  const instructionRequestResults = irSectionsWithRules.length > 0
    ? await generateInstructionRequestsParallel(
        irSectionsWithRules,
        irRules,
        3
      )
    : [];

  // ========================================
  // STEP 4: FORMAT RESULTS
  // ========================================
  updateJobProgress(jobId, 4, TOTAL_STEPS, 'Formatting results');

  const formattedResults = formatResultsForUI(
    amendmentResults,
    newSectionResults,
    instructionRequestResults,
    caMappingResult.ruleStatus,
    irMappingResult.ruleStatus,
    caRules,
    irRules,
    caMappingResult.annotatedOutline,
    irMappingResult.annotatedOutline
  );

  // ========================================
  // STEP 5: COMPLETE
  // ========================================
  updateJobProgress(jobId, 5, TOTAL_STEPS, 'Completing');

  logger.info({ jobId }, 'Review with Playbooks: Workflow completed successfully');

  return {
    success: true,
    formattedResults,
  };
}

// ============================================
// CONTROLLER (HTTP handler)
// ============================================

export const reviewWithPlaybooks = async (c: Context) => {

  try {
    // Parse and validate request
    const rawBody = await c.req.json();
    const body = parseReviewWithPlaybooksRequest(rawBody);

    // Get user context for job tracking
    const user = c.get('user') as { id: string; email: string; name: string | null } | undefined

    // Create job and return immediately
    const jobId = createJob({
      userId: user?.id,
      userEmail: user?.email,
      jobType: 'contract-review',
      jobName: 'Contract Review',
    });

    logger.info(
      {
        jobId,
        structureSections: body.structure.length,
        rulesCount: body.rules.length,
      },
      'Review with Playbooks: Job created, starting background processing'
    );

    // Run workflow in background 
    runReviewWithPlaybooksWorkflow(body, jobId)
      .then((result) => {
        setJobResult(jobId, result);
      })
      .catch((error) => {
        logger.error(
          {
            jobId,
            error: error instanceof Error
              ? { message: error.message, stack: error.stack }
              : error,
          },
          'Review with Playbooks: Background job failed'
        );
        setJobError(
          jobId,
          error instanceof Error ? error.message : 'Unknown error'
        );
      });

    return c.json({ jobId });

  } catch (error) {
    logger.error(
      {
        error: error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
      },
      'Review with Playbooks: Request validation failed'
    );

    return c.json(
      {
        success: false,
        error: 'Invalid request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      400
    );
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatResultsForUI(
  amendmentResults: any[],
  newSectionResults: any[],
  instructionRequestResults: any[],
  caRuleStatus: any[],
  irRuleStatus: any[],
  caRules: any[],
  irRules: any[],
  caAnnotatedOutline: any[],
  irAnnotatedOutline: any[]
): { [key: string]: any[] } {
  const formatted: { [key: string]: any[] } = {};

  // ============================================
  // PROCESS CA RULES (existing logic)
  // ============================================

  const mappedRuleLocations: { [ruleId: string]: string[] } = {};
  for (const status of caRuleStatus) {
    if (status.status === 'mapped' && status.locations) {
      mappedRuleLocations[status.ruleId] = status.locations;
    }
  }

  // Category 1: Recommended changes
  // Category 1 Type 1: Recommended changes to mapped sections
  for (const result of amendmentResults) {
    if (!result.success) continue;

    const sectionNumber = result.sectionNumber;
    if (result.result?.amendment) {
      const amendment = result.result.amendment;
      const appliedRules = amendment.appliedRules || [];

      for (const ruleId of appliedRules) {
        if (!formatted[ruleId]) formatted[ruleId] = [];
        formatted[ruleId].push({
          status: "amended",
          original_language: amendment.original,
          amended_language: amendment.amended,
          section_number: sectionNumber,
          isFullDeletion: amendment.isFullDeletion,
        });
      }

      // Category 2: No changes
      // Category 2 Type 1: Rules mapped but not applied  
      const rulesForThisSection = Object.entries(mappedRuleLocations)
        .filter(([_, locations]) => locations.includes(sectionNumber))
        .map(([ruleId, _]) => ruleId);

      const unusedRules = rulesForThisSection.filter(
        ruleId => !appliedRules.includes(ruleId)
      );

      for (const ruleId of unusedRules) {
        if (!formatted[ruleId]) formatted[ruleId] = [];
        const section = findSectionInOutline(sectionNumber, caAnnotatedOutline);
        const sectionText = section ? section.text : "Section text not available.";
        formatted[ruleId].push({
          status: "not-amended",
          section_number: sectionNumber,
          original_language: sectionText,
        });
      }
    }

    // Category 2 Type 2: Rules mapped and returned as "noChanges"
    else if (result.result?.noChanges === true) {
      const sectionNumber = result.sectionNumber;
      const rulesForThisSection = Object.entries(mappedRuleLocations)
        .filter(([_, locations]) => locations.includes(sectionNumber))
        .map(([ruleId, _]) => ruleId);

      for (const ruleId of rulesForThisSection) {
        if (!formatted[ruleId]) formatted[ruleId] = [];
        const section = findSectionInOutline(sectionNumber, caAnnotatedOutline);
        const sectionText = section ? section.text : "Section text not available.";
        formatted[ruleId].push({
          status: "not-amended",
          section_number: sectionNumber,
          original_language: sectionText,
        });
      }
    }
  }

  // Category 1 Type 2: Recommended changes to add new sections
  for (const result of newSectionResults) {
    if (!result.success) continue;

    if (result.result?.amendment) {
      const amendment = result.result.amendment;
      const appliedRules = amendment.appliedRules || [];

      for (const ruleId of appliedRules) {
        if (!formatted[ruleId]) formatted[ruleId] = [];
        formatted[ruleId].push({
          status: "new-section",  
          original_language: amendment.original,
          amended_language: amendment.amended,
          section_number: result.sectionNumber,
        });
      }
    }
  }

  // Category 3: Language not found (CA)
  for (const status of caRuleStatus) {
    if (status.status === 'not_applicable') {
      formatted[status.ruleId] = [{
        status: "not-found",
        section_number: "NOT FOUND",
        original_language: "The relevant language cannot be found. Please consider whether similar language should be added to your agreement.",
      }];
    }
  }

  // Category 4: Safety check - Missing CA rules
  for (const rule of caRules) {
    if (!formatted[rule.id]) {
      const statusEntry = caRuleStatus.find(s => s.ruleId === rule.id);
      if (!statusEntry) {
        formatted[rule.id] = [{
          status: "not-found",
          section_number: "ERROR",
          original_language: "Internal error: This rule was not processed. Please try again.",
        }];
      } else if (statusEntry.status === 'mapped') {
        const sectionNumber = statusEntry.locations?.[0] || "Unknown";
        const section = findSectionInOutline(sectionNumber, caAnnotatedOutline);
        const sectionText = section ? section.text : "Section text not available.";
        formatted[rule.id] = [{
          status: "not-amended",
          section_number: sectionNumber,
          original_language: sectionText,
        }];
      }
    }
  }

  // ============================================
  // PROCESS IR RULES
  // ============================================

  // Process instruction request results
  for (const sectionResult of instructionRequestResults) {
    if (!sectionResult || !sectionResult.success || !sectionResult.results) continue;

    for (const result of sectionResult.results) {
      if (!result || !result.ruleId) continue;
      
      const ruleId = result.ruleId;
      
      if (!formatted[ruleId]) formatted[ruleId] = [];
      formatted[ruleId].push({
        status: "instruction-request",
        section_number: sectionResult.sectionNumber,
        original_language: result.relevantLanguage || "",
        issue: result.issue || "Please review this section and provide confirmation or instruction.",
      });
    }
  }

  // IR rules: Language not found
  for (const status of irRuleStatus) {
    if (status.status === 'not_applicable') {
      if (!formatted[status.ruleId]) {
        formatted[status.ruleId] = [{
          status: "not-found",
          section_number: "NOT FOUND",
          original_language: "The relevant language cannot be found for this instruction request.",
        }];
      }
    }
  }

  // IR rules: Safety check - ensure all IR rules have results
  for (const rule of irRules) {
    if (!formatted[rule.id]) {
      const statusEntry = irRuleStatus.find(s => s.ruleId === rule.id);
      if (!statusEntry || statusEntry.status === 'not_applicable') {
        // Rule not found in document
        formatted[rule.id] = [{
          status: "not-found",
          section_number: "NOT FOUND",
          original_language: "The relevant language cannot be found for this instruction request.",
        }];
      } else if (statusEntry.status === 'mapped') {
        // Rule was mapped but somehow no instruction request generated (shouldn't happen)
        const sectionNumber = statusEntry.locations?.[0] || "Unknown";
        const section = findSectionInOutline(sectionNumber, irAnnotatedOutline);
        const sectionText = section ? section.text : "Section text not available.";
        formatted[rule.id] = [{
          status: "instruction-request",
          section_number: sectionNumber,
          original_language: sectionText,
          issue: "Please review this section and provide confirmation or instruction.",
        }];
        logger.warn({ ruleId: rule.id, sectionNumber }, 'IR rule was mapped but had no instruction request result');
      }
    }
  }

  // ============================================
  // SORT ALL RESULTS
  // ============================================

  for (const ruleId of Object.keys(formatted)) {
    if (formatted[ruleId]) {
      formatted[ruleId].sort((a, b) => {
        return compareSectionNumbers(a.section_number, b.section_number);
      });
    }
  }

  return formatted;
}

function compareSectionNumbers(a: string, b: string): number {
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
// OTHER ENDPOINTS
// ============================================

export const explainUnappliedRule = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { sectionText, rule } = body;

    logger.info({ ruleId: rule.id }, 'Explaining unapplied rule');
    
    const prompt = getExplanationPrompt(sectionText, rule);
  
    const response = await generateTextDirect(
      "",
      prompt,
      {
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 500,
      }
    );

    const explanation = response.trim();

    return c.json({ explanation });
  } catch (error) {
    logger.error({ error }, 'Failed to explain unapplied rule');
    return c.json(
      {
        error: 'Failed to explain unapplied rule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
};

// Handle missing language (generate, locate, create diff)
export const handleMissingLanguage = async(c: Context) => {
  try {
    const body = await c.req.json();
    const { rule, exampleLanguage, documentOutline, fullDocumentText } = body;

    logger.info({
      ruleLength: rule.length,
      exampleLanguageLength: exampleLanguage.length,
    }, 'Handling missing language')

    // STEP 1: Generate missing language
    const { proposedLanguage, suggestedHeading } = await generateMissingLanguage(
      rule,
      exampleLanguage,
      c
    )

    // STEP 2: Find insertion location
    const { afterSection, newSectionNumber } = await findInsertionLocation(
      proposedLanguage,
      suggestedHeading || 'New Section',
      documentOutline,
      c
    )

    // STEP 3: Get section text 
    const sectionBefore = getSectionText(
      afterSection,
      documentOutline,
      fullDocumentText
    )

    // STEP 4: Create before/after for diff (simplified format)
    const beforeAfter = createBeforeAfter(
      sectionBefore.sectionText,
      proposedLanguage,
      suggestedHeading,
      newSectionNumber
    )

    logger.info({
      afterSection,
      newSectionNumber,
    }, 'Missing language handled successfully')

    return c.json({
      proposedLanguage,
      suggestedHeading,
      afterSection,
      newSectionNumber,
      beforeAfter // Simplified: before = section text, after = section + new section
    })
  } catch (error) {
    logger.error({ error }, 'Failed to handle missing language')
    return c.json(
      {
        error: 'Failed to handle missing language',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    )
  }
}

async function generateMissingLanguage(
  rule: string,
  exampleLanguage: string,
  context?: Context
): Promise<{ proposedLanguage: string; suggestedHeading: string }> {
  const prompt = getMissingLanguagePrompt(rule, exampleLanguage);
  const response = await generateTextWithJsonParsing(
    "",
    prompt,
    { model: 'o3' }
  );

  return {
    proposedLanguage: response.proposedLanguage || '',
    suggestedHeading: response.suggestedHeading || 'New Section'
  }
}

/**
 * STEP 2: Find insertion location using outline only 
 */
export async function findInsertionLocation(
  proposedLanguage: string,
  suggestedHeading: string,
  documentOutline: SectionNode[],
  context?: Context
): Promise<{
  afterSection: string
  newSectionNumber: string
}> {
  const outlineText = buildOutlineText(documentOutline)
  const prompt = getInsertionLocationPrompt(outlineText, suggestedHeading, proposedLanguage);
  const response = await generateTextWithJsonParsing(
    "",
    prompt,
    { model: 'gpt-4o' }
  );

  // Ensure correct numbering format (add A suffix if LLM didn't)
  let newSectionNumber = response.newSectionNumber
  const afterSection = response.afterSection
  
  if (!newSectionNumber || newSectionNumber === afterSection) {
    // LLM didn't add the A suffix, so we add it
    newSectionNumber = afterSection.replace(/\.$/, '') + 'A'
  }

  return {
    afterSection,
    newSectionNumber
  }
}

/**
 * STEP 3: Get FULL section text before insertion point
 */
export function getSectionText(
  afterSection: string,
  documentOutline: SectionNode[],
  fullDocumentText: string
): {
  sectionNumber: string
  sectionHeading: string
  sectionText: string
} {
  const section = findSectionInOutline(afterSection, documentOutline)
  
  if (!section) {
    throw new Error(`Section ${afterSection} not found in document outline`)
  }

  // Extract the FULL section text from the document
  const sectionText = extractSectionTextFromDocument(section, fullDocumentText)

  return {
    sectionNumber: section.sectionNumber,
    sectionHeading: section.text,
    sectionText // Full text, not just heading
  }
}

// Helper: Extract actual section text from full document
function extractSectionTextFromDocument(section: SectionNode, fullText: string): string {
  // Try to find the section by its number and heading
  const sectionPattern = new RegExp(
    `${escapeRegExp(section.sectionNumber)}\\s+${escapeRegExp(section.text)}\\s*([\\s\\S]*?)(?=\\n\\d+\\.\\d*\\s+[A-Z]|\\n\\d+\\.\\s+[A-Z]|$)`,
    'i'
  )
  
  const match = fullText.match(sectionPattern)
  if (match && match[1]) {
    return `${section.sectionNumber} ${section.text}\n${match[1].trim()}`
  }

  // Fallback: just return the heading
  return `${section.sectionNumber} ${section.text}`
}

// Helper: Escape regex special characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * STEP 4: Create before/after for diff (simplified format)
 */
export function createBeforeAfter(
  afterSectionText: string,
  proposedLanguage: string,
  suggestedHeading: string,
  newSectionNumber: string
): {
  before: string
  after: string
} {
  // Before: Just the section before insertion
  const before = afterSectionText

  // After: Section before + new section
  const after = `${afterSectionText}\n\n${newSectionNumber} ${suggestedHeading}\n${proposedLanguage}`

  return { before, after }
}

// Helper: Build outline text (headings only)
function buildOutlineText(nodes: SectionNode[], indent = 0): string {
  let result = ''
  for (const node of nodes) {
    const indentStr = '  '.repeat(indent)
    result += `${indentStr}${node.sectionNumber} ${node.text}\n`
    if (node.children && node.children.length > 0) {
      result += buildOutlineText(node.children, indent + 1)
    }
  }
  return result
}

// ============================================
// RE-RUN AMENDMENTS ENDPOINT
// ============================================

export const rerunAmendmentsEndpoint = async (c: Context) => {
  try {
    const body: RerunAmendmentRequestBody = await c.req.json();

    // Validate request
    if (!body.sections || !Array.isArray(body.sections) || body.sections.length === 0) {
      return c.json(
        { success: false, error: 'Missing or empty sections array' },
        400
      );
    }

    if (!body.structure || !Array.isArray(body.structure)) {
      return c.json(
        { success: false, error: 'Missing structure array' },
        400
      );
    }

    // Validate each section
    for (const section of body.sections) {
      if (!section.sectionNumber || !section.sectionText || !section.rules || section.rules.length === 0) {
        return c.json(
          { success: false, error: 'Each section must have sectionNumber, sectionText, and at least one rule' },
          400
        );
      }
      if (!section.previousAttempts || !Array.isArray(section.previousAttempts) || section.previousAttempts.length === 0) {
        return c.json(
          { success: false, error: 'Each section must have at least one previous attempt' },
          400
        );
      }
    }

    logger.info({
      sectionCount: body.sections.length,
      sections: body.sections.map(s => ({
        sectionNumber: s.sectionNumber,
        ruleCount: s.rules.length,
        previousAttemptsCount: s.previousAttempts.length
      })),
    }, 'Re-run amendments: Request received');

    // Call the service function
    const result = await rerunAmendments({
      sections: body.sections.map(section => ({
        sectionNumber: section.sectionNumber,
        sectionText: section.sectionText,
        lockedParents: section.lockedParents || [],
        rules: section.rules,
        previousAttempts: section.previousAttempts,
        currentMappedSections: section.currentMappedSections || [],
      })),
      structure: body.structure,
    });

    logger.info({
      successCount: result.results.filter(r => r.success).length,
      totalCount: result.results.length,
    }, 'Re-run amendments: Complete');

    return c.json({
      success: true,
      results: result.results,
    });

  } catch (error) {
    logger.error(
      {
        error: error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
      },
      'Re-run amendments: Failed'
    );

    return c.json(
      {
        success: false,
        error: 'Failed to process re-run request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
};

// ============================================
// RE-RUN INSTRUCTION REQUESTS ENDPOINT
// ============================================

interface RerunInstructionRequestRequestBody {
  sections: Array<{
    sectionNumber: string;
    sectionText: string;
    rules: Array<{
      id: string;
      content: string;
    }>;
    previousAttempts: string[];
    currentMappedSections: string[];
  }>;
  structure: SectionNode[];
}

export const rerunInstructionRequestsEndpoint = async (c: Context) => {
  try {
    const body: RerunInstructionRequestRequestBody = await c.req.json();

    if (!body.sections || !Array.isArray(body.sections) || body.sections.length === 0) {
      return c.json(
        { success: false, error: 'Missing or empty sections array' },
        400
      );
    }

    if (!body.structure || !Array.isArray(body.structure)) {
      return c.json(
        { success: false, error: 'Missing structure array' },
        400
      );
    }

    for (const section of body.sections) {
      if (!section.sectionNumber || !section.sectionText || !section.rules || section.rules.length === 0) {
        return c.json(
          { success: false, error: 'Each section must have sectionNumber, sectionText, and at least one rule' },
          400
        );
      }
      if (!section.previousAttempts || !Array.isArray(section.previousAttempts) || section.previousAttempts.length === 0) {
        return c.json(
          { success: false, error: 'Each section must have at least one previous attempt' },
          400
        );
      }
    }

    logger.info({
      sectionCount: body.sections.length,
      sections: body.sections.map(s => ({
        sectionNumber: s.sectionNumber,
        ruleCount: s.rules.length,
        previousAttemptsCount: s.previousAttempts.length
      })),
    }, 'Re-run instruction requests: Request received');

    const result = await rerunInstructionRequests({
      sections: body.sections.map(section => ({
        sectionNumber: section.sectionNumber,
        sectionText: section.sectionText,
        rules: section.rules,
        previousAttempts: section.previousAttempts,
        currentMappedSections: section.currentMappedSections || [],
      })),
      structure: body.structure,
    });

    logger.info({
      successCount: result.results.filter(r => r.success).length,
      totalCount: result.results.length,
    }, 'Re-run instruction requests: Complete');

    return c.json({
      success: true,
      results: result.results,
    });

  } catch (error) {
    logger.error(
      {
        error: error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
      },
      'Re-run instruction requests: Failed'
    );

    return c.json(
      {
        success: false,
        error: 'Failed to process re-run request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
};

export const contractReviewController = {
  reviewWithPlaybooks,
  explainUnappliedRule,
  handleMissingLanguage,
  rerunAmendmentsEndpoint,
  rerunInstructionRequestsEndpoint,
};