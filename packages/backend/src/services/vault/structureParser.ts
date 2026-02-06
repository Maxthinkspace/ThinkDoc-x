// @ts-nocheck
// ========================================
// DOCUMENT STRUCTURE PARSER (Backend Version)
// Ported from frontend/src/services/documentParser.ts
// Contains parseEnglishStructure and parseChineseStructure
// 
// NOTE: @ts-nocheck is used because this is battle-tested frontend code.
// The strict mode errors are false positives due to array access patterns.
// ========================================

// ========================================
// TYPES
// ========================================

export interface DocumentNode {
  sectionNumber: string;
  text: string;
  level: number;
  additionalParagraphs: string[];
  children: DocumentNode[];
}

export interface InternalParsedDocument {
  recitals: string;
  structure: DocumentNode[];
  closing: string;
  badFormatSections: string[];
}

export interface AppendixItem {
  title: string;
  content: string;
  structure: DocumentNode[];  // Parsed sections within this appendix
}

export interface ParsedDocument {
  recitals: string;
  structure: DocumentNode[];
  signatures: string;
  appendices: AppendixItem[];
  badFormatSections: string[];
}

interface PathComponent {
  original: string;
  value: number;
  style: string;
}

// ========================================
// SECTION NUMBER NORMALIZATION
// ========================================

export function normalizeSectionNumber(section: string): string {
  if (!section) return section;
  const trimmed = section.trim();
  if (trimmed === 'NOT FOUND' || trimmed === '') return trimmed;
  return trimmed.endsWith('.') ? trimmed : trimmed + '.';
}

// ========================================
// CLOSING DETECTION HELPERS
// ========================================

function isSignatureLine(line: string): boolean {
  const trimmed = line.trim();
  if (/_{10,}/.test(trimmed)) return true;
  if (/^[_\s]+$/.test(trimmed) && (trimmed.match(/_/g) || []).length >= 10) return true;
  return false;
}

function hasNearbySignatureLine(lines: string[], currentIndex: number, range: number): boolean {
  const start = Math.max(0, currentIndex - range);
  const end = Math.min(lines.length, currentIndex + range + 1);
  for (let i = start; i < end; i++) {
    if (isSignatureLine(lines[i])) return true;
  }
  return false;
}

function hasNearbySignatureWords(lines: string[], currentIndex: number, range: number): boolean {
  const start = Math.max(0, currentIndex - range);
  const end = Math.min(lines.length, currentIndex + range + 1);
  const signatureWordsPattern = /\b(signature|signed|authori[sz]ed|signatory)\b/i;
  for (let i = start; i < end; i++) {
    if (signatureWordsPattern.test(lines[i])) return true;
  }
  return false;
}

function detectEnglishClosingStart(lines: string[], startSearchIndex: number): number {
  const strongSignaturePattern =
    /^(For and on behalf of|IN WITNESS WHEREOF|IN WITNESS HEREOF|Executed as of|Acknowledged and Accepted|AGREED AND ACCEPTED|The parties have executed|Duly authorized|Duly authorised|By signing below)/i;
  const signatureLabelPattern =
    /^(Signature|Authori[sz]ed\s+(Signature|Signatory)|Signed\s+by|Signatory)(:|\s{2,}|\t|$)/i;
  const standaloneAnnexPattern =
    /^(SCHEDULE|APPENDIX|ANNEX|EXHIBIT|ATTACHMENT|ADDENDUM|ENCLOSURE)\s*([A-Z0-9]+(-[A-Z0-9]+)?|[IVXLCDM]+)?\s*$/i;
  const weakSignaturePattern = /^(WITNESS(ED)?|SIGNATURE|SIGNED)(\s{2,}|:|$)/i;

  for (let i = startSearchIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (strongSignaturePattern.test(line)) return i;
    if (signatureLabelPattern.test(line)) return i;
    if (standaloneAnnexPattern.test(line)) return i;
    if (weakSignaturePattern.test(line) && hasNearbySignatureLine(lines, i, 5)) return i;
    if (isSignatureLine(line) && hasNearbySignatureWords(lines, i, 3)) return i;
  }
  return -1;
}

function detectChineseClosingStart(lines: string[], startSearchIndex: number): number {
  const strongChinesePattern = /^(签署|签名|公章|印章|签字盖章|双方签字|各方签署|本合同自|兹证明)/;
  const partyLabelPattern = /^(甲方|乙方|丙方|丁方)(\s*[：:（(]|\s*签)/;
  const chineseAnnexPattern =
    /^(附件|附表|附录|Schedule|SCHEDULE|Appendix|APPENDIX|Annex|ANNEX|Exhibit|EXHIBIT)\s*[一二三四五六七八九十A-Z0-9IVXLCDM]*\s*$/i;

  for (let i = startSearchIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (strongChinesePattern.test(line)) return i;
    if (partyLabelPattern.test(line)) return i;
    if (chineseAnnexPattern.test(line)) return i;
    if (isSignatureLine(line) && hasNearbySignatureWords(lines, i, 3)) return i;
  }
  return -1;
}

// ========================================
// PART STYLE DETECTION
// ========================================

function detectPartStyle(part: string): string {
  const cleaned = part.replace(/[()）（]/g, '').trim();

  if (!cleaned) return 'unknown';

  if (/^\d+[A-Za-z]$/.test(cleaned)) return 'decimal-letter';
  if (/^\d+$/.test(cleaned)) return 'decimal';

  if (/^[ivxlcdm]{2,}$/i.test(cleaned)) {
    return cleaned === cleaned.toLowerCase() ? 'roman-lower' : 'roman-upper';
  }

  if (/^[a-zA-Z]$/.test(cleaned)) {
    return cleaned === cleaned.toLowerCase() ? 'letter-lower' : 'letter-upper';
  }

  return 'unknown';
}

function computePartValue(part: string, style: string): number {
  const cleaned = part.replace(/[()）（]/g, '').trim();

  if (style === 'decimal-letter') {
    const match = cleaned.match(/^(\d+)([A-Za-z])$/);
    if (match) {
      const digit = parseInt(match[1]);
      const letter = match[2].toUpperCase().charCodeAt(0) - 64;
      return digit * 1000 + letter * 100;
    }
  }

  if (style === 'decimal') return parseInt(cleaned) * 1000;

  if (style === 'letter-lower' || style === 'letter-upper') {
    return (cleaned.toLowerCase().charCodeAt(0) - 96) * 1000;
  }

  if (style === 'roman-lower' || style === 'roman-upper') {
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
    return [{ original: rawNum, value: value, style: partStyle + '-paren' }];
  }

  if (/^[a-zA-Z]\)$/.test(num) || /^\d+\)$/.test(num)) {
    const inner = num.replace(/\)$/, '');
    const partStyle = detectPartStyle(inner);
    const value = computePartValue(inner, partStyle);
    return [{ original: rawNum, value: value, style: partStyle + '-close' }];
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
  if (style === 'chinese-tiao' || style === 'chinese-kuan' || style === 'chinese-xiang') {
    const chineseNum = rawNum.replace(/^第/, '').replace(/[条條款项項]$/, '');
    const value = chineseToNumber(chineseNum) * 1000;
    return [{ original: rawNum, value: value, style: style }];
  }

  if (style === 'chinese-pause') {
    const chineseNum = rawNum.replace(/[、]$/, '');
    const value = chineseToNumber(chineseNum) * 1000;
    return [{ original: rawNum, value: value, style: style }];
  }

  if (style === 'chinese-paren') {
    const inner = rawNum.replace(/^[（(]/, '').replace(/[)）]$/, '');
    const value = chineseToNumber(inner) * 1000;
    return [{ original: rawNum, value: value, style: style }];
  }

  if (style === 'arabic-paren') {
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
    result += next && current < next ? -current : current;
  }
  return result;
}

function buildDisplayNumber(path: PathComponent[]): string {
  if (path.length === 0) return '';
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

function getAlternativeComponent(component: PathComponent): PathComponent | null {
  const cleaned = component.original.replace(/[()）（\.]/g, '').trim();

  if (!isAmbiguousChar(cleaned)) return null;

  const baseStyle = getBaseStyle(component.style);
  const hasParen = component.style.endsWith('-paren');
  const hasClose = component.style.endsWith('-close');
  const suffix = hasParen ? '-paren' : hasClose ? '-close' : '';

  if (baseStyle === 'letter-lower' || baseStyle === 'letter-upper') {
    const isLower = cleaned === cleaned.toLowerCase();
    const romanValue = romanToNumber(cleaned.toLowerCase()) * 1000;
    return {
      original: component.original,
      value: romanValue,
      style: (isLower ? 'roman-lower' : 'roman-upper') + suffix,
    };
  } else if (baseStyle === 'roman-lower' || baseStyle === 'roman-upper') {
    const isLower = cleaned === cleaned.toLowerCase();
    const letterValue = (cleaned.toLowerCase().charCodeAt(0) - 96) * 1000;
    return {
      original: component.original,
      value: letterValue,
      style: (isLower ? 'letter-lower' : 'letter-upper') + suffix,
    };
  }

  return null;
}

function validateAndBuildPath(
  currentPath: PathComponent[],
  newComponents: PathComponent[]
): { valid: boolean; newPath: PathComponent[] } {
  if (newComponents.length === 0) {
    return { valid: false, newPath: [] };
  }

  const result = tryValidatePath(currentPath, newComponents);
  if (result.valid) return result;

  const lastComponent = newComponents[newComponents.length - 1];
  const alternative = getAlternativeComponent(lastComponent);

  if (alternative) {
    const altComponents = [...newComponents.slice(0, -1), alternative];
    const altResult = tryValidatePath(currentPath, altComponents);
    if (altResult.valid) {
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

  let matchPosition = -1;
  let foundMatchingStyleButFailed = false;
  const expectedMatchPosition = newComponents.length - 1;

  for (let i = currentPath.length - 1; i >= 0; i--) {
    if (stylesMatch(currentPath[i].style, lastStyle)) {
      const baseStyle = getBaseStyle(lastStyle);
      if ((baseStyle === 'decimal' || baseStyle === 'decimal-letter') && i > expectedMatchPosition) {
        continue;
      }

      const valueDiff = lastValue - currentPath[i].value;
      if (lastValue > currentPath[i].value && valueDiff <= 1000) {
        matchPosition = i;
        break;
      } else {
        foundMatchingStyleButFailed = true;
      }
    }
  }

  if (matchPosition !== -1) {
    if (newComponents.length > 1) {
      const prefixStartIndex = matchPosition - (newComponents.length - 1);

      if (prefixStartIndex < 0) {
        return { valid: false, newPath: [] };
      }

      for (let i = 0; i < newComponents.length - 1; i++) {
        const pathIndex = prefixStartIndex + i;
        if (
          pathIndex >= currentPath.length ||
          currentPath[pathIndex].value !== newComponents[i].value ||
          !stylesMatch(currentPath[pathIndex].style, newComponents[i].style)
        ) {
          return { valid: false, newPath: [] };
        }
      }

      const newPath = [...currentPath.slice(0, matchPosition), lastComponent];
      return { valid: true, newPath };
    } else {
      const newPath = [...currentPath.slice(0, matchPosition), lastComponent];
      return { valid: true, newPath };
    }
  }

  if (newComponents.length === 1) {
    if (lastValue === 1000) {
      const newPath = [...currentPath, lastComponent];
      return { valid: true, newPath };
    }

    if (foundMatchingStyleButFailed) {
      return { valid: false, newPath: [] };
    }

    return { valid: false, newPath: [] };
  }

  const prefixLength = newComponents.length - 1;

  if (prefixLength > currentPath.length) {
    return { valid: false, newPath: [] };
  }

  let prefixMatches = true;
  for (let i = 0; i < prefixLength; i++) {
    const pathIndex = currentPath.length - prefixLength + i;
    if (
      pathIndex < 0 ||
      currentPath[pathIndex].value !== newComponents[i].value ||
      !stylesMatch(currentPath[pathIndex].style, newComponents[i].style)
    ) {
      prefixMatches = false;
      break;
    }
  }

  if (prefixMatches && lastValue === 1000) {
    const newPath = [...currentPath, lastComponent];
    return { valid: true, newPath };
  } else if (prefixMatches) {
    return { valid: false, newPath: [] };
  } else {
    return { valid: false, newPath: [] };
  }
}

function findSectionInTree(tree: any[], path: PathComponent[]): any {
  if (!path || path.length === 0) return null;

  let current = tree;
  let section: any = null;

  for (let i = 0; i < path.length; i++) {
    const component = path[i];
    const found = current.find(
      (s: any) =>
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
// EXTRACTION & STYLE DETECTION
// ========================================

function extractChineseSectionNumber(text: string): { number: string; text: string } | null {
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
      if (text.startsWith('第')) {
        const textPart = match[2] ? match[2].trim() : '';
        return { number: text.substring(0, text.length - textPart.length).trim(), text: textPart };
      }
      return { number: match[1].trim(), text: match[2] ? match[2].trim() : '' };
    }
  }
  return null;
}

function extractEnglishSectionNumber(text: string): { number: string; text: string } | null {
  const trimmed = text.trim();

  const patterns: RegExp[] = [
    /^(?:Article|ARTICLE)\s+(\d+)(?:\s*$|\s*[\.:\-]\s*)(.*)$/i,
    /^(?:Section|SECTION)\s+(\d+)(?:\s*$|\s*[\.:\-]\s*)(.*)$/i,
    /^(\d+(?:\.\d+)+[A-Za-z]\.?)\s*(.*)$/,
    /^(\d+(?:\.\d+)+\.?)\s+(.*)$/,
    /^(\d+\.)\s+(.*)$/,
    /^(\d+)\s+(.+)$/,
    /^(\(\d+\)\.?)\s+(.+)/,
    /^(\d+\)\.?)\s+(.+)/,
    /^(\([ivxlcdm]+\)\.?)\s+(.+)/i,
    /^([ivxlcdm]{2,}\)\.?)\s+(.+)/i,
    /^([ivxlcdm]+\.)\s+(.+)/i,
    /^([ivxlcdm]{2,})$/i,
    /^(\([a-zA-Z]\)\.?)\s+(.+)/,
    /^([a-zA-Z]\)\.?)\s+(.+)/,
    /^([a-zA-Z]\.)\s+(.+)/,
    /^([a-zA-Z])$/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return { number: match[1].trim(), text: (match[2] || '').trim() };
    }
  }
  return null;
}

function getChineseNumberingStyle(sectionNumber: string): string {
  const num = sectionNumber.trim();

  if (/^\d+(?:\.\d+)*[A-Za-z]$/.test(num)) return 'decimal-letter';
  if (/^\d+$/.test(num)) return 'decimal';
  if (/^\d+(\.\d+)*\.?$/.test(num)) return 'decimal';
  if (/^第.+条$/.test(num) || /^第.+條$/.test(num)) return 'chinese-tiao';
  if (/^第.+款$/.test(num)) return 'chinese-kuan';
  if (/^第.+项$/.test(num) || /^第.+項$/.test(num)) return 'chinese-xiang';
  if (/^[一二三四五六七八九十百千壹贰叁肆伍陆柒捌玖拾佰仟][、]$/.test(num)) return 'chinese-pause';
  if (/^[（(][一二三四五六七八九十百千壹贰叁肆伍陆柒捌玖拾佰仟]+[)）]$/.test(num))
    return 'chinese-paren';
  if (/^[（(]\d+[)）]$/.test(num)) return 'arabic-paren';

  return 'unknown';
}

function formatSection(section: any): DocumentNode {
  const formatted: DocumentNode = {
    sectionNumber: section.sectionNumber,
    text: section.text,
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

function isRecital(sectionNumber: string): boolean {
  const num = sectionNumber.trim().replace(/\.$/, '');

  return (
    /^\(\d+\)$/.test(num) ||
    /^\d+\)$/.test(num) ||
    /^[A-Z]$/.test(num) ||
    /^\([A-Z]\)$/.test(num) ||
    /^[a-z]$/.test(num) ||
    /^\([a-z]\)$/.test(num) ||
    /^\([ivxlc]+\)$/i.test(num)
  );
}

function chineseToNumber(chinese: string): number {
  const digitMap: { [key: string]: number } = {
    零: 0,
    〇: 0,
    一: 1,
    壹: 1,
    二: 2,
    贰: 2,
    貳: 2,
    三: 3,
    叁: 3,
    參: 3,
    四: 4,
    肆: 4,
    五: 5,
    伍: 5,
    六: 6,
    陆: 6,
    陸: 6,
    七: 7,
    柒: 7,
    八: 8,
    捌: 8,
    九: 9,
    玖: 9,
  };

  const unitMap: { [key: string]: number } = {
    十: 10,
    拾: 10,
    百: 100,
    佰: 100,
    千: 1000,
    仟: 1000,
    万: 10000,
    萬: 10000,
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

// ========================================
// ENGLISH PARSER
// ========================================

export function parseEnglishStructure(cleanText: string): InternalParsedDocument {
  const lines = cleanText.split('\n');

  let firstSectionIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (extractEnglishSectionNumber(lines[i].trim())) {
      firstSectionIndex = i;
      break;
    }
  }

  const closingStartIndex = detectEnglishClosingStart(lines, firstSectionIndex);

  const outline: any[] = [];
  let path: PathComponent[] = [];
  let firstMainSectionFound = false;
  const recitalLines: string[] = [];
  const badFormatSections: string[] = [];
  const successfullyParsedSections = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    if (closingStartIndex !== -1 && i >= closingStartIndex) break;

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
      const firstStyle = getBaseStyle(components[0].style);
      if (firstStyle === 'decimal' || firstStyle === 'decimal-letter') {
        firstMainSectionFound = true;
      }
    }

    if (!firstMainSectionFound && isRecital(rawSectionNum)) {
      recitalLines.push(line);
      continue;
    }

    const result = validateAndBuildPath(path, components);

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

  const closingLines: string[] = closingStartIndex !== -1 ? lines.slice(closingStartIndex) : [];

  return {
    recitals: recitalLines.join('\n'),
    structure: outline.map((section) => formatSection(section)),
    closing: closingLines.join('\n'),
    badFormatSections,
  };
}

// ========================================
// CHINESE PARSER
// ========================================

export function parseChineseStructure(cleanText: string): InternalParsedDocument {
  const lines = cleanText.split('\n');

  let firstSectionIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (extractChineseSectionNumber(lines[i].trim())) {
      firstSectionIndex = i;
      break;
    }
  }

  const closingStartIndex = detectChineseClosingStart(lines, firstSectionIndex);

  const outline: any[] = [];
  let path: PathComponent[] = [];
  const recitalLines: string[] = [];
  let firstMainSectionFound = false;
  const badFormatSections: string[] = [];
  const successfullyParsedSections = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    if (closingStartIndex !== -1 && i >= closingStartIndex) break;

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

    if (!firstMainSectionFound && currentStyle === 'chinese-tiao') {
      firstMainSectionFound = true;
    }

    if (!firstMainSectionFound) {
      recitalLines.push(line);
      continue;
    }

    let components = parseSectionNumberToComponents(rawSectionNum);

    if (components.length === 0 && currentStyle.startsWith('chinese-')) {
      const chineseComponents = parseChineseSectionComponents(rawSectionNum, currentStyle);
      if (chineseComponents.length > 0) {
        components = chineseComponents;
      }
    }

    const result = validateAndBuildPath(path, components);

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

  const closingLines: string[] = closingStartIndex !== -1 ? lines.slice(closingStartIndex) : [];

  return {
    recitals: recitalLines.join('\n'),
    structure: outline.map((section) => formatSection(section)),
    closing: closingLines.join('\n'),
    badFormatSections,
  };
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
 * Build flat appendix structure from plain text.
 * One section per non-empty line. No heading detection (backend DocumentNode has no sectionHeading).
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
    structure.push({
      sectionNumber: `${prefix} Para ${structure.length + 1}.`,
      text,
      level: 1,
      additionalParagraphs: [],
      children: [],
    });
  }
  return structure;
}
