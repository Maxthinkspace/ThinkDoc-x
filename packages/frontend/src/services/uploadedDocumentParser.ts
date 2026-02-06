import JSZip from "jszip";
import type { ParsedDocument } from '@/src/types/documents';
import {
  extractTextFromOOXML,
  buildNumberingMap,
  detectDocumentLanguage,
} from '../utils/documentParserHelpers';
import {
  parseEnglishStructure,
  parseChineseStructure,
  cleanAppendixTitle,
  prefixAppendixSectionNumbers,
  buildFlatAppendixStructureFromText,
} from "./documentParser";

/**
 * Parse an uploaded .docx file using the same logic as parseDocument()
 * This reuses all the existing parsing logic but works with uploaded files
 */
export async function parseUploadedDocument(file: File): Promise<ParsedDocument> {
  try {
    console.log(`📄 Starting to parse uploaded file: ${file.name}`);

    // Step 1: Read the .docx file (which is a ZIP archive)
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Step 2: Extract the document XML
    const documentXmlFile = zip.file("word/document.xml");
    if (!documentXmlFile) {
      throw new Error("Invalid .docx file: word/document.xml not found");
    }
    const documentXml = await documentXmlFile.async("string");

    // Step 3: Extract the numbering XML (for list formatting) - parse separately!
    let numberingMap: any = { abstractNums: {}, numToAbstract: {} };
    const numberingXmlFile = zip.file("word/numbering.xml");
    if (numberingXmlFile) {
      const numberingXml = await numberingXmlFile.async("string");
      const parser = new DOMParser();
      const numberingDoc = parser.parseFromString(numberingXml, "text/xml");
      numberingMap = buildNumberingMap(numberingDoc);
    }

    console.log(`✅ Extracted XML from ${file.name}`);

    // Step 4: Parse the document XML into a DOM structure
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(documentXml, "text/xml");

    // Step 5: Extract clean text using the pre-built numbering map
    const cleanText = extractTextFromOOXML(xmlDoc, numberingMap);
    console.log(`✅ Extracted ${cleanText.length} characters of text`);

    // Step 6: Detect language and parse structure using existing logic
    const language = detectDocumentLanguage(cleanText);
    console.log(`✅ Detected language: ${language}`);

    const internalResult =
      language === "chinese"
        ? parseChineseStructure(cleanText)
        : parseEnglishStructure(cleanText);

    console.log(`✅ Parsed into ${internalResult.structure.length} top-level sections`);

    // Convert internal format to ParsedDocument format
    // For uploaded documents, put closing content into appendices
    // (no LLM refinement for uploaded docs - that happens in main flow if needed)
    const parseFn = language === 'chinese' ? parseChineseStructure : parseEnglishStructure;
    let closingStructure: import('@/src/types/documents').DocumentNode[] = [];
    if (internalResult.closing) {
      const closingParsed = parseFn(internalResult.closing);
      const prefix = cleanAppendixTitle('Appendices');
      if (closingParsed.structure.length === 0) {
        closingStructure = buildFlatAppendixStructureFromText(internalResult.closing, prefix);
      } else {
        closingStructure = prefixAppendixSectionNumbers(closingParsed.structure, prefix);
      }
    }

    const result: ParsedDocument = {
      recitals: internalResult.recitals,
      structure: internalResult.structure,
      signatures: '',
      appendices: internalResult.closing
        ? [{ title: 'Appendices', content: internalResult.closing, structure: closingStructure }]
        : [],
      badFormatSections: internalResult.badFormatSections,
    };

    return result;
  } catch (error) {
    console.error("❌ Error parsing uploaded document:", error);
    throw new Error(
      `Failed to parse document: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}