// Ask API Type Definitions

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface SourceCitation {
  id: number;
  type: 'document' | 'vault' | 'web' | 'playbook';
  title: string;
  snippet: string; // Relevant paragraph/excerpt
  fullContent?: string; // For preview rendering
  url?: string; // For web sources
  fileId?: string; // For vault sources
  location?: string; // Section/page reference
  highlightRange?: { start: number; end: number };
  // NEW: Precise location data for citation highlighting
  paragraphIndex?: number; // For DOCX/TXT documents
  pageNumber?: number; // For PDFs
  highlightBox?: {
    // For PDF region highlighting
    x: number;
    y: number;
    width: number;
    height: number;
    pageWidth: number;
    pageHeight: number;
  };
  // File metadata for viewer
  filePath?: string; // Full file path or identifier
  isPDF?: boolean; // Whether this is a PDF file
}

export interface AskSourceConfig {
  includeDocument: boolean;
  documentContext?: string;
  vaultFileIds?: string[];
  vaultPlaybookIds?: string[];
  vaultClauseIds?: string[];
  clauseIds?: string[];
  clauseTagIds?: string[];
  playbookIds?: string[];
  projectIds?: string[];
  enableWebSearch: boolean;
}

export interface AskRequest {
  question: string;
  conversationHistory?: Message[];
  sourceConfig: AskSourceConfig;
}

export type AskStreamEvent =
  | { type: 'workflow_step'; step: number; total: number; name: string; status: 'started' | 'completed' }
  | { type: 'thinking'; content: string }
  | { type: 'content'; text: string; done: boolean }
  | { type: 'citation'; id: number; source: SourceCitation }
  | { type: 'follow_up'; questions: string[] }
  | { type: 'error'; message: string }
  | { type: 'done' };

export interface WorkflowStep {
  step: number;
  total: number;
  name: string;
  status: 'started' | 'completed';
}

export interface AskContext {
  documentContext?: string;
  vaultFiles: Array<{ id: string; name: string; content: string }>;
  vaultPlaybooks: Array<{ id: string; name: string; content: string }>;
  vaultClauses: Array<{ id: string; name: string; content: string }>;
  webResults: Array<{ title: string; url: string; content: string; snippet: string }>;
}

