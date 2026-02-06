export interface SectionNode {
  sectionNumber: string
  sectionHeading?: string          // Detected heading
  text: string                     // Content text (heading excluded)
  level: number
  additionalParagraphs?: string[] | undefined
  children?: SectionNode[] | undefined
  rules?: string[] | undefined
}

export interface ParsedDocument {
  recitals: string;
  structure: SectionNode[];
  closing: string;
  badFormatSections?: string[];
  documentName?: string;
  definitionSection?: string;
}