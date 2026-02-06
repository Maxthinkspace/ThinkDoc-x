import type { Context } from 'hono';
import type { SectionNode } from '../types/documents';
import type { Rule, RuleStatus, NewSectionLocation } from '../types/contract-review';
import { logger } from '../config/logger';
import { getRuleMappingPrompt, getAmendmentsPrompt, getNewSectionsPrompt } from '../controllers/contract-review-prompts';
import { enhancedGetRuleMappingPrompt} from '../controllers/review-with-precedents-prompts';
import { getIRRuleMappingPrompt } from '../controllers/contract-review-prompts';
import { generateTextWithJsonParsing } from '../controllers/generate';
import { ParsedRuleMappingResponse, parseRuleMappingResponse, parseIRRuleMappingResponse, parseAmendmentsResponse, stripSectionNumber } from '../controllers/parsers';

// =============Function for Logging=================//

function truncateDocumentOutline(prompt: string, maxOutlineWords: number = 100): string {
  // Find the document outline section and truncate only that part
  const outlineStartMarkers = ['# DOCUMENT OUTLINE', '# CONTEXT:'];
  const outlineEndMarkers = ['# RULES', '# INSERTION POINT', '# YOUR TASK', '# SECTIONS'];
  
  let result = prompt;
  
  for (const startMarker of outlineStartMarkers) {
    const startIdx = prompt.indexOf(startMarker);
    if (startIdx === -1) continue;
    
    let endIdx = prompt.length;
    for (const endMarker of outlineEndMarkers) {
      const idx = prompt.indexOf(endMarker, startIdx + startMarker.length);
      if (idx !== -1 && idx < endIdx) {
        endIdx = idx;
      }
    }
    
    const beforeOutline = prompt.substring(0, startIdx + startMarker.length);
    const outlineContent = prompt.substring(startIdx + startMarker.length, endIdx);
    const afterOutline = prompt.substring(endIdx);
    
    const outlineWords = outlineContent.split(/\s+/);
    if (outlineWords.length > maxOutlineWords) {
      const truncatedOutline = outlineWords.slice(0, maxOutlineWords).join(' ') + '\n... [DOCUMENT OUTLINE TRUNCATED] ...\n';
      result = beforeOutline + '\n' + truncatedOutline + '\n' + afterOutline;
    }
    
    break;
  }
  
  return result;
}

// =============End of Function for Logging=================//

interface MapRulesRequest {
  structure: SectionNode[];
  rules: Rule[];
  batchNumber: number;
  startRule: number;
  endRule: number;
}

interface MapRulesResponse {
  annotatedOutline: SectionNode[];
  ruleStatus: any[];
  newSections: any[];
  processingOrder: string[];
  summary: any;
}

interface GenerateAmendmentsRequest {
  sectionNumber: string;
  sectionText: string;
  lockedParents: string[];
  rules: Rule[];
  previousAttempts?: string[];  // For rerun - section-level history
}

interface GenerateAmendmentsResponse {
  noChanges?: boolean;
  amendment?: {
    original: string;
    amended: string;
    appliedRules: string[];
  };
}

interface EnhancedMappingResult {
  additionalMappings: Array<{
    ruleId?: string;
    ruleIndex?: number;
    additionalLocations: string[];
  }>;
}

export async function mapRulesParallel(
  structure: SectionNode[],
  rules: Rule[],
  batchSize: number = 10,
  maxConcurrent: number = 3,
  context?: Context, 
  useEnhancedPrompts: boolean = false,
  enableSecondPass: boolean = true
): Promise<MapRulesResponse> {
  logger.info({ totalRules: rules.length, batchSize, maxConcurrent, enableSecondPass }, 'Starting parallel rule mapping');
  const batches: MapRulesRequest[] = [];
  for (let i = 0; i < rules.length; i += batchSize) {
    batches.push({
      structure,
      rules: rules.slice(i, i + batchSize),
      batchNumber: Math.floor(i / batchSize) + 1,
      startRule: i + 1,
      endRule: Math.min(i + batchSize, rules.length),
    });
  }

  const results: ParsedRuleMappingResponse[] = [];
  for (let i = 0; i < batches.length; i += maxConcurrent) {
    const batchGroup = batches.slice(i, i + maxConcurrent);
    const promises = batchGroup.map(batch => mapRulesBatch(batch, context, useEnhancedPrompts));
    const groupResults = await Promise.all(promises);
    results.push(...groupResults);
    
    logger.info({ completed: results.length, total: batches.length }, 'Batch group completed');
  }

  const firstPassResult = mergeMapRulesResults(results, structure);

  if (!enableSecondPass) {
    return firstPassResult;
  }

  // Second pass: find additional mappings
  const enhancedRuleStatus = await mapRulesSecondPass(
    structure,
    rules,
    firstPassResult.ruleStatus,
    batchSize,
    maxConcurrent
  );

  // Re-merge with enhanced status
  return {
    ...firstPassResult,
    ruleStatus: enhancedRuleStatus,
    annotatedOutline: annotateOutline(structure, enhancedRuleStatus),
    processingOrder: calculateProcessingOrder(structure, enhancedRuleStatus),
    summary: {
      mappedRules: enhancedRuleStatus.filter((s) => s.status === 'mapped').length,
      notApplicableRules: enhancedRuleStatus.filter((s) => s.status === 'not_applicable').length,
      needsNewSection: enhancedRuleStatus.filter((s) => s.status === 'needs_new_section').length,
    },
  };
}

export async function mapIRRulesParallel(
  structure: SectionNode[],
  rules: Rule[],
  batchSize: number = 10,
  maxConcurrent: number = 3,
  context?: Context,
  enableSecondPass: boolean = true
): Promise<MapRulesResponse> {
  logger.info({ totalRules: rules.length, batchSize, maxConcurrent, enableSecondPass }, 'Starting parallel IR rule mapping');

  const batches: MapRulesRequest[] = [];
  for (let i = 0; i < rules.length; i += batchSize) {
    batches.push({
      structure,
      rules: rules.slice(i, i + batchSize),
      batchNumber: Math.floor(i / batchSize) + 1,
      startRule: i + 1,
      endRule: Math.min(i + batchSize, rules.length),
    });
  }

  const results: ParsedRuleMappingResponse[] = [];
  for (let i = 0; i < batches.length; i += maxConcurrent) {
    const batchGroup = batches.slice(i, i + maxConcurrent);
    const promises = batchGroup.map(batch => mapIRRulesBatch(batch, context));
    const groupResults = await Promise.all(promises);
    results.push(...groupResults);
    
    logger.info({ completed: results.length, total: batches.length }, 'IR batch group completed');
  }

  const firstPassResult = mergeIRMapRulesResults(results, structure);

  if (!enableSecondPass) {
    return firstPassResult;
  }

  // Second pass: find additional mappings for IR rules
  const enhancedRuleStatus = await mapIRRulesSecondPass(
    structure,
    rules,
    firstPassResult.ruleStatus,
    batchSize,
    maxConcurrent
  );

  return {
    ...firstPassResult,
    ruleStatus: enhancedRuleStatus,
    annotatedOutline: annotateOutline(structure, enhancedRuleStatus),
    processingOrder: calculateProcessingOrder(structure, enhancedRuleStatus),
    summary: {
      mappedRules: enhancedRuleStatus.filter((s) => s.status === 'mapped').length,
      notApplicableRules: enhancedRuleStatus.filter((s) => s.status === 'not_applicable').length,
      needsNewSection: 0,
    },
  };
}

async function mapIRRulesBatch(
  request: MapRulesRequest,
  context?: Context
): Promise<ParsedRuleMappingResponse> {
  const prompt = getIRRuleMappingPrompt(request.structure, request.rules);
  
  const truncatedPrompt = truncateDocumentOutline(prompt, 100);
  logger.info({ 
    batchNumber: request.batchNumber,
    ruleIds: request.rules.map(r => r.id),
    prompt: truncatedPrompt 
  }, 'IR Rules Mapping - Full prompt');

  const response = await generateTextWithJsonParsing("", prompt, { model: 'o3-mini' });
  
  logger.info({ 
    batchNumber: request.batchNumber,
    response 
  }, 'IR Rules Mapping - Full LLM response');

  return parseIRRuleMappingResponse(response, request.structure, request.rules);
}

async function mapRulesSecondPass(
  structure: SectionNode[],
  rules: Rule[],
  initialRuleStatus: RuleStatus[],
  batchSize: number = 10,
  maxConcurrent: number = 3
): Promise<RuleStatus[]> {
  const { getEnhancedRuleMappingPrompt } = await import('../controllers/contract-review-prompts');
  
  logger.info({ totalRules: rules.length }, 'Starting second-pass CA rule mapping');

  const batches: Array<{ rules: Rule[]; initialResults: RuleStatus[]; batchNumber: number }> = [];
  
  for (let i = 0; i < rules.length; i += batchSize) {
    const batchRules = rules.slice(i, i + batchSize);
    const batchInitialResults = batchRules
      .map(rule => initialRuleStatus.find(s => s.ruleId === rule.id))
      .filter((s): s is RuleStatus => s !== undefined);
    
    batches.push({ 
      rules: batchRules, 
      initialResults: batchInitialResults,
      batchNumber: Math.floor(i / batchSize) + 1
    });
  }

  const allAdditionalMappings: EnhancedMappingResult['additionalMappings'] = [];

  for (let i = 0; i < batches.length; i += maxConcurrent) {
    const batchGroup = batches.slice(i, i + maxConcurrent);
    
    const promises = batchGroup.map(async (batch) => {
      const prompt = getEnhancedRuleMappingPrompt(structure, batch.rules, batch.initialResults);
      
      const truncatedPrompt = truncateDocumentOutline(prompt, 100);
      logger.info({ 
        batchNumber: batch.batchNumber,
        ruleIds: batch.rules.map(r => r.id),
        prompt: truncatedPrompt 
      }, 'CA Rules Mapping (second-pass) - Full prompt');

      const response = await generateTextWithJsonParsing("", prompt, { model: 'o3-mini' });
      
      logger.info({ 
        batchNumber: batch.batchNumber,
        response 
      }, 'CA Rules Mapping (second-pass) - Full LLM response');

      return response.additionalMappings || [];
    });

    const groupResults = await Promise.all(promises);
    for (const result of groupResults) {
      allAdditionalMappings.push(...result);
    }
    
    logger.info({ completed: i + batchGroup.length, total: batches.length }, 'Second-pass CA batch group completed');
  }

  // Merge additional locations into initial results
  const mergedRuleStatus = initialRuleStatus.map(status => {
    const additional = allAdditionalMappings.find(a => a.ruleId === status.ruleId);
    
    if (additional && additional.additionalLocations.length > 0) {
      const existingLocations = status.locations || [];
      const newLocations = additional.additionalLocations.filter(
        loc => !existingLocations.includes(loc)
      );
      
      if (newLocations.length > 0) {
        logger.info({ 
          ruleId: status.ruleId, 
          existing: existingLocations, 
          added: newLocations 
        }, 'Second pass found additional CA locations');
        
        return {
          ...status,
          status: 'mapped' as const,
          locations: [...existingLocations, ...newLocations],
        };
      }
    }
    return status;
  });

  const addedCount = mergedRuleStatus.filter((s, i) => 
    (s.locations?.length || 0) > (initialRuleStatus[i]?.locations?.length || 0)
  ).length;
  
  logger.info({ rulesWithAdditions: addedCount }, 'Second-pass CA mapping complete');

  return mergedRuleStatus;
}

async function mapIRRulesSecondPass(
  structure: SectionNode[],
  rules: Rule[],
  initialRuleStatus: RuleStatus[],
  batchSize: number = 10,
  maxConcurrent: number = 3
): Promise<RuleStatus[]> {
  const { getEnhancedIRRuleMappingPrompt } = await import('../controllers/contract-review-prompts');
  
  logger.info({ totalRules: rules.length }, 'Starting second-pass IR rule mapping');

  const batches: Array<{ rules: Rule[]; initialResults: RuleStatus[]; batchNumber: number }> = [];
  
  for (let i = 0; i < rules.length; i += batchSize) {
    const batchRules = rules.slice(i, i + batchSize);
    const batchInitialResults = initialRuleStatus.slice(i, i + batchSize);
    
    batches.push({ 
      rules: batchRules, 
      initialResults: batchInitialResults,
      batchNumber: Math.floor(i / batchSize) + 1
    });
  }

  const allAdditionalMappings: EnhancedMappingResult['additionalMappings'] = [];

  for (let i = 0; i < batches.length; i += maxConcurrent) {
    const batchGroup = batches.slice(i, i + maxConcurrent);
    
    const promises = batchGroup.map(async (batch, batchIdx) => {
      const prompt = getEnhancedIRRuleMappingPrompt(structure, batch.rules, batch.initialResults);
      
      const truncatedPrompt = truncateDocumentOutline(prompt, 100);
      logger.info({ 
        batchNumber: batch.batchNumber,
        ruleIds: batch.rules.map(r => r.id),
        prompt: truncatedPrompt 
      }, 'IR Rules Mapping (second-pass) - Full prompt');

      const response = await generateTextWithJsonParsing("", prompt, { model: 'o3-mini' });
      
      logger.info({ 
        batchNumber: batch.batchNumber,
        response 
      }, 'IR Rules Mapping (second-pass) - Full LLM response');

      // Convert batch-local indices to global indices
      const batchOffset = (i + batchIdx) * batchSize;
      return (response.additionalMappings || []).map((m: any) => ({
        ...m,
        ruleIndex: m.ruleIndex + batchOffset,
      }));
    });

    const groupResults = await Promise.all(promises);
    for (const result of groupResults) {
      allAdditionalMappings.push(...result);
    }
    
    logger.info({ completed: i + batchGroup.length, total: batches.length }, 'Second-pass IR batch group completed');
  }

  // Merge additional locations into initial results (using index)
  const mergedRuleStatus = initialRuleStatus.map((status, idx) => {
    const additional = allAdditionalMappings.find(a => a.ruleIndex === idx);
    
    if (additional && additional.additionalLocations.length > 0) {
      const existingLocations = status.locations || [];
      const newLocations = additional.additionalLocations.filter(
        loc => !existingLocations.includes(loc)
      );
      
      if (newLocations.length > 0) {
        logger.info({ 
          ruleId: status.ruleId,
          ruleIndex: idx,
          existing: existingLocations, 
          added: newLocations 
        }, 'Second pass found additional IR locations');
        
        return {
          ...status,
          status: 'mapped' as const,
          locations: [...existingLocations, ...newLocations],
        };
      }
    }
    return status;
  });

  const addedCount = mergedRuleStatus.filter((s, i) => 
    (s.locations?.length || 0) > (initialRuleStatus[i]?.locations?.length || 0)
  ).length;
  
  logger.info({ rulesWithAdditions: addedCount }, 'Second-pass IR mapping complete');

  return mergedRuleStatus;
}

function mergeIRMapRulesResults(results: ParsedRuleMappingResponse[], structure: SectionNode[]): MapRulesResponse {
  const mergedRuleStatus: RuleStatus[] = [];
  for (const result of results) {
    if (result.ruleStatus) mergedRuleStatus.push(...result.ruleStatus);
  }

  // Annotate outline with rules (same logic as CA)
  const annotatedOutline = annotateOutline(structure, mergedRuleStatus);
  
  // Processing order for IR rules
  const processingOrder = calculateProcessingOrder(structure, mergedRuleStatus);

  const summary = {
    mappedRules: mergedRuleStatus.filter((s) => s.status === 'mapped').length,
    notApplicableRules: mergedRuleStatus.filter((s) => s.status === 'not_applicable').length,
    needsNewSection: 0, // IR rules never need new sections
  };

  return {
    annotatedOutline,
    ruleStatus: mergedRuleStatus,
    newSections: [], // Always empty for IR rules
    processingOrder,
    summary,
  };
}

async function mapRulesBatch(
  request: MapRulesRequest, 
  context?: Context,
  useEnhancedPrompts: boolean = false 
): Promise<ParsedRuleMappingResponse> {
  const prompt = useEnhancedPrompts
    ? enhancedGetRuleMappingPrompt(request.structure, request.rules)
    : getRuleMappingPrompt(request.structure, request.rules);

  const truncatedPrompt = truncateDocumentOutline(prompt, 100);
  logger.info({ 
    batchNumber: request.batchNumber,
    ruleIds: request.rules.map(r => r.id),
    prompt: truncatedPrompt 
  }, 'CA Rules Mapping - Full prompt');

  const response = await generateTextWithJsonParsing("", prompt, { model: 'o3-mini'});
  
  logger.info({ 
    batchNumber: request.batchNumber,
    response 
  }, 'CA Rules Mapping - Full LLM response');

  return parseRuleMappingResponse(response, request.structure, request.rules);
}

function mergeMapRulesResults(results: ParsedRuleMappingResponse[], structure: SectionNode[]): MapRulesResponse {
  const mergedRuleStatus: any[] = [];
  for (const result of results) {
    if (result.ruleStatus) mergedRuleStatus.push(...result.ruleStatus);
  }

  // Separate out new sections
  const newSections: NewSectionLocation[] = mergedRuleStatus
    .filter((rule) => rule.status === 'needs_new_section')
    .map((rule) => ({
      ruleId: rule.ruleId,
      suggestedLocation: rule.suggestedLocation || '',
      suggestedHeading: rule.suggestedHeading || `Section for Rule ${rule.ruleId}`,
    }))
        
  // Annotate the "mapped" nodes with rules 
  const annotatedOutline = annotateOutline(structure, mergedRuleStatus)
    
  // Determine processing order for "mapped" nodes
  const processingOrder = calculateProcessingOrder(structure, mergedRuleStatus);
    
  const summary = {
    mappedRules: mergedRuleStatus.filter((s) => s.status === 'mapped').length,
    notApplicableRules: mergedRuleStatus.filter((s) => s.status === 'not_applicable').length,
    needsNewSection: newSections.length,
  }
    
  return {
    annotatedOutline,
    ruleStatus: mergedRuleStatus,
    newSections,
    processingOrder,
    summary,
  }
} 

function annotateOutline(structure: SectionNode[], ruleStatus: RuleStatus[]): SectionNode[] {
  return structure.map((node) => {
    const matchingRules = ruleStatus
      .filter((status) => status.status === 'mapped' && status.locations?.includes(node.sectionNumber))
      .map((status) => status.ruleId)

    const annotatedNode: SectionNode = {
      ...node,
      rules: matchingRules.length > 0 ? matchingRules : undefined,
    }

    if (node.children && node.children.length > 0) {
      annotatedNode.children = annotateOutline(node.children, ruleStatus)
    }

    return annotatedNode
  })
}

function calculateProcessingOrder(
  structure: SectionNode[],
  ruleStatus: RuleStatus[]
): string[] {
  const processingOrder: string[] = [];
  
  // Get all sections with mapped rules
  const mappedSections = new Set<string>();
  for (const status of ruleStatus) {
    if (status.status === 'mapped' && status.locations) {
      status.locations.forEach(loc => mappedSections.add(loc));
    }
  }
  
  // For each top-level section, collect bottom-up
  for (const topSection of structure) {
    collectBottomUp(topSection, mappedSections, processingOrder);
  }
  
  return processingOrder;
}

function collectBottomUp(
  node: SectionNode,
  mappedSections: Set<string>,
  result: string[]
): void {
  // First process all children (deepest first)
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      collectBottomUp(child, mappedSections, result);
    }
  }
  
  // Then add this node if it has rules
  if (mappedSections.has(node.sectionNumber)) {
    result.push(node.sectionNumber);
  }
}  

export function extractSectionsWithRules(annotatedOutline: SectionNode[]): Array<{
  sectionNumber: string;
  text: string;
  lockedParents: string[];
  rules: string[];
}> {
  const sections: Array<any> = [];
  
  function traverse(nodes: SectionNode[], parentPath: string[] = []) {
    for (const node of nodes) {
      if (node.rules && node.rules.length > 0) {
        const sectionText = buildSectionTextWithChildren(node);
        
        sections.push({
          sectionNumber: node.sectionNumber,
          text: sectionText,
          lockedParents: parentPath.map(p => `{${p}}`),
          rules: node.rules,
        });
      }
      
      if (node.children && node.children.length > 0) {
        const parentLabel = `${node.sectionNumber} ${node.text}`;
        traverse(node.children, [...parentPath, parentLabel]);
      }
    }
  }
  
  traverse(annotatedOutline);
  return sections;
}

export function buildSectionTextWithChildren(node: SectionNode): string {
  let text = node.text || '';
  
  if (node.additionalParagraphs && node.additionalParagraphs.length > 0) {
    text += '\n' + node.additionalParagraphs.join('\n');
  }
  
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      text += '\n' + buildSectionTextWithChildren(child);
    }
  }
  
  return text;
}

export async function generateAmendmentsParallel(
  sectionsWithRules: Array<{
    sectionNumber: string;
    text: string;
    lockedParents: string[];
    rules: string[];
    previousAttempts?: string[];  // For rerun
  }>,
  rules: Rule[],
  processingOrder: string[],
  structure: SectionNode[],
  maxConcurrent: number = 3,
  context?: Context,
  conversationContext?: string,
): Promise<Array<{ sectionNumber: string; result: GenerateAmendmentsResponse; success: boolean; error?: string }>> {
  logger.info({ totalSections: sectionsWithRules.length, maxConcurrent }, 'Starting parallel amendment generation');
  
  function findLevel(sectionNum: string, nodes: SectionNode[]): number | null {
    for (const node of nodes) {
      if (node.sectionNumber === sectionNum) {
        return node.level;
      }
      if (node.children && node.children.length > 0) {
        const found = findLevel(sectionNum, node.children);
        if (found !== null) return found;
      }
    }
    return null;
  }
  
  const levelGroups = new Map<number, string[]>();
  for (const sectionNum of processingOrder) {
    const level = findLevel(sectionNum, structure);
    if (level === null) {
      logger.warn({ sectionNum }, 'Section in processingOrder not found in structure - SHOULD NOT HAPPEN');
      continue;
    }
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(sectionNum);
  }
  
  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => b - a);
  const sectionMap = new Map(sectionsWithRules.map(s => [s.sectionNumber, s]));
  
  logger.info({ 
    parallelGroups: sortedLevels.map(level => ({
      level,
      sections: levelGroups.get(level)
    }))
  }, 'Parallel processing groups (bottom-up order)');
  
  const results: Array<any> = [];
  const total = sectionsWithRules.length;
  let completed = 0;

  for (const level of sortedLevels) {
    const sectionsAtLevel = levelGroups.get(level)!;
    logger.info({ level, sectionsCount: sectionsAtLevel.length, sections: sectionsAtLevel }, `Processing level ${level}`);
    
    for (let i = 0; i < sectionsAtLevel.length; i += maxConcurrent) {
      const batch = sectionsAtLevel.slice(i, i + maxConcurrent);
      
      const promises = batch.map(async (sectionNum) => {
        const section = sectionMap.get(sectionNum);
        if (!section) return null;
        
        try {
          const sectionRules = section.rules
            .map(ruleId => rules.find(r => (r as any).id === ruleId || (r as any).rule_number === ruleId))
            .filter(r => r !== undefined) as Rule[];

          const payload: GenerateAmendmentsRequest = {
            sectionNumber: section.sectionNumber,
            sectionText: section.text,
            lockedParents: section.lockedParents,
            rules: sectionRules,
            ...(section.previousAttempts && { previousAttempts: section.previousAttempts }),
          };

          const result = await generateAmendmentForSection(payload, context, conversationContext);
          completed++;

          logger.info({ section: section.sectionNumber, level, completed, total }, 'Section completed');
          
          return {
            success: true,
            sectionNumber: section.sectionNumber,
            result,
          };
        } catch (error) {
          completed++;
          logger.error({ section: section.sectionNumber, error }, 'Section failed');
          
          return {
            success: false,
            sectionNumber: section.sectionNumber,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults.filter(r => r !== null));
    }
  }

  logger.info({ succeeded: results.filter(r => r.success).length, total }, 'Amendment generation complete');
  return results;
}

async function generateAmendmentForSection(
  request: GenerateAmendmentsRequest,
  context?: Context,
  conversationContext?: string
): Promise<GenerateAmendmentsResponse> {
  const isRerun = request.previousAttempts && request.previousAttempts.length > 0;
  const rerunNumber = isRerun ? request.previousAttempts!.length : 0;

  let prompt: string;
  let logLabel: string;

  if (isRerun) {
    const { getEnhancedAmendmentsPrompt } = await import('../controllers/contract-review-prompts');
    prompt = getEnhancedAmendmentsPrompt(
      request.sectionText,
      request.lockedParents,
      request.rules,
      request.previousAttempts!
    );
    logLabel = `Contract Amendment - Full prompt (rerun #${rerunNumber})`;
  } else {
    prompt = getAmendmentsPrompt(
      request.sectionText,
      request.lockedParents,
      request.rules,
      conversationContext
    );
    logLabel = 'Contract Amendment - Full prompt';
  }

  const truncatedPrompt = truncateDocumentOutline(prompt, 100);
  logger.info({ 
    sectionNumber: request.sectionNumber,
    ruleIds: request.rules.map(r => r.id),
    isRerun,
    rerunNumber: isRerun ? rerunNumber : undefined,
    prompt: truncatedPrompt 
  }, logLabel);

  const response = await generateTextWithJsonParsing("", prompt, { model: 'o3-mini'});
  
  const responseLogLabel = isRerun 
    ? `Contract Amendment - Full LLM response (rerun #${rerunNumber})`
    : 'Contract Amendment - Full LLM response';
  
  logger.info({ 
    sectionNumber: request.sectionNumber,
    response 
  }, responseLogLabel);

  const parsed = parseAmendmentsResponse(response, request.rules);

  const DELETION_MARKERS = [
    "[DELETED]",
    "[INTENTIONALLY DELETED]",
    "[RESERVED]",
    "INTENTIONALLY DELETED",
    "RESERVED",
    "[INTENTIONALLY OMITTED]"
  ];

  function isFullDeletion(amendedText: string): boolean {
    const normalized = amendedText.trim().toUpperCase();
    return DELETION_MARKERS.some(marker => 
      normalized === marker.toUpperCase() || 
      normalized === marker.replace(/[\[\]]/g, '').toUpperCase()
    );
  }

   if (parsed.amendment) {
    parsed.amendment.original = request.sectionText;
    parsed.amendment.isFullDeletion = isFullDeletion(parsed.amendment.amended || '');

    const parsedAmendedText = parsed.amendment.amended.replace(/(\n)+/g, "\n");
    
    const diffLogLabel = isRerun 
      ? `Diff input - amendment (rerun #${rerunNumber})`
      : 'Diff input - amendment';
  
    logger.info({
      type: parsed.amendment.isFullDeletion ? 'full_deletion' : 'regular_amendment',
      sectionNumber: request.sectionNumber,
      isRerun,
      rerunNumber: isRerun ? rerunNumber : undefined,
      original: JSON.stringify(request.sectionText),
      amended: JSON.stringify(parsedAmendedText || ''),
    }, diffLogLabel);
  }

  return parsed;
}

export async function generateNewSections(
  newSections: NewSectionLocation[],
  rules: Rule[],
  structure: SectionNode[],
  maxConcurrent: number = 3,
  context?: Context,
  conversationContext?: string,
): Promise<Array<{ sectionNumber: string; result: GenerateAmendmentsResponse; success: boolean; error?: string }>> {
  logger.info({ totalNewSections: newSections.length, maxConcurrent }, 'Starting parallel new section generation');

  const groupedNewSectionsByLocation = new Map<string, NewSectionLocation[]>();  
  for (const newSection of newSections) {
    const location = newSection.suggestedLocation;
    if (!groupedNewSectionsByLocation.has(location)) {
      groupedNewSectionsByLocation.set(location, []);
    }
    groupedNewSectionsByLocation.get(location)!.push(newSection);
  }

  logger.info({ 
    uniqueLocations: groupedNewSectionsByLocation.size,
    groups: Array.from(groupedNewSectionsByLocation.entries()).map(([loc, items]) => ({
      location: loc,
      count: items.length
    }))
  }, 'Grouped new sections by location');

  const locationEntries = Array.from(groupedNewSectionsByLocation.entries());
  const results: Array<any> = [];
  const total = locationEntries.length;
  let completed = 0;

  for (let i = 0; i < locationEntries.length; i += maxConcurrent) {
    const batch = locationEntries.slice(i, i + maxConcurrent);
    
    logger.info({ 
      batchStart: i, 
      batchSize: batch.length, 
      total 
    }, 'Processing location batch');

    const promises = batch.map(async ([location, sectionsAtLocation]) => {
      try {
        const previousSectionMatch = location.match(/After Section\s+([\d.A-Za-z]+)/i);
        const previousSectionNum = previousSectionMatch?.[1];
        
        if (!previousSectionNum) {
          completed++;
          return {
            success: false,
            sectionNumber: location,
            error: 'Could not parse section number from suggestedLocation',
          };
        }

        const previousSection = findSectionInOutline(previousSectionNum, structure);
        if (!previousSection) {
          completed++;
          return {
            success: false,
            sectionNumber: location,
            error: 'Section before insertion point not found',
          };
        }

        const rulesForLocation = sectionsAtLocation
          .map(ns => rules.find(r => r.id === ns.ruleId))
          .filter(r => r !== undefined) as Rule[];

        const prompt = getNewSectionsPrompt(sectionsAtLocation, previousSection, rulesForLocation, previousSectionNum, structure, conversationContext);
        const response = await generateTextWithJsonParsing("", prompt, { model: 'o3-mini'});
        const originalLanguage = buildSectionTextWithChildren(previousSection);
        
        completed++;
        logger.info({ location, completed, total }, 'location completed');

        logger.info({
          type: 'new_section',
          location: location,
          original: JSON.stringify(originalLanguage),
          amended: JSON.stringify(response.amended || ''),
        }, 'Diff input - new section');
        
        return {
          success: true,
          sectionNumber: location,
          result: {
            amendment: {
              original: originalLanguage,
              amended: response.amended || "",
              appliedRules: sectionsAtLocation.map(s => s.ruleId)
            }
          }
        };
      } catch (error) {
        completed++;
        logger.error({ location, error }, 'Location failed');
        
        return {
          success: false,
          sectionNumber: location,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  }

  logger.info({ succeeded: results.filter(r => r.success).length, total }, 'New section generation complete');
  return results;
}

// ============================================
// INSTRUCTION REQUEST PROCESSING
// ============================================

interface InstructionRequestResult {
  sectionNumber: string;
  ruleId: string;
  status: 'applicable' | 'not_applicable';
  issue?: string;
  relevantLanguage?: string;
}

export async function generateInstructionRequestsParallel(
  sectionsWithRules: Array<{
    sectionNumber: string;
    text: string;
    lockedParents: string[];
    rules: string[];
  }>,
  rules: Rule[],
  maxConcurrent: number = 3,
  context?: Context,
): Promise<Array<{ sectionNumber: string; results: InstructionRequestResult[]; success: boolean; error?: string }>> {
  const { getInstructionRequestPrompt } = await import('../controllers/contract-review-prompts');
  
  logger.info({ totalSections: sectionsWithRules.length, maxConcurrent }, 'Starting parallel instruction request generation');

  const allResults: Array<{ sectionNumber: string; results: InstructionRequestResult[]; success: boolean; error?: string }> = [];

  for (let i = 0; i < sectionsWithRules.length; i += maxConcurrent) {
    const batch = sectionsWithRules.slice(i, i + maxConcurrent);

    const promises = batch.map(async (section) => {
  try {
    logger.info({ 
      sectionNumber: section.sectionNumber,
      sectionRuleIds: section.rules,
      availableRuleIds: rules.map(r => r.id)
    }, 'Instruction Generation - Debug: Rule matching');

    const sectionRules = section.rules
      .map(ruleId => rules.find(r => r.id === ruleId))
      .filter((r): r is Rule => r !== undefined)
      .map(r => ({ id: r.id, content: r.content }));

    logger.info({ 
      sectionNumber: section.sectionNumber,
      matchedRulesCount: sectionRules.length 
    }, 'Instruction Generation - Debug: Matched rules');

    if (sectionRules.length === 0) {
      return {
        sectionNumber: section.sectionNumber,
        results: [],
        success: true,
      };
    }

    const prompt = getInstructionRequestPrompt(
      section.sectionNumber,
      section.text,
      sectionRules
    );

    const truncatedPrompt = truncateDocumentOutline(prompt, 100);
    logger.info({ 
      sectionNumber: section.sectionNumber,
      ruleIds: sectionRules.map(r => r.id),
      prompt: truncatedPrompt 
    }, 'Instruction Request Generation - Full prompt');

    const response = await generateTextWithJsonParsing("", prompt, { model: 'gpt-4o' });

    logger.info({ 
      sectionNumber: section.sectionNumber,
      response 
    }, 'Instruction Request Generation - Full LLM response');

    const responseArray = Array.isArray(response) ? response : [];
    
    // Helper to capitalize first letter
    const capitalizeFirst = (str: string): string => {
      if (!str || str.length === 0) return str;
      return str.charAt(0).toUpperCase() + str.slice(1);
    };

    // Map by position — each index corresponds to the rule at that index
    const results: InstructionRequestResult[] = sectionRules.map((rule, idx) => {
      const item = responseArray[idx];
      
      const result: InstructionRequestResult = {
        sectionNumber: section.sectionNumber,
        ruleId: rule.id,
        status: 'applicable',
        issue: capitalizeFirst(item?.issue?.trim()) || 'Please review this section and provide confirmation or instruction.',
        relevantLanguage: item?.relevant_language?.trim() || '',
      };

      if (!item) {
        logger.warn({ 
          sectionNumber: section.sectionNumber, 
          ruleId: rule.id,
          index: idx
        }, 'IR rule missing from response, using fallback');
      }

      return result;
    });

    logger.info({ sectionNumber: section.sectionNumber, resultCount: results.length }, 'Instruction request generation completed for section');

        return {
          sectionNumber: section.sectionNumber,
          results,
          success: true,
        };
      } catch (error) {
        logger.error({ sectionNumber: section.sectionNumber, error }, 'Instruction request generation failed for section');
        return {
          sectionNumber: section.sectionNumber,
          results: [],
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    const batchResults = await Promise.all(promises);
    allResults.push(...batchResults);
  }

  logger.info({ succeeded: allResults.filter(r => r.success).length, total: allResults.length }, 'Instruction request generation complete');
  return allResults;
}

export function findSectionInOutline(
  sectionNumber: string,
  nodes: SectionNode[],
): SectionNode | null {
  for (const node of nodes) {
    if (node.sectionNumber === sectionNumber) {
      return node
    }
    if (node.children && node.children.length > 0) {
      const found = findSectionInOutline(sectionNumber, node.children)
      if (found) return found
    }
  }
  return null
}

// ============================================
// RE-RUN AMENDMENT WORKFLOW
// ============================================

interface RerunSection {
  sectionNumber: string;
  sectionText: string;
  lockedParents: string[];
  rules: Rule[];
  previousAttempts: string[];        // Each entry is: amended text OR "noChanges: true"
  currentMappedSections: string[];
}

interface RerunAmendmentRequest {
  sections: RerunSection[];
  structure: SectionNode[];
}

interface RerunAmendmentResponse {
  results: Array<{
    sectionNumber: string;
    type: 'rerun_amendment' | 'new_section_amendment';
    result: GenerateAmendmentsResponse;
    success: boolean;
    error?: string;
  }>;
}

export async function rerunAmendments(
  request: RerunAmendmentRequest,
  maxConcurrent: number = 3,
  context?: Context
): Promise<RerunAmendmentResponse> {
  logger.info({ 
    sectionCount: request.sections.length,
    sections: request.sections.map(s => ({
      sectionNumber: s.sectionNumber,
      ruleCount: s.rules.length,
      previousAttemptsCount: s.previousAttempts.length
    }))
  }, 'Starting re-run amendment workflow');

  const allResults: RerunAmendmentResponse['results'] = [];

  for (const section of request.sections) {
    const isFirstRerun = section.previousAttempts.length === 1;
    const rerunNumber = section.previousAttempts.length;

    if (isFirstRerun) {
      // Re-run #1: Enhanced amendment only
      logger.info({ 
        sectionNumber: section.sectionNumber, 
        rerunNumber 
      }, 'Re-run #1: Running enhanced amendment');

      const result = await processRerunSection(section, context);
      allResults.push(result);

    } else {
      // Re-run #2+: Check for additional mapping first
      logger.info({ 
        sectionNumber: section.sectionNumber, 
        rerunNumber 
      }, `Re-run #${rerunNumber}: Checking for additional mappings`);

      const additionalSections = await checkAdditionalMappingForSection(
        section.rules,
        section.currentMappedSections,
        request.structure,
        rerunNumber
      );

      if (additionalSections.length > 0) {
        // Found additional sections - run regular amendment on them
        logger.info({ 
          sectionNumber: section.sectionNumber, 
          additionalSections,
          rerunNumber 
        }, `Re-run #${rerunNumber}: Found additional sections`);

        const newSectionResults = await processNewSections(
          additionalSections,
          section.rules,
          request.structure,
          rerunNumber,
          context
        );
        allResults.push(...newSectionResults);

      } else {
        // No additional sections - run enhanced amendment
        logger.info({ 
          sectionNumber: section.sectionNumber,
          rerunNumber 
        }, `Re-run #${rerunNumber}: No additional sections, running enhanced amendment`);

        const result = await processRerunSection(section, context);
        allResults.push(result);
      }
    }
  }

  const successCount = allResults.filter(r => r.success).length;
  logger.info({ successCount, total: allResults.length }, 'Re-run amendment workflow complete');

  return { results: allResults };
}

async function processRerunSection(
  section: RerunSection,
  context?: Context
): Promise<RerunAmendmentResponse['results'][0]> {
  try {
    const payload: GenerateAmendmentsRequest = {
      sectionNumber: section.sectionNumber,
      sectionText: section.sectionText,
      lockedParents: section.lockedParents,
      rules: section.rules,
      previousAttempts: section.previousAttempts,
    };

    const result = await generateAmendmentForSection(payload, context);

    return {
      sectionNumber: section.sectionNumber,
      type: 'rerun_amendment',
      result,
      success: true,
    };
  } catch (error) {
    logger.error({ sectionNumber: section.sectionNumber, error }, 'Re-run section failed');
    return {
      sectionNumber: section.sectionNumber,
      type: 'rerun_amendment',
      result: { noChanges: true },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkAdditionalMappingForSection(
  rules: Rule[],
  currentMappedSections: string[],
  structure: SectionNode[],
  rerunNumber: number
): Promise<string[]> {
  const { getRerunMappingCheckPrompt } = await import('../controllers/contract-review-prompts');
  
  // Check each rule for additional mappings, combine results
  const allAdditionalSections = new Set<string>();

  for (const rule of rules) {
    const prompt = getRerunMappingCheckPrompt(structure, rule, currentMappedSections);

    const truncatedPrompt = truncateDocumentOutline(prompt, 100);
    logger.info({ 
      ruleId: rule.id,
      currentMappedSections,
      rerunNumber,
      prompt: truncatedPrompt 
    }, `CA Rules Mapping (rerun #${rerunNumber}) - Full prompt`);

    const response = await generateTextWithJsonParsing("", prompt, { model: 'o3-mini' });

    logger.info({ 
      ruleId: rule.id,
      rerunNumber,
      response 
    }, `CA Rules Mapping (rerun #${rerunNumber}) - Full LLM response`);

    const additionalSections = response.additionalSections || [];
    for (const section of additionalSections) {
      if (!currentMappedSections.includes(section)) {
        allAdditionalSections.add(section);
      }
    }
  }

  return Array.from(allAdditionalSections);
}

async function processNewSections(
  additionalSections: string[],
  rules: Rule[],
  structure: SectionNode[],
  rerunNumber: number,
  context?: Context
): Promise<RerunAmendmentResponse['results']> {
  const results: RerunAmendmentResponse['results'] = [];

  for (const sectionNum of additionalSections) {
    const section = findSectionInOutline(sectionNum, structure);
    
    if (!section) {
      logger.warn({ sectionNumber: sectionNum }, 'Re-run: Additional section not found in structure');
      continue;
    }

    const sectionText = buildSectionTextWithChildren(section);

    try {
      const payload: GenerateAmendmentsRequest = {
        sectionNumber: sectionNum,
        sectionText: sectionText,
        lockedParents: [],
        rules: rules,
        // No previousAttempts - this is a new section
      };

      const result = await generateAmendmentForSection(payload, context);

      results.push({
        sectionNumber: sectionNum,
        type: 'new_section_amendment',
        result,
        success: true,
      });
    } catch (error) {
      logger.error({ sectionNumber: sectionNum, error }, 'Re-run new section failed');
      results.push({
        sectionNumber: sectionNum,
        type: 'new_section_amendment',
        result: { noChanges: true },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

// ============================================
// RE-RUN INSTRUCTION REQUEST WORKFLOW
// ============================================

interface RerunIRSection {
  sectionNumber: string;
  sectionText: string;
  rules: Array<{ id: string; content: string }>;
  previousAttempts: string[];        // Each entry is: the "issue" text from previous LLM response
  currentMappedSections: string[];
}

interface RerunInstructionRequestRequest {
  sections: RerunIRSection[];
  structure: SectionNode[];
}

interface RerunInstructionRequestResponse {
  results: Array<{
    sectionNumber: string;
    type: 'rerun_instruction_request' | 'new_section_instruction_request';
    instructionRequests: Array<{
      ruleId: string;
      issue: string;
      relevantLanguage: string;
    }>;
    success: boolean;
    error?: string;
  }>;
}

export async function rerunInstructionRequests(
  request: RerunInstructionRequestRequest,
  maxConcurrent: number = 3,
  context?: Context
): Promise<RerunInstructionRequestResponse> {
  logger.info({ 
    sectionCount: request.sections.length,
    sections: request.sections.map(s => ({
      sectionNumber: s.sectionNumber,
      ruleCount: s.rules.length,
      previousAttemptsCount: s.previousAttempts.length
    }))
  }, 'Starting re-run instruction request workflow');

  const allResults: RerunInstructionRequestResponse['results'] = [];

  for (const section of request.sections) {
    const isFirstRerun = section.previousAttempts.length === 1;
    const rerunNumber = section.previousAttempts.length;

    if (isFirstRerun) {
      logger.info({ 
        sectionNumber: section.sectionNumber, 
        rerunNumber 
      }, 'IR Re-run #1: Running enhanced instruction request');

      const result = await processRerunIRSection(section, rerunNumber, context);
      allResults.push(result);

    } else {
      logger.info({ 
        sectionNumber: section.sectionNumber, 
        rerunNumber 
      }, `IR Re-run #${rerunNumber}: Checking for additional mappings`);

      const additionalSections = await checkAdditionalIRMappingForSection(
        section.rules,
        section.currentMappedSections,
        request.structure,
        rerunNumber
      );

      if (additionalSections.length > 0) {
        logger.info({ 
          sectionNumber: section.sectionNumber, 
          additionalSections,
          rerunNumber 
        }, `IR Re-run #${rerunNumber}: Found additional sections`);

        const newSectionResults = await processNewIRSections(
          additionalSections,
          section.rules,
          request.structure,
          rerunNumber,
          context
        );
        allResults.push(...newSectionResults);

      } else {
        logger.info({ 
          sectionNumber: section.sectionNumber,
          rerunNumber 
        }, `IR Re-run #${rerunNumber}: No additional sections, running enhanced instruction request`);

        const result = await processRerunIRSection(section, rerunNumber, context);
        allResults.push(result);
      }
    }
  }

  const successCount = allResults.filter(r => r.success).length;
  logger.info({ successCount, total: allResults.length }, 'Re-run instruction request workflow complete');

  return { results: allResults };
}

async function processRerunIRSection(
  section: RerunIRSection,
  rerunNumber: number,
  context?: Context
): Promise<RerunInstructionRequestResponse['results'][0]> {
  const { getEnhancedInstructionRequestPrompt } = await import('../controllers/contract-review-prompts');

  try {
    const prompt = getEnhancedInstructionRequestPrompt(
      section.sectionNumber,
      section.sectionText,
      section.rules,
      section.previousAttempts
    );

    const truncatedPrompt = truncateDocumentOutline(prompt, 100);
    logger.info({ 
      sectionNumber: section.sectionNumber,
      ruleIds: section.rules.map(r => r.id),
      rerunNumber,
      prompt: truncatedPrompt 
    }, `Instruction Request Generation - Full prompt (rerun #${rerunNumber})`);

    const response = await generateTextWithJsonParsing("", prompt, { model: 'gpt-4o' });

    logger.info({ 
      sectionNumber: section.sectionNumber,
      rerunNumber,
      response 
    }, `Instruction Request Generation - Full LLM response (rerun #${rerunNumber})`);

    const responseArray = Array.isArray(response) ? response : [];
    
    const capitalizeFirst = (str: string): string => {
      if (!str || str.length === 0) return str;
      return str.charAt(0).toUpperCase() + str.slice(1);
    };

    const instructionRequests = section.rules.map((rule, idx) => {
      const item = responseArray[idx];
      return {
        ruleId: rule.id,
        issue: capitalizeFirst(item?.issue?.trim()) || 'Please review this section and provide confirmation or instruction.',
        relevantLanguage: item?.relevant_language?.trim() || '',
      };
    });

    return {
      sectionNumber: section.sectionNumber,
      type: 'rerun_instruction_request',
      instructionRequests,
      success: true,
    };
  } catch (error) {
    logger.error({ sectionNumber: section.sectionNumber, error }, 'IR Re-run section failed');
    return {
      sectionNumber: section.sectionNumber,
      type: 'rerun_instruction_request',
      instructionRequests: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkAdditionalIRMappingForSection(
  rules: Array<{ id: string; content: string }>,
  currentMappedSections: string[],
  structure: SectionNode[],
  rerunNumber: number
): Promise<string[]> {
  const { getRerunIRMappingCheckPrompt } = await import('../controllers/contract-review-prompts');
  
  const allAdditionalSections = new Set<string>();

  for (const rule of rules) {
    const prompt = getRerunIRMappingCheckPrompt(structure, rule, currentMappedSections);

    const truncatedPrompt = truncateDocumentOutline(prompt, 100);
    logger.info({ 
      ruleId: rule.id,
      currentMappedSections,
      rerunNumber,
      prompt: truncatedPrompt 
    }, `IR Rules Mapping (rerun #${rerunNumber}) - Full prompt`);

    const response = await generateTextWithJsonParsing("", prompt, { model: 'o3-mini' });

    logger.info({ 
      ruleId: rule.id,
      rerunNumber,
      response 
    }, `IR Rules Mapping (rerun #${rerunNumber}) - Full LLM response`);

    const additionalSections = response.additionalSections || [];
    for (const section of additionalSections) {
      if (!currentMappedSections.includes(section)) {
        allAdditionalSections.add(section);
      }
    }
  }

  return Array.from(allAdditionalSections);
}

async function processNewIRSections(
  additionalSections: string[],
  rules: Array<{ id: string; content: string }>,
  structure: SectionNode[],
  rerunNumber: number,
  context?: Context
): Promise<RerunInstructionRequestResponse['results']> {
  const { getInstructionRequestPrompt } = await import('../controllers/contract-review-prompts');
  const results: RerunInstructionRequestResponse['results'] = [];

  for (const sectionNum of additionalSections) {
    const section = findSectionInOutline(sectionNum, structure);
    
    if (!section) {
      logger.warn({ sectionNumber: sectionNum }, 'IR Re-run: Additional section not found in structure');
      continue;
    }

    const sectionText = buildSectionTextWithChildren(section);

    try {
      const prompt = getInstructionRequestPrompt(sectionNum, sectionText, rules);

      const truncatedPrompt = truncateDocumentOutline(prompt, 100);
      logger.info({ 
        sectionNumber: sectionNum,
        ruleIds: rules.map(r => r.id),
        rerunNumber,
        prompt: truncatedPrompt 
      }, `Instruction Request Generation (rerun #${rerunNumber}) - Full prompt`);

      const response = await generateTextWithJsonParsing("", prompt, { model: 'gpt-4o' });

      logger.info({ 
        sectionNumber: sectionNum,
        rerunNumber,
        response 
      }, `Instruction Request Generation (rerun #${rerunNumber}) - Full LLM response`);

      const responseArray = Array.isArray(response) ? response : [];
      
      const capitalizeFirst = (str: string): string => {
        if (!str || str.length === 0) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
      };

      const instructionRequests = rules.map((rule, idx) => {
        const item = responseArray[idx];
        return {
          ruleId: rule.id,
          issue: capitalizeFirst(item?.issue?.trim()) || 'Please review this section and provide confirmation or instruction.',
          relevantLanguage: item?.relevant_language?.trim() || '',
        };
      });

      results.push({
        sectionNumber: sectionNum,
        type: 'new_section_instruction_request',
        instructionRequests,
        success: true,
      });
    } catch (error) {
      logger.error({ sectionNumber: sectionNum, error }, 'IR Re-run new section failed');
      results.push({
        sectionNumber: sectionNum,
        type: 'new_section_instruction_request',
        instructionRequests: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}