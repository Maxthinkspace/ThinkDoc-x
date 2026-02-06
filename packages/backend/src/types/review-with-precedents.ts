import type { SectionNode } from '@/types/documents';
import type { Rule } from '@/types/contract-review';

export interface FlatSection {
  sectionNumber: string;
  text: string;
  fullText: string;
  level: number;
}

export interface MappingResult {
  sourceSection: string;
  targetSections: string[];
}

export interface GroupedMapping {
  originalSection: string;
  referenceSections: string[];
}

export interface MapSectionsResponse {
  success: boolean;
  mappings: GroupedMapping[];
  metadata: {
    totalOriginalSections: number;
    totalReferenceSections: number;
    processingTimeMs: number;
    apiCallsMade: number;
  };
}

export interface AdditionItem {
  referenceSentence: string;
  referenceSectionRef: string;
  pointsToAdd: Rule[];
  mappedToOriginalSection: string[];
  status: string;
  verificationPath: string;
}

export interface GroupAdditionResult {
  groupId: string;
  referenceSections: string[];
  originalSection: string[];
  additions: AdditionItem[];
  sentencesProcessed: number;
  sentencesWithAdditions: number;
  apiCallsMade: number;
}

export interface DetailedAdditionResponse {
  success: boolean;
  comparisons: GroupAdditionResult[];
  metadata: {
    totalGroups: number;
    totalGroupsProcessed: number;
    totalSentencesProcessed: number;
    totalAdditionsFound: number;
    totalApiCalls: number;
    processingTimeMs: number;
  };
}

export interface DeletionItem {
  originalSentence: string;
  originalSectionRef: string;
  pointsToAmend: Rule[];
  mappedToReferenceSections: string[];
  status: string;
  verificationPath: string;
}

export interface GroupDeletionResult {
  groupId: string;
  originalSection: string[];
  referenceSections: string[];
  deletions: DeletionItem[];
  sentencesProcessed: number;
  sentencesWithDeletions: number;
  apiCallsMade: number;
}

export interface DetailedDeletionResponse {
  success: boolean;
  comparisons: GroupDeletionResult[];
  metadata: {
    totalGroups: number;
    totalGroupsProcessed: number;
    totalSentencesProcessed: number;
    totalDeletionsFound: number;
    totalApiCalls: number;
    processingTimeMs: number;
  };
}

export interface ConsolidatedResponse {
  success: boolean;
  additions: Rule[];
  deletions: Rule[];
  ruleMetadata: { [ruleId: string]: RuleMetadata };
  metadata: {
    totalAdditions: number;
    totalDeletions: number;
    totalItems: number;
  };
}

export type RuleMetadata = {
  referenceSectionRef?: string;  // For additions only
};

