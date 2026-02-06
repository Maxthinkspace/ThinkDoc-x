export interface ClassifyDocumentResponse {
  documentType: 'tree' | 'flat';
  documentName: string | null;          
  firstMainBodyText: string;
  closingStartText: string | null;      // First line of signature/closing section
  appendixStartTexts: string[];         // Heading lines of each schedule/appendix
  language: string;
}

