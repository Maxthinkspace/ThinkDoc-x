import type { Context } from 'hono';
import type { SectionNode } from '@/types/documents';
import type { Rule, NewSectionLocation } from '@/types/contract-review';
import type {
  FlatSection,
  MappingResult,
  GroupedMapping,
  MapSectionsResponse,
  DetailedAdditionResponse,
  DetailedDeletionResponse,
  ConsolidatedResponse,
  RuleMetadata,
  GroupAdditionResult,
  GroupDeletionResult,
  AdditionItem,
  DeletionItem,
} from '@/types/review-with-precedents';

import { logger } from '@/config/logger';
import { generateTextDirect } from '@/controllers/generate';
import {
  extractSentencesFromSections,
  buildFullTextFromSections,
} from '@/services/sentence-extractor';
import {
  mapRulesParallel,
  extractSectionsWithRules,
  generateAmendmentsParallel,
  generateNewSections,
  findSectionInOutline,
} from '@/services/contract-review';
import {
  buildSectionMappingSystemPrompt,
  buildSectionMappingUserPrompt,
  identifyPotentialAdditionsPrompt,
  validatePotentialAdditionsPrompt,
  reverifyPotentialAdditionsPrompt,
  identifyPotentialDeletionsPrompt,
  validatePotentialDeletionsPrompt,
  reverifyPotentialDeletionsPrompt,
} from '@/controllers/review-with-precedents-prompts';
import {
  parsePotentialAdditionsResponse,
  parseGlobalAdditionMappingResponse,
  parsePotentialDeletionsResponse,
  parseGlobalDeletionMappingResponse,
  normalizeSectionNumber,
  parseSectionResponse,
} from '@/services/review-with-precedents-parsers';

// ========================================
// STEP 1: SECTION MAPPING
// ========================================

export async function sectionMapping(
  originalStructure: SectionNode[],
  referenceStructure: SectionNode[],
  context: Context,
  debug?: string
): Promise<MapSectionsResponse> {
  const startTime = Date.now();
  let apiCallsMade = 0;

  logger.info(
    {
      originalSections: originalStructure.length,
      referenceSections: referenceStructure.length,
    },
    'Starting Step 1: Section mapping'
  );

  const originalTopLevelSections = extractTopLevelSections(originalStructure);
  const referenceTopLevelSections = extractTopLevelSections(referenceStructure);

  logger.info(`Identified ${originalTopLevelSections.length} sections in the original document`);
  logger.info(`Identified ${referenceTopLevelSections.length} sections in the reference document`);

  logger.info('Starting Reference → Original mapping');
  const referenceToOriginalMappings = await mapReferencesToOriginal(
    referenceTopLevelSections,
    originalStructure,
    context
  );
  apiCallsMade += referenceTopLevelSections.length;

  logger.info(
    {
      mappingsFound: referenceToOriginalMappings.filter(
        (m) => !m.targetSections.includes('NOT FOUND')
      ).length,
      notFound: referenceToOriginalMappings.filter((m) =>
        m.targetSections.includes('NOT FOUND')
      ).length,
    },
    'Reference → Original mapping complete'
  );

  const mappedOriginalSections = new Set<string>();
  for (const mapping of referenceToOriginalMappings) {
    for (const section of mapping.targetSections) {
      if (section !== 'NOT FOUND') {
        mappedOriginalSections.add(section);
      }
    }
  }

  const unmappedOriginalSections = originalTopLevelSections.filter(
    (section) => !mappedOriginalSections.has(section.sectionNumber)
  );

  logger.info(
    {
      mappedCount: mappedOriginalSections.size,
      unmappedCount: unmappedOriginalSections.length,
      unmappedSections: unmappedOriginalSections.map(s => s.sectionNumber),
    },
    'Identified unmapped original sections'
  );

  let originalToReferenceMappings: MappingResult[] = [];
  if (unmappedOriginalSections.length > 0) {
    logger.info('Starting Original → Reference mapping');
    originalToReferenceMappings = await mapOriginalsToReference(
      unmappedOriginalSections,
      referenceStructure,
      context
    );
    apiCallsMade += unmappedOriginalSections.length;

    logger.info(
      {
        mappingsFound: originalToReferenceMappings.filter(
          (m) => !m.targetSections.includes('NOT FOUND')
        ).length,
        notFound: originalToReferenceMappings.filter((m) =>
          m.targetSections.includes('NOT FOUND')
        ).length,
      },
      'Original → Reference mapping complete'
    );
  }

  logger.info('Grouping mappings');
  const groupedMappings = groupMappings(
    referenceToOriginalMappings,
    originalToReferenceMappings
  );

  logger.info(
    {
      totalGroups: groupedMappings.length,
      apiCallsMade,
    },
    'Step 1: Section mapping completed'
  );

  return {
    success: true,
    mappings: groupedMappings,
    metadata: {
      totalOriginalSections: originalTopLevelSections.length,
      totalReferenceSections: referenceTopLevelSections.length,
      processingTimeMs: Date.now() - startTime,
      apiCallsMade,
    },
  };
}

function extractTopLevelSections(structure: SectionNode[]): FlatSection[] {
  const topLevel: FlatSection[] = [];

  for (const node of structure) {  
    if (node.level === 1) {
      const fullText = buildFullTextFromSections(structure, [node.sectionNumber]);
      topLevel.push({
        sectionNumber: node.sectionNumber,
        text: node.text,
        fullText: fullText,
        level: node.level,
      });
    }
  }

  return topLevel;
}

async function mapReferencesToOriginal(
  referenceSections: FlatSection[],
  originalStructure: SectionNode[],
  context: Context
): Promise<MappingResult[]> {
  const allOriginalSections = originalStructure
    .filter(n => n.level === 1)
    .map(n => n.sectionNumber);
  const fullOriginalText = buildFullTextFromSections(originalStructure, allOriginalSections);
  const mappingPromises = referenceSections.map((referenceSection) =>
    findMatchingSections(referenceSection, fullOriginalText, 'original', context)
  );

  const results = await Promise.all(mappingPromises);

  return results;
}

async function mapOriginalsToReference(
  originalSections: FlatSection[],
  referenceStructure: SectionNode[],
  context: Context
): Promise<MappingResult[]> {
  const allReferenceSections = referenceStructure
    .filter(n => n.level === 1)
    .map(n => n.sectionNumber);
  const fullReferenceText = buildFullTextFromSections(referenceStructure, allReferenceSections);

  const mappingPromises = originalSections.map((originalSection) =>
    findMatchingSections(originalSection, fullReferenceText, 'reference', context)
  );

  const results = await Promise.all(mappingPromises);

  return results;
}

async function findMatchingSections(
  sourceSection: FlatSection,
  fullTargetText: string,
  targetType: 'original' | 'reference',
  context: Context
): Promise<MappingResult> {
  const systemPrompt = buildSectionMappingSystemPrompt(targetType);
  const userPrompt = buildSectionMappingUserPrompt(sourceSection, fullTargetText, targetType);

  try {
    const response = await generateTextDirect(
      systemPrompt,
      userPrompt,
      { model: 'gpt-4o', temperature: 0.3, maxTokens: 500 }
    );

    const mappedSections = parseSectionResponse(response, targetType);

    return {
      sourceSection: sourceSection.sectionNumber,
      targetSections: mappedSections,
    };
  } catch (error) {
    logger.error(
      { error, sourceSection: sourceSection.sectionNumber },
      'Failed to find matching sections'
    );

    return {
      sourceSection: sourceSection.sectionNumber,
      targetSections: ['NOT FOUND'],
    };
  }
}

function groupMappings(
  referenceToOriginal: MappingResult[],
  originalToReference: MappingResult[]
): GroupedMapping[] {
  const groupMap = new Map<string, Set<string>>();

  for (const mapping of referenceToOriginal) {
    const referenceSection = mapping.sourceSection;

    for (const originalSection of mapping.targetSections) {
      if (!groupMap.has(originalSection)) {
        groupMap.set(originalSection, new Set());
      }
      groupMap.get(originalSection)!.add(referenceSection);
    }
  }

  for (const mapping of originalToReference) {
    const originalSection = mapping.sourceSection;

    for (const referenceSection of mapping.targetSections) {
      if (!groupMap.has(originalSection)) {
        groupMap.set(originalSection, new Set());
      }
      groupMap.get(originalSection)!.add(referenceSection);
    }
  }

  const grouped: GroupedMapping[] = [];

  for (const [originalSection, referenceSections] of groupMap.entries()) {
    if (originalSection === 'NOT FOUND') {
      for (const referenceSection of referenceSections) {
        grouped.push({
          originalSection: 'NOT FOUND',
          referenceSections: [referenceSection],
        });
      }
    } else {
      grouped.push({
        originalSection: originalSection,
        referenceSections: Array.from(referenceSections).sort(),
      });
    }
  }

  const finalGroups: GroupedMapping[] = [];
  const processedOriginals = new Set<string>();

  for (const group of grouped) {
    if (group.originalSection === 'NOT FOUND') {
      finalGroups.push(group);
      continue;
    }

    if (processedOriginals.has(group.originalSection)) {
      continue;
    }

    const matchingGroups = grouped.filter(
      (g) =>
        g.originalSection !== 'NOT FOUND' &&
        g.originalSection === group.originalSection
    );

    const allReferenceSections = new Set<string>();
    for (const g of matchingGroups) {
      for (const ref of g.referenceSections) {
        allReferenceSections.add(ref);
      }
    }

    finalGroups.push({
      originalSection: group.originalSection,
      referenceSections: Array.from(allReferenceSections).sort(),
    });

    processedOriginals.add(group.originalSection);
  }

  return finalGroups.sort((a, b) => {
  const aFirst = a.originalSection;
  const bFirst = b.originalSection;

  const aIsAddition = aFirst === 'NOT FOUND';  
  const bIsAddition = bFirst === 'NOT FOUND';
  
  const aIsDeletion = a.referenceSections.includes('NOT FOUND');  
  const bIsDeletion = b.referenceSections.includes('NOT FOUND');

  const aIsNormal = !aIsAddition && !aIsDeletion;
  const bIsNormal = !bIsAddition && !bIsDeletion;

  if (aIsNormal && bIsNormal) {
    return aFirst.localeCompare(bFirst, undefined, { numeric: true });
  }

  if (aIsNormal && !bIsNormal) return -1;
  if (!aIsNormal && bIsNormal) return 1;

  if (aIsAddition && bIsDeletion) return -1;  
  if (aIsDeletion && bIsAddition) return 1;

  return 0;
});
}

// ===============================================
// STEP 1 & STEP 2 SHARED HELPER: BATCH PROCESSING
// ===============================================

async function processSentencesBatch<T>(
  sentences: Array<{ sentence: string; sectionReference: string }>,
  processFn: (sentence: string, sectionRef: string) => Promise<{ item: T | null; apiCallsUsed: number }>,
  batchSize: number = 10
): Promise<{ items: T[]; apiCallsMade: number }> {
  const items: T[] = [];
  let apiCallsMade = 0;

  for (let i = 0; i < sentences.length; i += batchSize) {
    const batch = sentences.slice(i, i + batchSize);
    const batchPromises = batch.map((s) => processFn(s.sentence, s.sectionReference));
    const batchResults = await Promise.all(batchPromises);

    for (const result of batchResults) {
      if (result.item) {
        items.push(result.item);
      }
      apiCallsMade += result.apiCallsUsed;
    }
  }

  return { items, apiCallsMade };
}

// ========================================
// STEP 2: PROCESS ADDITIONS
// ========================================

export async function processAdditions(
  originalStructure: SectionNode[],
  referenceStructure: SectionNode[],
  groupedMappings: GroupedMapping[],
  context: Context
): Promise<DetailedAdditionResponse> {
  const startTime = Date.now();
  let totalApiCalls = 0;

  logger.info({ totalGroups: groupedMappings.length }, 'Starting to identify additions from the precedent');

  const normalGroups = groupedMappings.filter(
    (group: GroupedMapping) =>
      group.originalSection !== 'NOT FOUND' &&
      !group.referenceSections.includes('NOT FOUND')
  );

  logger.info(
    {
      totalGroups: groupedMappings.length,
      normalGroups: normalGroups.length,
      notFoundGroups: groupedMappings.length - normalGroups.length,
    },
    'Filtered normal groups for processing'
  );

  const groupPromises = normalGroups.map((group: GroupedMapping, index: number) =>
    processGroupForAdditions(group, index, originalStructure, referenceStructure, context)
  );

  const groupResults = await Promise.all(groupPromises);
  totalApiCalls = groupResults.reduce((sum, result) => sum + result.apiCallsMade, 0);
  const processingTimeMs = Date.now() - startTime;

  const response: DetailedAdditionResponse = {
    success: true,
    comparisons: groupResults,
    metadata: {
      totalGroups: groupedMappings.length,
      totalGroupsProcessed: normalGroups.length,
      totalSentencesProcessed: groupResults.reduce((sum, r) => sum + r.sentencesProcessed, 0),
      totalAdditionsFound: groupResults.reduce((sum, r) => sum + r.sentencesWithAdditions, 0),
      totalApiCalls,
      processingTimeMs,
    },
  };

  return response;
}

async function processGroupForAdditions(
  group: GroupedMapping,
  groupIndex: number,
  originalStructure: SectionNode[],
  referenceStructure: SectionNode[],
  context: Context
): Promise<GroupAdditionResult> {
  const groupId = `group_${groupIndex + 1}`;

  const referenceSentences = extractSentencesFromSections(referenceStructure, group.referenceSections);
  const originalSectionText = buildFullTextFromSections(originalStructure, [group.originalSection]);

  const { items: additions, apiCallsMade } = await processSentencesBatch<AdditionItem>(
    referenceSentences,
    (sentence, sectionReference) => processSentenceForAdditions(
      sentence,
      sectionReference,
      originalSectionText,
      group.originalSection,
      originalStructure,
      context
    )
  );

  return {
    groupId,
    referenceSections: group.referenceSections,
    originalSection: [group.originalSection],
    additions,
    sentencesProcessed: referenceSentences.length,
    sentencesWithAdditions: additions.length,
    apiCallsMade,
  };
}

async function processSentenceForAdditions(
  referenceSentence: string,
  referenceSectionRef: string,
  originalSectionText: string,
  originalSectionRef: string,
  originalStructure: SectionNode[],
  context: Context
): Promise<{
  item: AdditionItem | null;
  apiCallsUsed: number;
}> {
  let apiCallsUsed = 0;

  const potentialAdditions = await identifyPotentialAdditions(referenceSentence, originalSectionText, context);
  apiCallsUsed++;

  if (potentialAdditions.result === 'SAME') {
    return { item: null, apiCallsUsed };
  }

  const globalAdditionMappingResult = await validatePotentialAdditions(referenceSentence, originalStructure, context);
  apiCallsUsed++;

  if (globalAdditionMappingResult.mappedSections[0] === 'NOT FOUND') {
    return {
      item: {
        referenceSentence,
        referenceSectionRef,
        pointsToAdd: potentialAdditions.pointsToAdd!,
        mappedToOriginalSection: ['NOT FOUND'],
        status: 'confirmed',
        verificationPath: 'not_found',
      },
      apiCallsUsed,
    };
  }

  const isWithinGroup = globalAdditionMappingResult.mappedSections.every((sec) =>
    normalizeSectionNumber(sec) === normalizeSectionNumber(originalSectionRef)
  );

  if (isWithinGroup) {
    return {
      item: {
        referenceSentence,
        referenceSectionRef,
        pointsToAdd: potentialAdditions.pointsToAdd!,
        mappedToOriginalSection: globalAdditionMappingResult.mappedSections,
        status: 'confirmed',
        verificationPath: 'within_group',
      },
      apiCallsUsed,
    };
  }

  const mappedSectionsText = buildFullTextFromSections(originalStructure, globalAdditionMappingResult.mappedSections);

  const reverifyResult = await reverifyPotentialAdditions(referenceSentence, mappedSectionsText, context);
  apiCallsUsed++;

  if (reverifyResult.result === 'SAME') {
    return { item: null, apiCallsUsed };
  }

  return {
    item: {
      referenceSentence,
      referenceSectionRef,
      pointsToAdd: reverifyResult.pointsToAdd!,
      mappedToOriginalSection: globalAdditionMappingResult.mappedSections,
      status: 'confirmed',
      verificationPath: 'outside_group_verified',
    },
    apiCallsUsed,
  };
}

async function identifyPotentialAdditions(
  referenceSentence: string,
  originalSectionText: string,
  context: Context
): Promise<{
  result: 'SAME' | 'HAS_ADDITIONS';
  pointsToAdd?: Rule[];
}> {
  const { systemPrompt, userPrompt } = identifyPotentialAdditionsPrompt(
    referenceSentence,
    originalSectionText
  );

  try {
    const response = await generateTextDirect(
      systemPrompt,
      userPrompt,
      { model: 'gpt-4o', temperature: 0.3, maxTokens: 1000 }
    );

    const parsed = parsePotentialAdditionsResponse(response);

    return parsed;
  } catch (error) {
    logger.error({ error }, 'Failed to identify points to add');
    return {
      result: 'SAME',
    };
  }
}

async function validatePotentialAdditions(
  referenceSentence: string,
  originalStructure: SectionNode[],
  context: Context
): Promise<{ mappedSections: string[] }> {
  const originalFullText = buildFullTextFromSections(
    originalStructure,
    originalStructure.filter((n) => n.level === 1).map((n) => n.sectionNumber)
  );

  const { systemPrompt, userPrompt } = validatePotentialAdditionsPrompt(
    referenceSentence,
    originalFullText
  );

  try {
    const response = await generateTextDirect(
      systemPrompt,
      userPrompt,
      { model: 'gpt-4o', temperature: 0.3, maxTokens: 500 }
    );

    const mappedSections = parseGlobalAdditionMappingResponse(response);

    return {
      mappedSections,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to find mapped original sections');
    return {
      mappedSections: ['NOT FOUND'],
    };
  }
}

async function reverifyPotentialAdditions(
  referenceSentence: string,
  mappedSectionsText: string,
  context: Context
): Promise<{
  result: 'SAME' | 'HAS_ADDITIONS';
  pointsToAdd?: Rule[];
}> {
  const { systemPrompt, userPrompt } = reverifyPotentialAdditionsPrompt(
    referenceSentence,
    mappedSectionsText
  );

  try {
    const response = await generateTextDirect(
      systemPrompt,
      userPrompt,
      { model: 'gpt-4o', temperature: 0.3, maxTokens: 1000 }
    );

    const parsed = parsePotentialAdditionsResponse(response);

    return parsed;
  } catch (error) {
    logger.error({ error }, 'Failed to compare with mapped original sections');
    return {
      result: 'SAME',
    };
  }
}

// ========================================
// STEP 3: PROCESS DELETIONS
// ========================================

export async function processDeletions(
  originalStructure: SectionNode[],
  referenceStructure: SectionNode[],
  groupedMappings: GroupedMapping[],
  context: Context
): Promise<DetailedDeletionResponse> {
  const startTime = Date.now();
  let totalApiCalls = 0;

  logger.info({ totalGroups: groupedMappings.length }, 'Starting to identify deletions from the original document');

  const normalGroups = groupedMappings.filter(
    (group: GroupedMapping) =>
      group.originalSection !== 'NOT FOUND' && !group.referenceSections.includes('NOT FOUND')
  );

  const groupPromises = normalGroups.map((group: GroupedMapping, index: number) =>
    processGroupForDeletions(group, index, originalStructure, referenceStructure, context)
  );

  const groupResults = await Promise.all(groupPromises);
  totalApiCalls = groupResults.reduce((sum, result) => sum + result.apiCallsMade, 0);
  const processingTimeMs = Date.now() - startTime;

  const response: DetailedDeletionResponse = { 
    success: true,
    comparisons: groupResults,
    metadata: {
      totalGroups: groupedMappings.length,
      totalGroupsProcessed: normalGroups.length,
      totalSentencesProcessed: groupResults.reduce((sum, r) => sum + r.sentencesProcessed, 0),
      totalDeletionsFound: groupResults.reduce((sum, r) => sum + r.sentencesWithDeletions, 0),
      totalApiCalls,
      processingTimeMs,
    },
  };
  return response;
}

async function processGroupForDeletions(
  group: GroupedMapping,
  groupIndex: number,
  originalStructure: SectionNode[],
  referenceStructure: SectionNode[],
  context: Context
): Promise<GroupDeletionResult> {
  const groupId = `group_${groupIndex + 1}`;

  const originalSentences = extractSentencesFromSections(originalStructure, [group.originalSection]);
  const referenceSectionsText = buildFullTextFromSections(referenceStructure, group.referenceSections);

  const { items: deletions, apiCallsMade } = await processSentencesBatch<DeletionItem>(
    originalSentences,
    (sentence, sectionReference) => processSentenceForDeletions(
      sentence,
      sectionReference,
      referenceSectionsText,
      group.referenceSections,
      referenceStructure,
      context
    )
  );

  return {
    groupId,
    originalSection: [group.originalSection],
    referenceSections: group.referenceSections,
    deletions,
    sentencesProcessed: originalSentences.length,
    sentencesWithDeletions: deletions.length,
    apiCallsMade,
  };
}

async function processSentenceForDeletions(
  originalSentence: string,
  originalSectionRef: string,
  referenceSectionsText: string,
  referenceSectionsRef: string[],
  referenceStructure: SectionNode[],
  context: Context
): Promise<{
  item: DeletionItem | null;
  apiCallsUsed: number;
}> {
  let apiCallsUsed = 0;

  const potentialDeletions = await identifyPotentialDeletions(originalSentence, referenceSectionsText, context);
  apiCallsUsed++;

  if (potentialDeletions.result === 'SAME') {
    return { item: null, apiCallsUsed };
  }

  const globalDeletionMappingResult = await validatePotentialDeletions(originalSentence, referenceStructure, context);
  apiCallsUsed++;

  if (globalDeletionMappingResult.mappedSections[0] === 'NOT FOUND') {
    return {
      item: {
        originalSentence,
        originalSectionRef,
        pointsToAmend: potentialDeletions.pointsToAmend!,
        mappedToReferenceSections: ['NOT FOUND'],
        status: 'confirmed',
        verificationPath: 'not_found',
      },
      apiCallsUsed,
    };
  }

  const isWithinGroup = globalDeletionMappingResult.mappedSections.every((sec) =>
    referenceSectionsRef.some((referenceSectionRef) => normalizeSectionNumber(sec) === normalizeSectionNumber(referenceSectionRef))
  );

  if (isWithinGroup) {
    return {
      item: {
        originalSentence,
        originalSectionRef,
        pointsToAmend: potentialDeletions.pointsToAmend!,
        mappedToReferenceSections: globalDeletionMappingResult.mappedSections,
        status: 'confirmed',
        verificationPath: 'within_group',
      },
      apiCallsUsed,
    };
  }

  const mappedSectionsText = buildFullTextFromSections(referenceStructure, globalDeletionMappingResult.mappedSections);

  const reverifyResult = await reverifyPotentialDeletions(originalSentence, mappedSectionsText, context);
  apiCallsUsed++;

  if (reverifyResult.result === 'SAME') {
    return { item: null, apiCallsUsed };
  }

  return {
    item: {
      originalSentence,
      originalSectionRef,
      pointsToAmend: reverifyResult.pointsToAmend!,
      mappedToReferenceSections: globalDeletionMappingResult.mappedSections,
      status: 'confirmed',
      verificationPath: 'outside_group_verified',
    },
    apiCallsUsed,
  };
}

async function identifyPotentialDeletions(
  originalSentence: string,
  referenceSectionsText: string,
  context: Context
): Promise<{
  result: 'SAME' | 'HAS_AMENDMENTS';
  pointsToAmend?: Rule[];
}> {
  const { systemPrompt, userPrompt } = identifyPotentialDeletionsPrompt(
    originalSentence,
    referenceSectionsText
  );

  try {
    const response = await generateTextDirect(
      systemPrompt,
      userPrompt,
      { model: 'gpt-4o', temperature: 0.3, maxTokens: 1000 }
    );

    const parsed = parsePotentialDeletionsResponse(response);

    return parsed;
  } catch (error) {
    logger.error({ error }, 'Failed to identify points to amend');
    return {
      result: 'SAME',
    };
  }
}

async function validatePotentialDeletions(
  originalSentence: string,
  referenceStructure: SectionNode[],
  context: Context
): Promise<{ mappedSections: string[] }> {
  const referenceFullText = buildFullTextFromSections(
    referenceStructure,
    referenceStructure.filter((n) => n.level === 1).map((n) => n.sectionNumber)
  );

  const { systemPrompt, userPrompt } = validatePotentialDeletionsPrompt(
    originalSentence,
    referenceFullText
  );

  try {
    const response = await generateTextDirect(
      systemPrompt,
      userPrompt,
      { model: 'gpt-4o', temperature: 0.3, maxTokens: 500 }
    );

    const mappedSections = parseGlobalDeletionMappingResponse(response);

    return {
      mappedSections,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to find mapped reference sections');
    return {
      mappedSections: ['NOT FOUND'],
    };
  }
}

async function reverifyPotentialDeletions(
  originalSentence: string,
  mappedSectionsText: string,
  context: Context
): Promise<{
  result: 'SAME' | 'HAS_AMENDMENTS';
  pointsToAmend?: Rule[];
}> {
  const { systemPrompt, userPrompt } = reverifyPotentialDeletionsPrompt(
    originalSentence,
    mappedSectionsText
  );

  try {
    const response = await generateTextDirect(
      systemPrompt,
      userPrompt,
      { model: 'gpt-4o', temperature: 0.3, maxTokens: 1000 }
    );

    const parsed = parsePotentialDeletionsResponse(response);

    return parsed;
  } catch (error) {
    logger.error({ error }, 'Failed to compare with mapped reference sections');
    return {
      result: 'SAME',
    };
  }
}

// ===========================================
// STEP 4: CONSOLIDATE ADDITIONS AND DELETIONS
// ===========================================

export function consolidateAdditionsAndDeletions(
  additionsComparisons: GroupAdditionResult[],
  deletionsComparisons: GroupDeletionResult[],
  groupedMappings: GroupedMapping[],
  originalStructure: SectionNode[],
  referenceStructure: SectionNode[]
): ConsolidatedResponse {
  const additions: Rule[] = [];
  const deletions: Rule[] = [];
  const ruleMetadata: { [ruleId: string]: RuleMetadata } = {};

  let additionNumber = 1;

  for (const group of additionsComparisons) {
    for (const item of group.additions) {
      for (const rule of item.pointsToAdd) {
        const ruleId = `addition-${additionNumber++}`;

        additions.push({
          id: ruleId,
          content: rule.content,
          example: rule.example,
        });

        ruleMetadata[ruleId] = {
          referenceSectionRef: item.referenceSectionRef,
        };
      }
    }
  }

  for (const mapping of groupedMappings) {
    if (mapping.originalSection === 'NOT FOUND' && !mapping.referenceSections.includes('NOT FOUND')) {
      for (const refSection of mapping.referenceSections) {
        const sectionText = buildFullTextFromSections(referenceStructure, [refSection]);
        if (sectionText.trim()) {
          const ruleId = `addition-${additionNumber++}`;

          additions.push({
            id: ruleId,
            content: `Insert: "${sectionText}"`,
            example: sectionText,
          });

          ruleMetadata[ruleId] = {
            referenceSectionRef: refSection,
          };

        }
      }
    }
  }

  let deletionNumber = 1;

  for (const group of deletionsComparisons) {
    for (const item of group.deletions) {
      for (const rule of item.pointsToAmend) {
        const ruleId = `deletion-${deletionNumber++}`;

        deletions.push({
          id: ruleId,
          content: rule.content,
          example: rule.example,
        });

        ruleMetadata[ruleId] = {};
      }
    }
  }

  for (const mapping of groupedMappings) {
    if (mapping.referenceSections.includes('NOT FOUND') && mapping.originalSection !== 'NOT FOUND') {
      const origSection = mapping.originalSection;
      const sectionText = buildFullTextFromSections(originalStructure, [origSection]);
      if (sectionText.trim()) {
        const ruleId = `deletion-${deletionNumber++}`;

        deletions.push({
          id: ruleId,
          content: `Delete: "${sectionText}"`,
          example: sectionText,
        });

        ruleMetadata[ruleId] = {};
      }
    }
  }

  logger.info(
    {
      totalAdditions: additions.length,
      totalDeletions: deletions.length,
      metadataEntries: Object.keys(ruleMetadata).length,
    },
    'Step 4: Consolidation of additions and deletions completed'
  );

  return {
    success: true,
    additions,
    deletions,
    ruleMetadata,
    metadata: {
      totalAdditions: additions.length,
      totalDeletions: deletions.length,
      totalItems: additions.length + deletions.length,
    },
  };
}

// ========================================
// STEP 5: MAP TO SECTIONS 
// ========================================

export async function mapAdditionsAndDeletionsToSections(
  additions: Rule[],
  deletions: Rule[],
  structure: SectionNode[],
  context: Context
): Promise<any> {
  const allRules = [...additions, ...deletions];

  logger.info(
    { totalRules: allRules.length },
    'Step 5: Starting mapping additions and deletions to sections'
  );

  // STEP 5.1: INITIAL MAPPING

  const initialMappingResult = await mapRulesParallel(structure, allRules, 10, 3, context);

  // STEP 5.2: IDENTIFY UNMAPPED RULES IN THE INITIAL MAPPING

    const unmappedRuleIds = initialMappingResult.ruleStatus
      .filter(s => s.status === 'not_applicable')
      .map(s => s.ruleId);

    const unmappedRules = allRules.filter(rule => unmappedRuleIds.includes(rule.id));

    logger.info(
      { 
        totalMapped: allRules.length - unmappedRules.length,
        totalUnmapped: unmappedRules.length,
        unmappedRuleIds
      },
      'Identified unmapped rules'
    );

  // STEP 5.3: RETRY UNMAPPED RULES WITH ENHANCED PROMPT

  if (unmappedRules.length > 0) {
    logger.info('Step 5.3: Retrying unmapped rules with enhanced prompts');
    
    const retryMappingResult = await mapRulesParallel(
      structure, 
      unmappedRules, 
      10, 
      3, 
      context,
      true
    );

    const retriedSuccessfullyIds = retryMappingResult.ruleStatus
      .filter(s => s.status === 'mapped' || s.status === 'needs_new_section')
      .map(s => s.ruleId);

    logger.info(
      { 
        retriedCount: unmappedRules.length,
        retriedSuccessfully: retriedSuccessfullyIds.length,
        stillUnmapped: unmappedRules.length - retriedSuccessfullyIds.length,
        discardedRuleIds: unmappedRuleIds.filter(id => !retriedSuccessfullyIds.includes(id))
      },
      'Retry mapping complete'  
    );
  
  // STEP 5.4: MERGE RESULTS FROM THE INITIAL MAPPING AND RETRY

  for (const retryStatus of retryMappingResult.ruleStatus) {
      if (retryStatus.status === 'mapped' || retryStatus.status === 'needs_new_section') {
        const oldIndex = initialMappingResult.ruleStatus.findIndex(
          s => s.ruleId === retryStatus.ruleId
        );
        if (oldIndex !== -1) {
          initialMappingResult.ruleStatus.splice(oldIndex, 1);
        }

        initialMappingResult.ruleStatus.push(retryStatus);
      }
    }  

    for (const retrySection of retryMappingResult.annotatedOutline) {
      if (retrySection.rules && retrySection.rules.length > 0) {
        const originalSection = initialMappingResult.annotatedOutline.find(
          s => s.sectionNumber === retrySection.sectionNumber
        );
        if (originalSection) {
          originalSection.rules = [
            ...(originalSection.rules || []),
            ...retrySection.rules
          ];
        }
      }
    }

    initialMappingResult.newSections = [
      ...initialMappingResult.newSections,
      ...retryMappingResult.newSections
    ];

    const existingOrder = new Set(initialMappingResult.processingOrder);
    for (const section of retryMappingResult.processingOrder) {
      if (!existingOrder.has(section)) {
        initialMappingResult.processingOrder.push(section);
      }
    }
  }

  const finalRuleStatus = initialMappingResult.ruleStatus.filter(
    s => s.status !== 'not_applicable'
  );

  const discardedCount = initialMappingResult.ruleStatus.length - finalRuleStatus.length;
  
  initialMappingResult.ruleStatus = finalRuleStatus;

  logger.info(
    { 
      finalMappedCount: finalRuleStatus.length,
      discardedCount,
      finalStatuses: finalRuleStatus.map(s => ({ ruleId: s.ruleId, status: s.status }))
    },
    'Step 5: Mapping complete'
  );

  return initialMappingResult;
}

// ========================================
// STEP 6: GENERATE AMENDMENTS 
// ========================================

export async function generateAllAmendments(
  mappingResult: any,
  additions: Rule[],
  deletions: Rule[],
  structure: SectionNode[],
  context: Context
): Promise<{
  amendments: any[];
  newSections: any[];
}> {
  const allRules = [...additions, ...deletions];

  logger.info('Step 6: Starting amendment generation');

  const sectionsWithRules = extractSectionsWithRules(mappingResult.annotatedOutline);

  const [amendments, newSections] = await Promise.all([
    sectionsWithRules.length > 0
      ? generateAmendmentsParallel(
          sectionsWithRules,
          allRules,
          mappingResult.processingOrder,
          structure,
          3,
          context
        )
      : Promise.resolve([]),

    mappingResult.newSections.length > 0
      ? generateNewSections(mappingResult.newSections, allRules, structure, 3, context)
      : Promise.resolve([]),
  ]);

  logger.info(
    {
      amendmentsCount: amendments.filter(a => a.success).length,
      newSectionsCount: newSections.filter(a => a.success).length,
    },
    'Step 6: Amendment generation complete'
  );

  return {
    amendments,
    newSections,
  };
}

// ========================================
// STEP 7: FORMAT FOR UI
// ========================================

export function formatResultsForUI(
  amendmentResults: any[],
  newSectionResults: any[],
  ruleMetadata: { [ruleId: string]: RuleMetadata }  
): Array<{
  change_type: 'addition' | 'deletion';
  original_section: string;
  reference_section: string | null;
  original_language: string;
  amended_language: string;
  isFullDeletion?: boolean;
}> {
  const results: Array<{
    change_type: 'addition' | 'deletion';
    original_section: string;
    reference_section: string | null;
    original_language: string;
    amended_language: string;
    isFullDeletion?: boolean;
  }> = [];

  for (const result of amendmentResults) {
    if (!result.success || !result.result?.amendment) continue;

    const amendment = result.result.amendment;
    const appliedRules = amendment.appliedRules || [];

    for (const ruleId of appliedRules) {
      const metadata = ruleMetadata[ruleId];
      const changeType = ruleId.startsWith('addition-') ? 'addition' : 'deletion';
      
      results.push({
        change_type: changeType,
        original_section: result.sectionNumber,
        reference_section: metadata?.referenceSectionRef || null,
        original_language: amendment.original,
        amended_language: amendment.amended,
        isFullDeletion: amendment.isFullDeletion || false,
      });
    }
  }

  for (const result of newSectionResults) {
    if (!result.success || !result.result?.amendment) continue;

    const amendment = result.result.amendment;
    const appliedRules = amendment.appliedRules || [];

    for (const ruleId of appliedRules) {
      const metadata = ruleMetadata[ruleId];
      const changeType = ruleId.startsWith('addition-') ? 'addition' : 'deletion';
      
      results.push({
        change_type: changeType,
        original_section: result.sectionNumber,  
        reference_section: metadata?.referenceSectionRef || null,
        original_language: amendment.original,   
        amended_language: amendment.amended,     
      });
    }
  }

  logger.info(
    {
      totalChanges: results.length,
      additions: results.filter(r => r.change_type === 'addition').length,
      deletions: results.filter(r => r.change_type === 'deletion').length,
    },
    'Step 7: Results formatted for UI'
  );

  return results;
}