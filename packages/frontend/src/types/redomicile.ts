export interface RedomiciledSection {
  sectionNumber: string;
  sectionHeading: string;
  content: string;
  sourceSectionRef?: string;
  isNewSection: boolean;
  notes?: string;
}

export interface ClauseChange {
  sectionNumber: string;
  reason: string;
}

export interface RedomicileMetadata {
  removedClauses: ClauseChange[];
  addedClauses: ClauseChange[];
  adaptedClauses: ClauseChange[];
}