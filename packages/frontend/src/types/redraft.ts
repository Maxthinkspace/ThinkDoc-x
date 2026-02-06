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

export interface SkeletonSection {
  newSectionNumber: string;
  newSectionHeading: string;
  oldSectionNumbers: string[];
  oldSectionHeadings: string[];
  isLegalSection: boolean;
  restructuringNotes?: string;
}

export interface RedraftConfig {
  targetJurisdiction: string;
  targetLegalSystem: string;
  preserveBusinessTerms: boolean;
  additionalGuidance?: string;
}