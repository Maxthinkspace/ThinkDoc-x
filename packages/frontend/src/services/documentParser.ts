import {
  detectDocumentLanguage,
  extractOOXMLParagraphs,
  OOXMLParagraph,
  buildNumberingModel,
  computeUnifiedNumbering,
  buildTextsWithSectionMarkers,
  ParagraphTrackChange,
  findSectionByOoxmlIndex,
  type NumberingModel,
} from '../utils/documentParserHelpers';

import type {
  AppendixItem,
  ClassifyDocumentResponse,
  DocumentNode,
  DocumentNodeWithRange,
  ParagraphMapping,
  ParsedDocument,
  ParsedDocumentWithRanges,
  SectionTrackChangeMap,
  SectionTrackChanges,
  TrackChangeWithOffset,
} from '@/src/types/documents';

// Import backend API service for LLM document classification
import { backendApi } from './api';
import { authService } from './auth';

import { extractAllSentencesWithSources, extractFlatDocumentSentences } from '../utils/annotationExtractionHelpers';
import { detectHeading } from '../utils/headingDetector';

interface InternalParsedDocument {
  recitals: string;
  structure: DocumentNode[];
  closing: string;
  badFormatSections: string[];
}

/**
 * Paragraph with both Word API and OOXML indices.
 * Created by mapping the two sources upfront before parsing.
 * Text contains full content WITH section numbers for parsing.
 */
interface IndexedParagraph {
  wordIndex: number;
  ooxmlIndex: number;
  text: string;              // Amended (insertions included, deletions excluded)
  originalText: string;      // Original (deletions included, insertions excluded)
  combinedText: string;      // Combined (both insertions AND deletions included)
  combinedTextForParsing: string; // With section prefix (for parsing)
  // Unified numbering from OOXML extraction
  unifiedNumbering: {
    internalSectionNumber: string;
    originalDisplayNumber: string | null;
    amendedDisplayNumber: string | null;
    level: number;
    format: string;
  } | null;
  paragraphStatus: 'unchanged' | 'inserted' | 'deleted';
}

interface PathComponent {
  original: string;
  value: number;
  style: string;
}

interface InternalClassification {
  documentType: 'tree' | 'flat';
  language: string;
  firstSectionParagraphIndex: number;
}

// ========================================
// DOCUMENT TYPE HEURISTIC
// ========================================

/**
 * Detect document type using pattern matching 
 * Returns 'tree', 'flat', or 'uncertain' if patterns are ambiguous
 */
function detectDocumentTypeHeuristic(paragraphs: string[]): 'tree' | 'flat' | 'uncertain' {
  const patterns = [
    /^\d+\.\s/,                              // "1. ", "2. "
    /^\d+\.\d+\.?\s/,                        // "1.1 ", "1.2. "
    /^Article\s+\d+/i,                       // "Article 1"
    /^Section\s+\d+/i,                       // "Section 1"
    /^第[一二三四五六七八九十百]+[条條款项項]/,   // Chinese "第一条"
    /^\([a-z]\)\s/i,                         // "(a) ", "(b) "
    /^\([ivxlc]+\)\s/i,                      // "(i) ", "(ii) "
  ];
  
  let matchCount = 0;
  const samplesToCheck = Math.min(50, paragraphs.length);
  
  for (let i = 0; i < samplesToCheck; i++) {
    const trimmed = paragraphs[i].trim();
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        matchCount++;
        break;
      }
    }
  }
  
  // Decision thresholds
  if (matchCount >= 5) return 'tree';      // Clearly hierarchical
  if (matchCount === 0) return 'flat';     // No numbering at all
  return 'uncertain';                       // Let LLM decide
}

/**
 * Find paragraph index by matching text content (after stripping section number)
 * LLM returns text. And then find where it appears.
 * 
 * Step 1: Find paragraph matching LLM's text
 * Step 2: Verify it's numbered
 * Step 3: If not first item in sequence, backtrack to find actual first item
 */
function findFirstMainBodyIndex(
  paragraphs: string[],
  targetText: string,
  language: string
): number {
  console.log(`[findFirstMainBodyIndex] === PARAGRAPH SAMPLE (28-35) ===`);
  // console.log(`[findFirstMainBodyIndex] === START ===`);
  // console.log(`[findFirstMainBodyIndex] Total paragraphs: ${paragraphs.length}`);
  // console.log(`[findFirstMainBodyIndex] LLM targetText: "${targetText?.substring(0, 80)}..."`);
  // console.log(`[findFirstMainBodyIndex] Language: ${language}`);
  
  if (!targetText || targetText.trim() === '') {
    // console.log(`[findFirstMainBodyIndex] Empty targetText, defaulting to 0`);
    return 0;
  }
  
  const normalizedTarget = targetText.trim().toLowerCase().substring(0, 50);
  const extractFn = language === 'chinese' ? extractChineseSectionNumber : extractEnglishSectionNumber;
  
  // console.log(`[findFirstMainBodyIndex] --- First 20 paragraphs scan ---`);
  for (let i = 0; i < Math.min(20, paragraphs.length); i++) {
    const para = paragraphs[i].trim();
    const extracted = extractFn(para);
    const isNumbered = extracted !== null;
    const sectionNum = extracted ? extracted.number : 'N/A';
    // console.log(`[findFirstMainBodyIndex] [${i}] numbered=${isNumbered} section="${sectionNum}" text="${para.substring(0, 50)}..."`);
  }
  // console.log(`[findFirstMainBodyIndex] --- End scan ---`);
  
  // Step 1: Find paragraph matching LLM's text
  let matchedIndex = -1;
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i].trim();
    const extracted = extractFn(para);
    const textContent = extracted ? extracted.text : para;
    const normalizedContent = textContent.trim().toLowerCase().substring(0, 50);
    
    if (normalizedContent && normalizedTarget) {
      if (normalizedContent.includes(normalizedTarget) || 
          normalizedTarget.includes(normalizedContent)) {
        matchedIndex = i;
        // console.log(`[findFirstMainBodyIndex] STEP 1: Text match at paragraph ${i}`);
        // console.log(`[findFirstMainBodyIndex]   LLM text: "${normalizedTarget}"`);
        // console.log(`[findFirstMainBodyIndex]   Para text: "${normalizedContent}"`);
        // console.log(`[findFirstMainBodyIndex]   Full para: "${para.substring(0, 100)}..."`);
        break;
      }
    }
  }
  
  if (matchedIndex === -1) {
    // console.log(`[findFirstMainBodyIndex] STEP 1 FAILED: No text match found, defaulting to 0`);
    return 0;
  }
  
  // Step 2: Find first numbered paragraph at or after matchedIndex
  let numberedIndex = -1;
  for (let i = matchedIndex; i < paragraphs.length; i++) {
    const para = paragraphs[i].trim();
    const extracted = extractFn(para);
    if (extracted) {
      numberedIndex = i;
      break;
    }
  }
  
  // If no numbered paragraph found forward, look backward
  if (numberedIndex === -1) {
    for (let i = matchedIndex - 1; i >= 0; i--) {
      const para = paragraphs[i].trim();
      const extracted = extractFn(para);
      if (extracted) {
        numberedIndex = i;
        break;
      }
    }
  }
  
  if (numberedIndex === -1) {
    // No numbered paragraph found at all - use matchedIndex as fallback
    return matchedIndex;
  }
  
  // Step 3: Two-phase backtracking to find true first section
const numberedPara = paragraphs[numberedIndex].trim();
const extracted = extractFn(numberedPara);
if (!extracted) {
  return numberedIndex;
}

const components = parseSectionNumberToComponents(extracted.number);
const startingStyle = components[0]?.style;
const startingValue = components[0]?.value;
const isFirstItem = startingValue === 1000;

// console.log(`[findFirstMainBodyIndex] STEP 3: "${extracted.number}" style="${startingStyle}" value=${startingValue} isFirst=${isFirstItem}`);

let resultIndex = numberedIndex;

// PHASE 1: If not first item, find first item of SAME style (skip different styles)
if (!isFirstItem) {
  // console.log(`[findFirstMainBodyIndex] PHASE 1: Finding first item of style "${startingStyle}"...`);
  for (let i = numberedIndex - 1; i >= 0; i--) {
    const para = paragraphs[i].trim();
    const ext = extractFn(para);
    if (ext) {
      const comp = parseSectionNumberToComponents(ext.number);
      const extStyle = comp[0]?.style;
      const extValue = comp[0]?.value;
      
      console.log(`[findFirstMainBodyIndex] PHASE 1 [${i}]: "${ext.number}" style="${extStyle}" value=${extValue}`);
      
      if (extStyle === startingStyle) {
        if (extValue === 1000) {
          resultIndex = i;
          console.log(`[findFirstMainBodyIndex] PHASE 1: Found first item at ${i}`);
          break;
        }
      }
    } else {
      console.log(`[findFirstMainBodyIndex] PHASE 1 [${i}]: extractFn returned null for "${para.substring(0, 40)}..."`);
    }
  }
  console.log(`[findFirstMainBodyIndex] PHASE 1 DONE: resultIndex=${resultIndex}`);
}

// PHASE 2: From current first item, check for earlier first item (STOP on different style)
// console.log(`[findFirstMainBodyIndex] PHASE 2: Checking for earlier first items from ${resultIndex}...`);
console.log(`[findFirstMainBodyIndex] PHASE 2: Checking for earlier first items from ${resultIndex}...`);
for (let i = resultIndex - 1; i >= 0; i--) {
  const para = paragraphs[i].trim();
  const ext = extractFn(para);
  if (ext) {
    const comp = parseSectionNumberToComponents(ext.number);
    const extValue = comp[0]?.value;
    
    console.log(`[findFirstMainBodyIndex] PHASE 2 [${i}]: "${ext.number}" value=${extValue}`);
    
    // Not a first item (value != 1000) - STOP (we've hit a different list)
    if (extValue !== 1000) {
      console.log(`[findFirstMainBodyIndex] PHASE 2: Hit non-first item - stopping`);
      break;
    }
    
    // First item (value=1000) - update result and continue looking
    resultIndex = i;
    console.log(`[findFirstMainBodyIndex] PHASE 2: Found earlier first item at ${i}`);
  }
}

console.log(`[findFirstMainBodyIndex] RESULT: ${resultIndex}`);
return resultIndex;
}

/**
 * Find paragraph index where closing section starts by matching text content
 * Similar to findFirstMainBodyIndex but searches from the end
 */
function findClosingStartIndex(
  paragraphs: string[],
  closingStartText: string | null,
  firstSectionIndex: number
): number {
  if (!closingStartText || closingStartText.trim() === '') {
    return -1; // No closing found
  }
  
  const normalizedTarget = closingStartText.trim().toLowerCase().substring(0, 50);
  
  // Search from firstSectionIndex to end (closing must be after main body starts)
  for (let i = firstSectionIndex; i < paragraphs.length; i++) {
    const para = paragraphs[i].trim().toLowerCase();
    const paraStart = para.substring(0, 50);
    
    if (paraStart && normalizedTarget) {
      if (paraStart.includes(normalizedTarget.substring(0, 30)) || 
          normalizedTarget.includes(paraStart.substring(0, 30))) {
        console.log(`[findClosingStartIndex] Found closing at paragraph ${i}: "${paragraphs[i].substring(0, 50)}..."`);
        return i;
      }
    }
  }
  
  console.log(`[findClosingStartIndex] Closing text not found: "${closingStartText?.substring(0, 50)}..."`);
  return -1;
}

/**
 * Find paragraph indices where each appendix section starts by matching text content.
 * Returns an array of paragraph indices, one per appendix heading, in document order.
 */
function findAppendixStartIndices(
  paragraphs: string[],
  appendixStartTexts: string[],
  closingStartIndex: number,
  firstSectionIndex: number
): number[] {
  if (!appendixStartTexts || appendixStartTexts.length === 0) {
    return [];
  }

  const searchStart = closingStartIndex >= 0 ? closingStartIndex : firstSectionIndex;
  const indices: number[] = [];

  for (const targetText of appendixStartTexts) {
    if (!targetText || targetText.trim() === '') continue;

    const normalizedTarget = targetText.trim().toLowerCase().substring(0, 50);
    let found = false;

    for (let i = searchStart; i < paragraphs.length; i++) {
      // Skip paragraphs already claimed by a previous appendix
      if (indices.includes(i)) continue;

      const para = paragraphs[i].trim().toLowerCase();
      const paraStart = para.substring(0, 50);

      if (paraStart && normalizedTarget) {
        if (paraStart.includes(normalizedTarget.substring(0, 30)) ||
            normalizedTarget.includes(paraStart.substring(0, 30))) {
          console.log(`[findAppendixStartIndices] Found appendix at paragraph ${i}: "${paragraphs[i].substring(0, 50)}..."`);
          indices.push(i);
          found = true;
          break;
        }
      }
    }

    if (!found) {
      console.log(`[findAppendixStartIndices] Appendix text not found: "${targetText.substring(0, 50)}..."`);
    }
  }

  // Sort indices in document order
  indices.sort((a, b) => a - b);
  return indices;
}

/**
 * Slice paragraphs into individual AppendixItem objects using the appendix start indices.
 * Each appendix spans from its heading to the next appendix heading (or end boundary).
 */
function sliceAppendices(
  paragraphs: string[],
  appendixIndices: number[],
  endIndex: number
): AppendixItem[] {
  if (appendixIndices.length === 0) return [];

  const items: AppendixItem[] = [];
  for (let i = 0; i < appendixIndices.length; i++) {
    const start = appendixIndices[i];
    const end = (i + 1 < appendixIndices.length)
      ? appendixIndices[i + 1]
      : endIndex;
    const title = paragraphs[start] || '';
    const content = paragraphs.slice(start + 1, end).join('\n');
    items.push({ title, content, structure: [] });
  }
  return items;
}

/**
 * Slice IndexedParagraph array into individual AppendixItem objects.
 */
function sliceAppendicesFromIndexed(
  paragraphs: { text: string }[],
  appendixIndices: number[],
  endIndex: number
): AppendixItem[] {
  if (appendixIndices.length === 0) return [];

  const items: AppendixItem[] = [];
  for (let i = 0; i < appendixIndices.length; i++) {
    const start = appendixIndices[i];
    const end = (i + 1 < appendixIndices.length)
      ? appendixIndices[i + 1]
      : endIndex;
    const title = paragraphs[start]?.text || '';
    const content = paragraphs.slice(start + 1, end).map(p => p.text).join('\n');
    items.push({ title, content, structure: [] });
  }
  return items;
}

// ========================================
// APPENDIX TITLE + PREFIX HELPERS
// ========================================

/**
 * Clean an appendix title to a short prefix like "Schedule I" or "Appendix A".
 * Strips subtitles after dashes, colons, parentheses.
 */
export function cleanAppendixTitle(rawTitle: string): string {
  const trimmed = rawTitle.trim();
  if (!trimmed) return trimmed;

  // English: Schedule I, Appendix A, Exhibit 1, Annex IV-A, etc.
  const englishMatch = trimmed.match(
    /^(Schedule|Appendix|Exhibit|Annex|Attachment|Addendum|Enclosure)(?:\s+([A-Z0-9]+(?:-[A-Z0-9]+)?|[IVXLCDM]+))?/i
  );
  if (englishMatch) {
    const keyword = englishMatch[1];
    const titleCased = keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase();
    const identifier = englishMatch[2] || '';
    return identifier ? `${titleCased} ${identifier}` : titleCased;
  }

  // Chinese: 附件一, 附表A, 附录3
  const chineseMatch = trimmed.match(
    /^(附件|附表|附录)([一二三四五六七八九十百千0-9IVXLCDMA-Za-z]*)/
  );
  if (chineseMatch) {
    return chineseMatch[1] + (chineseMatch[2] || '');
  }

  // Fallback: use full title as-is
  return trimmed;
}

/**
 * Prefix every sectionNumber in a parsed structure with a cleaned appendix title.
 * Mutates nodes in place (they're freshly created by the parser).
 * Example: "1." → "Schedule I Section 1."
 */
export function prefixAppendixSectionNumbers(
  structure: DocumentNode[],
  prefix: string
): DocumentNode[] {
  for (const node of structure) {
    node.sectionNumber = `${prefix} Section ${node.sectionNumber}`;
    if (node.children && node.children.length > 0) {
      prefixAppendixSectionNumbers(node.children, prefix);
    }
  }
  return structure;
}

/**
 * Build flat appendix structure from IndexedParagraph array.
 * One section per non-empty paragraph, with heading detection.
 * Internal-only paragraph numbers: "Schedule I Para 1."
 */
function buildFlatAppendixStructureFromIndexed(
  bodyParagraphs: IndexedParagraph[],
  prefix: string
): DocumentNode[] {
  const structure: DocumentNode[] = [];
  for (const para of bodyParagraphs) {
    const text = para.text?.trim();
    if (!text) continue;
    const headingResult = detectHeading(text);
    const originalHeadingResult = detectHeading(para.originalText || '');
    structure.push({
      sectionNumber: `${prefix} Para ${structure.length + 1}.`,
      sectionHeading: headingResult.heading || undefined,
      originalSectionHeading: originalHeadingResult.heading || undefined,
      text: headingResult.content,
      originalText: originalHeadingResult.content,
      level: 1,
      additionalParagraphs: [],
      originalAdditionalParagraphs: [],
      children: [],
      wordIndices: [para.wordIndex],
      ooxmlIndices: [para.ooxmlIndex],
    });
  }
  return structure;
}

/**
 * Build flat appendix structure from plain text.
 * One section per non-empty line, with heading detection.
 * Internal-only paragraph numbers: "Schedule I Para 1."
 */
export function buildFlatAppendixStructureFromText(
  bodyText: string,
  prefix: string
): DocumentNode[] {
  const lines = bodyText.split('\n');
  const structure: DocumentNode[] = [];
  for (const line of lines) {
    const text = line.trim();
    if (!text) continue;
    const headingResult = detectHeading(text);
    structure.push({
      sectionNumber: `${prefix} Para ${structure.length + 1}.`,
      sectionHeading: headingResult.heading || undefined,
      text: headingResult.content,
      level: 1,
      additionalParagraphs: [],
      children: [],
    });
  }
  return structure;
}

const MAX_APPENDIX_DEPTH = 2;

/**
 * Classify an appendix's paragraphs via the LLM document classification endpoint.
 * Returns null on failure so callers can fall back to heuristic parsing.
 */
async function classifyAppendixParagraphs(
  paragraphTexts: string[]
): Promise<ClassifyDocumentResponse | null> {
  if (!paragraphTexts || paragraphTexts.length === 0) return null;
  try {
    return await backendApi.classifyDocument({ paragraphs: paragraphTexts });
  } catch (error) {
    console.warn('[classifyAppendixParagraphs] LLM failed, falling back to heuristic:', error);
    return null;
  }
}

/**
 * Heuristic-only appendix parsing using IndexedParagraph-based parsers.
 * Used as fallback when LLM classification fails.
 */
function parseAppendixWithHeuristic(
  bodyParagraphs: IndexedParagraph[],
  title: string,
  content: string,
  prefix: string,
  language: string
): AppendixItem {
  const parseFn = language === 'chinese'
    ? parseChineseStructureWithIndices
    : parseEnglishStructureWithIndices;
  const parsed = parseFn(bodyParagraphs, 'amended');
  let structure: DocumentNode[];
  if (parsed.structure.length === 0) {
    structure = buildFlatAppendixStructureFromIndexed(bodyParagraphs, prefix);
  } else {
    structure = prefixAppendixSectionNumbers(parsed.structure, prefix);
  }
  return { title, content, structure };
}

/**
 * Heuristic-only appendix parsing using text-based parsers.
 * Used as fallback when LLM classification fails (text flow).
 */
function parseAppendixWithHeuristicFromText(
  bodyText: string,
  title: string,
  prefix: string,
  language: string
): AppendixItem {
  const parseFn = language === 'chinese'
    ? parseChineseStructure
    : parseEnglishStructure;
  const parsed = parseFn(bodyText);
  let structure: DocumentNode[];
  if (parsed.structure.length === 0) {
    structure = buildFlatAppendixStructureFromText(bodyText, prefix);
  } else {
    structure = prefixAppendixSectionNumbers(parsed.structure, prefix);
  }
  return { title, content: bodyText, structure };
}

/**
 * Parse each appendix as a standalone document using IndexedParagraph-based parsers.
 * Each appendix gets LLM classification with heuristic fallback, boundary detection,
 * and recursive sub-appendix parsing (up to MAX_APPENDIX_DEPTH).
 *
 * Uses buildTextsWithSectionMarkers to resolve Word auto-numbering into text —
 * the same approach used for the main document body classification.
 */
async function parseAppendixStructures(
  indexedParagraphs: IndexedParagraph[],
  appendixIndices: number[],
  endIndex: number,
  language: string,
  ooxmlParagraphs: OOXMLParagraph[],
  model: NumberingModel,
  depth: number = 0
): Promise<AppendixItem[]> {
  if (appendixIndices.length === 0) return [];

  const items: AppendixItem[] = [];
  for (let i = 0; i < appendixIndices.length; i++) {
    const start = appendixIndices[i];
    const end = (i + 1 < appendixIndices.length) ? appendixIndices[i + 1] : endIndex;

    const title = indexedParagraphs[start]?.text || '';
    const bodyParagraphs = indexedParagraphs.slice(start + 1, end);
    const content = bodyParagraphs.map(p => p.text).join('\n');
    const prefix = cleanAppendixTitle(title);

    // Build marker-prefixed texts from OOXML — same as main body flow.
    // This resolves Word auto-numbering (<w:numPr>) into the text strings
    // so the heuristic and LLM see "1. Some text" instead of just "Some text".
    const bodyOoxmlParagraphs = ooxmlParagraphs.slice(start + 1, end);
    const markerTexts = buildTextsWithSectionMarkers(bodyOoxmlParagraphs, model);

    // LLM classification (with resolved numbering)
    const llmResult = await classifyAppendixParagraphs(markerTexts);
    if (!llmResult) {
      console.log(`[parseAppendixStructures] LLM failed for "${title}", using heuristic fallback`);
      items.push(parseAppendixWithHeuristic(bodyParagraphs, title, content, prefix, language));
      continue;
    }

    // Determine document type (heuristic wins unless uncertain)
    const heuristicType = detectDocumentTypeHeuristic(markerTexts);
    const effectiveType = heuristicType === 'uncertain' ? llmResult.documentType : heuristicType;
    const effectiveLang = llmResult.language || language;

    // Find boundaries within this appendix (using marker-prefixed texts)
    const localFirstIdx = effectiveType === 'flat' ? 0
      : findFirstMainBodyIndex(markerTexts, llmResult.firstMainBodyText, effectiveLang);
    const localClosingIdx = findClosingStartIndex(
      markerTexts, llmResult.closingStartText || null, localFirstIdx
    );
    const localSubAppendixIndices = findAppendixStartIndices(
      markerTexts, llmResult.appendixStartTexts || [], localClosingIdx, localFirstIdx
    );
    const firstSubIdx = localSubAppendixIndices.length > 0 ? localSubAppendixIndices[0] : -1;

    // DEBUG 1.1 (appendix): Internal boundaries for this appendix
    console.log(`[DEBUG 1.1] Appendix[${i}] depth=${depth} "${title.substring(0, 60)}"`);
    console.log(`[DEBUG 1.1]   effectiveType=${effectiveType}, effectiveLang=${effectiveLang}`);
    console.log(`[DEBUG 1.1]   localFirstIdx=${localFirstIdx}, localClosingIdx=${localClosingIdx}`);
    for (let si = 0; si < localSubAppendixIndices.length; si++) {
      console.log(`[DEBUG 1.1]   subAppendix[${si}] idx=${localSubAppendixIndices[si]} → "${bodyParagraphs[localSubAppendixIndices[si]]?.text?.substring(0, 80) || '(none)'}"`);
    }

    // Main body end
    let mainBodyEnd = bodyParagraphs.length;
    if (localClosingIdx >= 0) mainBodyEnd = localClosingIdx;
    else if (firstSubIdx >= 0) mainBodyEnd = firstSubIdx;

    // Parse main body structure
    const mainBodyParas = bodyParagraphs.slice(localFirstIdx, mainBodyEnd);
    let structure: DocumentNode[];
    if (effectiveType === 'flat') {
      structure = buildFlatAppendixStructureFromIndexed(mainBodyParas, prefix);
      console.log(`[parseAppendixStructures] Appendix "${title}" is flat: ${structure.length} paragraphs`);
    } else {
      const parseFn = effectiveLang === 'chinese'
        ? parseChineseStructureWithIndices
        : parseEnglishStructureWithIndices;
      const parsed = parseFn(mainBodyParas, 'amended');
      if (parsed.structure.length === 0) {
        structure = buildFlatAppendixStructureFromIndexed(mainBodyParas, prefix);
        console.log(`[parseAppendixStructures] Appendix "${title}" tree parse empty, flat fallback: ${structure.length} paragraphs`);
      } else {
        structure = prefixAppendixSectionNumbers(parsed.structure, prefix);
        console.log(`[parseAppendixStructures] Appendix "${title}" is structured: ${structure.length} top-level sections`);
      }
    }

    // Recitals (text before first numbered section)
    const recitals = localFirstIdx > 0
      ? bodyParagraphs.slice(0, localFirstIdx).map(p => p.text).join('\n') || undefined
      : undefined;

    // Signatures (closing block)
    let signatures: string | undefined;
    if (localClosingIdx >= 0) {
      const sigEnd = (firstSubIdx >= 0 && firstSubIdx > localClosingIdx) ? firstSubIdx : bodyParagraphs.length;
      signatures = bodyParagraphs.slice(localClosingIdx, sigEnd).map(p => p.text).join('\n') || undefined;
    }

    // Recursive sub-appendices
    let subAppendices: AppendixItem[] | undefined;
    if (localSubAppendixIndices.length > 0 && depth < MAX_APPENDIX_DEPTH) {
      const subEnd = (localClosingIdx >= 0 && localClosingIdx > firstSubIdx) ? localClosingIdx : bodyParagraphs.length;
      subAppendices = await parseAppendixStructures(
        bodyParagraphs, localSubAppendixIndices, subEnd, effectiveLang,
        bodyOoxmlParagraphs, model, depth + 1
      );
      if (subAppendices.length === 0) subAppendices = undefined;
    } else if (localSubAppendixIndices.length > 0) {
      // Max depth reached: heuristic-only for sub-appendices
      subAppendices = [];
      for (let si = 0; si < localSubAppendixIndices.length; si++) {
        const subStart = localSubAppendixIndices[si];
        const subEndIdx = (si + 1 < localSubAppendixIndices.length)
          ? localSubAppendixIndices[si + 1] : bodyParagraphs.length;
        const subTitle = bodyParagraphs[subStart]?.text || '';
        const subBody = bodyParagraphs.slice(subStart + 1, subEndIdx);
        const subContent = subBody.map(p => p.text).join('\n');
        const subPrefix = cleanAppendixTitle(subTitle);
        subAppendices.push(parseAppendixWithHeuristic(subBody, subTitle, subContent, subPrefix, effectiveLang));
      }
      if (subAppendices.length === 0) subAppendices = undefined;
    }

    items.push({
      title, content, structure,
      recitals, signatures, subAppendices,
      documentType: effectiveType, language: effectiveLang,
    });
  }
  return items;
}

/**
 * Parse each appendix as a standalone document using text-based parsers.
 * Used by the text-flow functions (parseTreeDocumentFlow, parseFlatDocumentFlow).
 * Each appendix gets LLM classification with heuristic fallback, boundary detection,
 * and recursive sub-appendix parsing (up to MAX_APPENDIX_DEPTH).
 */
async function parseAppendixStructuresFromText(
  paragraphs: string[],
  appendixIndices: number[],
  endIndex: number,
  language: string,
  depth: number = 0
): Promise<AppendixItem[]> {
  if (appendixIndices.length === 0) return [];

  const items: AppendixItem[] = [];
  for (let i = 0; i < appendixIndices.length; i++) {
    const start = appendixIndices[i];
    const end = (i + 1 < appendixIndices.length) ? appendixIndices[i + 1] : endIndex;

    const title = paragraphs[start] || '';
    const bodyParagraphs = paragraphs.slice(start + 1, end);
    const bodyText = bodyParagraphs.join('\n');
    const prefix = cleanAppendixTitle(title);

    // LLM classification
    const llmResult = await classifyAppendixParagraphs(bodyParagraphs);
    if (!llmResult) {
      console.log(`[parseAppendixStructuresFromText] LLM failed for "${title}", using heuristic fallback`);
      items.push(parseAppendixWithHeuristicFromText(bodyText, title, prefix, language));
      continue;
    }

    // Determine document type (heuristic wins unless uncertain)
    const heuristicType = detectDocumentTypeHeuristic(bodyParagraphs);
    const effectiveType = heuristicType === 'uncertain' ? llmResult.documentType : heuristicType;
    const effectiveLang = llmResult.language || language;

    // Find boundaries within this appendix
    const localFirstIdx = effectiveType === 'flat' ? 0
      : findFirstMainBodyIndex(bodyParagraphs, llmResult.firstMainBodyText, effectiveLang);
    const localClosingIdx = findClosingStartIndex(
      bodyParagraphs, llmResult.closingStartText || null, localFirstIdx
    );
    const localSubAppendixIndices = findAppendixStartIndices(
      bodyParagraphs, llmResult.appendixStartTexts || [], localClosingIdx, localFirstIdx
    );
    const firstSubIdx = localSubAppendixIndices.length > 0 ? localSubAppendixIndices[0] : -1;

    // Main body end
    let mainBodyEnd = bodyParagraphs.length;
    if (localClosingIdx >= 0) mainBodyEnd = localClosingIdx;
    else if (firstSubIdx >= 0) mainBodyEnd = firstSubIdx;

    // Parse main body structure
    const mainBodyText = bodyParagraphs.slice(localFirstIdx, mainBodyEnd).join('\n');
    let structure: DocumentNode[];
    if (effectiveType === 'flat') {
      structure = buildFlatAppendixStructureFromText(mainBodyText, prefix);
    } else {
      const parseFn = effectiveLang === 'chinese'
        ? parseChineseStructure
        : parseEnglishStructure;
      const parsed = parseFn(mainBodyText);
      if (parsed.structure.length === 0) {
        structure = buildFlatAppendixStructureFromText(mainBodyText, prefix);
      } else {
        structure = prefixAppendixSectionNumbers(parsed.structure, prefix);
      }
    }

    // Recitals (text before first numbered section)
    const recitals = localFirstIdx > 0
      ? bodyParagraphs.slice(0, localFirstIdx).join('\n') || undefined
      : undefined;

    // Signatures (closing block)
    let signatures: string | undefined;
    if (localClosingIdx >= 0) {
      const sigEnd = (firstSubIdx >= 0 && firstSubIdx > localClosingIdx) ? firstSubIdx : bodyParagraphs.length;
      signatures = bodyParagraphs.slice(localClosingIdx, sigEnd).join('\n') || undefined;
    }

    // Recursive sub-appendices
    let subAppendices: AppendixItem[] | undefined;
    if (localSubAppendixIndices.length > 0 && depth < MAX_APPENDIX_DEPTH) {
      const subEnd = (localClosingIdx >= 0 && localClosingIdx > firstSubIdx) ? localClosingIdx : bodyParagraphs.length;
      subAppendices = await parseAppendixStructuresFromText(bodyParagraphs, localSubAppendixIndices, subEnd, effectiveLang, depth + 1);
      if (subAppendices.length === 0) subAppendices = undefined;
    } else if (localSubAppendixIndices.length > 0) {
      // Max depth reached: heuristic-only for sub-appendices
      subAppendices = [];
      for (let si = 0; si < localSubAppendixIndices.length; si++) {
        const subStart = localSubAppendixIndices[si];
        const subEndIdx = (si + 1 < localSubAppendixIndices.length)
          ? localSubAppendixIndices[si + 1] : bodyParagraphs.length;
        const subTitle = bodyParagraphs[subStart] || '';
        const subBodyText = bodyParagraphs.slice(subStart + 1, subEndIdx).join('\n');
        const subPrefix = cleanAppendixTitle(subTitle);
        subAppendices.push(parseAppendixWithHeuristicFromText(subBodyText, subTitle, subPrefix, effectiveLang));
      }
      if (subAppendices.length === 0) subAppendices = undefined;
    }

    items.push({
      title, content: bodyText, structure,
      recitals, signatures, subAppendices,
      documentType: effectiveType, language: effectiveLang,
    });
  }
  return items;
}

// ========================================
// MAIN BODY CANDIDATE VALIDATION (Forward Scan)
// ========================================

interface MainBodyCandidate {
  index: number;
  gapText: string;
  candidateText: string;
}

/**
 * Extract candidate context for LLM validation.
 * - gapText: text from the non-numbered paragraph before candidate
 * - candidateText: text from candidate + next 2 paragraphs
 */
function extractCandidateContext(
  ooxmlTexts: string[],
  candidateIndex: number
): MainBodyCandidate {
  // Get gap text (previous paragraph)
  const gapText = candidateIndex > 0 ? (ooxmlTexts[candidateIndex - 1] || '') : '';

  // Get candidate + next 2 paragraphs
  const textParts: string[] = [];
  for (let i = candidateIndex; i < Math.min(candidateIndex + 3, ooxmlTexts.length); i++) {
    if (ooxmlTexts[i]) {
      textParts.push(ooxmlTexts[i]);
    }
  }
  const candidateText = textParts.join('\n');

  return {
    index: candidateIndex,
    gapText,
    candidateText,
  };
}

/**
 * Forward scan to validate and potentially update main body start index.
 * Scans from initial index to closing, looking for "new child list after gap" patterns
 * using path-based logic (same as the main document parser).
 *
 * Key insight: A paragraph is a "new list candidate" when:
 * 1. Its section number gets APPENDED to the path (newPath.length > path.length),
 *    meaning it starts a new deeper level rather than continuing as a sibling.
 * 2. There was a GAP (non-numbered paragraph) before it.
 *
 * Sibling sections (e.g., 5. returning after (i)(ii)) replace in the path
 * (newPath.length <= path.length) and are NOT candidates.
 */
async function forwardScanMainBodyStart(
  ooxmlParagraphs: OOXMLParagraph[],
  ooxmlTexts: string[],
  initialMainBodyIdx: number,
  closingStartIdx: number,
  language: string
): Promise<number> {
  const effectiveEnd = closingStartIdx >= 0 ? closingStartIdx : ooxmlParagraphs.length;

  console.log(`[forwardScan] Starting path-based forward scan from ${initialMainBodyIdx} to ${effectiveEnd}, language=${language}`);

  const extractFn = language === 'chinese' ? extractChineseSectionNumber : extractEnglishSectionNumber;

  // Path-based state (mirrors parseEnglishStructureWithIndices / parseChineseStructureWithIndices)
  let path: PathComponent[] = [];
  let currentCandidate: MainBodyCandidate | null = null;
  let lastWasGap = false;

  for (let i = initialMainBodyIdx; i < effectiveEnd; i++) {
    const text = ooxmlTexts[i];
    if (!text) {
      lastWasGap = true;
      continue;
    }

    // Try to extract a section number from this paragraph
    const extracted = extractFn(text.trim());
    if (!extracted) {
      // Non-numbered paragraph → mark gap
      lastWasGap = true;
      continue;
    }

    // Parse the section number into path components
    // For Chinese: try generic parser first, fall back to Chinese-specific parser
    let components = parseSectionNumberToComponents(extracted.number);
    if (language === 'chinese' && components.length === 0) {
      const chineseStyle = getChineseNumberingStyle(extracted.number);
      if (chineseStyle.startsWith('chinese-') || chineseStyle === 'arabic-paren') {
        components = parseChineseSectionComponents(extracted.number, chineseStyle);
      }
    }

    if (components.length === 0) {
      lastWasGap = true;
      continue;
    }

    // Validate against current path and build new path
    const previousPathLength = path.length;
    const result = validateAndBuildPath(path, components, ooxmlTexts, i, extractFn);

    if (!result.valid) {
      // Invalid section — skip but don't reset gap flag
      console.log(`[forwardScan] [${i}] Invalid path for "${extracted.number}", skipping`);
      continue;
    }

    const newPathLength = result.newPath.length;
    const isAppended = newPathLength > previousPathLength;

    // First numbered paragraph in the scan — always becomes the initial candidate
    if (currentCandidate === null) {
      currentCandidate = extractCandidateContext(ooxmlTexts, i);
      console.log(`[forwardScan] [${i}] Initial candidate: "${extracted.number}" path=[${result.newPath.map(c => c.original).join(',')}]`);
      path = result.newPath;
      lastWasGap = false;
      continue;
    }

    // Check: new child list after a gap = potential main body candidate
    if (isAppended && lastWasGap) {
      const newCandidate = extractCandidateContext(ooxmlTexts, i);

      console.log(`[forwardScan] [${i}] New candidate (child after gap): "${extracted.number}" pathLen ${previousPathLength}→${newPathLength}`);
      console.log(`[forwardScan]   gapText: "${newCandidate.gapText.substring(0, 50)}..."`);
      console.log(`[forwardScan]   candidateText: "${newCandidate.candidateText.substring(0, 100)}..."`);

      // Ask LLM to choose between current and new candidate
      console.log(`[forwardScan] Comparing candidates: A (index ${currentCandidate.index}) vs B (index ${newCandidate.index})`);
      console.log(`[forwardScan] === LLM VALIDATION REQUEST ===`);
      console.log(`[forwardScan] Candidate A:`);
      console.log(`[forwardScan]   gapText: "${currentCandidate.gapText}"`);
      console.log(`[forwardScan]   candidateText: "${currentCandidate.candidateText}"`);
      console.log(`[forwardScan] Candidate B:`);
      console.log(`[forwardScan]   gapText: "${newCandidate.gapText}"`);
      console.log(`[forwardScan]   candidateText: "${newCandidate.candidateText}"`);

      try {
        const llmResult = await backendApi.validateMainBodyCandidates({
          candidateA: {
            gapText: currentCandidate.gapText,
            candidateText: currentCandidate.candidateText,
          },
          candidateB: {
            gapText: newCandidate.gapText,
            candidateText: newCandidate.candidateText,
          },
        });

        console.log(`[forwardScan] === LLM VALIDATION RESPONSE ===`);
        console.log(`[forwardScan] Winner: ${llmResult.winner}`);

        if (llmResult.winner === 'B') {
          console.log(`[forwardScan] Updating main body start from ${currentCandidate.index} to ${newCandidate.index}`);
          currentCandidate = newCandidate;
        } else {
          console.log(`[forwardScan] Keeping current candidate at ${currentCandidate.index}`);
        }
      } catch (error) {
        console.error(`[forwardScan] LLM validation failed, defaulting to new candidate:`, error);
        currentCandidate = newCandidate;
      }
    } else if (isAppended) {
      console.log(`[forwardScan] [${i}] Child "${extracted.number}" but no gap before — not a candidate`);
    } else {
      console.log(`[forwardScan] [${i}] Sibling "${extracted.number}" pathLen ${previousPathLength}→${newPathLength} — not a candidate`);
    }

    path = result.newPath;
    lastWasGap = false;
  }

  const finalResult = currentCandidate?.index ?? initialMainBodyIdx;
  console.log(`[forwardScan] Final main body start: ${finalResult}`);
  console.log(`[forwardScan] Final path: [${path.map(c => c.original).join(', ')}]`);
  return finalResult;
}

/**
 * Normalize quotation marks to standard straight quotes for comparison.
 * Handles: curly double quotes, curly single quotes, and other variants.
 */
function normalizeQuotes(text: string): string {
  return text
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')  // Curly double quotes → straight
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'"); // Curly single quotes → straight
}

/**
 * Find paragraph index where definition section starts by matching text content.
 * Uses same approach as findFirstMainBodyIndex - strips section numbers before matching.
 */
function findDefinitionSectionIndex(
  paragraphs: string[],
  definitionSectionText: string | null,
  firstSectionIndex: number,
  mainBodyEndIndex: number,
  language: string
): number {
  if (!definitionSectionText || definitionSectionText.trim() === '') {
    return -1; // No definition section found
  }

  // Normalize quotes and case for comparison
  const normalizedTarget = normalizeQuotes(definitionSectionText.trim().toLowerCase()).substring(0, 50);
  const extractFn = language === 'chinese' ? extractChineseSectionNumber : extractEnglishSectionNumber;

  // Search within main body only
  for (let i = firstSectionIndex; i < mainBodyEndIndex; i++) {
    const para = paragraphs[i].trim();
    const extracted = extractFn(para);
    // Use text content only (without section number), same as findFirstMainBodyIndex
    const textContent = extracted ? extracted.text : para;
    // Normalize quotes and case for comparison
    const normalizedContent = normalizeQuotes(textContent.trim().toLowerCase()).substring(0, 50);

    if (normalizedContent && normalizedTarget) {
      if (normalizedContent.includes(normalizedTarget) ||
          normalizedTarget.includes(normalizedContent)) {
        console.log(`[findDefinitionSectionIndex] Found definition section at paragraph ${i}: "${paragraphs[i]}"`);
        return i;
      }
    }
  }

  console.log(`[findDefinitionSectionIndex] Definition section text not found.`);
  console.log(`[findDefinitionSectionIndex]   Target text: "${definitionSectionText}"`);
  console.log(`[findDefinitionSectionIndex]   Normalized target: "${normalizedTarget}"`);
  console.log(`[findDefinitionSectionIndex]   Search range: paragraphs ${firstSectionIndex} to ${mainBodyEndIndex - 1}`);
  // Log first few paragraphs in search range to debug
  for (let i = firstSectionIndex; i < Math.min(firstSectionIndex + 10, mainBodyEndIndex); i++) {
    const para = paragraphs[i]?.trim() || '';
    const extracted = extractFn(para);
    const textContent = extracted ? extracted.text : para;
    console.log(`[findDefinitionSectionIndex]   [${i}] "${textContent}"`);
  }
  return -1;
}

// ========================================
// INDEXED PARAGRAPH MAPPING
// ========================================

/**
 * Build IndexedParagraph array by mapping Word API paragraphs to OOXML paragraphs.
 * Uses OOXML as source of truth for content (handles track changes correctly).
 * Matches by index to handle cases where empty paragraph counts differ.
 */
function buildIndexedParagraphs(
  wordParagraphs: { range: Word.Range; text: string }[],
  ooxmlParagraphs: OOXMLParagraph[]
): IndexedParagraph[] {
  const result: IndexedParagraph[] = [];
  
  // Build map: original OOXML index -> OOXMLParagraph
  // OOXML is source of truth for paragraph content (correctly handles track changes)
  const ooxmlByIndex = new Map<number, OOXMLParagraph>();
  for (const p of ooxmlParagraphs) {
    ooxmlByIndex.set(p.index, p);
  }
  
  // For each Word paragraph index, find corresponding OOXML paragraph
  // This handles cases where empty paragraph counts differ between Word API and OOXML
  for (let i = 0; i < wordParagraphs.length; i++) {
    const ooxmlPara = ooxmlByIndex.get(i);
    
    if (!ooxmlPara) {
      // No OOXML paragraph at this index (filtered out as truly empty)
      continue;
    }
   
    let fullText = ooxmlPara.text;
    let fullOriginalText = ooxmlPara.originalText;
    let fullCombinedText = ooxmlPara.combinedText || '';
    
    // Only combinedText needs section number prepended (for Priority 2 fallback parsing)
    if (ooxmlPara.unifiedNumbering && ooxmlPara.unifiedNumbering.internalSectionNumber) {
      const level = ooxmlPara.unifiedNumbering.level;
      const indent = level > 1 ? '  '.repeat(level - 1) : '';
      const prefix = indent + ooxmlPara.unifiedNumbering.internalSectionNumber + ' ';
      fullCombinedText = prefix + (ooxmlPara.combinedText || '');
    } else if (ooxmlPara.combinedNumbering && ooxmlPara.combinedNumbering.sectionNumber) {
      // Fallback for manual numbering
      const indent = ooxmlPara.combinedNumbering.level > 0 ? '  '.repeat(ooxmlPara.combinedNumbering.level) : '';
      const prefix = indent + ooxmlPara.combinedNumbering.sectionNumber + ' ';
      fullCombinedText = prefix + (ooxmlPara.combinedText || '');
    } else {
      fullCombinedText = ooxmlPara.combinedText || ooxmlPara.text;
    }
    
    result.push({
      wordIndex: i,  // Use loop index directly (= original Word paragraph index)
      ooxmlIndex: ooxmlPara.index,
      text: fullText,
      originalText: fullOriginalText,
      combinedText: ooxmlPara.combinedText || ooxmlPara.text,  // RAW - no prefix
      combinedTextForParsing: fullCombinedText,  // WITH prefix - for parsing only
      unifiedNumbering: ooxmlPara.unifiedNumbering || null,
      paragraphStatus: ooxmlPara.paragraphStatus || 'unchanged',
    });
  }
  
  console.log(`[buildIndexedParagraphs] Created ${result.length} indexed paragraphs from ${wordParagraphs.length} Word / ${ooxmlParagraphs.length} OOXML`);
  return result;
}

// ========================================
// SECTION NUMBER NORMALIZATION
// ========================================

function normalizeSectionNumber(section: string): string {
  if (!section) return section;
  const trimmed = section.trim();
  if (trimmed === 'NOT FOUND' || trimmed === '') return trimmed;
  return trimmed.endsWith('.') ? trimmed : trimmed + '.';
}

// ========================================
// MAIN ENTRY POINT
// ========================================

export async function parseDocument(): Promise<ParsedDocument> {
  return Word.run(async (context) => {
    const fullResult = await parseDocumentWithRanges(context);
    
    // Strip range-related fields to return simple ParsedDocument
    const stripRanges = (nodes: DocumentNodeWithRange[]): DocumentNode[] => {
      return nodes.map(node => ({
        sectionNumber: node.sectionNumber,
        originalDisplayNumber: node.originalDisplayNumber,
        amendedDisplayNumber: node.amendedDisplayNumber,
        sectionHeading: node.sectionHeading,
        originalSectionHeading: node.originalSectionHeading,
        combinedSectionHeading: node.combinedSectionHeading,
        text: node.text,
        originalText: node.originalText,
        combinedText: node.combinedText,
        level: node.level,
        additionalParagraphs: node.additionalParagraphs,
        originalAdditionalParagraphs: node.originalAdditionalParagraphs,
        combinedAdditionalParagraphs: node.combinedAdditionalParagraphs,
        additionalParagraphStatuses: node.additionalParagraphStatuses,
        children: node.children ? stripRanges(node.children) : [],
        wordIndices: node.wordIndices,
        ooxmlIndices: node.ooxmlIndices,
        paragraphStatus: node.paragraphStatus,
      }));
    };

    return {
      recitals: fullResult.recitals,
      structure: stripRanges(fullResult.structure),
      signatures: fullResult.signatures,
      appendices: fullResult.appendices,
      badFormatSections: fullResult.badFormatSections,
      documentName: fullResult.documentName,
    };
  });
}

// ========================================
// TREE DOCUMENT FLOW
// ========================================

async function parseTreeDocumentFlow(
  paragraphTexts: string[],
  classification: InternalClassification,
  closingStartIndex: number,
  appendixIndices: number[]
): Promise<ParsedDocument> {
  const firstAppendixIndex = appendixIndices.length > 0 ? appendixIndices[0] : -1;

  // Extract recitals (before main body)
  const recitalsText = paragraphTexts
    .slice(0, classification.firstSectionParagraphIndex)
    .join('\n');

  // Determine main body end index
  let mainBodyEndIndex = paragraphTexts.length;
  if (closingStartIndex >= 0) {
    mainBodyEndIndex = closingStartIndex;
  } else if (firstAppendixIndex >= 0) {
    mainBodyEndIndex = firstAppendixIndex;
  }

  console.log(`[parseTreeDocumentFlow] Main body: paragraphs ${classification.firstSectionParagraphIndex} to ${mainBodyEndIndex - 1}`);

  // Parse ONLY main body (excludes closing and appendices)
  const mainBodyText = paragraphTexts
    .slice(classification.firstSectionParagraphIndex, mainBodyEndIndex)
    .join('\n');

  console.log(`[parseTreeDocumentFlow] mainBodyText starts with: "${mainBodyText.substring(0, 150)}..."`);

  const language = classification.language === 'chinese' ? 'chinese' : 'english';
  console.log(`[parseTreeDocumentFlow] Using ${language} parser`);

  const parsed: InternalParsedDocument = language === 'chinese'
    ? parseChineseStructure(mainBodyText)
    : parseEnglishStructure(mainBodyText);

  // Extract signatures and appendices from raw paragraphs (not parsed)
  let signatures = '';
  let appendices: AppendixItem[] = [];

  if (closingStartIndex >= 0 && firstAppendixIndex >= 0) {
    // Both exist
    if (closingStartIndex < firstAppendixIndex) {
      signatures = paragraphTexts.slice(closingStartIndex, firstAppendixIndex).join('\n');
      appendices = await parseAppendixStructuresFromText(paragraphTexts, appendixIndices, paragraphTexts.length, language);
    } else {
      // Appendices before closing (unusual but handle it)
      appendices = await parseAppendixStructuresFromText(paragraphTexts, appendixIndices, closingStartIndex, language);
      signatures = paragraphTexts.slice(closingStartIndex).join('\n');
    }
  } else if (closingStartIndex >= 0) {
    // Only closing, no appendices
    signatures = paragraphTexts.slice(closingStartIndex).join('\n');
  } else if (firstAppendixIndex >= 0) {
    // Only appendices, no closing
    appendices = await parseAppendixStructuresFromText(paragraphTexts, appendixIndices, paragraphTexts.length, language);
  }

  console.log(`[parseTreeDocumentFlow] Signatures length: ${signatures.length}, Appendices count: ${appendices.length}`);

  return {
    recitals: recitalsText || parsed.recitals,
    structure: parsed.structure,
    signatures,
    appendices,
    badFormatSections: parsed.badFormatSections,
  };
}

// ========================================
// FLAT DOCUMENT FLOW
// ========================================

async function parseFlatDocumentFlow(
  paragraphTexts: string[],
  closingStartIndex: number,
  appendixIndices: number[],
  language: string = 'english'
): Promise<ParsedDocument> {
  const firstAppendixIndex = appendixIndices.length > 0 ? appendixIndices[0] : -1;
  console.log(`[parseFlatDocumentFlow] Parsing ${paragraphTexts.length} paragraphs`);
  console.log(`[parseFlatDocumentFlow] Boundaries: closing=${closingStartIndex}, appendices=${JSON.stringify(appendixIndices)}`);

  // Determine main body end
  let mainBodyEndIndex = paragraphTexts.length;
  if (closingStartIndex >= 0) {
    mainBodyEndIndex = closingStartIndex;
  } else if (firstAppendixIndex >= 0) {
    mainBodyEndIndex = firstAppendixIndex;
  }

  // Build simple structure: each paragraph = one section
  const structure: DocumentNode[] = [];
  for (let i = 0; i < mainBodyEndIndex; i++) {
    const text = paragraphTexts[i]?.trim();
    if (!text) continue;

    const headingResult = detectHeading(text);
    structure.push({
      sectionNumber: `${structure.length + 1}.`,
      sectionHeading: headingResult.heading || undefined,
      text: headingResult.content,
      level: 1,
      additionalParagraphs: [],
      children: [],
    });
  }

  // Extract signatures and appendices
  let signatures = '';
  let appendices: AppendixItem[] = [];

  if (closingStartIndex >= 0 && firstAppendixIndex >= 0) {
    if (closingStartIndex < firstAppendixIndex) {
      signatures = paragraphTexts.slice(closingStartIndex, firstAppendixIndex).join('\n');
      appendices = await parseAppendixStructuresFromText(paragraphTexts, appendixIndices, paragraphTexts.length, language);
    } else {
      appendices = await parseAppendixStructuresFromText(paragraphTexts, appendixIndices, closingStartIndex, language);
      signatures = paragraphTexts.slice(closingStartIndex).join('\n');
    }
  } else if (closingStartIndex >= 0) {
    signatures = paragraphTexts.slice(closingStartIndex).join('\n');
  } else if (firstAppendixIndex >= 0) {
    appendices = await parseAppendixStructuresFromText(paragraphTexts, appendixIndices, paragraphTexts.length, language);
  }

  return {
    recitals: '',
    structure,
    signatures,
    appendices,
    badFormatSections: [],
  };
}

// ========================================
// FLAT STRUCTURE CONVERTER
// ========================================

/**
 * Parse flat document with index tracking for ranges
 */
async function parseFlatDocumentFlowWithIndices(
  indexedParagraphs: IndexedParagraph[],
  closingStartIndex: number,
  appendixIndices: number[],
  language: string = 'english',
  ooxmlParagraphs: OOXMLParagraph[] = [],
  model?: NumberingModel
): Promise<ParsedDocument> {
  const firstAppendixIndex = appendixIndices.length > 0 ? appendixIndices[0] : -1;
  console.log(`[parseFlatDocumentFlowWithIndices] Parsing ${indexedParagraphs.length} paragraphs`);

  // Determine main body end
  let mainBodyEndIndex = indexedParagraphs.length;
  if (closingStartIndex >= 0) {
    mainBodyEndIndex = closingStartIndex;
  } else if (firstAppendixIndex >= 0) {
    mainBodyEndIndex = firstAppendixIndex;
  }

  // Build simple structure: each paragraph = one section
  const structure: DocumentNode[] = [];
  for (let i = 0; i < mainBodyEndIndex; i++) {
    const para = indexedParagraphs[i];
    const text = para.text?.trim();
    if (!text) continue;

    const headingResult = detectHeading(text);
    const originalHeadingResult = detectHeading(para.originalText || '');
    structure.push({
      sectionNumber: `${structure.length + 1}.`,
      sectionHeading: headingResult.heading || undefined,
      originalSectionHeading: originalHeadingResult.heading || undefined,
      text: headingResult.content,
      originalText: originalHeadingResult.content,
      level: 1,
      additionalParagraphs: [],
      originalAdditionalParagraphs: [],
      children: [],
      wordIndices: [para.wordIndex],
      ooxmlIndices: [para.ooxmlIndex],
    });
  }

  // Extract signatures and appendices
  let signatures = '';
  let appendices: AppendixItem[] = [];

  if (closingStartIndex >= 0 && firstAppendixIndex >= 0) {
    if (closingStartIndex < firstAppendixIndex) {
      signatures = indexedParagraphs.slice(closingStartIndex, firstAppendixIndex).map(p => p.text).join('\n');
      appendices = await parseAppendixStructures(indexedParagraphs, appendixIndices, indexedParagraphs.length, language, ooxmlParagraphs, model!);
    } else {
      appendices = await parseAppendixStructures(indexedParagraphs, appendixIndices, closingStartIndex, language, ooxmlParagraphs, model!);
      signatures = indexedParagraphs.slice(closingStartIndex).map(p => p.text).join('\n');
    }
  } else if (closingStartIndex >= 0) {
    signatures = indexedParagraphs.slice(closingStartIndex).map(p => p.text).join('\n');
  } else if (firstAppendixIndex >= 0) {
    appendices = await parseAppendixStructures(indexedParagraphs, appendixIndices, indexedParagraphs.length, language, ooxmlParagraphs, model!);
  }

  return {
    recitals: '',
    structure,
    signatures,
    appendices,
    badFormatSections: [],
  };
}

// ========================================
// SECTION TRACK CHANGE AGGREGATION
// ========================================

/**
 * Build a map of section numbers to their aggregated track changes.
 * Combines track changes from header paragraph and additional paragraphs,
 * adjusting offsets to be relative to the full section text.
 */
function buildSectionTrackChangeMap(
  structure: DocumentNode[],
  ooxmlParagraphs: OOXMLParagraph[]
): SectionTrackChangeMap {
  const map: SectionTrackChangeMap = new Map();
  
  // Build ooxmlIndex -> OOXMLParagraph lookup
  const paragraphByIndex = new Map<number, OOXMLParagraph>();
  for (const para of ooxmlParagraphs) {
    paragraphByIndex.set(para.index, para);
  }
  
  function getTopLevelSection(sectionNumber: string): string {
    const match = sectionNumber.match(/^(\d+)\./);
    return match ? match[0] : sectionNumber;
  }
  
  function processNode(node: DocumentNode): void {
    const ooxmlIndices = node.ooxmlIndices || [];
    if (ooxmlIndices.length === 0) {
      // Process children even if this node has no indices
      if (node.children) {
        for (const child of node.children) {
          processNode(child);
        }
      }
      return;
    }
    
    let sectionCombinedText = '';
    let currentOffset = 0;
    const sectionTrackChanges: TrackChangeWithOffset[] = [];
    const topLevel = getTopLevelSection(node.sectionNumber);
    
    // Process each paragraph in this section
    for (const ooxmlIdx of ooxmlIndices) {
      const para = paragraphByIndex.get(ooxmlIdx);
      if (!para) continue;
      
      // Add paragraph separator if not first paragraph
      if (sectionCombinedText.length > 0) {
        sectionCombinedText += '\n';
        currentOffset += 1;
      }
      
      // Add paragraph's combined text
      const paraText = para.combinedText || '';
      sectionCombinedText += paraText;
      
      // Adjust track change offsets and add to section
      for (const tc of para.trackChanges || []) {
        sectionTrackChanges.push({
          type: tc.type,
          text: tc.text,
          sectionNumber: node.sectionNumber,
          topLevelSectionNumber: topLevel,
          startOffset: currentOffset + tc.startOffset,
          endOffset: currentOffset + tc.endOffset,
          author: tc.author,
          date: tc.date ? new Date(tc.date) : undefined,
        });
      }
      
      currentOffset += paraText.length;
    }
    
    // Store in map
    if (sectionTrackChanges.length > 0 || sectionCombinedText.length > 0) {
      map.set(node.sectionNumber, {
        sectionNumber: node.sectionNumber,
        topLevelSectionNumber: topLevel,
        combinedText: sectionCombinedText,
        trackChanges: sectionTrackChanges,
      });
    }
    
    // Process children
    if (node.children) {
      for (const child of node.children) {
        processNode(child);
      }
    }
  }
  
  // Process all top-level nodes
  for (const node of structure) {
    processNode(node);
  }
  
  console.log(`[buildSectionTrackChangeMap] Built map with ${map.size} sections containing track changes`);
  
  return map;
}

// ========================================
// MAIN ENTRY POINT WITH RANGES 
// ========================================

/**
 * Parse document structure with Word.Range tracking for each level
 * Used for track change analysis to map changes to specific sections
 */

export async function parseDocumentWithRanges(
  context: Word.RequestContext
): Promise<ParsedDocumentWithRanges> {
    console.log('[documentParser] Starting parseDocumentWithRanges...');
    
    // Step 1: Get paragraphs with ranges via Word.js
    const paragraphs = context.document.body.paragraphs;
    paragraphs.load("items");
    await context.sync();
    
    console.log(`[documentParser] Found ${paragraphs.items.length} paragraphs`);
    
    // Step 2: Load range and text for each paragraph (batched)
    const BATCH_SIZE = 50;
    const wordParagraphData: { range: Word.Range; text: string }[] = [];
    
    for (let i = 0; i < paragraphs.items.length; i += BATCH_SIZE) {
      const batch = paragraphs.items.slice(i, i + BATCH_SIZE);
      const ranges = batch.map(para => {
        const range = para.getRange();
        range.load("text");
        return range;
      });
      await context.sync();
      
      for (const range of ranges) {
        wordParagraphData.push({ range, text: range.text?.trim() || '' });
      }
    }
    
    console.log(`[documentParser] Loaded ranges for ${wordParagraphData.length} paragraphs`);
    
    // Step 3: Extract OOXML paragraphs
    const body = context.document.body;
    const ooxml = body.getOoxml();
    await context.sync();
    
    const xmlParser = new DOMParser();
    const xmlDoc = xmlParser.parseFromString(ooxml.value, "text/xml");
    
    const ooxmlParagraphs = extractOOXMLParagraphs(xmlDoc);
    
    // Detect language from raw text (doesn't need section numbers)
    const ooxmlTextForLanguage = ooxmlParagraphs.map(p => p.text).join('\n');
    const language = detectDocumentLanguage(ooxmlTextForLanguage);
    
    console.log(`[documentParser] Extracted ${ooxmlParagraphs.length} OOXML paragraphs, language: ${language}`);
    
    // Build numbering model early - needed for section marker rendering
    const model = buildNumberingModel(xmlDoc);
    
    // Build texts WITH section markers for boundary detection
    // This allows findFirstMainBodyIndex to locate numbered paragraphs
    const ooxmlTexts = buildTextsWithSectionMarkers(ooxmlParagraphs, model);
    
    // // DEBUG 1.2: Word API paragraphs (raw, before mapping)
    // console.log(`[DEBUG 1.2] Word API paragraphs (${wordParagraphData.length} total):`);
    // for (let i = 0; i < wordParagraphData.length; i++) {
    //    const text = wordParagraphData[i].text || '';
    //      console.log(`[DEBUG 1.2]   [${i}] "${text.substring(0, 60)}..."`);
    // }
    
    // // DEBUG 1.3: OOXML paragraphs (amended version - insertions included, deletions excluded)
    // console.log(`[DEBUG 1.3] OOXML paragraphs - AMENDED (${ooxmlParagraphs.length} total):`);
    // for (const p of ooxmlParagraphs) {
    //   const fullText = p.numbering?.sectionNumber 
    //     ? `${p.numbering.sectionNumber} ${p.text}`
    //     : p.text;
    //   console.log(`[DEBUG 1.3]   [${p.index}] "${fullText.substring(0, 60)}..."`);
    // }
    
    // // DEBUG 1.4: OOXML paragraphs (original version - deletions included, insertions excluded)
    // console.log(`[DEBUG 1.4] OOXML paragraphs - ORIGINAL (${ooxmlParagraphs.length} total):`);
    // for (const p of ooxmlParagraphs) {
    //   const fullOriginalText = p.originalNumbering?.sectionNumber 
    //     ? `${p.originalNumbering.sectionNumber} ${p.originalText}`
    //     : p.originalText;
    //   console.log(`[DEBUG 1.4]   [${p.index}] "${fullOriginalText.substring(0, 60)}..."`);
    // }
    
    // Step 5: Classify document and find boundaries
    const heuristicType = detectDocumentTypeHeuristic(ooxmlTexts);
    console.log(`[documentParser] Heuristic type detection: ${heuristicType}`);
    
    // Ensure dev auth token is present before calling authenticated endpoints.
    // This avoids "Missing or invalid authorization header" during Configure Playbook Generation.
    await authService.setupDevAuth().catch(() => {});

    const llmResult = await backendApi.classifyDocument({
      paragraphs: ooxmlTexts,
    });
    
    // Determine document type (heuristic takes precedence if not uncertain)
    const documentType = heuristicType === 'uncertain' ? llmResult.documentType : heuristicType;
    
    console.log(`[documentParser] LLM returned documentName: "${llmResult.documentName || '(none)'}"`);
    console.log(`[documentParser] LLM returned firstMainBodyText: "${llmResult.firstMainBodyText?.substring(0, 50)}..."`);
    console.log(`[documentParser] LLM returned definitionSectionText: "${llmResult.definitionSectionText || '(none)'}"`);

    // Log normalized version to help debug quotation mark issues
    if (llmResult.definitionSectionText) {
      const normalized = normalizeQuotes(llmResult.definitionSectionText);
      if (normalized !== llmResult.definitionSectionText) {
        console.log(`[documentParser] Normalized definitionSectionText: "${normalized}"`);
      }
    }

    // Store document name for later use
    const documentName = llmResult.documentName || undefined;

    // Find boundaries using ooxmlTexts
    // For flat documents, skip recitals detection - main body starts at 0
    let firstSectionIdx: number;
    if (documentType === 'flat') {
      firstSectionIdx = 0;
    } else {
      // Step 1: Get initial main body index from LLM text match + backtracking
      const initialFirstSectionIdx = findFirstMainBodyIndex(
        ooxmlTexts,
        llmResult.firstMainBodyText,
        language
      );
      console.log(`[documentParser] Initial firstSectionIdx from LLM: ${initialFirstSectionIdx}`);

      // Step 2: Get closing index (needed for forward scan boundary)
      const closingForScan = findClosingStartIndex(
        ooxmlTexts,
        llmResult.closingStartText || null,
        initialFirstSectionIdx
      );

      // Step 3: Forward scan to validate/update main body start
      // This handles cases where LLM pointed to recitals instead of true main body
      firstSectionIdx = await forwardScanMainBodyStart(
        ooxmlParagraphs,
        ooxmlTexts,
        initialFirstSectionIdx,
        closingForScan,
        language
      );
      console.log(`[documentParser] Final firstSectionIdx after forward scan: ${firstSectionIdx}`);
    }

    const closingStartIdx = findClosingStartIndex(
      ooxmlTexts,
      llmResult.closingStartText || null,
      firstSectionIdx
    );

    const appendixIndices = findAppendixStartIndices(
      ooxmlTexts,
      llmResult.appendixStartTexts || [],
      closingStartIdx,
      firstSectionIdx
    );
    const firstAppendixIdx = appendixIndices.length > 0 ? appendixIndices[0] : -1;

    // Determine main body end
    let mainBodyEndIdx = ooxmlParagraphs.length;
    if (closingStartIdx >= 0) {
      mainBodyEndIdx = closingStartIdx;
    } else if (firstAppendixIdx >= 0) {
      mainBodyEndIdx = firstAppendixIdx;
    }
    
    // Find definition section paragraph index
    const definitionSectionIdx = findDefinitionSectionIndex(
      ooxmlTexts,
      llmResult.definitionSectionText || null,
      firstSectionIdx,
      mainBodyEndIdx,
      language
    );

    console.log(`[documentParser] Boundaries: firstSection=${firstSectionIdx}, closing=${closingStartIdx}, appendixIndices=${JSON.stringify(appendixIndices)}, mainBodyEnd=${mainBodyEndIdx}, definitionSection=${definitionSectionIdx}`);

    // Stage 3: Slice to main body only
    const mainBodyOOXMLParagraphs = ooxmlParagraphs.slice(firstSectionIdx, mainBodyEndIdx);
    console.log(`[documentParser] Stage 3: Sliced to ${mainBodyOOXMLParagraphs.length} main body paragraphs`);
    
    // Stage 4: Compute unified numbering on sliced list only
    // Path state starts fresh - recitals don't contaminate
    computeUnifiedNumbering(mainBodyOOXMLParagraphs, model);

    // Stage 4b: Compute unified numbering for each appendix independently
    // Each appendix gets fresh path state — numbering won't conflict with main body
    const appendixEndBoundary = (closingStartIdx >= 0 && closingStartIdx > firstAppendixIdx)
      ? closingStartIdx
      : ooxmlParagraphs.length;

    for (let i = 0; i < appendixIndices.length; i++) {
      const start = appendixIndices[i];
      const end = (i + 1 < appendixIndices.length) ? appendixIndices[i + 1] : appendixEndBoundary;
      const appendixOOXML = ooxmlParagraphs.slice(start, end);
      computeUnifiedNumbering(appendixOOXML, model);
      console.log(`[documentParser] Computed numbering for appendix ${i}: paragraphs ${start}-${end - 1}`);
    }

    // Stage 5: Build IndexedParagraph array (maps Word ↔ OOXML)
    // Now ooxmlParagraphs has unifiedNumbering populated for main body and appendices
    const indexedParagraphs = buildIndexedParagraphs(wordParagraphData, ooxmlParagraphs);
    
    // DEBUG 1.1: All boundaries with detail
    console.log(`[DEBUG 1.1] === DOCUMENT BOUNDARIES ===`);
    console.log(`[DEBUG 1.1] firstSectionIdx=${firstSectionIdx} → "${indexedParagraphs[firstSectionIdx]?.text?.substring(0, 80) || '(none)'}"`);
    console.log(`[DEBUG 1.1] closingStartIdx=${closingStartIdx} → "${closingStartIdx >= 0 ? indexedParagraphs[closingStartIdx]?.text?.substring(0, 80) || '(none)' : '(none)'}"`);
    for (let i = 0; i < appendixIndices.length; i++) {
      console.log(`[DEBUG 1.1] appendix[${i}] idx=${appendixIndices[i]} → "${indexedParagraphs[appendixIndices[i]]?.text?.substring(0, 80) || '(none)'}"`);
    }
    console.log(`[DEBUG 1.1] === END BOUNDARIES ===`);
    
    const classification: InternalClassification = {
      documentType,
      language: llmResult.language,
      firstSectionParagraphIndex: firstSectionIdx,
    };
    
    // Step 6: Parse structure with indices (parse BOTH amended and original)
    let baseResult: ParsedDocument;
    let originalParsedStructure: DocumentNode[] = [];
    let combinedParsedStructure: DocumentNode[] = [];
    
    if (classification.documentType === 'flat') {
      baseResult = await parseFlatDocumentFlowWithIndices(
        indexedParagraphs,
        closingStartIdx,
        appendixIndices,
        language,
        ooxmlParagraphs,
        model
      );
      // For flat docs, original and combined structure is same as amended (text fields differ)
      originalParsedStructure = baseResult.structure;
      combinedParsedStructure = baseResult.structure;
    } else {
      // Slice to main body only
      const mainBodyParagraphs = indexedParagraphs.slice(firstSectionIdx, mainBodyEndIdx);
      
      console.log(`[documentParser] Main body: ${mainBodyParagraphs.length} paragraphs (indices ${firstSectionIdx} to ${mainBodyEndIdx - 1})`);
      
      // Parse AMENDED version (excludes deleted paragraphs)
      const parsedAmended = language === 'chinese'
        ? parseChineseStructureWithIndices(mainBodyParagraphs, 'amended')
        : parseEnglishStructureWithIndices(mainBodyParagraphs, 'amended');
      
      // Parse ORIGINAL version (includes deleted paragraphs)
      const parsedOriginal = language === 'chinese'
        ? parseChineseStructureWithIndices(mainBodyParagraphs, 'original')
        : parseEnglishStructureWithIndices(mainBodyParagraphs, 'original');
      
      // Parse COMBINED version (includes BOTH insertions and deletions)
      // This provides stable section numbers regardless of track changes
      const parsedCombined = language === 'chinese'
        ? parseChineseStructureWithIndices(mainBodyParagraphs, 'combined')
        : parseEnglishStructureWithIndices(mainBodyParagraphs, 'combined');
      
      originalParsedStructure = parsedOriginal.structure;
      combinedParsedStructure = parsedCombined.structure;
      
      // Extract recitals
      const recitalsText = indexedParagraphs
        .slice(0, firstSectionIdx)
        .map(p => p.text)
        .join('\n');
      
      // Extract signatures and appendices
      let signatures = '';
      let appendices: AppendixItem[] = [];

      if (closingStartIdx >= 0 && firstAppendixIdx >= 0) {
        if (closingStartIdx < firstAppendixIdx) {
          signatures = indexedParagraphs.slice(closingStartIdx, firstAppendixIdx).map(p => p.text).join('\n');
          appendices = await parseAppendixStructures(indexedParagraphs, appendixIndices, indexedParagraphs.length, language, ooxmlParagraphs, model);
        } else {
          appendices = await parseAppendixStructures(indexedParagraphs, appendixIndices, closingStartIdx, language, ooxmlParagraphs, model);
          signatures = indexedParagraphs.slice(closingStartIdx).map(p => p.text).join('\n');
        }
      } else if (closingStartIdx >= 0) {
        signatures = indexedParagraphs.slice(closingStartIdx).map(p => p.text).join('\n');
      } else if (firstAppendixIdx >= 0) {
        appendices = await parseAppendixStructures(indexedParagraphs, appendixIndices, indexedParagraphs.length, language, ooxmlParagraphs, model);
      }
      
      baseResult = {
        recitals: recitalsText || parsedAmended.recitals,
        structure: parsedAmended.structure,
        signatures,
        appendices,
        badFormatSections: parsedAmended.badFormatSections,
      };
    }
    
    console.log(`[documentParser] Base result has ${baseResult.structure.length} top-level sections`);
    
    // DEBUG 1.9: Parsed COMBINED structure (includes BOTH insertions and deletions)
    console.log(`[DEBUG 1.9] === COMBINED STRUCTURE (${combinedParsedStructure.length} top-level sections) ===`);
    console.log(`[DEBUG 1.9] Document Name: "${documentName || '(not detected)'}"`);
    console.log(`[DEBUG 1.9] Document Type: ${documentType}, Language: ${language}`);
    function logCombinedStructureDetailed(nodes: DocumentNode[], indent: string = '') {
      for (const node of nodes) {
        const childCount = node.children?.length || 0;
        const addlParas = node.additionalParagraphs || [];
        const origAddlParas = node.originalAdditionalParagraphs || [];
        const wordIndices = node.wordIndices || [];
        const ooxmlIndices = node.ooxmlIndices || [];

        // First index is header, rest are additional paragraphs
        const headerWordIdx = wordIndices[0] ?? '(none)';
        const headerOoxmlIdx = ooxmlIndices[0] ?? '(none)';

        console.log(`[DEBUG 1.9] ${indent}L${node.level} [${node.sectionNumber}] origDisp="${node.originalDisplayNumber || 'N/A'}" amendDisp="${node.amendedDisplayNumber || 'N/A'}" status=${node.paragraphStatus || 'unchanged'}`);
        console.log(`[DEBUG 1.9] ${indent}  wordIdx=${headerWordIdx} ooxmlIdx=${headerOoxmlIdx} children=${childCount} addlParas=${addlParas.length}`);
        console.log(`[DEBUG 1.9] ${indent}  sectionHeading: "${node.sectionHeading || '(none)'}"`);
        console.log(`[DEBUG 1.9] ${indent}  text: "${(node.text || '').substring(0, 80)}${(node.text || '').length > 80 ? '...' : ''}"`);
        if (node.originalSectionHeading && node.originalSectionHeading !== node.sectionHeading) {
          console.log(`[DEBUG 1.9] ${indent}  origSectionHeading: "${node.originalSectionHeading}"`);
        }
        if (node.originalText && node.originalText !== node.text) {
          console.log(`[DEBUG 1.9] ${indent}  origText: "${(node.originalText || '').substring(0, 80)}${(node.originalText || '').length > 80 ? '...' : ''}"`);
        }

        // Show additional paragraphs with their indices
        for (let j = 0; j < addlParas.length; j++) {
          const addlWordIdx = wordIndices[j + 1] ?? '(none)';
          const addlOoxmlIdx = ooxmlIndices[j + 1] ?? '(none)';
          const addlText = addlParas[j] || '';
          const origAddlText = origAddlParas[j] || '';
          console.log(`[DEBUG 1.9] ${indent}  └─addl[${j}] wordIdx=${addlWordIdx} ooxmlIdx=${addlOoxmlIdx}`);
          console.log(`[DEBUG 1.9] ${indent}     text: "${addlText.substring(0, 60)}${addlText.length > 60 ? '...' : ''}"`);
          if (addlText.length > 60) {
            console.log(`[DEBUG 1.9] ${indent}     text (last 50 chars): "...${addlText.slice(-50)}"`);
          }
          if (origAddlText && origAddlText !== addlText) {
            console.log(`[DEBUG 1.9] ${indent}     origText: "${origAddlText.substring(0, 60)}${origAddlText.length > 60 ? '...' : ''}"`);
          }
        }

        if (node.children && node.children.length > 0) {
          logCombinedStructureDetailed(node.children, indent + '  ');
        }
      }
    }
    logCombinedStructureDetailed(combinedParsedStructure, '');
    console.log(`[DEBUG 1.9] Signatures length: ${baseResult.signatures.length}`);
    function logAppendixRecursive(items: AppendixItem[], indent: string = '  ') {
      for (let ai = 0; ai < items.length; ai++) {
        const item = items[ai];
        console.log(`[DEBUG 1.9] ${indent}[${ai}] title: "${item.title}"`);
        console.log(`[DEBUG 1.9] ${indent}[${ai}] type: ${item.documentType || '(heuristic)'}, language: ${item.language || '(inherited)'}`);
        console.log(`[DEBUG 1.9] ${indent}[${ai}] content length: ${item.content.length} chars`);
        if (item.recitals) {
          console.log(`[DEBUG 1.9] ${indent}[${ai}] recitals: "${item.recitals.substring(0, 80)}${item.recitals.length > 80 ? '...' : ''}"`);
        }
        console.log(`[DEBUG 1.9] ${indent}[${ai}] structure: ${item.structure.length} top-level sections`);
        if (item.structure.length > 0) {
          logCombinedStructureDetailed(item.structure, indent + '  ');
        }
        if (item.signatures) {
          console.log(`[DEBUG 1.9] ${indent}[${ai}] signatures length: ${item.signatures.length}`);
        }
        if (item.subAppendices && item.subAppendices.length > 0) {
          console.log(`[DEBUG 1.9] ${indent}[${ai}] sub-appendices (${item.subAppendices.length}):`);
          logAppendixRecursive(item.subAppendices, indent + '    ');
        }
      }
    }
    console.log(`[DEBUG 1.9] Appendices (${baseResult.appendices.length}):`);
    logAppendixRecursive(baseResult.appendices);
    console.log(`[DEBUG 1.9] === END COMBINED STRUCTURE ===`);

    function convertToNodeWithRange(nodes: DocumentNode[]): DocumentNodeWithRange[] {
      return nodes.map(node => ({
        sectionNumber: node.sectionNumber,
        originalDisplayNumber: node.originalDisplayNumber,
        amendedDisplayNumber: node.amendedDisplayNumber,
        sectionHeading: node.sectionHeading,
        originalSectionHeading: node.originalSectionHeading,
        combinedSectionHeading: node.combinedSectionHeading,
        text: node.text,
        originalText: node.originalText,
        combinedText: node.combinedText,
        level: node.level,
        additionalParagraphs: node.additionalParagraphs || [],
        originalAdditionalParagraphs: node.originalAdditionalParagraphs || [],
        combinedAdditionalParagraphs: node.combinedAdditionalParagraphs || [],
        children: node.children ? convertToNodeWithRange(node.children) : [],
        levelRange: undefined,
        wordIndices: node.wordIndices || [],
        ooxmlIndices: node.ooxmlIndices || [],
        paragraphStatus: node.paragraphStatus,
      }));
    }
    
    const originalStructureForSentences = convertToNodeWithRange(originalParsedStructure);
    
    // Extract sentences based on document type
    if (classification.documentType === 'flat') {
      // This will trigger DEBUG 3.3 for flat documents
      const originalSentences = extractFlatDocumentSentences(originalStructureForSentences, 'ORIGINAL');
    } else {
      // This will trigger DEBUG 3.1 for tree documents
      const originalSentences = extractAllSentencesWithSources(originalStructureForSentences, 'ORIGINAL');
    }
    
    // Step 7: Build paragraph mappings using wordIndex from structure
    const paragraphMappings = buildParagraphMappingsFromStructure(
      wordParagraphData,
      baseResult.structure
    );

    // Step 7b: Build ORIGINAL paragraph mappings for deletion tracking
const originalParagraphMappings = buildParagraphMappingsFromStructure(
  wordParagraphData,
  originalParsedStructure
);

const mappingsWithSections = paragraphMappings.filter(m => m.sectionNumber !== null).length;
const originalMappingsWithSections = originalParagraphMappings.filter(m => m.sectionNumber !== null).length;
console.log(`[documentParser] Built ${paragraphMappings.length} paragraph mappings (${mappingsWithSections} with sections)`);
console.log(`[documentParser] Built ${originalParagraphMappings.length} original paragraph mappings (${originalMappingsWithSections} with sections)`);
    
    // Step 8: Attach ranges to structure nodes
    const structureWithRanges = attachRangesToStructure(
      baseResult.structure,
      paragraphMappings
    );
    
    // Step 8b: Attach ranges to ORIGINAL structure nodes
    const originalStructureWithRanges = attachRangesToStructure(
      originalParsedStructure,
      originalParagraphMappings
    );

    const combinedParagraphMappings = buildParagraphMappingsFromStructure(
      wordParagraphData,
      combinedParsedStructure
    );
    
    const combinedStructureWithRanges = attachRangesToStructure(
      combinedParsedStructure,
      combinedParagraphMappings
    );
    
    await context.sync();
    
    console.log('[documentParser] parseDocumentWithRanges complete');
    
    // Build section track change map from combined structure
    const sectionTrackChangeMap = buildSectionTrackChangeMap(
      combinedParsedStructure,
      ooxmlParagraphs
    );

    // Find deepest section number for definition section
    let definitionSection: string | undefined;
    if (definitionSectionIdx >= 0) {
      console.log(`[documentParser] Definition section paragraph index: ${definitionSectionIdx}`);
      console.log(`[documentParser] Definition section paragraph text: "${ooxmlTexts[definitionSectionIdx]?.substring(0, 100)}..."`);
      const sectionInfo = findSectionByOoxmlIndex(definitionSectionIdx, structureWithRanges);
      console.log(`[documentParser] findSectionByOoxmlIndex returned:`, sectionInfo);
      // Use amendedDisplayNumber (actual document number) instead of internal sectionNumber
      definitionSection = sectionInfo?.amendedDisplayNumber || sectionInfo?.sectionNumber || undefined;
      console.log(`[documentParser] Definition section: ${definitionSection || '(not found in structure)'}`);
    } else {
      console.log(`[documentParser] Definition section: NONE`);
    }

    return {
      recitals: baseResult.recitals,
      structure: structureWithRanges,
      originalStructure: originalStructureWithRanges,
      combinedStructure: combinedStructureWithRanges,
      signatures: baseResult.signatures,
      appendices: baseResult.appendices,
      badFormatSections: baseResult.badFormatSections,
      paragraphMappings,
      originalParagraphMappings,
      sectionTrackChangeMap,
      documentName,
      definitionSection,
      documentType: classification.documentType,
    };
}

// ========================================
// INDEXED PARAGRAPH BOUNDARY DETECTION
// ========================================

/**
 * Find first main body index in IndexedParagraph array
 */
function findFirstMainBodyIndexInIndexedParagraphs(
  paragraphs: IndexedParagraph[],
  targetText: string,
  language: string
): number {
  if (!targetText || targetText.trim() === '') {
    return 0;
  }
  
  const normalizedTarget = targetText.trim().toLowerCase().substring(0, 50);
  const extractFn = language === 'chinese' ? extractChineseSectionNumber : extractEnglishSectionNumber;
  
  // Step 1: Find paragraph matching LLM's text
  let matchedIndex = -1;
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const extracted = extractFn(para.text);
    const textContent = extracted ? extracted.text : para.text;
    const normalizedContent = textContent.trim().toLowerCase().substring(0, 50);
    
    if (normalizedContent && normalizedTarget) {
      if (normalizedContent.includes(normalizedTarget) || 
          normalizedTarget.includes(normalizedContent)) {
        matchedIndex = i;
        break;
      }
    }
  }
  
  if (matchedIndex === -1) {
    return 0;
  }
  
  // Step 2: Find first numbered paragraph at or after matchedIndex
  let numberedIndex = -1;
  for (let i = matchedIndex; i < paragraphs.length; i++) {
    const extracted = extractFn(paragraphs[i].text);
    if (extracted) {
      numberedIndex = i;
      break;
    }
  }
  
  if (numberedIndex === -1) {
    for (let i = matchedIndex - 1; i >= 0; i--) {
      const extracted = extractFn(paragraphs[i].text);
      if (extracted) {
        numberedIndex = i;
        break;
      }
    }
  }
  
  if (numberedIndex === -1) {
    return matchedIndex;
  }
  
  // Step 3: Backtrack to find true first section
  const extracted = extractFn(paragraphs[numberedIndex].text);
  if (!extracted) {
    return numberedIndex;
  }

  const components = parseSectionNumberToComponents(extracted.number);
  const startingStyle = components[0]?.style;
  const startingValue = components[0]?.value;
  const isFirstItem = startingValue === 1000;

  console.log(`[findFirstMainBodyIndex] STEP 3 DEBUG:`);
  console.log(`  numberedIndex=${numberedIndex}`);
  console.log(`  paragraph text="${paragraphs[numberedIndex]?.text?.substring(0, 80)}..."`);
  console.log(`  extracted.number="${extracted.number}"`);
  console.log(`  components=${JSON.stringify(components)}`);
  console.log(`  startingValue=${startingValue}, isFirstItem=${isFirstItem}`);

  let resultIndex = numberedIndex;

  if (!isFirstItem) {
    for (let i = numberedIndex - 1; i >= 0; i--) {
      const ext = extractFn(paragraphs[i].text);
      if (ext) {
        const comp = parseSectionNumberToComponents(ext.number);
        const extStyle = comp[0]?.style;
        const extValue = comp[0]?.value;
        
        if (extStyle === startingStyle && extValue === 1000) {
          resultIndex = i;
          break;
        }
      }
    }
  }

  for (let i = resultIndex - 1; i >= 0; i--) {
    const ext = extractFn(paragraphs[i].text);
    if (ext) {
      const comp = parseSectionNumberToComponents(ext.number);
      const extValue = comp[0]?.value;
      
      if (extValue !== 1000) {
        break;
      }
      resultIndex = i;
    }
  }

  return resultIndex;
}

/**
 * Find closing start index in IndexedParagraph array
 */
function findClosingStartIndexInIndexedParagraphs(
  paragraphs: IndexedParagraph[],
  closingStartText: string | null,
  firstSectionIndex: number
): number {
  if (!closingStartText || closingStartText.trim() === '') {
    return -1;
  }
  
  const normalizedTarget = closingStartText.trim().toLowerCase().substring(0, 50);
  
  for (let i = firstSectionIndex; i < paragraphs.length; i++) {
    const paraStart = paragraphs[i].text.trim().toLowerCase().substring(0, 50);
    
    if (paraStart && normalizedTarget) {
      if (paraStart.includes(normalizedTarget.substring(0, 30)) || 
          normalizedTarget.includes(paraStart.substring(0, 30))) {
        return i;
      }
    }
  }
  
  return -1;
}

/**
 * Find appendix start indices in IndexedParagraph array.
 * Returns an array of paragraph indices, one per appendix heading, in document order.
 */
function findAppendixStartIndicesInIndexedParagraphs(
  paragraphs: IndexedParagraph[],
  appendixStartTexts: string[],
  closingStartIndex: number,
  firstSectionIndex: number
): number[] {
  if (!appendixStartTexts || appendixStartTexts.length === 0) {
    return [];
  }

  const searchStart = closingStartIndex >= 0 ? closingStartIndex : firstSectionIndex;
  const indices: number[] = [];

  for (const targetText of appendixStartTexts) {
    if (!targetText || targetText.trim() === '') continue;

    const normalizedTarget = targetText.trim().toLowerCase().substring(0, 50);

    for (let i = searchStart; i < paragraphs.length; i++) {
      // Skip paragraphs already claimed by a previous appendix
      if (indices.includes(i)) continue;

      const paraStart = paragraphs[i].text.trim().toLowerCase().substring(0, 50);

      if (paraStart && normalizedTarget) {
        if (paraStart.includes(normalizedTarget.substring(0, 30)) ||
            normalizedTarget.includes(paraStart.substring(0, 30))) {
          indices.push(i);
          break;
        }
      }
    }
  }

  indices.sort((a, b) => a - b);
  return indices;
}

/**
 * Attach Word.Range to each node in the structure
 */
function attachRangesToStructure(
  structure: DocumentNode[],
  paragraphMappings: ParagraphMapping[]
): DocumentNodeWithRange[] {
  
  function attachToNode(node: DocumentNode): DocumentNodeWithRange {
    const nodeWithRange: DocumentNodeWithRange = {
      sectionNumber: node.sectionNumber,
      originalDisplayNumber: node.originalDisplayNumber,
      amendedDisplayNumber: node.amendedDisplayNumber,
      sectionHeading: node.sectionHeading,
      originalSectionHeading: node.originalSectionHeading,
      combinedSectionHeading: node.combinedSectionHeading,
      text: node.text,
      originalText: node.originalText,
      combinedText: node.combinedText,
      level: node.level,
      additionalParagraphs: node.additionalParagraphs || [],
      originalAdditionalParagraphs: node.originalAdditionalParagraphs || [],
      combinedAdditionalParagraphs: node.combinedAdditionalParagraphs || [],
      children: [],
      levelRange: undefined,
      wordIndices: node.wordIndices || [],
      ooxmlIndices: node.ooxmlIndices || [],
      paragraphStatus: node.paragraphStatus,
    };
    
    const sectionMappings = paragraphMappings.filter(
      m => m.sectionNumber === node.sectionNumber
    );
    
    if (sectionMappings.length > 0) {
      const firstRange = sectionMappings[0].range;
      const lastRange = sectionMappings[sectionMappings.length - 1].range;
      
      if (sectionMappings.length === 1) {
        nodeWithRange.levelRange = firstRange;
      } else {
        try {
          nodeWithRange.levelRange = firstRange.expandTo(lastRange);
        } catch (e) {
          console.warn(`[documentParser] Could not expand range for ${node.sectionNumber}`);
          nodeWithRange.levelRange = firstRange;
        }
      }
    }
    
    if (node.children && node.children.length > 0) {
      nodeWithRange.children = node.children.map(child => attachToNode(child));
    }
    
    return nodeWithRange;
  }
  
  return structure.map(node => attachToNode(node));
}

// ========================================
// ENGLISH PARSER WITH INDICES
// ========================================

/**
 * Parse English structure from IndexedParagraph array.
 * Carries wordIndex and ooxmlIndex through to each section node.
 * @param mode - 'amended' uses para.text, 'original' uses para.originalText
 */
function parseEnglishStructureWithIndices(
  paragraphs: IndexedParagraph[],
  mode: 'amended' | 'original' | 'combined' = 'amended'
): InternalParsedDocument {
  const outline: any[] = [];
  let path: PathComponent[] = [];
  let firstMainSectionFound = false;
  const recitalLines: string[] = [];
  const badFormatSections: string[] = [];
  const successfullyParsedSections = new Set<string>();

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const line = mode === 'combined' ? para.combinedTextForParsing : (mode === 'amended' ? para.text : para.originalText);
    if (!line && !para.unifiedNumbering) continue;

    // Priority 1: Use unifiedNumbering from XML (w:numPr)
    if (para.unifiedNumbering) {
      const internalNum = para.unifiedNumbering.internalSectionNumber;
      const level = para.unifiedNumbering.level;
      
      if (!firstMainSectionFound) {
        firstMainSectionFound = true;
      }
      
      // Use para.text and para.originalText directly (they don't have section number prefixes)
      // Don't use `line` here because that's combinedText which has prefix for parsing
      let sectionText = para.text || '';
      let originalSectionText = para.originalText || '';
      let combinedSectionText = para.combinedText || '';

      const section: any = {
        level,
        sectionNumber: internalNum,
        originalDisplayNumber: para.unifiedNumbering.originalDisplayNumber,
        amendedDisplayNumber: para.unifiedNumbering.amendedDisplayNumber,
        rawSectionNumber: internalNum,
        text: sectionText,
        originalText: originalSectionText,
        combinedText: combinedSectionText,
        additionalParagraphs: [],
        originalAdditionalParagraphs: [],
        children: [],
        pathComponents: [],
        wordIndex: para.wordIndex,
        ooxmlIndex: para.ooxmlIndex,
        paragraphStatus: para.paragraphStatus,
      };

      // Insert into tree at correct position based on level
      insertSectionByLevel(outline, section, level);
      continue;
    }

    // Priority 2: Text-based extraction (existing code continues below)
    const sectionMatch = extractEnglishSectionNumber(line || '');

    if (!sectionMatch) {
      if (!firstMainSectionFound) {
        recitalLines.push(line || '');
      } else if (outline.length > 0) {
        // Add as additional paragraph to the last section
        const lastSection = findLastSectionInTree(outline);
        if (lastSection) {
          lastSection.additionalParagraphs.push({
            text: line || '',
            originalText: para.originalText || '',
            combinedText: para.combinedText || '',
            wordIndex: para.wordIndex,
            ooxmlIndex: para.ooxmlIndex,
            paragraphStatus: para.paragraphStatus,
          });
        }
      }
      continue;
    }

    const rawSectionNum = sectionMatch.number;

    const components = parseSectionNumberToComponents(rawSectionNum);

    if (!firstMainSectionFound && components.length > 0) {
      firstMainSectionFound = true;
    }

    const result = validateAndBuildPath(path, components, paragraphs, i, extractEnglishSectionNumber);

    if (!result.valid) {
      const normalizedNum = rawSectionNum.replace(/\.+$/, '');
      const firstComponent = components[0];
      const currentTopLevel = path.length > 0 ? path[0].value : 0;

      const alreadyParsed = successfullyParsedSections.has(normalizedNum);
      const isAheadOfCurrent = firstComponent && firstComponent.value >= currentTopLevel;

      if (!alreadyParsed && isAheadOfCurrent) {
        badFormatSections.push(rawSectionNum);
      }
      continue;
    }

    path = result.newPath;
    const displayNumber = buildDisplayNumber(path);
    const level = path.length;

    const normalizedDisplay = displayNumber.replace(/\.+$/, '');
    successfullyParsedSections.add(normalizedDisplay);

    // Extract text from both versions based on mode
    const amendedExtracted = extractEnglishSectionNumber(para.text || '');
    const originalExtracted = extractEnglishSectionNumber(para.originalText || '');
    
    let sectionText: string;
    let originalSectionText: string;
    
    if (mode === 'combined') {
      // For combined mode, extract from combinedText
      const combinedExtracted = extractEnglishSectionNumber(para.combinedText || '');
      sectionText = combinedExtracted ? combinedExtracted.text : (para.combinedText || '');
      originalSectionText = originalExtracted ? originalExtracted.text : (para.originalText || '');
    } else if (mode === 'amended') {
      sectionText = amendedExtracted ? amendedExtracted.text : (para.text || '');
      originalSectionText = originalExtracted ? originalExtracted.text : (para.originalText || '');
    } else {
      // In original mode, use original text for the primary text field
      sectionText = originalExtracted ? originalExtracted.text : (para.originalText || '');
      originalSectionText = sectionText;
    }

    // Use unified numbering if available, otherwise fall back to parsed number
    const internalSectionNumber = para.unifiedNumbering?.internalSectionNumber 
      || (displayNumber.endsWith('.') ? displayNumber : displayNumber + '.');
    const originalDisplayNum = para.unifiedNumbering?.originalDisplayNumber || null;
    const amendedDisplayNum = para.unifiedNumbering?.amendedDisplayNumber || null;

    const section: any = {
      level,
      sectionNumber: internalSectionNumber,
      originalDisplayNumber: originalDisplayNum,
      amendedDisplayNumber: amendedDisplayNum,
      rawSectionNumber: rawSectionNum,
      text: sectionText,
      originalText: originalSectionText,
      additionalParagraphs: [],
      originalAdditionalParagraphs: [],
      children: [],
      pathComponents: [...path],
      wordIndex: para.wordIndex,
      ooxmlIndex: para.ooxmlIndex,
      paragraphStatus: para.paragraphStatus,
    };

    if (level === 1) {
      outline.push(section);
    } else {
      const parent = findParentInTree(outline, path.slice(0, -1));
      if (parent) parent.children.push(section);
    }
  }

  if (badFormatSections.length > 0) {
    console.warn("⚠️ Bad format detected:", badFormatSections);
  }

  return {
    recitals: recitalLines.join("\n"),
    structure: outline.map((section) => formatSectionWithIndices(section)),
    closing: "",
    badFormatSections,
  };
}

// ========================================
// CHINESE PARSER WITH INDICES
// ========================================

/**
 * Parse Chinese structure from IndexedParagraph array.
 * Carries wordIndex and ooxmlIndex through to each section node.
 * @param mode - 'amended' uses para.text, 'original' uses para.originalText
 */
function parseChineseStructureWithIndices(
  paragraphs: IndexedParagraph[],
  mode: 'amended' | 'original' | 'combined' = 'amended'
): InternalParsedDocument {
  const outline: any[] = [];
  let path: PathComponent[] = [];
  const recitalLines: string[] = [];
  let firstMainSectionFound = false;
  const badFormatSections: string[] = [];
  const successfullyParsedSections = new Set<string>();

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const line = mode === 'combined' ? para.combinedTextForParsing : (mode === 'amended' ? para.text : para.originalText);
    if (!line && !para.unifiedNumbering) continue;  // Skip only if no text AND no numbering

    // Priority 1: Use unifiedNumbering from XML (w:numPr) 
    if (para.unifiedNumbering) {
      const internalNum = para.unifiedNumbering.internalSectionNumber;
      const level = para.unifiedNumbering.level;
      
      if (!firstMainSectionFound) {
        firstMainSectionFound = true;
      }
      
      let sectionText = para.text || '';
      let originalSectionText = para.originalText || '';
      let combinedSectionText = para.combinedText || '';

      const section: any = {
        level,
        sectionNumber: internalNum,
        originalDisplayNumber: para.unifiedNumbering.originalDisplayNumber,
        amendedDisplayNumber: para.unifiedNumbering.amendedDisplayNumber,
        rawSectionNumber: internalNum,
        text: sectionText,
        originalText: originalSectionText,
        combinedText: combinedSectionText,
        additionalParagraphs: [],
        originalAdditionalParagraphs: [],
        children: [],
        pathComponents: [],
        wordIndex: para.wordIndex,
        ooxmlIndex: para.ooxmlIndex,
        paragraphStatus: para.paragraphStatus,
      };

      // Insert into tree at correct position based on level
      insertSectionByLevel(outline, section, level);
      continue;
    }

    // Priority 2: Try to extract section number from text (plaintext numbering)
    const sectionMatch = extractChineseSectionNumber(line);

    if (!sectionMatch) {
      if (!firstMainSectionFound) {
        recitalLines.push(line);
      } else if (outline.length > 0) {
        // Add as additional paragraph to the last section 
        const lastSection = findLastSectionInTree(outline);
        if (lastSection) {
          const textToStore = mode === 'combined' 
            ? (para.combinedText || '') 
            : (mode === 'amended' ? (para.text || '') : (para.originalText || ''));
          lastSection.additionalParagraphs.push({
            text: textToStore,
            originalText: para.originalText || '',
            combinedText: para.combinedText || '',
            wordIndex: para.wordIndex,
            ooxmlIndex: para.ooxmlIndex,
            paragraphStatus: para.paragraphStatus,
          });
        }
      }
      continue;
    }

    const rawSectionNum = sectionMatch.number;
    const currentStyle = getChineseNumberingStyle(rawSectionNum);

    if (!firstMainSectionFound && currentStyle === "chinese-tiao") {
      firstMainSectionFound = true;
    }

    if (!firstMainSectionFound) {
      recitalLines.push(line);
      continue;
    }

    let components = parseSectionNumberToComponents(rawSectionNum);

    if (components.length === 0 && currentStyle.startsWith("chinese-")) {
      const chineseComponents = parseChineseSectionComponents(rawSectionNum, currentStyle);
      if (chineseComponents.length > 0) {
        components = chineseComponents;
      }
    }

    const result = validateAndBuildPath(path, components, paragraphs, i, extractChineseSectionNumber);

    if (!result.valid) {
      const normalizedNum = rawSectionNum.replace(/\.+$/, '');
      const firstComponent = components[0];
      const currentTopLevel = path.length > 0 ? path[0].value : 0;

      const alreadyParsed = successfullyParsedSections.has(normalizedNum);
      const isAheadOfCurrent = firstComponent && firstComponent.value >= currentTopLevel;

      if (!alreadyParsed && isAheadOfCurrent) {
        badFormatSections.push(rawSectionNum);
      }
      continue;
    }

    path = result.newPath;
    const displayNumber = buildDisplayNumber(path);
    const level = path.length;

    const normalizedDisplay = displayNumber.replace(/\.+$/, '');
    successfullyParsedSections.add(normalizedDisplay);

    // Extract text from both versions
    const amendedExtracted = extractChineseSectionNumber(para.text || '');
    const originalExtracted = extractChineseSectionNumber(para.originalText || '');
    
    let sectionText: string;
    let originalSectionText: string;
    
    if (mode === 'combined') {
      // For combined mode, extract from combinedText
      const combinedExtracted = extractEnglishSectionNumber(para.combinedText || '');
      sectionText = combinedExtracted ? combinedExtracted.text : (para.combinedText || '');
      originalSectionText = originalExtracted ? originalExtracted.text : (para.originalText || '');
    } else if (mode === 'amended') {
      sectionText = amendedExtracted ? amendedExtracted.text : (para.text || '');
      originalSectionText = originalExtracted ? originalExtracted.text : (para.originalText || '');
    } else {
      // In original mode, use original text for the primary text field
      sectionText = originalExtracted ? originalExtracted.text : (para.originalText || '');
      originalSectionText = sectionText;
    }

    // Use unified numbering if available, otherwise fall back to parsed number
    const internalSectionNumber = para.unifiedNumbering?.internalSectionNumber 
      || normalizeSectionNumber(displayNumber);
    const originalDisplayNum = para.unifiedNumbering?.originalDisplayNumber || null;
    const amendedDisplayNum = para.unifiedNumbering?.amendedDisplayNumber || null;

    const section: any = {
      level,
      sectionNumber: internalSectionNumber,
      originalDisplayNumber: originalDisplayNum,
      amendedDisplayNumber: amendedDisplayNum,
      rawSectionNumber: rawSectionNum,
      text: sectionText,
      originalText: originalSectionText,
      additionalParagraphs: [],
      originalAdditionalParagraphs: [],
      children: [],
      pathComponents: [...path],
      wordIndex: para.wordIndex,
      ooxmlIndex: para.ooxmlIndex,
      paragraphStatus: para.paragraphStatus,
    };

    if (level === 1) {
      outline.push(section);
    } else {
      const parent = findParentInTree(outline, path.slice(0, -1));
      if (parent) parent.children.push(section);
    }
  }

  if (badFormatSections.length > 0) {
    console.warn("⚠️ Bad format detected:", badFormatSections);
  }

  return {
    recitals: recitalLines.join("\n"),
    structure: outline.map((section) => formatSectionWithIndices(section)),
    closing: "",
    badFormatSections,
  };
}

/**
 * Format section node with indices
 */
function formatSectionWithIndices(section: any): DocumentNode {
  // Extract additional paragraphs with their indices
  const addlParas = section.additionalParagraphs || [];
  
  // Build wordIndices: [headerIndex, ...additionalParagraphIndices]
  const wordIndices: number[] = [];
  const ooxmlIndices: number[] = [];
  
  // Header indices
  if (section.wordIndex !== undefined) {
    wordIndices.push(section.wordIndex);
  }
  if (section.ooxmlIndex !== undefined) {
    ooxmlIndices.push(section.ooxmlIndex);
  }
  
  // Additional paragraph indices
  for (const addl of addlParas) {
    if (typeof addl === 'object' && addl.wordIndex !== undefined) {
      wordIndices.push(addl.wordIndex);
    }
    if (typeof addl === 'object' && addl.ooxmlIndex !== undefined) {
      ooxmlIndices.push(addl.ooxmlIndex);
    }
  }
  
  // Extract text from additional paragraphs
  const additionalParagraphTexts: string[] = addlParas.map((addl: any) => 
    typeof addl === 'object' ? addl.text : addl
  );
  const originalAdditionalParagraphTexts: string[] = addlParas.map((addl: any) => 
    typeof addl === 'object' ? (addl.originalText || addl.text) : addl
  );
  const combinedAdditionalParagraphTexts: string[] = addlParas.map((addl: any) => 
    typeof addl === 'object' ? (addl.combinedText || addl.text) : addl
  );
  // Extract status from additional paragraphs
  const additionalParagraphStatuses: ('unchanged' | 'inserted' | 'deleted')[] = addlParas.map((addl: any) => 
    typeof addl === 'object' ? (addl.paragraphStatus || 'unchanged') : 'unchanged'
  );

  // Detect headings from text fields
  const headingResult = detectHeading(section.text || '');
  const originalHeadingResult = detectHeading(section.originalText || '');
  const combinedHeadingResult = detectHeading(section.combinedText || '');

  const formatted: DocumentNode = {
    sectionNumber: section.sectionNumber,
    originalDisplayNumber: section.originalDisplayNumber || null,
    amendedDisplayNumber: section.amendedDisplayNumber || null,
    sectionHeading: headingResult.heading || undefined,
    originalSectionHeading: originalHeadingResult.heading || undefined,
    combinedSectionHeading: combinedHeadingResult.heading || undefined,
    text: headingResult.content,
    originalText: originalHeadingResult.content,
    combinedText: combinedHeadingResult.content,
    level: section.level,
    additionalParagraphs: additionalParagraphTexts,
    originalAdditionalParagraphs: originalAdditionalParagraphTexts,
    combinedAdditionalParagraphs: combinedAdditionalParagraphTexts,
    additionalParagraphStatuses,
    children: [],
    wordIndices,
    ooxmlIndices,
    paragraphStatus: section.paragraphStatus || 'unchanged',
  };

  if (section.children && section.children.length > 0) {
    formatted.children = section.children.map((child: any) => formatSectionWithIndices(child));
  }

  return formatted;
}

// ========================================
// PARAGRAPH MAPPINGS FROM STRUCTURE
// ========================================

/**
 * Build paragraph mappings directly from structure's wordIndices
 */
function buildParagraphMappingsFromStructure(
  wordParagraphData: { range: Word.Range; text: string }[],
  structure: DocumentNode[]
): ParagraphMapping[] {
  // Build wordIndex → section lookup
  const wordIndexToSection = new Map<number, { sectionNumber: string; level: number }>();
  
  function collectIndices(nodes: DocumentNode[]) {
    for (const node of nodes) {
      const wordIndices = node.wordIndices || [];
      for (const idx of wordIndices) {
        wordIndexToSection.set(idx, { sectionNumber: node.sectionNumber, level: node.level });
      }
      if (node.children) {
        collectIndices(node.children);
      }
    }
  }
  collectIndices(structure);
  
  // Build mappings
  const mappings: ParagraphMapping[] = [];
  for (let i = 0; i < wordParagraphData.length; i++) {
    const section = wordIndexToSection.get(i);
    mappings.push({
      paragraphIndex: i,
      sectionNumber: section?.sectionNumber || null,
      level: section?.level || 0,
      range: wordParagraphData[i].range,
    });
  }
  
  return mappings;
}

// ========================================
// PART STYLE DETECTION
// ========================================

function detectPartStyle(part: string): string {
  const cleaned = part.replace(/[()）（]/g, '').trim();

  if (!cleaned) return "unknown";

  if (/^\d+[A-Za-z]$/.test(cleaned)) return "decimal-letter";
  if (/^\d+$/.test(cleaned)) return "decimal";

  if (/^[ivxlcdm]{2,}$/i.test(cleaned)) {
    return cleaned === cleaned.toLowerCase() ? "roman-lower" : "roman-upper";
  }

  if (/^[a-zA-Z]$/.test(cleaned)) {
    return cleaned === cleaned.toLowerCase() ? "letter-lower" : "letter-upper";
  }

  return "unknown";
}

function computePartValue(part: string, style: string): number {
  const cleaned = part.replace(/[()）（]/g, '').trim();

  if (style === "decimal-letter") {
    const match = cleaned.match(/^(\d+)([A-Za-z])$/);
    if (match) {
      const digit = parseInt(match[1]);
      const letter = match[2].toUpperCase().charCodeAt(0) - 64;
      return digit * 1000 + letter * 100;
    }
  }

  if (style === "decimal") return parseInt(cleaned) * 1000;

  if (style === "letter-lower" || style === "letter-upper") {
    return (cleaned.toLowerCase().charCodeAt(0) - 96) * 1000;
  }

  if (style === "roman-lower" || style === "roman-upper") {
    return romanToNumber(cleaned.toLowerCase()) * 1000;
  }

  return 1000;
}

// ========================================
// COMPONENT PARSING
// ========================================

function parseSectionNumberToComponents(rawNum: string): PathComponent[] {
  const num = rawNum.trim().replace(/\.+$/, '');

  if (/^\([^)]+\)$/.test(num) || /^[（][^）]+[）]$/.test(num)) {
    const inner = num.replace(/^[（(]/, '').replace(/[)）]$/, '');
    const partStyle = detectPartStyle(inner);
    const value = computePartValue(inner, partStyle);
    return [{ original: rawNum, value: value, style: partStyle + "-paren" }];
  }

  if (/^[a-zA-Z]\)$/.test(num) || /^\d+\)$/.test(num)) {
    const inner = num.replace(/\)$/, '');
    const partStyle = detectPartStyle(inner);
    const value = computePartValue(inner, partStyle);
    return [{ original: rawNum, value: value, style: partStyle + "-close" }];
  }

  const parts = num.split('.');
  const components: PathComponent[] = [];

  for (const part of parts) {
    if (!part) continue;
    const partStyle = detectPartStyle(part);
    const partValue = computePartValue(part, partStyle);
    components.push({ original: part, value: partValue, style: partStyle });
  }

  return components;
}

function parseChineseSectionComponents(rawNum: string, style: string): PathComponent[] {
  if (style === "chinese-tiao" || style === "chinese-kuan" || style === "chinese-xiang") {
    const chineseNum = rawNum.replace(/^第/, '').replace(/[条條款项項]$/, '');
    const value = chineseToNumber(chineseNum) * 1000;
    return [{ original: rawNum, value: value, style: style }];
  }

  if (style === "chinese-pause") {
    const chineseNum = rawNum.replace(/[、]$/, '');
    const value = chineseToNumber(chineseNum) * 1000;
    return [{ original: rawNum, value: value, style: style }];
  }

  if (style === "chinese-paren") {
    const inner = rawNum.replace(/^[（(]/, '').replace(/[)）]$/, '');
    const value = chineseToNumber(inner) * 1000;
    return [{ original: rawNum, value: value, style: style }];
  }

  if (style === "arabic-paren") {
    const inner = rawNum.replace(/^[（(]/, '').replace(/[)）]$/, '');
    const value = parseInt(inner) * 1000;
    return [{ original: rawNum, value: value, style: style }];
  }

  return [];
}

function romanToNumber(roman: string): number {
  if (!roman) return 0;
  const map: { [key: string]: number } = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
  let result = 0;
  const lowerRoman = roman.toLowerCase();
  for (let i = 0; i < lowerRoman.length; i++) {
    const current = map[lowerRoman[i]];
    const next = map[lowerRoman[i + 1]];
    if (!current) continue;
    result += (next && current < next) ? -current : current;
  }
  return result;
}

/**
 * Validate that a string is a legitimate roman numeral.
 * Rejects invalid sequences like "ddddd", "iiii", "llll".
 * Valid roman numerals follow specific patterns and convert to reasonable values.
 */
function isValidRomanNumeral(str: string): boolean {
  if (!str) return false;
  const lower = str.toLowerCase();
  
  // Must only contain valid roman chars
  if (!/^[ivxlcdm]+$/i.test(lower)) return false;
  
  // Convert to number
  const value = romanToNumber(lower);
  
  // Must be a positive value
  if (value <= 0) return false;
  
  // Reasonable limit for section numbers 
  if (value > 50) return false;
  
  // Validate by converting back: a valid roman numeral should have a canonical form
  // For simplicity, reject obviously invalid patterns:
  // - More than 3 consecutive identical chars (except for edge cases)
  // - 'd' can only appear once, 'l' can only appear once, 'v' can only appear once
  if ((lower.match(/d/g) || []).length > 1) return false;
  if ((lower.match(/l/g) || []).length > 1) return false;
  if ((lower.match(/v/g) || []).length > 1) return false;
  if (/(.)\1{3,}/.test(lower)) return false;  // No 4+ consecutive identical chars
  
  return true;
}

function buildDisplayNumber(path: PathComponent[]): string {
  if (path.length === 0) return "";
  const parts: string[] = [];
  for (const component of path) {
    parts.push(component.original);
  }
  return parts.join('.');
}

// ========================================
// PATH VALIDATION LOGIC
// ========================================

function getBaseStyle(style: string): string {
  return style.replace(/-paren$/, '').replace(/-close$/, '');
}

function stylesMatch(style1: string, style2: string): boolean {
  return getBaseStyle(style1) === getBaseStyle(style2);
}

function isAmbiguousChar(char: string): boolean {
  const cleaned = char.replace(/[()）（]/g, '').trim().toLowerCase();
  return /^[ivxl]$/.test(cleaned);
}

function resolveAmbiguousStyle(
  paragraphs: string[] | IndexedParagraph[],
  currentIndex: number,
  component: PathComponent,
  extractFn: (text: string) => { number: string; text: string } | null,
  currentPath?: PathComponent[]  
): 'letter' | 'roman' {
  const char = component.original.replace(/[().\)（）]/g, '').toLowerCase();
  
  // Look ahead for next numbered paragraphs
  for (let i = currentIndex + 1; i < Math.min(currentIndex + 10, paragraphs.length); i++) {
    const para = paragraphs[i];
    const text = typeof para === 'string' ? para : para.text;
    const extracted = extractFn(text);
    if (!extracted) continue;
    
    const nextNum = extracted.number;
    if (!sameNumberFormat(component.original, nextNum)) continue;
    
    const nextChar = nextNum.replace(/[().\)（）]/g, '').toLowerCase();
    
    const expectedNextRoman = nextRomanNumeral(char);
    if (nextChar === expectedNextRoman) return 'roman';
    
    const expectedNextLetter = nextLetter(char);
    if (nextChar === expectedNextLetter) return 'letter';
  }
  
  // Lookahead inconclusive - check if this could be continuation of path
  if (currentPath && currentPath.length > 0) {
    const lastInPath = currentPath[currentPath.length - 1];
    const lastStyle = getBaseStyle(lastInPath.style);
    
    // If last item is a letter, check if current char continues the sequence
    if (lastStyle === 'letter-lower' || lastStyle === 'letter-upper') {
      const lastLetter = lastInPath.original.replace(/[().\)（）]/g, '').toLowerCase();
      const expectedNext = nextLetter(lastLetter);
      if (char === expectedNext) {
        return 'letter';  // Valid continuation of letter sequence (e.g., H→I)
      }
    }
    
    // If last item is roman, check if current char continues the sequence
    if (lastStyle === 'roman-lower' || lastStyle === 'roman-upper') {
      const lastRoman = lastInPath.original.replace(/[().\)（）]/g, '').toLowerCase();
      const expectedNext = nextRomanNumeral(lastRoman);
      if (char === expectedNext) {
        return 'roman';  // Valid continuation of roman sequence
      }
    }
  }
  
  // Default heuristic: 'i' alone is likely roman, others likely letter
  return char === 'i' ? 'roman' : 'letter';
}

function nextRomanNumeral(current: string): string {
  const romans = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv'];
  const idx = romans.indexOf(current.toLowerCase());
  return idx >= 0 && idx < romans.length - 1 ? romans[idx + 1] : '';
}

function nextLetter(current: string): string {
  const lower = current.toLowerCase();
  if (lower >= 'a' && lower < 'z') {
    return String.fromCharCode(lower.charCodeAt(0) + 1);
  }
  return '';
}

function sameNumberFormat(a: string, b: string): boolean {
  const hasFullParenA = /^\(.*\)$/.test(a.replace(/\.+$/, ''));
  const hasFullParenB = /^\(.*\)$/.test(b.replace(/\.+$/, ''));
  const hasCloseParenA = /^[^(].*\)$/.test(a.replace(/\.+$/, ''));
  const hasCloseParenB = /^[^(].*\)$/.test(b.replace(/\.+$/, ''));
  const hasDotA = /\.$/.test(a);
  const hasDotB = /\.$/.test(b);
  return hasFullParenA === hasFullParenB && hasCloseParenA === hasCloseParenB && hasDotA === hasDotB;
}

function getAlternativeComponent(component: PathComponent): PathComponent | null {
  const cleaned = component.original.replace(/[()）（\.]/g, '').trim();

  if (!isAmbiguousChar(cleaned)) return null;

  const baseStyle = getBaseStyle(component.style);
  const hasParen = component.style.endsWith('-paren');
  const hasClose = component.style.endsWith('-close');
  const suffix = hasParen ? '-paren' : (hasClose ? '-close' : '');

  if (baseStyle === 'letter-lower' || baseStyle === 'letter-upper') {
    const isLower = cleaned === cleaned.toLowerCase();
    const romanValue = romanToNumber(cleaned.toLowerCase()) * 1000;
    return {
      original: component.original,
      value: romanValue,
      style: (isLower ? 'roman-lower' : 'roman-upper') + suffix
    };
  } else if (baseStyle === 'roman-lower' || baseStyle === 'roman-upper') {
    const isLower = cleaned === cleaned.toLowerCase();
    const letterValue = (cleaned.toLowerCase().charCodeAt(0) - 96) * 1000;
    return {
      original: component.original,
      value: letterValue,
      style: (isLower ? 'letter-lower' : 'letter-upper') + suffix
    };
  }

  return null;
}

function validateAndBuildPath(
  currentPath: PathComponent[],
  newComponents: PathComponent[],
  paragraphs?: string[] | IndexedParagraph[],
  currentIndex?: number,
  extractFn?: (text: string) => { number: string; text: string } | null
): { valid: boolean; newPath: PathComponent[] } {
  if (newComponents.length === 0) {
    return { valid: false, newPath: [] };
  }

  const lastComponent = newComponents[newComponents.length - 1];
  
  // For ambiguous chars, use lookahead to resolve before trying paths
  if (isAmbiguousChar(lastComponent.original) && paragraphs && currentIndex !== undefined && extractFn) {
  const resolvedStyle = resolveAmbiguousStyle(paragraphs, currentIndex, lastComponent, extractFn, currentPath);
    const currentBaseStyle = getBaseStyle(lastComponent.style);
    const isCurrentRoman = currentBaseStyle === 'roman-lower' || currentBaseStyle === 'roman-upper';
    const isCurrentLetter = currentBaseStyle === 'letter-lower' || currentBaseStyle === 'letter-upper';
    
    // If lookahead says roman but we parsed as letter (or vice versa), use alternative
    if ((resolvedStyle === 'roman' && isCurrentLetter) || (resolvedStyle === 'letter' && isCurrentRoman)) {
      const alternative = getAlternativeComponent(lastComponent);
      if (alternative) {
        const altComponents = [...newComponents.slice(0, -1), alternative];
        const altResult = tryValidatePath(currentPath, altComponents);
        if (altResult.valid) {
          console.log(`  Lookahead resolved: ${lastComponent.style} -> ${alternative.style}`);
          return altResult;
        }
      }
    }
  }

  const result = tryValidatePath(currentPath, newComponents);
  if (result.valid) return result;

  const alternative = getAlternativeComponent(lastComponent);

  if (alternative) {
    const altComponents = [...newComponents.slice(0, -1), alternative];
    const altResult = tryValidatePath(currentPath, altComponents);
    if (altResult.valid) {
      console.log(`  Using alternative interpretation: ${lastComponent.style} -> ${alternative.style}`);
      return altResult;
    }
  }

  return { valid: false, newPath: [] };
}

function tryValidatePath(
  currentPath: PathComponent[],
  newComponents: PathComponent[]
): { valid: boolean; newPath: PathComponent[] } {
  const lastComponent = newComponents[newComponents.length - 1];
  const lastStyle = lastComponent.style;
  const lastValue = lastComponent.value;

  // console.log(`validateAndBuildPath: new="${lastComponent.original}" style="${lastStyle}" value=${lastValue}`);
  // console.log(`  currentPath: [${currentPath.map(c => `${c.original}(${c.style}:${c.value})`).join(', ')}]`);

  let matchPosition = -1;
  let foundMatchingStyleButFailed = false;
  const expectedMatchPosition = newComponents.length - 1;

  for (let i = currentPath.length - 1; i >= 0; i--) {
    if (stylesMatch(currentPath[i].style, lastStyle)) {
      const baseStyle = getBaseStyle(lastStyle);
      if ((baseStyle === "decimal" || baseStyle === "decimal-letter") && i > expectedMatchPosition) {
        continue;
      }

      const valueDiff = lastValue - currentPath[i].value;
      if (lastValue > currentPath[i].value) {
        // For ambiguous chars, require consecutive to force alternative interpretation
        if (isAmbiguousChar(lastComponent.original) && valueDiff > 1000) {
          foundMatchingStyleButFailed = true;
          continue;
        }
        // Non-ambiguous: allow non-consecutive siblings
        matchPosition = i;
        break;
      } else {
        foundMatchingStyleButFailed = true;
      }
    }
  }

  // console.log(`  matchPosition=${matchPosition}, foundMatchingStyleButFailed=${foundMatchingStyleButFailed}`);

  if (matchPosition !== -1) {
    if (newComponents.length > 1) {
      const prefixStartIndex = matchPosition - (newComponents.length - 1);

      if (prefixStartIndex < 0) {
        return { valid: false, newPath: [] };
      }

      for (let i = 0; i < newComponents.length - 1; i++) {
        const pathIndex = prefixStartIndex + i;
        if (pathIndex >= currentPath.length ||
          currentPath[pathIndex].value !== newComponents[i].value ||
          !stylesMatch(currentPath[pathIndex].style, newComponents[i].style)) {
          return { valid: false, newPath: [] };
        }
      }

      const newPath = [...currentPath.slice(0, matchPosition), lastComponent];
      // console.log(`  RESULT (multi-component replace): [${newPath.map(c => c.original).join(', ')}]`);
      return { valid: true, newPath };
    } else {
      const newPath = [...currentPath.slice(0, matchPosition), lastComponent];
      // console.log(`  RESULT (single-component replace): [${newPath.map(c => c.original).join(', ')}]`);
      return { valid: true, newPath };
    }
  }

  if (newComponents.length === 1) {
    if (lastValue === 1000) {
      const newPath = [...currentPath, lastComponent];
      console.log(`  RESULT (append as new level - first in sequence): [${newPath.map(c => c.original).join(', ')}]`);
      return { valid: true, newPath };
    }

    if (foundMatchingStyleButFailed) {
      // console.log(`  RESULT: invalid (found matching style but value not consecutive - bad format)`);
      return { valid: false, newPath: [] };
    }

    // console.log(`  RESULT: invalid (no matching style and not first in sequence)`);
    return { valid: false, newPath: [] };
  }

  const prefixLength = newComponents.length - 1;

  if (prefixLength > currentPath.length) {
    return { valid: false, newPath: [] };
  }

  let prefixMatches = true;
  for (let i = 0; i < prefixLength; i++) {
    const pathIndex = currentPath.length - prefixLength + i;
    if (pathIndex < 0 ||
      currentPath[pathIndex].value !== newComponents[i].value ||
      !stylesMatch(currentPath[pathIndex].style, newComponents[i].style)) {
      prefixMatches = false;
      break;
    }
  }

  if (prefixMatches && lastValue === 1000) {
    const newPath = [...currentPath, lastComponent];
    // console.log(`  RESULT (prefix matches, append as first child): [${newPath.map(c => c.original).join(', ')}]`);
    return { valid: true, newPath };
  } else if (prefixMatches) {
    // console.log(`  RESULT: invalid (prefix matches but not first in sequence)`);
    return { valid: false, newPath: [] };
  } else {
    // console.log(`  RESULT: invalid (prefix doesn't match)`);
    return { valid: false, newPath: [] };
  }
}

function findSectionInTree(tree: any[], path: PathComponent[]): any {
  if (!path || path.length === 0) return null;

  let current = tree;
  let section: any = null;

  for (let i = 0; i < path.length; i++) {
    const component = path[i];
    const found = current.find((s: any) =>
      s.pathComponents &&
      s.pathComponents.length > i &&
      s.pathComponents[i].value === component.value &&
      s.pathComponents[i].style === component.style
    );

    if (!found) return null;

    section = found;
    current = found.children || [];
  }

  return section;
}

function findParentInTree(tree: any[], parentPath: PathComponent[]): any {
  if (!parentPath || parentPath.length === 0) return null;
  return findSectionInTree(tree, parentPath);
}

// ========================================
// ENGLISH PARSER
// ========================================

/**
 * Insert section into tree at correct position based on level.
 * Finds the appropriate parent by traversing the last branch.
 */
function insertSectionByLevel(outline: any[], section: any, level: number): void {
  if (level === 1 || outline.length === 0) {
    outline.push(section);
    return;
  }
  
  // Find parent by walking down the last branch
  let parent = outline[outline.length - 1];
  let currentLevel = 1;
  
  while (currentLevel < level - 1 && parent.children && parent.children.length > 0) {
    parent = parent.children[parent.children.length - 1];
    currentLevel++;
  }
  
  if (!parent.children) {
    parent.children = [];
  }
  parent.children.push(section);
}

/**
 * Find the last section in the tree by traversing down the last branch.
 * Used for adding additional paragraphs to the most recently added section.
 */
function findLastSectionInTree(outline: any[]): any | null {
  if (outline.length === 0) return null;
  
  let current = outline[outline.length - 1];
  while (current.children && current.children.length > 0) {
    current = current.children[current.children.length - 1];
  }
  return current;
}

export function parseEnglishStructure(cleanText: string): InternalParsedDocument {
  const lines = cleanText.split("\n");

  const outline: any[] = [];
  let path: PathComponent[] = [];
  let firstMainSectionFound = false;
  const recitalLines: string[] = [];
  const badFormatSections: string[] = [];
  const successfullyParsedSections = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const sectionMatch = extractEnglishSectionNumber(line);

    if (!sectionMatch) {
      if (!firstMainSectionFound) {
        recitalLines.push(line);
      } else if (path.length > 0) {
        const section = findSectionInTree(outline, path);
        if (section) section.additionalParagraphs.push(line);
      }
      continue;
    }

    const rawSectionNum = sectionMatch.number;
    const sectionText = sectionMatch.text;

    const components = parseSectionNumberToComponents(rawSectionNum);

    if (!firstMainSectionFound && components.length > 0) {
      firstMainSectionFound = true;
    }

    const result = validateAndBuildPath(path, components, lines, i, extractEnglishSectionNumber);

    if (!result.valid) {
      const normalizedNum = rawSectionNum.replace(/\.+$/, '');
      const firstComponent = components[0];
      const currentTopLevel = path.length > 0 ? path[0].value : 0;

      const alreadyParsed = successfullyParsedSections.has(normalizedNum);
      const isAheadOfCurrent = firstComponent && firstComponent.value >= currentTopLevel;

      if (!alreadyParsed && isAheadOfCurrent) {
        badFormatSections.push(rawSectionNum);
      }
      continue;
    }

    path = result.newPath;
    const displayNumber = buildDisplayNumber(path);
    const level = path.length;

    const normalizedDisplay = displayNumber.replace(/\.+$/, '');
    successfullyParsedSections.add(normalizedDisplay);

    const section: any = {
      level,
      sectionNumber: displayNumber.endsWith('.') ? displayNumber : displayNumber + '.',
      rawSectionNumber: rawSectionNum,
      text: sectionText,
      additionalParagraphs: [],
      children: [],
      pathComponents: [...path],
    };

    if (level === 1) {
      outline.push(section);
    } else {
      const parent = findParentInTree(outline, path.slice(0, -1));
      if (parent) parent.children.push(section);
    }
  }

  if (badFormatSections.length > 0) {
    console.warn("⚠️ Bad format detected:", badFormatSections);
  }

  return {
    recitals: recitalLines.join("\n"),
    structure: outline.map((section) => formatSection(section)),
    closing: "",
    badFormatSections,
  };
}

// ========================================
// CHINESE PARSER
// ========================================

export function parseChineseStructure(cleanText: string): InternalParsedDocument {
  const lines = cleanText.split("\n");

  const outline: any[] = [];
  let path: PathComponent[] = [];
  const recitalLines: string[] = [];
  let firstMainSectionFound = false;
  const badFormatSections: string[] = [];
  const successfullyParsedSections = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const sectionMatch = extractChineseSectionNumber(line);

    if (!sectionMatch) {
      if (!firstMainSectionFound) {
        recitalLines.push(line);
      } else if (path.length > 0) {
        const section = findSectionInTree(outline, path);
        if (section) section.additionalParagraphs.push(line);
      }
      continue;
    }

    const rawSectionNum = sectionMatch.number;
    const sectionText = sectionMatch.text;
    const currentStyle = getChineseNumberingStyle(rawSectionNum);

    if (!firstMainSectionFound && currentStyle === "chinese-tiao") {
      firstMainSectionFound = true;
    }

    if (!firstMainSectionFound) {
      recitalLines.push(line);
      continue;
    }

    let components = parseSectionNumberToComponents(rawSectionNum);

    if (components.length === 0 && currentStyle.startsWith("chinese-")) {
      const chineseComponents = parseChineseSectionComponents(rawSectionNum, currentStyle);
      if (chineseComponents.length > 0) {
        components = chineseComponents;
      }
    }

    const result = validateAndBuildPath(path, components, lines, i, extractChineseSectionNumber);

    if (!result.valid) {
      const normalizedNum = rawSectionNum.replace(/\.+$/, '');
      const firstComponent = components[0];
      const currentTopLevel = path.length > 0 ? path[0].value : 0;

      const alreadyParsed = successfullyParsedSections.has(normalizedNum);
      const isAheadOfCurrent = firstComponent && firstComponent.value >= currentTopLevel;

      if (!alreadyParsed && isAheadOfCurrent) {
        badFormatSections.push(rawSectionNum);
      }
      continue;
    }

    path = result.newPath;
    const displayNumber = buildDisplayNumber(path);
    const level = path.length;

    const normalizedDisplay = displayNumber.replace(/\.+$/, '');
    successfullyParsedSections.add(normalizedDisplay);

    const section: any = {
      level,
      sectionNumber: normalizeSectionNumber(displayNumber),
      rawSectionNumber: rawSectionNum,
      text: sectionText,
      additionalParagraphs: [],
      children: [],
      pathComponents: [...path],
    };

    if (level === 1) {
      outline.push(section);
    } else {
      const parent = findParentInTree(outline, path.slice(0, -1));
      if (parent) parent.children.push(section);
    }
  }

  if (badFormatSections.length > 0) {
    console.warn("⚠️ Bad format detected:", badFormatSections);
  }

  return {
    recitals: recitalLines.join("\n"),
    structure: outline.map((section) => formatSection(section)),
    closing: "",
    badFormatSections,
  };
}

// ========================================
// EXTRACTION & STYLE DETECTION
// ========================================

export function extractChineseSectionNumber(text: string): { number: string; text: string } | null {
  const patterns: RegExp[] = [
    /^第([一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟萬]+)条[、\s]*(.*)$/,
    /^第([一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟萬]+)條[、\s]*(.*)$/,
    /^第([一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟萬]+)款[、\s]*(.*)$/,
    /^第([一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟萬]+)项[、\s]*(.*)$/,
    /^第([一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟萬]+)項[、\s]*(.*)$/,
    /^([一二三四五六七八九十百千壹贰叁肆伍陆柒捌玖拾佰仟])[、]\s*(.*)$/,
    /^[（(]([一二三四五六七八九十百千壹贰叁肆伍陆柒捌玖拾佰仟]+)[)）]\s*(.*)$/,
    /^(\d+(?:\.\d+)*\.?)\s*(.*)$/,
    /^(\d+(?:\.\d+)*[A-Za-z]\.?)\s*(.*)$/,
    /^[（(](\d+)[)）]\s*(.*)$/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (text.startsWith("第")) {
        const textPart = match[2] ? match[2].trim() : "";
        return { number: text.substring(0, text.length - textPart.length).trim(), text: textPart };
      }
      return { number: match[1].trim(), text: match[2] ? match[2].trim() : "" };
    }
  }
  return null;
}

/**
 * Extract English section number from text
 * 
 * IMPORTANT: Naked letters/romans WITHOUT dots (A, B, i, ii, III) are ONLY
 * recognized as section numbers when they are STANDALONE (alone on the line).
 * Letters/romans WITH dots (A., B., i., ii.) CAN have text following.
 */
export function extractEnglishSectionNumber(text: string): { number: string; text: string } | null {
  const trimmed = text.trim();
  
  // Patterns that DON'T need roman validation (non-roman or have clear delimiters)
  const nonRomanPatterns: RegExp[] = [
    // === Article/Section keyword prefixes ===
    /^(?:Article|ARTICLE)\s+(\d+)(?:\s*$|\s*[\.:\-]\s*)(.*)$/i,
    /^(?:Section|SECTION)\s+(\d+)(?:\s*$|\s*[\.:\-]\s*)(.*)$/i,

    // === Decimal formats ===
    /^(\d+(?:\.\d+)+[A-Za-z]\.?)\s*(.*)$/,
    /^(\d+(?:\.\d+)+\.?)\s+(.*)$/,
    /^(\d+\.)\s+(.*)$/,
    /^(\d+)\s+(.+)$/,
    /^(\(\d+\)\.?)\s*(.*)$/,
    /^(\d+\)\.?)\s*(.*)$/,

    // === Letter formats ===
    /^(\([a-zA-Z]\)\.?)\s*(.*)$/,
    /^([a-zA-Z]\)\.?)\s*(.*)$/,
    /^([a-zA-Z]\.)\s*(.*)$/,
    /^([a-zA-Z])$/,
  ];

  for (const pattern of nonRomanPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return { number: match[1].trim(), text: (match[2] || '').trim() };
    }
  }

  // Patterns that NEED roman numeral validation
  const romanPatterns: RegExp[] = [
    // Full parens: (i), (ii), (IV)
    /^(\([ivxlcdm]+\)\.?)\s*(.*)$/i,
    // Close paren multi-char: ii), iii), IV)
    /^([ivxlcdm]{2,}\)\.?)\s*(.*)$/i,
    // With dot: i., ii., iii., IV.
    /^([ivxlcdm]+\.)\s*(.*)$/i,
    // STANDALONE multi-char roman (NO text after): ii, iii, iv, IV, VI
    /^([ivxlcdm]{2,})$/i,
  ];

  for (const pattern of romanPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      // Extract just the roman numeral part for validation
      const romanPart = match[1].replace(/[().\s]/g, '');
      if (isValidRomanNumeral(romanPart)) {
        return { number: match[1].trim(), text: (match[2] || '').trim() };
      }
    }
  }

  return null;
}

function getChineseNumberingStyle(sectionNumber: string): string {
  const num = sectionNumber.trim();

  if (/^\d+(?:\.\d+)*[A-Za-z]$/.test(num)) return "decimal-letter";
  if (/^\d+$/.test(num)) return "decimal";
  if (/^\d+(\.\d+)*\.?$/.test(num)) return "decimal";
  if (/^第.+条$/.test(num) || /^第.+條$/.test(num)) return "chinese-tiao";
  if (/^第.+款$/.test(num)) return "chinese-kuan";
  if (/^第.+项$/.test(num) || /^第.+項$/.test(num)) return "chinese-xiang";
  if (/^[一二三四五六七八九十百千壹贰叁肆伍陆柒捌玖拾佰仟][、]$/.test(num)) return "chinese-pause";
  if (/^[（(][一二三四五六七八九十百千壹贰叁肆伍陆柒捌玖拾佰仟]+[)）]$/.test(num)) return "chinese-paren";
  if (/^[（(]\d+[)）]$/.test(num)) return "arabic-paren";

  return "unknown";
}

function formatSection(section: any): DocumentNode {
  // Detect heading from text
  const headingResult = detectHeading(section.text || '');

  const formatted: DocumentNode = {
    sectionNumber: section.sectionNumber,
    sectionHeading: headingResult.heading || undefined,
    text: headingResult.content,
    level: section.level,
    additionalParagraphs: [],
    children: [],
  };

  if (section.additionalParagraphs && section.additionalParagraphs.length > 0) {
    formatted.additionalParagraphs = section.additionalParagraphs;
  }

  if (section.children && section.children.length > 0) {
    formatted.children = section.children.map((child: any) => formatSection(child));
  }

  return formatted;
}

function chineseToNumber(chinese: string): number {
  const digitMap: { [key: string]: number } = {
    '零': 0, '〇': 0,
    '一': 1, '壹': 1,
    '二': 2, '贰': 2, '貳': 2,
    '三': 3, '叁': 3, '參': 3,
    '四': 4, '肆': 4,
    '五': 5, '伍': 5,
    '六': 6, '陆': 6, '陸': 6,
    '七': 7, '柒': 7,
    '八': 8, '捌': 8,
    '九': 9, '玖': 9,
  };

  const unitMap: { [key: string]: number } = {
    '十': 10, '拾': 10,
    '百': 100, '佰': 100,
    '千': 1000, '仟': 1000,
    '万': 10000, '萬': 10000,
  };

  let result = 0;
  let temp = 0;
  let unit = 1;

  for (let i = chinese.length - 1; i >= 0; i--) {
    const char = chinese[i];

    if (digitMap.hasOwnProperty(char)) {
      temp = digitMap[char] * unit;
      result += temp;
      unit = 1;
    } else if (unitMap.hasOwnProperty(char)) {
      unit = unitMap[char];
      if (temp === 0) {
        temp = unit;
        result += temp;
        unit = 1;
      }
    }
  }

  return result;
}