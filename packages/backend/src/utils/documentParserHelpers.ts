// @ts-nocheck
// ========================================
// DOCUMENT PARSER HELPERS (Backend Version)
// Ported from frontend/src/utils/documentParserHelpers.ts
// Uses @xmldom/xmldom instead of browser DOMParser
//
// NOTE: @ts-nocheck is used because this is battle-tested frontend code.
// ========================================

import { DOMParser } from '@xmldom/xmldom';

// ========================================
// TYPES
// ========================================

export interface NumberingMap {
  abstractNums: Record<string, Record<string, {
    format: string;
    levelText: string;
    start: number;
  }>>;
  numToAbstract: Record<string, string>;
}

/**
 * Extraction mode for OOXML text
 * - 'amended': Include insertions, exclude deletions (current/accepted state)
 * - 'original': Include deletions, exclude insertions (original state before changes)
 */
export type OOXMLExtractionMode = 'amended' | 'original';

// ========================================
// LANGUAGE DETECTION
// ========================================

/**
 * Detect if document is in English or Chinese based on text sample
 */
export function detectDocumentLanguage(cleanText: string): 'english' | 'chinese' {
  const sample = cleanText.substring(0, 100);
  const hasChinese = /[\u4e00-\u9fa5]/.test(sample);
  return hasChinese ? 'chinese' : 'english';
}

// ========================================
// NUMBERING MAP BUILDER
// ========================================

/**
 * Build numbering map from numbering XML document
 */
export function buildNumberingMap(xmlDoc: Document): NumberingMap {
  const numberingMap: NumberingMap = { abstractNums: {}, numToAbstract: {} };
  const abstractNums = xmlDoc.getElementsByTagNameNS('*', 'abstractNum');

  for (let i = 0; i < abstractNums.length; i++) {
    const abstractNum = abstractNums[i];
    const abstractNumId = abstractNum.getAttributeNS(
      'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      'abstractNumId'
    );

    if (!abstractNumId) continue;

    numberingMap.abstractNums[abstractNumId] = {};

    const lvls = abstractNum.getElementsByTagNameNS('*', 'lvl');

    for (let j = 0; j < lvls.length; j++) {
      const lvl = lvls[j];
      const ilvl = lvl.getAttributeNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'ilvl'
      );

      const numFmt = lvl.getElementsByTagNameNS('*', 'numFmt')[0];
      const format = numFmt
        ? numFmt.getAttributeNS(
            'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
            'val'
          )
        : 'decimal';

      const lvlText = lvl.getElementsByTagNameNS('*', 'lvlText')[0];
      const levelText = lvlText
        ? lvlText.getAttributeNS(
            'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
            'val'
          )
        : '%1.';

      const startNode = lvl.getElementsByTagNameNS('*', 'start')[0];
      const start = startNode
        ? parseInt(
            startNode.getAttributeNS(
              'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
              'val'
            ) || '1'
          )
        : 1;

      if (ilvl) {
        numberingMap.abstractNums[abstractNumId][ilvl] = {
          format: format || 'decimal',
          levelText: levelText || '%1.',
          start: start,
        };
      }
    }
  }

  const nums = xmlDoc.getElementsByTagNameNS('*', 'num');

  for (let i = 0; i < nums.length; i++) {
    const num = nums[i];
    const numId = num.getAttributeNS(
      'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      'numId'
    );
    const abstractNumIdNode = num.getElementsByTagNameNS('*', 'abstractNumId')[0];

    if (abstractNumIdNode && numId) {
      const abstractId = abstractNumIdNode.getAttributeNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'val'
      );
      if (abstractId) {
        numberingMap.numToAbstract[numId] = abstractId;
      }
    }
  }

  return numberingMap;
}

// ========================================
// SECTION NUMBER PARSING HELPERS
// ========================================

/**
 * Parse a section number string into an array of numeric values.
 * E.g., "2.3.1" -> [2, 3, 1], "1.2" -> [1, 2]
 */
function parseSectionNumberString(sectionNum: string): number[] {
  if (!sectionNum) return [];
  const cleaned = sectionNum.trim().replace(/\.$/, '');
  const parts = cleaned.split('.');
  const result: number[] = [];
  for (const part of parts) {
    const num = parseInt(part);
    if (!isNaN(num)) {
      result.push(num);
    }
  }
  return result;
}

/**
 * Try to extract a decimal section number from the beginning of text.
 * Returns the section number string if found, null otherwise.
 */
function extractSectionNumberFromText(text: string): string | null {
  if (!text) return null;
  const trimmed = text.trim();

  // Match patterns like "1.2.3" or "1.2" or "1." at the start
  const match = trimmed.match(/^(\d+(?:\.\d+)*\.?)\s/);
  if (match) {
    return match[1].replace(/\.$/, '');
  }
  return null;
}

/**
 * Fix section numbers where parent levels OR current level are wrong due to cross-numId issues.
 */
function fixCrossNumIdNumbering(
  formattedNumber: string,
  globalContext: number[],
  ilvl: number,
  format: string
): string {
  // Only fix decimal hierarchical numbers (like "16.1.")
  if (format !== 'decimal') {
    return formattedNumber;
  }

  const cleanNumber = formattedNumber.replace(/\.+$/, '');
  const parts = cleanNumber.split('.');
  const expectedParts = ilvl + 1;

  // Only fix if we have the expected number of parts for a hierarchical number
  if (parts.length !== expectedParts || expectedParts < 2) {
    return formattedNumber;
  }

  let needsFix = false;
  const fixedParts = [...parts];

  // Check each PARENT level (all except the last part)
  for (let i = 0; i < fixedParts.length - 1; i++) {
    const partValue = parseInt(fixedParts[i]);
    const contextValue = globalContext[i];

    if (contextValue !== undefined && contextValue > 0 && partValue !== contextValue) {
      fixedParts[i] = contextValue.toString();
      needsFix = true;
    }
  }

  // Also check CURRENT level (the last part)
  const currentLevelIdx = fixedParts.length - 1;
  const currentPartValue = parseInt(fixedParts[currentLevelIdx]);
  const currentContextValue = globalContext[currentLevelIdx];

  if (currentContextValue !== undefined && currentContextValue > 0) {
    let parentsMatch = true;
    for (let i = 0; i < currentLevelIdx; i++) {
      if (parseInt(fixedParts[i]) !== globalContext[i]) {
        parentsMatch = false;
        break;
      }
    }

    if (parentsMatch && currentPartValue <= currentContextValue) {
      const newValue = currentContextValue + 1;
      fixedParts[currentLevelIdx] = newValue.toString();
      needsFix = true;
    }
  }

  if (needsFix) {
    const suffix = formattedNumber.endsWith('.') ? '.' : '';
    return fixedParts.join('.') + suffix;
  }

  return formattedNumber;
}

// ========================================
// TABLE CELL DETECTION
// ========================================

/**
 * Check if a paragraph element is inside a table cell.
 */
function isParentTableCell(element: Element): boolean {
  let parent = element.parentNode as Element | null;
  while (parent) {
    if (parent.localName === 'tc' || parent.nodeName === 'w:tc') {
      return true;
    }
    if (parent.localName === 'body' || parent.nodeName === 'w:body') {
      return false;
    }
    parent = parent.parentNode as Element | null;
  }
  return false;
}

// ========================================
// TRACK CHANGES DETECTION
// ========================================

/**
 * Check if a node is inside a deletion (track changes)
 */
function isInsideDeletion(node: Node): boolean {
  let current: Node | null = node.parentNode;
  while (current) {
    if ((current as Element).localName === 'del') {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}

/**
 * Check if a node is inside an insertion (track changes)
 */
function isInsideInsertion(node: Node): boolean {
  let current: Node | null = node.parentNode;
  while (current) {
    if ((current as Element).localName === 'ins') {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}

// ========================================
// PARAGRAPH TEXT EXTRACTION
// ========================================

/**
 * Extract text from a paragraph, preserving tabs as spaces.
 */
function extractTextFromParagraph(para: Element, mode: OOXMLExtractionMode = 'amended'): string {
  let result = '';
  const runs = para.getElementsByTagNameNS('*', 'r');
  let skippedContentHadSpace = false;

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];

    let shouldSkip = false;
    if (mode === 'amended') {
      shouldSkip = isInsideDeletion(run);
    } else {
      shouldSkip = isInsideInsertion(run);
    }

    let runText = '';
    const children = run.childNodes;
    for (let j = 0; j < children.length; j++) {
      const child = children[j];

      if (child.nodeType === 1) { // ELEMENT_NODE
        const element = child as Element;
        const localName = element.localName;

        if (localName === 't') {
          runText += element.textContent || '';
        } else if (localName === 'delText') {
          if (mode === 'original') {
            runText += element.textContent || '';
          }
        } else if (localName === 'tab') {
          runText += ' ';
        } else if (localName === 'br') {
          runText += ' ';
        }
      }
    }

    if (shouldSkip) {
      if (runText.length > 0 && /\s/.test(runText)) {
        skippedContentHadSpace = true;
      }
      continue;
    }

    if (
      skippedContentHadSpace &&
      result.length > 0 &&
      !/\s$/.test(result) &&
      runText.length > 0 &&
      !/^\s/.test(runText)
    ) {
      result += ' ';
    }
    skippedContentHadSpace = false;

    result += runText;
  }

  return result;
}

// ========================================
// NUMBER FORMATTING
// ========================================

function formatNumber(num: number, format: string): string {
  switch (format) {
    case 'decimal':
      return num.toString();
    case 'upperRoman':
      return toRoman(num).toUpperCase();
    case 'lowerRoman':
      return toRoman(num).toLowerCase();
    case 'upperLetter':
      return toLetter(num).toUpperCase();
    case 'lowerLetter':
      return toLetter(num).toLowerCase();
    case 'ordinal':
      return num + getOrdinalSuffix(num);
    case 'bullet':
      return '•';
    default:
      return num.toString();
  }
}

function toRoman(num: number): string {
  const romanNumerals: [string, number][] = [
    ['M', 1000],
    ['CM', 900],
    ['D', 500],
    ['CD', 400],
    ['C', 100],
    ['XC', 90],
    ['L', 50],
    ['XL', 40],
    ['X', 10],
    ['IX', 9],
    ['V', 5],
    ['IV', 4],
    ['I', 1],
  ];

  let result = '';
  for (const [roman, value] of romanNumerals) {
    while (num >= value) {
      result += roman;
      num -= value;
    }
  }
  return result;
}

function toLetter(num: number): string {
  let result = '';
  while (num > 0) {
    num--;
    result = String.fromCharCode(97 + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  return result;
}

function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

// ========================================
// NUMBERING FORMAT GETTER
// ========================================

function getNumberingFormat(
  numberingMap: NumberingMap,
  numId: string,
  level: number,
  listCounters: { [key: string]: number }
): { fullText: string } {
  const abstractNumId = numberingMap.numToAbstract[numId];

  let levelText = '';

  if (
    abstractNumId &&
    numberingMap.abstractNums[abstractNumId] &&
    numberingMap.abstractNums[abstractNumId][level]
  ) {
    const levelDef = numberingMap.abstractNums[abstractNumId][level];
    levelText = levelDef.levelText;
  } else {
    levelText = '%1.';
  }

  let fullText = levelText;
  const placeholderRegex = /%(\d+)/g;
  let match;
  const replacements: Array<{ placeholder: string; level: number }> = [];

  while ((match = placeholderRegex.exec(levelText)) !== null) {
    const placeholderLevel = parseInt(match[1]) - 1;
    replacements.push({
      placeholder: match[0],
      level: placeholderLevel,
    });
  }

  for (const replacement of replacements) {
    const counterKey = `${numId}_${replacement.level}`;
    const counterValue = listCounters[counterKey] || 0;

    let levelFormat = 'decimal';
    if (
      abstractNumId &&
      numberingMap.abstractNums[abstractNumId] &&
      numberingMap.abstractNums[abstractNumId][replacement.level]
    ) {
      levelFormat = numberingMap.abstractNums[abstractNumId][replacement.level].format;
    }

    const formattedNum = formatNumber(counterValue, levelFormat);
    fullText = fullText.replace(replacement.placeholder, formattedNum);
  }

  return { fullText };
}

// ========================================
// MAIN TEXT EXTRACTION
// ========================================

/**
 * Extract text from OOXML document
 * @param xmlDoc - The parsed XML document
 * @param numberingMap - Optional pre-built numbering map (for uploaded documents)
 * @param mode - Extraction mode: 'amended' (include insertions) or 'original' (include deletions)
 */
export function extractTextFromOOXML(
  xmlDoc: Document,
  numberingMap?: NumberingMap,
  mode: OOXMLExtractionMode = 'amended'
): string {
  const textParts: string[] = [];

  // If no numbering map provided, build it from the document
  const numMap = numberingMap || buildNumberingMap(xmlDoc);

  const listCounters: { [key: string]: number } = {};
  const paragraphs = xmlDoc.getElementsByTagNameNS('*', 'p');

  // Maintain a global section path context from DECIMAL section numbers only
  let globalDecimalContext: number[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];

    // Extract text preserving tabs as spaces
    const actualText = extractTextFromParagraph(para, mode);

    if (!actualText.trim()) {
      continue;
    }

    // Skip all numbering logic for paragraphs inside table cells
    if (isParentTableCell(para)) {
      textParts.push(actualText);
      continue;
    }

    let paraText = '';
    const numPr = para.getElementsByTagNameNS('*', 'numPr')[0];

    if (numPr) {
      const ilvlNode = numPr.getElementsByTagNameNS('*', 'ilvl')[0];
      const level = ilvlNode
        ? parseInt(
            ilvlNode.getAttributeNS(
              'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
              'val'
            ) || '0'
          )
        : 0;

      const numIdNode = numPr.getElementsByTagNameNS('*', 'numId')[0];
      const numId = numIdNode
        ? numIdNode.getAttributeNS(
            'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
            'val'
          )
        : null;

      if (numId) {
        const counterKey = `${numId}_${level}`;

        // Get format for this level
        const abstractNumId = numMap.numToAbstract[numId];
        let levelFormat = 'decimal';
        if (abstractNumId && numMap.abstractNums[abstractNumId]?.[level]) {
          levelFormat = numMap.abstractNums[abstractNumId][level].format;
        }

        // Initialize this level AND all parent levels with their START values
        if (!listCounters[counterKey]) {
          for (let initLevel = 0; initLevel <= level; initLevel++) {
            const initKey = `${numId}_${initLevel}`;
            if (!listCounters[initKey]) {
              const startValue =
                (abstractNumId && numMap.abstractNums[abstractNumId]?.[initLevel]?.start) || 1;
              listCounters[initKey] = startValue - 1;
            }
          }
        }

        listCounters[counterKey]++;

        for (let resetLevel = level + 1; resetLevel < 10; resetLevel++) {
          const resetKey = `${numId}_${resetLevel}`;
          listCounters[resetKey] = 0;
        }

        const numFormat = getNumberingFormat(numMap, numId, level, listCounters);
        let formattedNumber = numFormat.fullText;

        // Fix cross-numId issues for DECIMAL numbers
        if (levelFormat === 'decimal') {
          if (level === 0) {
            const parsedValue = parseInt(formattedNumber.replace(/\.$/, ''));
            const contextValue = globalDecimalContext[0];
            if (!isNaN(parsedValue) && contextValue !== undefined && parsedValue <= contextValue) {
              const fixedValue = contextValue + 1;
              const suffix = formattedNumber.endsWith('.') ? '.' : '';
              formattedNumber = fixedValue + suffix;
            }
          } else {
            formattedNumber = fixCrossNumIdNumbering(
              formattedNumber,
              globalDecimalContext,
              level,
              levelFormat
            );
          }
        }

        const indent = level > 0 ? '  '.repeat(level) : '';
        paraText = indent + formattedNumber + ' ';

        // Only update global context with DECIMAL numbers
        if (levelFormat === 'decimal') {
          const parsedNum = parseSectionNumberString(formattedNumber);
          if (parsedNum.length > 0) {
            for (let l = 0; l < parsedNum.length; l++) {
              globalDecimalContext[l] = parsedNum[l];
            }
            globalDecimalContext.length = parsedNum.length;
          }
        }
      }
    } else {
      // No auto-numbering - check if this paragraph starts with a manual section number
      const manualSectionNum = extractSectionNumberFromText(actualText);
      if (manualSectionNum) {
        const parsedNum = parseSectionNumberString(manualSectionNum);
        if (parsedNum.length > 0) {
          for (let l = 0; l < parsedNum.length; l++) {
            globalDecimalContext[l] = parsedNum[l];
          }
          globalDecimalContext.length = parsedNum.length;
        }
      }
    }

    paraText += actualText;
    textParts.push(paraText);
  }

  return textParts.join('\n');
}

// ========================================
// UTILITY: Create DOMParser instance
// ========================================

/**
 * Create a DOMParser instance (works in both Node.js and browser)
 */
export function createDOMParser(): DOMParser {
  return new DOMParser();
}
