// ============================================
// VAULT DOCUMENT PARSER
// Main entry point for parsing uploaded documents
// 
// Supports:
// - PDF (via pdf-parse)
// - DOCX (via JSZip + OOXML with full numbering support)
// - DOC (via word-extractor)
// - TXT, MD (direct read)
// ============================================

import { logger } from '@/config/logger';
import {
  extractTextFromOOXML,
  buildNumberingMap,
  detectDocumentLanguage,
  createDOMParser,
  type NumberingMap,
} from '@/utils/documentParserHelpers';
import {
  parseEnglishStructure,
  parseChineseStructure,
  cleanAppendixTitle,
  prefixAppendixSectionNumbers,
  buildFlatAppendixStructureFromText,
  type ParsedDocument,
  type DocumentNode,
  type AppendixItem,
} from './structureParser';

// ============================================
// TYPES
// ============================================

export interface ParsedDocumentResult {
  /** Full extracted text content */
  text: string;
  /** Structured document sections (if parsing succeeded) */
  structure?: {
    recitals?: string;
    sections: DocumentNode[];
    signatures?: string;
    appendices?: AppendixItem[];
    badFormatSections?: string[];
  };
  /** Document metadata */
  metadata?: {
    title?: string | undefined;
    author?: string | undefined;
    pageCount?: number;
    language?: 'english' | 'chinese' | 'mixed';
  };
}

// Re-export types for consumers
export type { ParsedDocument, DocumentNode };

// ============================================
// MAIN ENTRY POINT
// ============================================

/**
 * Parse an uploaded document and extract text + structure
 * 
 * @param buffer - File contents as Buffer
 * @param fileName - Original file name (used for extension detection)
 * @param mimeType - Optional MIME type
 * @returns Parsed document with text, structure, and metadata
 */
export async function parseDocument(
  buffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<ParsedDocumentResult> {
  const extension = fileName.toLowerCase().split('.').pop() || '';
  const effectiveMimeType = mimeType || getMimeTypeFromExtension(extension);

  logger.info({ fileName, extension, mimeType: effectiveMimeType }, 'Vault: Parsing document');

  try {
    switch (extension) {
      case 'pdf':
        return await parsePDF(buffer);

      case 'docx':
        return await parseDOCX(buffer);

      case 'doc':
        return await parseDOC(buffer);

      case 'txt':
      case 'md':
      case 'markdown':
        return parseText(buffer);

      default:
        // Try to infer from mime type
        if (effectiveMimeType?.includes('pdf')) {
          return await parsePDF(buffer);
        }
        if (effectiveMimeType?.includes('wordprocessingml') || effectiveMimeType?.includes('docx')) {
          return await parseDOCX(buffer);
        }
        if (effectiveMimeType?.includes('msword')) {
          return await parseDOC(buffer);
        }
        if (effectiveMimeType?.includes('text/')) {
          return parseText(buffer);
        }

        logger.warn(
          { fileName, extension, mimeType: effectiveMimeType },
          'Vault: Unsupported file type, attempting text extraction'
        );
        return parseText(buffer);
    }
  } catch (error) {
    logger.error({ error, fileName }, 'Vault: Failed to parse document');
    throw new Error(
      `Failed to parse ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================
// PDF PARSER
// ============================================

async function parsePDF(buffer: Buffer): Promise<ParsedDocumentResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let PDFParse: any;
  try {
    // pdf-parse v2.x exports PDFParse class
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const pdfParseModule = require('pdf-parse');
    PDFParse = pdfParseModule.PDFParse;
    
    if (typeof PDFParse !== 'function') {
      throw new Error(`pdf-parse module does not export PDFParse class. Keys: ${Object.keys(pdfParseModule).join(', ')}`);
    }
    
    logger.debug('pdf-parse v2.x imported successfully', { hasPDFParse: true });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMsg }, 'Failed to import pdf-parse');
    throw new Error(`pdf-parse package not installed or failed to import: ${errorMsg}. Run: pnpm add pdf-parse`);
  }

  // Convert Buffer to Uint8Array for pdf-parse v2.x
  const data = new Uint8Array(buffer);
  
  // Use the new PDFParse class API (v2.x)
  const parser = new PDFParse({ data });
  
  // Get text content
  const textResult = await parser.getText();
  const text = textResult.text || '';
  
  // Get document info
  let info: any = {};
  let pageCount = 1;
  try {
    const infoResult = await parser.getInfo();
    info = infoResult.info || {};
    pageCount = infoResult.numPages || 1;
  } catch (infoError) {
    logger.warn({ error: infoError }, 'Failed to get PDF info, continuing with text only');
  }
  
  // Clean up
  await parser.destroy();
  
  const language = detectLanguage(text);

  // Parse structure using the appropriate parser
  const parseFn = language === 'chinese' ? parseChineseStructure : parseEnglishStructure;
  const internalResult = parseFn(text);
  let closingStructure: DocumentNode[] = [];
  if (internalResult.closing) {
    const closingParsed = parseFn(internalResult.closing);
    const prefix = cleanAppendixTitle('Appendices');
    if (closingParsed.structure.length === 0) {
      closingStructure = buildFlatAppendixStructureFromText(internalResult.closing, prefix);
    } else {
      closingStructure = prefixAppendixSectionNumbers(closingParsed.structure, prefix);
    }
  }

  return {
    text,
    structure: {
      recitals: internalResult.recitals,
      sections: internalResult.structure,
      signatures: '', // PDF doesn't have LLM refinement, put closing in appendices
      appendices: internalResult.closing
        ? [{ title: 'Appendices', content: internalResult.closing, structure: closingStructure }]
        : [],
      badFormatSections: internalResult.badFormatSections,
    },
    metadata: {
      title: info?.Title,
      author: info?.Author,
      pageCount: pageCount,
      language,
    },
  };
}

// ============================================
// DOCX PARSER (with full numbering support)
// ============================================

async function parseDOCX(buffer: Buffer): Promise<ParsedDocumentResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let JSZip: any;
  try {
    const module = await import('jszip');
    JSZip = module.default ?? module;
  } catch {
    throw new Error('jszip package not installed. Run: pnpm add jszip');
  }

  // Load the DOCX (ZIP archive)
  const zip = await JSZip.loadAsync(buffer);

  // Extract document.xml
  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) {
    throw new Error('Invalid .docx file: word/document.xml not found');
  }
  const documentXml = await documentXmlFile.async('string');

  // Extract numbering.xml if present (for list formatting)
  let numberingMap: NumberingMap | undefined;
  const numberingXmlFile = zip.file('word/numbering.xml');
  if (numberingXmlFile) {
    const numberingXml = await numberingXmlFile.async('string');
    const parser = createDOMParser();
    const numberingDoc = parser.parseFromString(numberingXml, 'text/xml');
    numberingMap = buildNumberingMap(numberingDoc);
  }

  // Parse document XML
  const parser = createDOMParser();
  const xmlDoc = parser.parseFromString(documentXml, 'text/xml');

  // Extract text using the full OOXML extraction with numbering support
  const text = extractTextFromOOXML(xmlDoc, numberingMap);
  const language = detectDocumentLanguage(text);

  logger.info(
    { textLength: text.length, language },
    'Vault: Extracted text from DOCX'
  );

  // Parse structure using the appropriate parser
  const parseFnDocx = language === 'chinese' ? parseChineseStructure : parseEnglishStructure;
  const internalResult = parseFnDocx(text);
  let closingStructureDocx: DocumentNode[] = [];
  if (internalResult.closing) {
    const closingParsed = parseFnDocx(internalResult.closing);
    const prefix = cleanAppendixTitle('Appendices');
    if (closingParsed.structure.length === 0) {
      closingStructureDocx = buildFlatAppendixStructureFromText(internalResult.closing, prefix);
    } else {
      closingStructureDocx = prefixAppendixSectionNumbers(closingParsed.structure, prefix);
    }
  }

  return {
    text,
    structure: {
      recitals: internalResult.recitals,
      sections: internalResult.structure,
      signatures: '',
      appendices: internalResult.closing
        ? [{ title: 'Appendices', content: internalResult.closing, structure: closingStructureDocx }]
        : [],
      badFormatSections: internalResult.badFormatSections,
    },
    metadata: {
      language,
    },
  };
}

// ============================================
// DOC PARSER (old Word format)
// ============================================

async function parseDOC(buffer: Buffer): Promise<ParsedDocumentResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let WordExtractor: any;
  try {
    const module = await import('word-extractor');
    WordExtractor = module.default ?? module;
  } catch {
    throw new Error('word-extractor package not installed. Run: pnpm add word-extractor');
  }

  const extractor = new WordExtractor();
  const doc = await extractor.extract(buffer);
  const text = doc.getBody() || '';
  const language = detectLanguage(text);

  // Parse structure
  const parseFnDoc = language === 'chinese' ? parseChineseStructure : parseEnglishStructure;
  const internalResult = parseFnDoc(text);
  let closingStructureDoc: DocumentNode[] = [];
  if (internalResult.closing) {
    const closingParsed = parseFnDoc(internalResult.closing);
    const prefix = cleanAppendixTitle('Appendices');
    if (closingParsed.structure.length === 0) {
      closingStructureDoc = buildFlatAppendixStructureFromText(internalResult.closing, prefix);
    } else {
      closingStructureDoc = prefixAppendixSectionNumbers(closingParsed.structure, prefix);
    }
  }

  return {
    text,
    structure: {
      recitals: internalResult.recitals,
      sections: internalResult.structure,
      signatures: '',
      appendices: internalResult.closing
        ? [{ title: 'Appendices', content: internalResult.closing, structure: closingStructureDoc }]
        : [],
      badFormatSections: internalResult.badFormatSections,
    },
    metadata: {
      language,
    },
  };
}

// ============================================
// TEXT PARSER (TXT, MD)
// ============================================

function parseText(buffer: Buffer): ParsedDocumentResult {
  const text = buffer.toString('utf-8');
  const language = detectLanguage(text);

  // Parse structure
  const parseFnTxt = language === 'chinese' ? parseChineseStructure : parseEnglishStructure;
  const internalResult = parseFnTxt(text);
  let closingStructureTxt: DocumentNode[] = [];
  if (internalResult.closing) {
    const closingParsed = parseFnTxt(internalResult.closing);
    const prefix = cleanAppendixTitle('Appendices');
    if (closingParsed.structure.length === 0) {
      closingStructureTxt = buildFlatAppendixStructureFromText(internalResult.closing, prefix);
    } else {
      closingStructureTxt = prefixAppendixSectionNumbers(closingParsed.structure, prefix);
    }
  }

  return {
    text,
    structure: {
      recitals: internalResult.recitals,
      sections: internalResult.structure,
      signatures: '',
      appendices: internalResult.closing
        ? [{ title: 'Appendices', content: internalResult.closing, structure: closingStructureTxt }]
        : [],
      badFormatSections: internalResult.badFormatSections,
    },
    metadata: {
      language,
    },
  };
}

// ============================================
// HELPERS
// ============================================

function getMimeTypeFromExtension(extension: string): string {
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    txt: 'text/plain',
    md: 'text/markdown',
    markdown: 'text/markdown',
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

function detectLanguage(text: string): 'english' | 'chinese' | 'mixed' {
  // Ensure text is a string
  const textStr = typeof text === 'string' ? text : String(text || '');
  
  // Count Chinese characters
  const chineseChars = (textStr.match(/[\u4e00-\u9fff]/g) || []).length;
  const totalChars = textStr.replace(/\s/g, '').length;

  if (totalChars === 0) return 'english';

  const chineseRatio = chineseChars / totalChars;

  if (chineseRatio > 0.3) return 'chinese';
  if (chineseRatio > 0.1) return 'mixed';
  return 'english';
}
