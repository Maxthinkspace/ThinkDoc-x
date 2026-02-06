import type { Context } from 'hono';
import type { SectionNode } from '@/types/documents';
import { logger } from '@/config/logger';
import { generateTextDirect } from '@/controllers/generate';
import {
  getJurisdictionRequirements,
  getClausesToRemove,
  getClausesToAdd,
} from './jurisdictionConfig';
import {
  buildRedomicileAnalysisPrompt,
  buildRedomicileDraftPrompt,
} from '@/controllers/redomicile-prompts';

// ============================================
// TYPES
// ============================================

export interface RedomicileRequest {
  originalStructure: SectionNode[];
  sourceJurisdiction: string;
  targetJurisdiction: string;
  documentType: string;
  additionalGuidance?: string;
}

export interface RedomiciledSection {
  sectionNumber: string;
  sectionHeading: string;
  content: string;
  sourceSectionRef?: string;
  isNewSection: boolean;
  notes?: string;
}

export interface RedomicileResponse {
  success: boolean;
  sections: RedomiciledSection[];
  metadata: {
    removedClauses: string[];
    addedClauses: string[];
    adaptedClauses: string[];
  };
}

// ============================================
// STEP 1: ANALYZE DOCUMENT
// ============================================

export async function analyzeDocument(
  originalStructure: SectionNode[],
  sourceJurisdiction: string,
  targetJurisdiction: string,
  documentType: string,
  context: Context
): Promise<{
  analysis: {
    sectionsToRemove: string[];
    sectionsToAdapt: Array<{ sectionNumber: string; reason: string }>;
    sectionsToAdd: Array<{ sectionHeading: string; reason: string }>;
  };
  apiCallsMade: number;
}> {
  logger.info(
    { sourceJurisdiction, targetJurisdiction, documentType },
    'Step 1: Analyzing document for redomicile'
  );

  const { systemPrompt, userPrompt } = buildRedomicileAnalysisPrompt(
    originalStructure,
    sourceJurisdiction,
    targetJurisdiction,
    documentType
  );

  const response = await generateTextDirect(
    systemPrompt,
    userPrompt,
    { model: 'gpt-4o', temperature: 0.3, maxTokens: 4000 }
  );

  const analysis = parseAnalysisResponse(response);

  logger.info(
    { 
      sectionsToRemove: analysis.sectionsToRemove.length,
      sectionsToAdapt: analysis.sectionsToAdapt.length,
      sectionsToAdd: analysis.sectionsToAdd.length,
    },
    'Step 1: Analysis complete'
  );

  return { analysis, apiCallsMade: 1 };
}

function parseAnalysisResponse(response: string): {
  sectionsToRemove: string[];
  sectionsToAdapt: Array<{ sectionNumber: string; reason: string }>;
  sectionsToAdd: Array<{ sectionHeading: string; reason: string }>;
} {
  try {
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim());

    return {
      sectionsToRemove: parsed.sectionsToRemove || [],
      sectionsToAdapt: parsed.sectionsToAdapt || [],
      sectionsToAdd: parsed.sectionsToAdd || [],
    };
  } catch (error) {
    logger.error({ error, response: response.substring(0, 500) }, 'Failed to parse analysis response');
    // Return empty analysis on error
    return {
      sectionsToRemove: [],
      sectionsToAdapt: [],
      sectionsToAdd: [],
    };
  }
}

// ============================================
// STEP 2: DRAFT SECTIONS
// ============================================

export async function draftSections(
  originalStructure: SectionNode[],
  analysis: {
    sectionsToRemove: string[];
    sectionsToAdapt: Array<{ sectionNumber: string; reason: string }>;
    sectionsToAdd: Array<{ sectionHeading: string; reason: string }>;
  },
  sourceJurisdiction: string,
  targetJurisdiction: string,
  documentType: string,
  additionalGuidance?: string,
  batchSize: number = 3
): Promise<{ sections: RedomiciledSection[]; apiCallsMade: number }> {
  logger.info(
    { 
      sectionsToAdapt: analysis.sectionsToAdapt.length,
      sectionsToAdd: analysis.sectionsToAdd.length,
    },
    'Step 2: Drafting sections'
  );

  const sections: RedomiciledSection[] = [];
  let apiCallsMade = 0;

  // Draft adapted sections
  for (let i = 0; i < analysis.sectionsToAdapt.length; i += batchSize) {
    const batch = analysis.sectionsToAdapt.slice(i, i + batchSize);

    const batchPromises = batch.map(async (item) => {
      const originalSection = findSectionByNumber(originalStructure, item.sectionNumber);
      if (!originalSection) {
        logger.warn({ sectionNumber: item.sectionNumber }, 'Section not found for adaptation');
        return null;
      }

      const { systemPrompt, userPrompt } = buildRedomicileDraftPrompt(
        originalSection,
        sourceJurisdiction,
        targetJurisdiction,
        documentType,
        item.reason,
        additionalGuidance,
        false // isNewSection
      );

      const response = await generateTextDirect(
        systemPrompt,
        userPrompt,
        { model: 'gpt-4o', temperature: 0.3, maxTokens: 4000 }
      );

      return parseDraftResponse(response, item.sectionNumber, false);
    });

    const batchResults = await Promise.all(batchPromises);
    sections.push(...batchResults.filter((s): s is RedomiciledSection => s !== null));
    apiCallsMade += batch.length;
  }

  // Draft new sections
  for (let i = 0; i < analysis.sectionsToAdd.length; i += batchSize) {
    const batch = analysis.sectionsToAdd.slice(i, i + batchSize);

    const batchPromises = batch.map(async (item) => {
      const { systemPrompt, userPrompt } = buildRedomicileDraftPrompt(
        null,
        sourceJurisdiction,
        targetJurisdiction,
        documentType,
        item.reason,
        additionalGuidance,
        true // isNewSection
      );

      const response = await generateTextDirect(
        systemPrompt,
        userPrompt,
        { model: 'gpt-4o', temperature: 0.3, maxTokens: 4000 }
      );

      return parseDraftResponse(response, item.sectionHeading, true);
    });

    const batchResults = await Promise.all(batchPromises);
    sections.push(...batchResults.filter((s): s is RedomiciledSection => s !== null));
    apiCallsMade += batch.length;
  }

  logger.info(
    { totalSections: sections.length },
    'Step 2: Sections drafted'
  );

  return { sections, apiCallsMade };
}

function findSectionByNumber(structure: SectionNode[], sectionNumber: string): SectionNode | null {
  const search = (nodes: SectionNode[]): SectionNode | null => {
    for (const node of nodes) {
      if (node.sectionNumber === sectionNumber) {
        return node;
      }
      if (node.children) {
        const found = search(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  return search(structure);
}

function parseDraftResponse(
  response: string,
  identifier: string,
  isNewSection: boolean
): RedomiciledSection | null {
  try {
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim());

    return {
      sectionNumber: parsed.sectionNumber || '',
      sectionHeading: parsed.sectionHeading || identifier,
      content: parsed.content || '',
      sourceSectionRef: parsed.sourceSectionRef,
      isNewSection,
      notes: parsed.notes,
    };
  } catch (error) {
    logger.error({ error, response: response.substring(0, 500) }, 'Failed to parse draft response');
    return null;
  }
}

// ============================================
// STEP 3: ASSEMBLE METADATA
// ============================================

export function assembleMetadata(
  analysis: {
    sectionsToRemove: string[];
    sectionsToAdapt: Array<{ sectionNumber: string; reason: string }>;
    sectionsToAdd: Array<{ sectionHeading: string; reason: string }>;
  },
  sourceJurisdiction: string,
  targetJurisdiction: string,
  documentType: string
): {
  removedClauses: string[];
  addedClauses: string[];
  adaptedClauses: string[];
} {
  const removedClauses = [
    ...analysis.sectionsToRemove,
    ...getClausesToRemove(sourceJurisdiction, targetJurisdiction),
  ];

  const addedClauses = [
    ...analysis.sectionsToAdd.map(s => s.sectionHeading),
    ...getClausesToAdd(targetJurisdiction, documentType).map(r => r.description),
  ];

  const adaptedClauses = analysis.sectionsToAdapt.map(s => 
    `Section ${s.sectionNumber}: ${s.reason}`
  );

  return {
    removedClauses: [...new Set(removedClauses)],
    addedClauses: [...new Set(addedClauses)],
    adaptedClauses,
  };
}

