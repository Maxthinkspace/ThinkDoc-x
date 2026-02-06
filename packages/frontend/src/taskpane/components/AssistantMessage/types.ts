/**
 * Type definitions for AssistantMessage component
 */

export interface SourceCitation {
  id: number;
  type: 'document' | 'vault' | 'web' | 'playbook';
  title: string;
  snippet: string;
  fullContent?: string;
  url?: string;
  fileId?: string;
  location?: string;
  highlightRange?: { start: number; end: number };
  paragraphIndex?: number;
  pageNumber?: number;
  highlightBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    pageWidth: number;
    pageHeight: number;
  };
  filePath?: string;
  isPDF?: boolean;
}

export interface ParsedCitation {
  id: number;
  citation: SourceCitation | null;
  position: number; // Position in the text where citation appears
}

export interface StructuredContent {
  header?: string;
  rationale?: string;
  content: string; // Main answer with inline [N] references
}

export interface StructuredMessage {
  content: StructuredContent;
  citations: SourceCitation[];
  followUpQuestions?: string[];
}

