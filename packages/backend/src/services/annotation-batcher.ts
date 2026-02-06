import { logger } from '@/config/logger';
import { buildFullSectionText, findTopLevelSection } from '@/services/sentence-extractor';
import type { SectionNode } from '@/types/documents';
import type { ClassifierOutput, FullClassificationOutput } from '@/types/annotation-classifier';
import type {
  NormalizedAnnotation,
  SentenceGroup,
  Batch,
  CommentForLLM,
  HighlightForLLM,
  TrackChangeForLLM,
} from '@/types/playbook-generation';

// ============================================
// BATCH CONFIGURATION
// ============================================

export interface BatchConfig {
  maxAnnotationsPerGroup: number;
  maxAnnotationsPerBatch: number;
  includeFullSectionContext: boolean;
}

export const PLAYBOOK_BATCH_CONFIG: BatchConfig = {
  maxAnnotationsPerGroup: 5,
  maxAnnotationsPerBatch: 8,
  includeFullSectionContext: true,
};

export const SUMMARY_BATCH_CONFIG: BatchConfig = {
  maxAnnotationsPerGroup: 10,
  maxAnnotationsPerBatch: 15,
  includeFullSectionContext: true,
};

export const EXPLAINER_BATCH_CONFIG: BatchConfig = {
  maxAnnotationsPerGroup: 5,
  maxAnnotationsPerBatch: 5,
  includeFullSectionContext: true,
};

// ============================================
// SPLIT BY CLASSIFIER CATEGORY
// ============================================

export interface SplitAnnotations {
  substantive: NormalizedAnnotation[];
  query: NormalizedAnnotation[];
}

/**
 * Split annotations by classifier category (S vs Q).
 * E annotations should already be filtered out before calling this.
 */
export function splitAnnotationsByCategory(
  annotations: NormalizedAnnotation[],
  classifierOutput: ClassifierOutput
): SplitAnnotations {
  const substantive: NormalizedAnnotation[] = [];
  const query: NormalizedAnnotation[] = [];

  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i];
    if (!annotation) continue;

    const result = classifierOutput.results.find((r) => r.index === i + 1);
    if (!result) {
      // Default to substantive if no classification found
      substantive.push(annotation);
      continue;
    }

    if (result.category === 'S') {
      substantive.push(annotation);
    } else if (result.category === 'Q') {
      query.push(annotation);
    }
    // E annotations are skipped (should be filtered upstream)
  }

  return { substantive, query };
}

/**
 * Split annotations by category using full classification (with condition info)
 */
export function splitAnnotationsByCategoryFull(
  annotations: NormalizedAnnotation[],
  fullClassification: FullClassificationOutput
): { substantive: NormalizedAnnotation[]; query: NormalizedAnnotation[]; editorial: NormalizedAnnotation[] } {
  const substantive: NormalizedAnnotation[] = [];
  const query: NormalizedAnnotation[] = [];
  const editorial: NormalizedAnnotation[] = [];

  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i];
    if (!annotation) continue;

    const originalIndex = annotation.originalIndex || (i + 1);
    const classResult = fullClassification.results.find(r => r.index === originalIndex);
    const category = classResult?.category || 'S';

    switch (category) {
      case 'S':
        substantive.push(annotation);
        break;
      case 'Q':
        query.push(annotation);
        break;
      case 'E':
        editorial.push(annotation);
        break;
    }
  }

  return { substantive, query, editorial };
}

// ============================================
// GROUPING BY SENTENCE OVERLAP
// ============================================

/**
 * Group annotations that share any sentence.
 * Annotations affecting overlapping sentences must be processed together.
 */
export function groupAnnotationsBySentence(
  annotations: NormalizedAnnotation[]
): SentenceGroup[] {
  const annotationsWithSentences = annotations.filter((a) => a.sentenceIds.length > 0);
  const annotationsOutsideSentences = annotations.filter((a) => a.sentenceIds.length === 0);

  const groups: {
    annotations: NormalizedAnnotation[];
    sentenceIds: Set<string>;
  }[] = [];

  for (const annotation of annotationsWithSentences) {
    const annotationSentenceIds = new Set(annotation.sentenceIds);

    const overlappingGroupIndices: number[] = [];
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (!group) continue;

      for (const sentenceId of annotationSentenceIds) {
        if (group.sentenceIds.has(sentenceId)) {
          overlappingGroupIndices.push(i);
          break;
        }
      }
    }

    if (overlappingGroupIndices.length === 0) {
      groups.push({
        annotations: [annotation],
        sentenceIds: annotationSentenceIds,
      });
    } else if (overlappingGroupIndices.length === 1) {
      const groupIndex = overlappingGroupIndices[0]!;
      const group = groups[groupIndex]!;
      group.annotations.push(annotation);
      for (const sentenceId of annotationSentenceIds) {
        group.sentenceIds.add(sentenceId);
      }
    } else {
      const mergedAnnotations: NormalizedAnnotation[] = [annotation];
      const mergedSentenceIds = new Set(annotationSentenceIds);

      for (const groupIndex of overlappingGroupIndices) {
        const group = groups[groupIndex]!;
        mergedAnnotations.push(...group.annotations);
        for (const sentenceId of group.sentenceIds) {
          mergedSentenceIds.add(sentenceId);
        }
      }

      for (let i = overlappingGroupIndices.length - 1; i >= 0; i--) {
        const groupIndex = overlappingGroupIndices[i]!;
        groups.splice(groupIndex, 1);
      }

      groups.push({
        annotations: mergedAnnotations,
        sentenceIds: mergedSentenceIds,
      });
    }
  }

  const sentenceGroups: SentenceGroup[] = [];
  let groupIdCounter = 0;

  for (const group of groups) {
    const sentences = new Map<string, string>();

    for (const annotation of group.annotations) {
      if (annotation.type === 'comment') {
        const data = annotation.data as CommentForLLM;
        data.affectedSentences.forEach((sentence, idx) => {
          const sentenceId = annotation.sentenceIds[idx];
          if (sentenceId) {
            sentences.set(sentenceId, sentence);
          }
        });
      } else if (annotation.type === 'highlight') {
        const data = annotation.data as HighlightForLLM;
        data.affectedSentences.forEach((sentence, idx) => {
          const sentenceId = annotation.sentenceIds[idx];
          if (sentenceId) {
            sentences.set(sentenceId, sentence);
          }
        });
      } else if (annotation.type === 'wordLevelTrackchange') {
        const data = annotation.data as TrackChangeForLLM;
        const sentenceId = annotation.sentenceIds[0];
        if (sentenceId) {
          sentences.set(sentenceId, data.amendedSentence);
        }
      }
    }

    const topLevelCounts = new Map<string, number>();
    for (const annotation of group.annotations) {
      const sectionNum = annotation.topLevelSectionNumber;
      const count = topLevelCounts.get(sectionNum) ?? 0;
      topLevelCounts.set(sectionNum, count + 1);
    }

    const topLevelEntries = [...topLevelCounts.entries()];
    const sortedEntries = topLevelEntries.sort((a, b) => b[1] - a[1]);
    const topLevelSectionNumber = sortedEntries[0]?.[0] ?? 'unknown';

    sentenceGroups.push({
      groupId: `group-${groupIdCounter++}`,
      sentenceIds: Array.from(group.sentenceIds),
      sentences,
      annotations: group.annotations,
      topLevelSectionNumber,
    });
  }

  // Group full-sentence changes by section
  const fullSentenceBySection = new Map<string, NormalizedAnnotation[]>();
  
  for (const annotation of annotationsOutsideSentences) {
    const section = annotation.topLevelSectionNumber;
    if (!fullSentenceBySection.has(section)) {
      fullSentenceBySection.set(section, []);
    }
    fullSentenceBySection.get(section)!.push(annotation);
  }
  
  for (const [section, sectionAnnotations] of fullSentenceBySection) {
    sentenceGroups.push({
      groupId: `group-${groupIdCounter++}`,
      sentenceIds: [],
      sentences: new Map(),
      annotations: sectionAnnotations,
      topLevelSectionNumber: section,
    });
  }

  return sentenceGroups;
}

// ============================================
// BATCH CREATION
// ============================================

/**
 * Create batches from sentence groups using provided config.
 */
export function createBatches(
  sentenceGroups: SentenceGroup[],
  structure: SectionNode[],
  config: BatchConfig
): Batch[] {
  const groupsBySection = new Map<string, SentenceGroup[]>();
  for (const group of sentenceGroups) {
    const section = group.topLevelSectionNumber;
    if (!groupsBySection.has(section)) {
      groupsBySection.set(section, []);
    }
    groupsBySection.get(section)!.push(group);
  }

  const batches: Batch[] = [];
  let batchIdCounter = 0;

  for (const [sectionNumber, groups] of groupsBySection) {
    const topLevelSection = findTopLevelSection(sectionNumber, structure);
    const context = config.includeFullSectionContext && topLevelSection
      ? buildFullSectionText(topLevelSection)
      : `Section ${sectionNumber}`;

    const batchChunks: SentenceGroup[] = [];

    for (const group of groups) {
      if (group.annotations.length <= config.maxAnnotationsPerGroup) {
        batchChunks.push(group);
      } else {
        const splitGroups = splitGroup(group, config.maxAnnotationsPerGroup);
        batchChunks.push(...splitGroups);
      }
    }

    const combinedBatches = combineSmallGroups(batchChunks, config.maxAnnotationsPerBatch);

    for (const batchGroups of combinedBatches) {
      batches.push(buildBatch(batchGroups, context, sectionNumber, batchIdCounter++));
    }
  }

  return batches;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function splitGroup(group: SentenceGroup, maxSize: number): SentenceGroup[] {
  const chunks: SentenceGroup[] = [];
  const annotations = group.annotations;

  for (let i = 0; i < annotations.length; i += maxSize) {
    const chunkAnnotations = annotations.slice(i, i + maxSize);

    const chunkSentenceIds = new Set<string>();
    const chunkSentences = new Map<string, string>();

    for (const annotation of chunkAnnotations) {
      for (const sentenceId of annotation.sentenceIds) {
        chunkSentenceIds.add(sentenceId);
        const sentenceText = group.sentences.get(sentenceId);
        if (sentenceText) {
          chunkSentences.set(sentenceId, sentenceText);
        }
      }
    }

    chunks.push({
      groupId: `${group.groupId}-chunk-${chunks.length}`,
      sentenceIds: Array.from(chunkSentenceIds),
      sentences: chunkSentences,
      annotations: chunkAnnotations,
      topLevelSectionNumber: group.topLevelSectionNumber,
    });
  }

  return chunks;
}

function combineSmallGroups(
  groups: SentenceGroup[],
  maxCombinedSize: number
): SentenceGroup[][] {
  const result: SentenceGroup[][] = [];
  const sortedGroups = [...groups].sort(
    (a, b) => a.annotations.length - b.annotations.length
  );

  const used = new Set<number>();

  for (let i = 0; i < sortedGroups.length; i++) {
    if (used.has(i)) continue;

    const currentBatch: SentenceGroup[] = [];
    const firstGroup = sortedGroups[i]!;
    currentBatch.push(firstGroup);
    used.add(i);

    let currentSize = firstGroup.annotations.length;

    for (let j = i + 1; j < sortedGroups.length; j++) {
      if (used.has(j)) continue;

      const candidateGroup = sortedGroups[j]!;
      const candidateSize = candidateGroup.annotations.length;

      if (currentSize + candidateSize <= maxCombinedSize) {
        currentBatch.push(candidateGroup);
        used.add(j);
        currentSize += candidateSize;
      }
    }

    result.push(currentBatch);
  }

  return result;
}

function buildBatch(
  groups: SentenceGroup[],
  context: string,
  sectionNumber: string,
  batchId: number
): Batch {
  const allAnnotations: NormalizedAnnotation[] = [];
  const allSentences = new Map<string, string>();

  for (const group of groups) {
    allAnnotations.push(...group.annotations);
    for (const [id, text] of group.sentences) {
      allSentences.set(id, text);
    }
  }

  return {
    batchId: `batch-${batchId}`,
    topLevelSectionNumber: sectionNumber,
    context,
    sentences: Array.from(allSentences.values()),
    annotations: allAnnotations,
  };
}