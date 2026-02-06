/**
 * TypeScript Type Definitions for Definition Checker
 */

// Document Structure (from frontend parser)
export interface DocumentNode {
  sectionNumber: string;
  text: string;
  level: number;
  additionalParagraphs?: string[];
  children?: DocumentNode[];
}

// Request types
export interface AnalyzeDefinitionsRequest {
  documentStructure: DocumentNode[];
  language?: 'english' | 'chinese';
}

// Response types
export interface DefinitionCheckResult {
  unusedDefinitions: UnusedDefinition[];
  duplicateDefinitions: DuplicateDefinition[];
  undefinedTerms: UndefinedTerm[];
  inconsistentTerms: InconsistentTerm[];
  missingQuoteTerms: MissingQuoteTerm[];
  capitalizationIssues: CapitalizationIssue[];
  summary: DefinitionCheckSummary;
}

export interface UnusedDefinition {
  term: string;
  definitionText: string;
  sectionReference: string;
}

export interface DuplicateDefinition {
  term: string;
  totalOccurrences: number;
  occurrences: TermOccurrence[];
}

export interface UndefinedTerm {
  term: string;
  totalOccurrences: number;
  occurrences: TermOccurrence[];
}

export interface InconsistentTerm {
  term: string;
  totalOccurrences: number;
  definedForm?: string;
  variations: TermVariation[];
}

export interface TermVariation {
  variant: string;
  count: number;
  occurrences: TermOccurrence[];
}

export interface TermOccurrence {
  sentence: string;
  sectionReference: string;
}

export interface MissingQuoteTerm {
  term: string;
  totalOccurrences: number;
  occurrences: TermOccurrence[];  // Where term appears without quotes
}

export interface CapitalizationIssue {
  term: string;
  expectedForm: string;           // The properly capitalized form
  issues: {
    foundForm: string;            // What was found (e.g., "agreement")
    sectionReference: string;
    sentence: string;
  }[];
}

export interface DefinitionCheckSummary {
  totalIssues: number;
  unusedCount: number;
  duplicateCount: number;
  undefinedCount: number;
  inconsistentCount: number;
  missingQuotesCount: number;      // NEW
  capitalizationCount: number;     // NEW
}

// Resolve Duplicate Definitions request/response types
export interface ResolveDuplicatesRequest {
  term: string;
  occurrences: Array<{
    sentence: string;
    sectionReference: string;
  }>;
  structure: DocumentNode[];
  recitals?: string;
  previousAmendments?: ResolveDuplicateAmendment[];  // For re-run
}

export interface ResolveDuplicateAmendment {
  sectionReference: string;
  originalText: string;
  amendedText: string;
}

export interface ResolveDuplicatesResult {
  status: 'success' | 'error';
  term: string;
  amendments: ResolveDuplicateAmendment[];
  errorMessage?: string;
}

// Generate Definition request/response types
export interface GenerateDefinitionRequest {
  term: string;
  occurrences: Array<{ sentence: string; sectionReference: string }>;
  structure: DocumentNode[];
  recitals?: string;
  definitionSection?: string;
}

export interface GenerateDefinitionResult {
  status: 'amended' | 'new_section' | 'error';
  definitionText: string;
  originalText: string;
  amendedText: string;
  sectionNumber: string;
  suggestedHeading?: string;
  errorMessage?: string;
}

// Error response
export interface DefinitionCheckErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}