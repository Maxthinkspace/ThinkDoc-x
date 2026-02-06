import type { Context } from 'hono';
import type { SectionNode } from '@/types/documents';
import { logger } from '@/config/logger';
import { generateTextDirect } from '@/controllers/generate';
import {
  buildSkeletonPrompt,
  buildDraftSectionPrompt,
} from '@/controllers/redraft-prompts';

// ============================================
// TYPES
// ============================================

export interface RedraftRequest {
  originalStructure: SectionNode[];
  instructions: {
    targetJurisdiction: string;
    targetLegalSystem: string;
    preserveBusinessTerms: boolean;
    additionalGuidance?: string;
  };
}

export interface SkeletonSection {
  newSectionNumber: string;
  newSectionHeading: string;
  oldSectionNumbers: string[];
  oldSectionHeadings: string[];
  isLegalSection: boolean;
  restructuringNotes?: string;
}

export interface DraftedSentence {
  text: string;
  footnoteNumber?: number;
  footnoteType: 'original' | 'addition';
  footnoteContent: string;
  originalSectionRef?: string;
}

export interface DraftedClause {
  clauseNumber: string;
  clauseHeading?: string;
  sentences: DraftedSentence[];
}

export interface DraftedSection {
  sectionNumber: string;
  sectionHeading: string;
  clauses: DraftedClause[];
}

export interface RedraftResponse {
  success: boolean;
  skeleton: SkeletonSection[];
  draftedSections: DraftedSection[];
  metadata: {
    totalSections: number;
    totalApiCalls: number;
    processingTimeMs: number;
  };
}

// ============================================
// STEP 1: GENERATE SKELETON
// ============================================

export async function generateSkeleton(
  originalStructure: SectionNode[],
  instructions: RedraftRequest['instructions'],
  context: Context
): Promise<{ skeleton: SkeletonSection[]; apiCallsMade: number }> {
  logger.info(
    { sectionCount: originalStructure.length },
    'Step 1: Generating restructuring skeleton'
  );

  const { systemPrompt, userPrompt } = buildSkeletonPrompt(originalStructure, instructions);

  const response = await generateTextDirect(
    systemPrompt,
    userPrompt,
    { model: 'gpt-4o', temperature: 0.3, maxTokens: 4000 }
  );

  const skeleton = parseSkeletonResponse(response);

  logger.info(
    { skeletonSections: skeleton.length },
    'Step 1: Skeleton generated'
  );

  return { skeleton, apiCallsMade: 1 };
}

function parseSkeletonResponse(response: string): SkeletonSection[] {
  try {
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim());

    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }

    return parsed.map((item: any) => ({
      newSectionNumber: item.newSectionNumber || '',
      newSectionHeading: item.newSectionHeading || '',
      oldSectionNumbers: item.oldSectionNumbers || [],
      oldSectionHeadings: item.oldSectionHeadings || [],
      isLegalSection: item.isLegalSection || false,
      restructuringNotes: item.restructuringNotes,
    }));
  } catch (error) {
    logger.error({ error, response: response.substring(0, 500) }, 'Failed to parse skeleton response');
    throw new Error('Failed to parse skeleton response');
  }
}

// ============================================
// STEP 2: DRAFT SECTIONS IN PARALLEL
// ============================================

export async function draftSectionsParallel(
  skeleton: SkeletonSection[],
  originalStructure: SectionNode[],
  instructions: RedraftRequest['instructions'],
  batchSize: number = 5
): Promise<{ draftedSections: DraftedSection[]; apiCallsMade: number }> {
  logger.info(
    { totalSections: skeleton.length, batchSize },
    'Step 2: Drafting sections in parallel'
  );

  const draftedSections: DraftedSection[] = [];
  let apiCallsMade = 0;

  for (let i = 0; i < skeleton.length; i += batchSize) {
    const batch = skeleton.slice(i, i + batchSize);

    const batchPromises = batch.map(skeletonSection =>
      draftSingleSection(skeletonSection, originalStructure, instructions)
    );

    const batchResults = await Promise.all(batchPromises);

    for (const result of batchResults) {
      draftedSections.push(result.section);
      apiCallsMade += result.apiCallsUsed;
    }

    logger.info(
      { processed: Math.min(i + batchSize, skeleton.length), total: skeleton.length },
      'Step 2: Batch complete'
    );
  }

  return { draftedSections, apiCallsMade };
}

async function draftSingleSection(
  skeletonSection: SkeletonSection,
  originalStructure: SectionNode[],
  instructions: RedraftRequest['instructions']
): Promise<{ section: DraftedSection; apiCallsUsed: number }> {
  const originalTexts = extractOriginalTexts(
    originalStructure,
    skeletonSection.oldSectionNumbers
  );

  const { systemPrompt, userPrompt } = buildDraftSectionPrompt(
    skeletonSection,
    originalTexts,
    instructions
  );

  try {
    const response = await generateTextDirect(
      systemPrompt,
      userPrompt,
      { model: 'gpt-4o', temperature: 0.3, maxTokens: 3000 }
    );

    const section = parseDraftSectionResponse(response, skeletonSection);

    return { section, apiCallsUsed: 1 };
  } catch (error) {
    logger.error(
      { error, sectionNumber: skeletonSection.newSectionNumber },
      'Failed to draft section'
    );

    return {
      section: {
        sectionNumber: skeletonSection.newSectionNumber,
        sectionHeading: skeletonSection.newSectionHeading,
        clauses: [],
      },
      apiCallsUsed: 1,
    };
  }
}

function extractOriginalTexts(
  structure: SectionNode[],
  sectionNumbers: string[]
): { sectionNumber: string; text: string }[] {
  const results: { sectionNumber: string; text: string }[] = [];

  const findSection = (nodes: SectionNode[], targetNum: string): SectionNode | null => {
    for (const node of nodes) {
      const normalizedNode = node.sectionNumber.replace(/\.+$/, '').trim();
      const normalizedTarget = targetNum.replace(/\.+$/, '').trim();

      if (normalizedNode === normalizedTarget) {
        return node;
      }
      if (node.children) {
        const found = findSection(node.children, targetNum);
        if (found) return found;
      }
    }
    return null;
  };

  const collectChildrenText = (children: SectionNode[]): string => {
    let text = '';
    for (const child of children) {
      text += `\n${child.sectionNumber} ${child.text || ''}`;
      if (child.additionalParagraphs) {
        text += '\n' + child.additionalParagraphs.join('\n');
      }
      if (child.children) {
        text += collectChildrenText(child.children);
      }
    }
    return text;
  };

  for (const sectionNum of sectionNumbers) {
    const node = findSection(structure, sectionNum);
    if (node) {
      let fullText = `${node.sectionNumber} ${node.text || ''}`;
      if (node.additionalParagraphs) {
        fullText += '\n' + node.additionalParagraphs.join('\n');
      }
      if (node.children) {
        fullText += collectChildrenText(node.children);
      }
      results.push({ sectionNumber: sectionNum, text: fullText });
    }
  }

  return results;
}

function parseDraftSectionResponse(response: string, skeletonSection: SkeletonSection): DraftedSection {
  try {
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim());

    return {
      sectionNumber: parsed.sectionNumber || skeletonSection.newSectionNumber,
      sectionHeading: parsed.sectionHeading || skeletonSection.newSectionHeading,
      clauses: (parsed.clauses || []).map((clause: any) => ({
        clauseNumber: clause.clauseNumber || '',
        clauseHeading: clause.clauseHeading,
        sentences: (clause.sentences || []).map((s: any) => ({
          text: s.text || '',
          footnoteType: s.footnoteType || 'original',
          footnoteContent: s.footnoteContent || '',
          originalSectionRef: s.originalSectionRef,
        })),
      })),
    };
  } catch (error) {
    logger.error({ error, response: response.substring(0, 500) }, 'Failed to parse draft section response');
    return {
      sectionNumber: skeletonSection.newSectionNumber,
      sectionHeading: skeletonSection.newSectionHeading,
      clauses: [],
    };
  }
}

// ============================================
// STEP 3: FORMAT FOR UI
// ============================================

export function formatForUI(
  skeleton: SkeletonSection[],
  draftedSections: DraftedSection[]
): DraftedSection[] {
  let footnoteCounter = 1;

  return draftedSections.map(section => ({
    ...section,
    clauses: section.clauses.map(clause => ({
      ...clause,
      sentences: clause.sentences.map(sentence => ({
        ...sentence,
        footnoteNumber: footnoteCounter++,
      })),
    })),
  }));
}

// ============================================
// MAIN ORCHESTRATOR (alternative to controller workflow)
// ============================================

export async function runRedraftWorkflow(
  request: RedraftRequest,
  context: Context
): Promise<RedraftResponse> {
  const startTime = Date.now();
  let totalApiCalls = 0;

  logger.info('Starting Re-Draft workflow');

  // Step 1
  const { skeleton, apiCallsMade: skeletonCalls } = await generateSkeleton(
    request.originalStructure,
    request.instructions,
    context
  );
  totalApiCalls += skeletonCalls;

  // Step 2
  const { draftedSections, apiCallsMade: draftCalls } = await draftSectionsParallel(
    skeleton,
    request.originalStructure,
    request.instructions
  );
  totalApiCalls += draftCalls;

  // Step 3
  const formattedSections = formatForUI(skeleton, draftedSections);

  const processingTimeMs = Date.now() - startTime;

  logger.info(
    { totalApiCalls, processingTimeMs, sectionsGenerated: formattedSections.length },
    'Re-Draft workflow complete'
  );

  return {
    success: true,
    skeleton,
    draftedSections: formattedSections,
    metadata: {
      totalSections: formattedSections.length,
      totalApiCalls,
      processingTimeMs,
    },
  };
}