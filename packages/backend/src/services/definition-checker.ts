import type { ExtractedSentence } from '@/services/sentence-extractor';
import { extractSentences } from '@/services/sentence-extractor';
import { generateTextWithJsonParsing } from '@/controllers/generate';
import type { ParsedDocument, SectionNode } from '@/types/documents';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DefinitionCheckResult {
  unusedDefinitions: UnusedDefinition[];
  undefinedTerms: UndefinedTerm[];
  inconsistentTerms: InconsistentTerm[];
  missingQuoteTerms: MissingQuoteTerm[];
  capitalizationIssues: CapitalizationIssue[];
  summary: {
    totalIssues: number;
    unusedCount: number;
    undefinedCount: number;
    inconsistentCount: number;
    missingQuotesCount: number;
    capitalizationCount: number;
    neverUsedCount: number;
    usedOnceCount: number;
  };
}

export interface UnusedDefinition {
  term: string;
  definitionText: string;
  sectionReference: string;
  usageCount: number;
}

export interface UndefinedTerm {
  term: string;
  totalOccurrences: number;
  occurrences: TermOccurrence[];
}

export interface InconsistentTerm {
  term: string;
  totalOccurrences: number;
  variations: {
    variant: string;
    count: number;
    occurrences: TermOccurrence[];
  }[];
}

export interface TermOccurrence {
  sentence: string;
  sectionReference: string;
}

export interface MissingQuoteTerm {
  term: string;
  totalOccurrences: number;
  occurrences: TermOccurrence[];
}

export interface CapitalizationIssue {
  term: string;
  expectedForm: string;
  issues: {
    foundForm: string;
    sectionReference: string;
    sentence: string;
  }[];
}

interface TextChunk {
  text: string;
  sectionReference: string;
  isHeading: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Connector words that can appear between capitalized words in a term.
 * Examples: "Instrument of Transfer", "Term and Termination", "Companies Act 1967 of Singapore"
 * NOTE: "This" and "That" are NOT connectors - they break terms.
 */
const CONNECTOR_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in',
  'of', 'on', 'or', 'the', 'to', 'with', 'under', 'upon'
]);

/**
 * Words that break a capitalized term even though they start with a capital letter.
 * These are common sentence starters or demonstratives that shouldn't be part of defined terms.
 */
const TERM_BREAKER_WORDS = new Set([
  'This', 'That', 'These', 'Those', 'The', 'A', 'An',
  'If', 'When', 'Where', 'While', 'Unless', 'Until',
  'Any', 'All', 'Each', 'Every', 'No', 'Some',
  'Such', 'Said', 'Neither', 'Either', 'Both',
  'However', 'Therefore', 'Furthermore', 'Moreover',
  'Notwithstanding', 'Subject', 'Pursuant', 'According',
]);

/**
 * Document structure terms that should NOT be used to build capitalized terms.
 * Even when capitalized, these are references to document parts, not defined terms.
 * Examples: "Section 5", "Schedule A", "Article III"
 */
const STRUCTURE_WORDS = new Set([
  'Section', 'Sections',
  'Article', 'Articles',
  'Clause', 'Clauses',
  'Paragraph', 'Paragraphs',
  'Part', 'Parts',
  'Chapter', 'Chapters',
  'Schedule', 'Schedules',
  'Appendix', 'Appendices',
  'Annex', 'Annexes', 'Annexure', 'Annexures',
  'Exhibit', 'Exhibits',
  'Attachment', 'Attachments',
  'Recital', 'Recitals',
  'Preamble',
  'Definition', 'Definitions',
  'Table', 'Tables',
  'Figure', 'Figures',
]);

/**
 * Company suffixes that indicate a term is a company name.
 * These patterns match common corporate entity indicators worldwide.
 * When detected, the ENTIRE term should be filtered out (not just the suffix).
 */
const COMPANY_SUFFIX_PATTERNS = [
  /\bPte\.?\s*Ltd\.?$/i,
  /\bSdn\.?\s*Bhd\.?$/i,
  /\bCo\.?,?\s*Ltd\.?$/i,
  /\bLtd\.?$/i,
  /\bLimited$/i,
  /\bPLC$/i,
  /\bLLC$/i,
  /\bLLP$/i,
  /\bLP$/i,
  /\bInc\.?$/i,
  /\bCorp\.?$/i,
  /\bCorporation$/i,
  /\bIncorporated$/i,
  /\bGmbH$/i,
  /\bAG$/i,
  /\bS\.?A\.?$/i,
  /\bS\.?A\.?R\.?L\.?$/i,
  /\bB\.?V\.?$/i,
  /\bN\.?V\.?$/i,
  /\bK\.?K\.?$/i,
  /\bPT\.?$/i,
];

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export async function analyzeDefinitions(
  parsedDocument: ParsedDocument,
  language: 'english' | 'chinese' = 'english'
): Promise<DefinitionCheckResult> {
  console.log('🔍 Starting definition analysis...');
  console.log('📦 Received document keys:', Object.keys(parsedDocument || {}));
  console.log('📦 Has structure:', !!parsedDocument?.structure);
  console.log('📦 Has recitals:', !!parsedDocument?.recitals);
  console.log('📦 Document name:', parsedDocument?.documentName || '(not provided)');

  if (!parsedDocument) {
    throw new Error('parsedDocument is null or undefined');
  }

  if (!parsedDocument.structure || !Array.isArray(parsedDocument.structure)) {
    console.error('❌ Invalid document structure');
    console.error('Received:', JSON.stringify(parsedDocument, null, 2));
    throw new Error('parsedDocument.structure must be an array');
  }

  // ========================================================================
  // PHASE 1: FAST EXTRACTION (NO SENTENCE EXTRACTOR)
  // ========================================================================

  const chunks = extractTextChunks(parsedDocument);
  console.log(`📝 Extracted ${chunks.length} text chunks from document parser`);

  const headingChunks = chunks.filter(c => c.isHeading);
  console.log(`📋 Identified ${headingChunks.length} heading chunks (will be excluded)`);

  console.log('\n=== 📋 INTERIM TEST 3: ALL HEADINGS ===');
  if (headingChunks.length > 0) {
    headingChunks.forEach((h, idx) => {
      console.log(`${idx + 1}. "${h.text}" [${h.sectionReference}]`);
    });
  } else {
    console.log('No headings detected.');
  }
  console.log('=====================================\n');

  const documentText = chunks.map(c => c.text).join(' ');

  const definedTermsMap = extractDefinedTerms(documentText);

  console.log('\n=== 📖 INTERIM TEST 2: ALL DEFINITIONS ===');
  console.log(`Found ${definedTermsMap.size} defined terms (sentence details logged after extraction).`);
  console.log('=====================================\n');

  const nonHeadingChunks = chunks.filter(c => !c.isHeading);
  const capitalizedTerms = findCapitalizedTerms(nonHeadingChunks, definedTermsMap);

  console.log('\n=== 📊 INTERIM TEST 1: ALL CAPITALIZED TERMS (PRE-LLM) ===');
  console.log(`Found ${capitalizedTerms.size} capitalized terms (after filtering headings & common terms):`);
  if (capitalizedTerms.size > 0) {
    Array.from(capitalizedTerms.entries()).forEach(([term, sections], idx) => {
      console.log(`${idx + 1}. "${term}" - appears in ${sections.size} section(s): ${Array.from(sections).slice(0, 3).join(', ')}${sections.size > 3 ? '...' : ''}`);
    });
  } else {
    console.log('No capitalized terms found.');
  }
  console.log('=====================================\n');

  const filteredTerms = await filterTermsWithLLM(Array.from(capitalizedTerms.keys()));
  console.log(`🤖 LLM filtered: ${capitalizedTerms.size} → ${filteredTerms.length} terms`);

  const filteredCapitalizedTerms = new Map<string, Set<string>>();
  filteredTerms.forEach(term => {
    if (capitalizedTerms.has(term)) {
      filteredCapitalizedTerms.set(term, capitalizedTerms.get(term)!);
    }
  });

  console.log('\n=== 📊 DEBUG: CAPITALIZED TERMS (AFTER LLM FILTERING) ===');
  console.log(`Kept ${filteredCapitalizedTerms.size} terms out of ${capitalizedTerms.size}:`);
  if (filteredCapitalizedTerms.size > 0) {
    Array.from(filteredCapitalizedTerms.entries()).forEach(([term, sections], idx) => {
      console.log(`  ${idx + 1}. "${term}" - appears in sections: ${Array.from(sections).join(', ')}`);
    });
  } else {
    console.log('  (none)');
  }
  console.log('=====================================\n');

  // ========================================================================
  // PHASE 2: CHECK IF ANY ISSUES EXIST
  // ========================================================================

  const unusedTerms = findUnusedTermsQuick(definedTermsMap, documentText);
  const undefinedTermsList = findUndefinedTermsQuick(filteredCapitalizedTerms, definedTermsMap);
  const inconsistentTermsList = findInconsistentTermsQuick(filteredCapitalizedTerms, chunks);
  const missingQuoteTermsList = findMissingQuoteTermsQuick(filteredCapitalizedTerms, definedTermsMap);
  const capitalizationIssuesList = findCapitalizationIssuesQuick(definedTermsMap, chunks);

  const hasIssues =
    unusedTerms.length > 0 ||
    undefinedTermsList.length > 0 ||
    inconsistentTermsList.length > 0 ||
    missingQuoteTermsList.length > 0 ||
    capitalizationIssuesList.length > 0;

  if (!hasIssues) {
    console.log('✅ No issues found - perfect document!');
    return {
      unusedDefinitions: [],
      undefinedTerms: [],
      inconsistentTerms: [],
      missingQuoteTerms: [],
      capitalizationIssues: [],
      summary: {
        totalIssues: 0,
        unusedCount: 0,
        undefinedCount: 0,
        inconsistentCount: 0,
        missingQuotesCount: 0,
        capitalizationCount: 0,
        neverUsedCount: 0,
        usedOnceCount: 0,
      },
    };
  }

  console.log(`⚠️  Found issues - extracting detailed locations...`);
  console.log(`   - Unused definitions: ${unusedTerms.length}`);
  console.log(`   - Undefined terms: ${undefinedTermsList.length}`);
  console.log(`   - Inconsistent terms: ${inconsistentTermsList.length}`);
  console.log(`   - Missing quotes: ${missingQuoteTermsList.length}`);
  console.log(`   - Capitalization issues: ${capitalizationIssuesList.length}`);

  // ========================================================================
  // PHASE 3: EXTRACT SENTENCES (ONLY IF ISSUES FOUND)
  // ========================================================================

  console.log('📝 Calling sentence extractor for detailed locations...');
  const sentences = extractAllSentences(parsedDocument);
  console.log(`📝 Extracted ${sentences.length} sentences`);

  const unusedDefinitions = buildUnusedDefinitionsWithDetails(
    unusedTerms,
    definedTermsMap,
    sentences
  );

  // Log all defined terms with full sentences and section references
  console.log('\n=== 📖 ALL DEFINITIONS (with sentences) ===');
  console.log(`Found ${definedTermsMap.size} defined terms:`);
  if (definedTermsMap.size > 0) {
    Array.from(definedTermsMap.keys()).forEach((term, idx) => {
      const occurrences = findTermOccurrences(sentences, term, 1);
      const firstOcc = occurrences[0];
      if (firstOcc) {
        console.log(`${idx + 1}. "${term}"`);
        console.log(`   [${firstOcc.sectionReference}] "${firstOcc.sentence.substring(0, 120)}${firstOcc.sentence.length > 120 ? '...' : ''}"`);
      } else {
        console.log(`${idx + 1}. "${term}"`);
        console.log(`   [No sentence found]`);
      }
    });
  }
  console.log('=====================================\n');

  const undefinedTerms = buildUndefinedTermsWithDetails(
    undefinedTermsList,
    sentences
  );

  const inconsistentTerms = buildInconsistentTermsWithDetails(
    inconsistentTermsList,
    sentences
  );

  const missingQuoteTerms = buildMissingQuoteTermsWithDetails(
    missingQuoteTermsList,
    sentences
  );

  const capitalizationIssues = buildCapitalizationIssuesWithDetails(
    capitalizationIssuesList,
    definedTermsMap,
    sentences
  );

  const neverUsedCount = unusedDefinitions.filter(d => d.usageCount === 0).length;
  const usedOnceCount = unusedDefinitions.filter(d => d.usageCount === 1).length;

  const result: DefinitionCheckResult = {
    unusedDefinitions,
    undefinedTerms,
    inconsistentTerms,
    missingQuoteTerms,
    capitalizationIssues,
    summary: {
      totalIssues: unusedDefinitions.length + undefinedTerms.length + inconsistentTerms.length + missingQuoteTerms.length + capitalizationIssues.length,
      unusedCount: unusedDefinitions.length,
      undefinedCount: undefinedTerms.length,
      inconsistentCount: inconsistentTerms.length,
      missingQuotesCount: missingQuoteTerms.length,
      capitalizationCount: capitalizationIssues.length,
      neverUsedCount,
      usedOnceCount,
    },
  };

  console.log('✅ Analysis complete:', result.summary);
  return result;
}

// ============================================================================
// TEXT EXTRACTION (USES HEADING INFO FROM DOCUMENT PARSER)
// ============================================================================

function extractTextChunks(parsedDocument: ParsedDocument): TextChunk[] {
  const chunks: TextChunk[] = [];

  if (!parsedDocument) {
    console.error('❌ parsedDocument is null or undefined');
    return chunks;
  }

  if (!parsedDocument.structure) {
    console.error('❌ parsedDocument.structure is undefined');
    console.error('Received document:', JSON.stringify(parsedDocument, null, 2));
    return chunks;
  }

  if (parsedDocument.recitals && parsedDocument.recitals.trim().length > 0) {
    let recitalsText = parsedDocument.recitals.trim();

    if (parsedDocument.documentName && parsedDocument.documentName.trim().length > 0) {
      const docName = parsedDocument.documentName.trim();
      const docNamePattern = new RegExp(`^\\s*${escapeRegex(docName)}\\s*`, 'i');
      const before = recitalsText.length;
      recitalsText = recitalsText.replace(docNamePattern, '').trim();
      if (recitalsText.length < before) {
        console.log(`📝 Excluded document name "${docName}" from recitals for term detection`);
      }
    }

    if (recitalsText.length > 0) {
      chunks.push({
        text: recitalsText,
        sectionReference: 'Recitals',
        isHeading: false,
      });
    }
  }

  function processNode(node: SectionNode, parentRef: string = ''): void {
    const sectionRef = parentRef
      ? `${parentRef} > ${node.sectionNumber}`
      : node.sectionNumber;

    if (node.sectionHeading && node.sectionHeading.trim().length > 0) {
      chunks.push({
        text: node.sectionHeading.trim(),
        sectionReference: sectionRef,
        isHeading: true,
      });
    }

    if (node.text && node.text.trim().length > 0) {
      chunks.push({
        text: node.text.trim(),
        sectionReference: sectionRef,
        isHeading: false,
      });
    }

    if (node.additionalParagraphs && node.additionalParagraphs.length > 0) {
      node.additionalParagraphs.forEach(para => {
        if (para && para.trim().length > 0) {
          chunks.push({
            text: para.trim(),
            sectionReference: sectionRef,
            isHeading: false,
          });
        }
      });
    }

    if (node.children && node.children.length > 0) {
      node.children.forEach(child => processNode(child, sectionRef));
    }
  }

  parsedDocument.structure.forEach(node => processNode(node));
  return chunks;
}

// ============================================================================
// CAPITALIZED TERM DETECTION
// ============================================================================

function isYear(word: string): boolean {
  return /^(18|19|20)\d{2}$/.test(word);
}

function isRomanNumeral(word: string): boolean {
  return /^[IVXLCDM]+$/i.test(word) && isValidRomanNumeral(word.toUpperCase());
}

function isValidRomanNumeral(s: string): boolean {
  const validNumerals = new Set([
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
    'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX',
    'XL', 'L', 'LX', 'LXX', 'LXXX', 'XC', 'C',
  ]);
  return validNumerals.has(s);
}

function isCapitalizedWord(word: string): boolean {
  if (!word || word.length === 0) return false;

  const cleanWord = word.replace(/[.,;:!?'''ʼ′""\)\]]+$/, '');
  if (cleanWord.length === 0) return false;

  if (cleanWord.length === 1) return false;

  if (TERM_BREAKER_WORDS.has(cleanWord)) return false;

  const titleCaseWord = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase();
  if (STRUCTURE_WORDS.has(titleCaseWord)) return false;

  if (isRomanNumeral(cleanWord)) return false;

  const parts = cleanWord.split('-');
  const firstPart = parts[0];
  if (!firstPart || firstPart.length === 0) return false;

  const withoutPossessive = firstPart.replace(/['''ʼ′]s?$/, '');
  if (withoutPossessive.length === 0) return false;

  const letters = withoutPossessive.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 2) return false;

  const firstChar = withoutPossessive.charAt(0);
  return /[A-Z]/.test(firstChar);
}

function isAllCapsWord(word: string): boolean {
  const cleanWord = word.replace(/[.,;:!?'''ʼ′""\)\]]+$/, '').replace(/['''ʼ′]s?$/, '');
  if (cleanWord.length < 2) return false;
  const letters = cleanWord.replace(/[^a-zA-Z]/g, '');
  return letters.length >= 2 && letters === letters.toUpperCase();
}

function hasBreakingSymbol(text: string, startPos: number, endPos: number): boolean {
  const separator = text.substring(startPos, endPos);
  const breakingSymbols = /[()[\]{}""'''ʼ′«»;:\/\\,#."]/;
  return breakingSymbols.test(separator);
}

function isCompanySuffixContinuation(lastWord: string, separator: string, nextWord: string): boolean {
  if (!separator.includes('.')) return false;

  const lastLower = lastWord.toLowerCase();
  const nextLower = nextWord.toLowerCase();

  const suffixPairs: [string, string][] = [
    ['pte', 'ltd'],
    ['co', 'ltd'],
    ['sdn', 'bhd'],
  ];

  for (const [first, second] of suffixPairs) {
    if (lastLower === first && nextLower === second) {
      return true;
    }
  }

  return false;
}

function findCapitalizedTerms(
  chunks: TextChunk[],
  definedTerms: Map<string, string>
): Map<string, Set<string>> {
  const capitalizedTerms = new Map<string, Set<string>>();
  const ignoredTerms = new Set<string>();

  for (const chunk of chunks) {
    const text = chunk.text;

    const wordPattern = /[A-Za-z][A-Za-z'''ʼ′\-]+(?:['''ʼ′]s?)?|\d{4}/g;
    const words: { word: string; index: number; endIndex: number }[] = [];
    let wordMatch: RegExpExecArray | null;

    while ((wordMatch = wordPattern.exec(text)) !== null) {
      words.push({
        word: wordMatch[0],
        index: wordMatch.index,
        endIndex: wordMatch.index + wordMatch[0].length
      });
    }

    let i = 0;
    while (i < words.length) {
      const wordInfo = words[i];
      if (!wordInfo) {
        i++;
        continue;
      }
      const { word, index: position, endIndex } = wordInfo;

      if (isAtSentenceStart(text, position)) {
        i++;
        continue;
      }

      if (!isCapitalizedWord(word)) {
        i++;
        continue;
      }

      const termParts: string[] = [word];
      const termStartIndex = position;
      let lastEndIndex = endIndex;
      let j = i + 1;

      while (j < words.length) {
        const nextWordInfo = words[j];
        if (!nextWordInfo) break;

        const nextWord = nextWordInfo.word;
        const lowerNext = nextWord.toLowerCase();
        const separator = text.substring(lastEndIndex, nextWordInfo.index);
        const lastTermWord = termParts[termParts.length - 1] ?? '';

        if (hasBreakingSymbol(text, lastEndIndex, nextWordInfo.index)) {
          if (!isCompanySuffixContinuation(lastTermWord, separator, nextWord)) {
            break;
          }
        }

        if (isYear(nextWord)) {
          termParts.push(nextWord);
          lastEndIndex = nextWordInfo.endIndex;
          j++;
          continue;
        }

        if (CONNECTOR_WORDS.has(lowerNext)) {
          if (j + 1 < words.length) {
            const afterConnectorInfo = words[j + 1];
            if (!afterConnectorInfo) break;

            const afterConnector = afterConnectorInfo.word;
            const connectorSeparator = text.substring(nextWordInfo.endIndex, afterConnectorInfo.index);

            if (hasBreakingSymbol(text, nextWordInfo.endIndex, afterConnectorInfo.index)) {
              if (!isCompanySuffixContinuation(nextWord, connectorSeparator, afterConnector)) {
                break;
              }
            }

            if (isCapitalizedWord(afterConnector) || isYear(afterConnector)) {
              termParts.push(nextWord);
              termParts.push(afterConnector);
              lastEndIndex = afterConnectorInfo.endIndex;
              j += 2;
              continue;
            }
          }
          break;
        }

        if (isCapitalizedWord(nextWord)) {
          termParts.push(nextWord);
          lastEndIndex = nextWordInfo.endIndex;
          j++;
          continue;
        }

        break;
      }

      const term = text.substring(termStartIndex, lastEndIndex);

      if (shouldIgnoreTerm(term)) {
        ignoredTerms.add(term);
        i = j;
        continue;
      }

      if (!capitalizedTerms.has(term)) {
        capitalizedTerms.set(term, new Set());
      }
      capitalizedTerms.get(term)!.add(chunk.sectionReference);

      i = j;
    }
  }

  if (ignoredTerms.size > 0) {
    console.log(`  🚫 Filtered out ${ignoredTerms.size} common terms:`, Array.from(ignoredTerms).join(', '));
  }

  const normalizedTerms = normalizePlurals(capitalizedTerms);
  const withoutCompanies = filterCompanyNames(normalizedTerms);
  const withoutAllCaps = filterAllCapsTerms(withoutCompanies);

  return filterComponentWords(withoutAllCaps, chunks, definedTerms);
}

// ============================================================================
// PLURAL NORMALIZATION
// ============================================================================

function normalizePlurals(
  terms: Map<string, Set<string>>
): Map<string, Set<string>> {
  const normalized = new Map<string, Set<string>>();
  const termsList = Array.from(terms.keys());
  const processed = new Set<string>();

  for (const term of termsList) {
    if (processed.has(term)) continue;

    const variants = findPluralVariants(term, termsList);
    const canonicalTerm = variants.reduce((a, b) => a.length <= b.length ? a : b);

    const allSections = new Set<string>();
    for (const variant of variants) {
      const sections = terms.get(variant);
      if (sections) {
        sections.forEach(s => allSections.add(s));
      }
      processed.add(variant);
    }

    normalized.set(canonicalTerm, allSections);

    if (variants.length > 1) {
      console.log(`  📝 Normalized plurals: ${variants.join(', ')} → "${canonicalTerm}"`);
    }
  }

  return normalized;
}

function findPluralVariants(term: string, allTerms: string[]): string[] {
  const variants: string[] = [term];
  const lowerTerm = term.toLowerCase();

  for (const other of allTerms) {
    if (other === term) continue;

    const lowerOther = other.toLowerCase();

    if (arePluralVariants(lowerTerm, lowerOther)) {
      variants.push(other);
    }
  }

  return variants;
}

function arePluralVariants(term1: string, term2: string): boolean {
  const words1 = term1.split(' ');
  const words2 = term2.split(' ');

  if (words1.length !== words2.length) return false;

  for (let i = 0; i < words1.length - 1; i++) {
    if (words1[i] !== words2[i]) return false;
  }

  const last1 = words1[words1.length - 1] ?? '';
  const last2 = words2[words2.length - 1] ?? '';

  return areWordPluralVariants(last1, last2);
}

function areWordPluralVariants(word1: string, word2: string): boolean {
  const apostrophePattern = /['''ʼ′]$/;
  if (apostrophePattern.test(word1) || apostrophePattern.test(word2)) {
    return false;
  }

  const [shorter, longer] = word1.length <= word2.length
    ? [word1, word2]
    : [word2, word1];

  if (longer === shorter + 's') return true;
  if (shorter.endsWith('y') && longer === shorter.slice(0, -1) + 'ies') return true;
  if (longer === shorter + 'es') return true;
  if (shorter.endsWith('f') && longer === shorter.slice(0, -1) + 'ves') return true;
  if (shorter.endsWith('fe') && longer === shorter.slice(0, -2) + 'ves') return true;

  return false;
}

// ============================================================================
// FILTERING FUNCTIONS
// ============================================================================

function filterComponentWords(
  allTerms: Map<string, Set<string>>,
  chunks: TextChunk[],
  definedTerms: Map<string, string>
): Map<string, Set<string>> {
  const termsList = Array.from(allTerms.keys());
  const definedTermsList = Array.from(definedTerms.keys());

  const componentMap = new Map<string, Set<string>>();

  for (const term of termsList) {
    componentMap.set(term, new Set());

    for (const otherTerm of termsList) {
      if (otherTerm !== term && otherTerm.includes(term)) {
        const regex = new RegExp(`\\b${escapeRegex(term)}\\b`);
        if (regex.test(otherTerm)) {
          componentMap.get(term)!.add(otherTerm);
        }
      }
    }

    for (const definedTerm of definedTermsList) {
      if (definedTerm !== term && definedTerm.includes(term)) {
        const regex = new RegExp(`\\b${escapeRegex(term)}\\b`);
        if (regex.test(definedTerm)) {
          componentMap.get(term)!.add(definedTerm);
        }
      }
    }
  }

  const filteredTerms = new Map<string, Set<string>>();

  for (const [term, sections] of allTerms.entries()) {
    const longerTerms = componentMap.get(term)!;

    if (longerTerms.size === 0) {
      filteredTerms.set(term, sections);
      continue;
    }

    let appearsStandalone = false;
    const termPattern = new RegExp(`\\b${escapeRegex(term)}\\b`, 'g');

    for (const chunk of chunks) {
      const text = chunk.text;
      const matches = Array.from(text.matchAll(termPattern));

      for (const match of matches) {
        let isPartOfLonger = false;

        for (const longerTerm of longerTerms) {
          const longerPattern = new RegExp(`\\b${escapeRegex(longerTerm)}\\b`);
          const contextStart = Math.max(0, match.index! - longerTerm.length);
          const contextEnd = Math.min(text.length, match.index! + term.length + longerTerm.length);
          const context = text.substring(contextStart, contextEnd);

          if (longerPattern.test(context)) {
            isPartOfLonger = true;
            break;
          }
        }

        if (!isPartOfLonger) {
          appearsStandalone = true;
          break;
        }
      }

      if (appearsStandalone) break;
    }

    if (appearsStandalone) {
      filteredTerms.set(term, sections);
    } else {
      console.log(`  Filtered out "${term}" (only appears as part of longer terms)`);
    }
  }

  return filteredTerms;
}

function isAtSentenceStart(text: string, position: number): boolean {
  if (position === 0) return true;
  const precedingText = text.substring(0, position).trimEnd();
  if (precedingText.length === 0) return true;
  const lastChar = precedingText.charAt(precedingText.length - 1);
  return /[.!?]/.test(lastChar);
}

function isCompanyName(term: string): boolean {
  for (const pattern of COMPANY_SUFFIX_PATTERNS) {
    if (pattern.test(term)) {
      return true;
    }
  }
  return false;
}

function isAllCapsTerm(term: string): boolean {
  const words = term.split(/\s+/);

  if (words.length === 0) return false;

  let significantWordCount = 0;
  let allCapsWordCount = 0;

  for (const word of words) {
    const lowerWord = word.toLowerCase();

    if (CONNECTOR_WORDS.has(lowerWord)) continue;
    if (isYear(word)) continue;

    const letters = word.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) continue;

    significantWordCount++;

    if (letters === letters.toUpperCase()) {
      allCapsWordCount++;
    } else {
      return false;
    }
  }

  return significantWordCount >= 2 && allCapsWordCount === significantWordCount;
}

function filterCompanyNames(
  terms: Map<string, Set<string>>
): Map<string, Set<string>> {
  const filtered = new Map<string, Set<string>>();
  const removedCompanies: string[] = [];

  for (const [term, sections] of terms.entries()) {
    if (isCompanyName(term)) {
      removedCompanies.push(term);
    } else {
      filtered.set(term, sections);
    }
  }

  if (removedCompanies.length > 0) {
    console.log(`  🏢 Filtered out ${removedCompanies.length} company names:`);
    removedCompanies.forEach(name => console.log(`     - "${name}"`));
  }

  return filtered;
}

function filterAllCapsTerms(
  terms: Map<string, Set<string>>
): Map<string, Set<string>> {
  const filtered = new Map<string, Set<string>>();
  const removedAllCaps: string[] = [];

  for (const [term, sections] of terms.entries()) {
    if (isAllCapsTerm(term)) {
      removedAllCaps.push(term);
    } else {
      filtered.set(term, sections);
    }
  }

  if (removedAllCaps.length > 0) {
    console.log(`  🔠 Filtered out ${removedAllCaps.length} ALL CAPS terms (warnings/headers):`);
    removedAllCaps.forEach(name => console.log(`     - "${name}"`));
  }

  return filtered;
}

function shouldIgnoreTerm(term: string): boolean {
  if (term === 'Party' || term === 'Parties') return false;

  const commonTerms = new Set([
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    'Mr', 'Mrs', 'Ms', 'Dr', 'Prof',
    'United', 'States', 'America', 'China', 'Chinese',
    'Singapore', 'Malaysia', 'Indonesia', 'Thailand', 'Vietnam',
    'India', 'Japan', 'Korea', 'Australia', 'Canada',
    'England', 'Britain', 'France', 'Germany', 'Italy',
    'Republic of Singapore', 'People\'s Republic of China',
    'Hong', 'Kong', 'Hong Kong',
    'New', 'York', 'New York',
    'Los', 'Angeles', 'Los Angeles',
    'San', 'Francisco', 'San Francisco',
    'United States', 'United Kingdom', 'United States of America',
    'London', 'Tokyo', 'Beijing', 'Shanghai', 'Kuala Lumpur',
    'English', 'Chinese', 'Mandarin', 'Japanese', 'Korean',
    'French', 'Spanish', 'German', 'Italian', 'Portuguese',
    'Schedule', 'Exhibit', 'Appendix', 'Annex', 'Section', 'Article',
    'Clause', 'Paragraph', 'Chapter', 'Part', 'Recital', 'Preamble',
  ]);

  if (commonTerms.has(term)) return true;

  const structurePattern = /^(Schedule|Exhibit|Appendix|Annex|Part|Section|Article)\s+[A-Z0-9]+$/i;
  if (structurePattern.test(term)) return true;

  return false;
}

// ============================================================================
// LLM FILTERING
// ============================================================================

async function filterTermsWithLLM(terms: string[]): Promise<string[]> {
  if (terms.length === 0) return [];

  console.log('🤖 Sending to LLM for filtering...');

  const systemPrompt = `You are a legal contract analysis assistant specialized in identifying defined terms in contracts.`;

  const userContent = `You are analyzing a legal contract. Below is a list of capitalized terms found in the document.

Your task is to REMOVE terms that should NOT be flagged as needing definitions.

REMOVE ONLY these types of terms:
1. Names of specific people (e.g., "John Smith", "Mary Wong")
2. Building names and addresses (e.g., "Sunflower Building", "Garden View Road", "123 Main Street")
3. Geographic locations - countries, cities, states, regions (e.g., "Singapore", "Hong Kong", "California", "Asia Pacific")
4. Languages (e.g., "English", "Chinese", "French")
5. Months and days of the week (e.g., "January", "Monday")
6. Titles (e.g., "Mr", "Mrs", "Dr", "Professor")

KEEP these types of terms (CRITICAL - DO NOT REMOVE):
1. "Party", "Parties", "Company", "Companies" - these are almost always defined terms
2. Role-based terms - "Franchisee", "Franchisor", "Licensee", "Licensor", "Vendor", "Purchaser", "Seller", "Buyer", "Lessee", "Lessor", "Borrower", "Lender", "Guarantor", "Shareholder", "Director", "Employee"
3. Organization names and acronyms - "ACRA", "SIAC", "SEC", etc. (these are often defined in contracts)
4. Legislation and regulatory references - "Companies Act", "Stamp Duties Act", "Securities Act", etc.
5. Industry standards and frameworks - "SFRS", "GAAP", "IFRS", etc.
6. Contract-specific terms - "Effective Date", "Completion Date", "Purchase Price", "Territory", etc.
7. Generic capitalized terms that could be defined - "Rules", "President", "Board", "Agreement", "Services", "Products", "Confidential Information", etc.
8. Any term that appears to be intentionally capitalized as a defined term

Terms to analyze:
${terms.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Return your response as a JSON object with this structure:
{
  "filtered_terms": ["term1", "term2", ...]
}

IMPORTANT: When in doubt, KEEP the term. It is better to flag a term that might need a definition than to miss one that does.
`;

  try {
    const response = await generateTextWithJsonParsing(systemPrompt, userContent);

    if (response.filtered_terms && Array.isArray(response.filtered_terms)) {
      console.log(`🤖 LLM kept ${response.filtered_terms.length} terms out of ${terms.length}`);

      const removed = terms.filter(t => !response.filtered_terms.includes(t));
      if (removed.length > 0) {
        console.log(`🤖 LLM removed these terms:`, removed.join(', '));
      }

      return response.filtered_terms;
    }

    console.log('⚠️  LLM returned unexpected format, keeping all terms');
    return terms;
  } catch (error) {
    console.error('❌ LLM filtering failed:', error);
    return terms;
  }
}

// ============================================================================
// DEFINED TERM EXTRACTION
// ============================================================================

function extractDefinedTerms(text: string): Map<string, string> {
  const definedTerms = new Map<string, string>();

  const quotePatterns = [
    /"([A-Z][^"]{0,48})"/g,
    /\u201C([A-Z][^\u201D]{0,48})\u201D/g,
    /"\u201D([A-Z][^\u201D]{0,48})\u201D/g,
    /\u201C([A-Z][^"]{0,48})"/g,
    /'([A-Z][^']{0,48})'/g,
    /\u2018([A-Z][^\u2019]{0,48})\u2019/g,
  ];

  console.log('🔍 Searching for defined terms with enhanced patterns...');

  for (const pattern of quotePatterns) {
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const captured = match[1];
      if (!captured) continue;
      const term = captured.trim();

      if (term.length === 0 || term.length > 50) continue;
      if (!/^[A-Z]/.test(term)) continue;

      const snippet = getSnippet(text, match.index, 80);

      if (!definedTerms.has(term)) {
        definedTerms.set(term, snippet);
        console.log(`  ✅ Found defined term: "${term}"`);
      } else {
        console.log(`  ℹ️  Term already found: "${term}"`);
      }
    }
  }

  console.log(`📖 Total defined terms found: ${definedTerms.size}`);

  if (definedTerms.size > 0) {
    console.log('📋 All defined terms:');
    Array.from(definedTerms.keys()).forEach((term, idx) => {
      console.log(`  ${idx + 1}. "${term}"`);
    });
  }

  return definedTerms;
}

// ============================================================================
// QUICK CHECKS (WITHOUT SENTENCE EXTRACTOR)
// ============================================================================

function findUnusedTermsQuick(
  definedTerms: Map<string, string>,
  documentText: string
): string[] {
  const unused: string[] = [];

  definedTerms.forEach((snippet, term) => {
    const termPattern = new RegExp(`\\b${escapeRegex(term)}\\b`, 'g');
    const matches = documentText.match(termPattern);
    const count = matches ? matches.length : 0;

    if (count <= 1) {
      unused.push(term);
    }
  });

  return unused;
}

function findUndefinedTermsQuick(
  capitalizedTerms: Map<string, Set<string>>,
  definedTerms: Map<string, string>
): string[] {
  console.log('\n=== 🔍 DEBUG: Checking for Undefined Terms ===');

  const definedTermSet = new Set(
    Array.from(definedTerms.keys()).map(t => t.trim())
  );

  console.log(`📖 Defined terms (${definedTermSet.size}):`, Array.from(definedTermSet).join(', '));
  console.log(`📊 Capitalized terms to check (${capitalizedTerms.size}):`, Array.from(capitalizedTerms.keys()).join(', '));

  const undefinedList: string[] = [];

  capitalizedTerms.forEach((sections, term) => {
    const trimmedTerm = term.trim();
    const isDefined = definedTermSet.has(trimmedTerm);

    if (!isDefined) {
      const lowerTerm = trimmedTerm.toLowerCase();
      let foundSimilar = false;

      definedTermSet.forEach(definedTerm => {
        const lowerDefined = definedTerm.toLowerCase();
        if (lowerTerm === lowerDefined) {
          console.log(`  ⚠️ EXACT MATCH FAILED but case-insensitive match found:`);
          console.log(`     Capitalized: "${term}" (length: ${term.length})`);
          console.log(`     Defined:     "${definedTerm}" (length: ${definedTerm.length})`);
          console.log(`     Bytes: [${Array.from(term).map(c => c.charCodeAt(0)).join(', ')}]`);
          console.log(`     Bytes: [${Array.from(definedTerm).map(c => c.charCodeAt(0)).join(', ')}]`);
          foundSimilar = true;
        }
      });

      if (!foundSimilar) {
        console.log(`  ❌ "${term}" - NOT defined`);
      }

      undefinedList.push(term);
    } else {
      console.log(`  ✅ "${trimmedTerm}" - defined`);
    }
  });

  console.log(`\n📊 Total undefined terms: ${undefinedList.length}`);
  console.log('=====================================\n');

  return undefinedList;
}

function findInconsistentTermsQuick(
  capitalizedTerms: Map<string, Set<string>>,
  chunks: TextChunk[]
): string[] {
  console.log('\n=== 🔍 INTERIM TEST 4: CASE INCONSISTENCY DETECTION ===');
  console.log('Checking for inconsistencies WITHIN content only (headings are ignored)');

  const inconsistent: string[] = [];
  const processedTerms = new Set<string>();

  const nonHeadingChunks = chunks.filter(c => !c.isHeading);
  const headingChunks = chunks.filter(c => c.isHeading);

  const headingTermVariants = new Set<string>();
  for (const chunk of headingChunks) {
    const text = chunk.text;
    const pattern = /\b([A-Za-z]+(?:\s+[A-Za-z]+){0,3})\b/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const captured = match[1];
      if (captured) {
        headingTermVariants.add(captured.toLowerCase());
      }
    }
  }

  console.log('\nChecking each term for case variations in content...');

  let consistentCount = 0;
  let noOccurrenceCount = 0;

  capitalizedTerms.forEach((sections, term) => {
    const lowerTerm = term.toLowerCase();

    if (processedTerms.has(lowerTerm)) return;
    processedTerms.add(lowerTerm);

    const variations = findCaseVariationsInContent(nonHeadingChunks, term, headingTermVariants);

    if (variations.length > 1) {
      console.log(`  ⚠️  "${lowerTerm}" - INCONSISTENT - ${variations.length} variations: ${variations.join(', ')}`);
      inconsistent.push(term);
    } else if (variations.length === 1) {
      consistentCount++;
    } else {
      noOccurrenceCount++;
    }
  });

  console.log(`\n📊 Summary: ${inconsistent.length} inconsistent, ${consistentCount} consistent, ${noOccurrenceCount} no occurrences`);
  console.log('=====================================\n');

  return inconsistent;
}

function findCaseVariationsInContent(
  nonHeadingChunks: TextChunk[],
  term: string,
  headingTermVariants: Set<string>
): string[] {
  const variationsMap = new Map<string, number>();

  for (const chunk of nonHeadingChunks) {
    const text = chunk.text;
    const pattern = new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi');
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const variant = match[0];
      variationsMap.set(variant, (variationsMap.get(variant) || 0) + 1);
    }
  }

  return Array.from(variationsMap.keys());
}

function findMissingQuoteTermsQuick(
  capitalizedTerms: Map<string, Set<string>>,
  definedTerms: Map<string, string>
): string[] {
  console.log('\n=== 🔍 STEP 8: Checking for Missing Quotes ===');

  const definedTermSet = new Set(
    Array.from(definedTerms.keys()).map(t => t.trim())
  );

  const missingQuotes: string[] = [];

  capitalizedTerms.forEach((sections, term) => {
    const trimmedTerm = term.trim();
    const isDefined = definedTermSet.has(trimmedTerm);

    if (!isDefined) {
      if (sections.size > 2) {
        missingQuotes.push(term);
        console.log(`  ⚠️  "${term}" - appears ${sections.size} times but not quoted`);
      }
    }
  });

  console.log(`\n📊 Total missing quote terms found: ${missingQuotes.length}`);
  console.log('=====================================\n');

  return missingQuotes;
}

function findCapitalizationIssuesQuick(
  definedTerms: Map<string, string>,
  chunks: TextChunk[]
): string[] {
  console.log('\n=== 🔍 STEP 9: Checking Capitalization Issues ===');

  const issues: string[] = [];
  const nonHeadingChunks = chunks.filter(c => !c.isHeading);

  definedTerms.forEach((snippet, term) => {
    if (!/^[A-Z]/.test(term)) {
      issues.push(term);
      console.log(`  ⚠️  "${term}" - definition doesn't start with capital`);
      return;
    }

    const termPattern = new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi');
    const lowerTerm = term.toLowerCase();
    let foundIncorrectCase = false;

    for (const chunk of nonHeadingChunks) {
      const text = chunk.text;
      let match: RegExpExecArray | null;

      while ((match = termPattern.exec(text)) !== null) {
        const foundForm = match[0];
        if (foundForm !== term && foundForm.toLowerCase() === lowerTerm) {
          foundIncorrectCase = true;
          break;
        }
      }

      if (foundIncorrectCase) break;
    }

    if (foundIncorrectCase) {
      issues.push(term);
      console.log(`  ⚠️  "${term}" - used with incorrect capitalization`);
    }
  });

  console.log(`\n📊 Total capitalization issues found: ${issues.length}`);
  console.log('=====================================\n');

  return issues;
}

// ============================================================================
// SENTENCE EXTRACTION (ONLY CALLED IF ISSUES FOUND)
// ============================================================================

function extractAllSentences(parsedDocument: ParsedDocument): ExtractedSentence[] {
  const sentences: ExtractedSentence[] = [];

  if (parsedDocument.recitals && parsedDocument.recitals.trim().length > 0) {
    const recitalLines = parsedDocument.recitals.split('\n');
    recitalLines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        sentences.push({
          sentence: trimmed,
          sectionReference: 'Recitals',
        });
      }
    });
  }

  const structuredSentences = extractSentences(parsedDocument.structure);
  sentences.push(...structuredSentences);

  return sentences;
}

// ============================================================================
// BUILD DETAILED RESULTS (USING SENTENCES)
// ============================================================================

function buildUnusedDefinitionsWithDetails(
  unusedTerms: string[],
  definedTermsMap: Map<string, string>,
  sentences: ExtractedSentence[]
): UnusedDefinition[] {
  const unused: UnusedDefinition[] = [];
  const documentText = sentences.map(s => s.sentence).join(' ');

  for (const term of unusedTerms) {
    const termPattern = new RegExp(`\\b${escapeRegex(term)}\\b`, 'g');
    const matches = documentText.match(termPattern);
    const count = matches ? matches.length : 0;

    // Use findTermOccurrences (same method as undefined terms) to get the
    // full sentence and correct section reference where the term is defined.
    const occurrences = findTermOccurrences(sentences, term, 1);
    const firstOcc = occurrences[0];

    unused.push({
      term,
      definitionText: firstOcc ? firstOcc.sentence : (definedTermsMap.get(term) || term),
      sectionReference: firstOcc ? firstOcc.sectionReference : 'Unknown',
      usageCount: count,
    });
  }

  unused.sort((a, b) => {
    if (a.usageCount !== b.usageCount) {
      return a.usageCount - b.usageCount;
    }
    return a.term.localeCompare(b.term);
  });

  return unused;
}

function buildUndefinedTermsWithDetails(
  undefinedTermsList: string[],
  sentences: ExtractedSentence[]
): UndefinedTerm[] {
  const undefinedTerms: UndefinedTerm[] = [];

  for (const term of undefinedTermsList) {
    const occurrences = findTermOccurrences(sentences, term, 5);

    undefinedTerms.push({
      term,
      totalOccurrences: occurrences.length,
      occurrences,
    });
  }

  undefinedTerms.sort((a, b) => b.totalOccurrences - a.totalOccurrences);

  return undefinedTerms;
}

function buildInconsistentTermsWithDetails(
  inconsistentTermsList: string[],
  sentences: ExtractedSentence[]
): InconsistentTerm[] {
  console.log('\n=== 🔍 INCONSISTENT TERMS (with sentences) ===');
  const inconsistent: InconsistentTerm[] = [];

  for (const term of inconsistentTermsList) {
    const variations = findCaseVariations(sentences, term);

    if (variations.length > 1) {
      const totalCount = variations.reduce((sum, v) => sum + v.count, 0);
      inconsistent.push({
        term,
        totalOccurrences: totalCount,
        variations,
      });

      console.log(`\n  "${term}" — ${totalCount} total occurrences, ${variations.length} variations:`);
      for (const v of variations) {
        console.log(`    "${v.variant}" (${v.count}x):`);
        for (const occ of v.occurrences) {
          console.log(`      [${occ.sectionReference}] "${occ.sentence}"`);
        }
      }
    }
  }

  console.log(`\n📊 Total inconsistent terms with details: ${inconsistent.length}`);
  console.log('=====================================\n');

  return inconsistent;
}

function buildMissingQuoteTermsWithDetails(
  missingQuoteTermsList: string[],
  sentences: ExtractedSentence[]
): MissingQuoteTerm[] {
  const missingQuotes: MissingQuoteTerm[] = [];

  for (const term of missingQuoteTermsList) {
    const occurrences = findTermOccurrences(sentences, term, 10);

    missingQuotes.push({
      term,
      totalOccurrences: occurrences.length,
      occurrences,
    });
  }

  missingQuotes.sort((a, b) => b.totalOccurrences - a.totalOccurrences);

  return missingQuotes;
}

function buildCapitalizationIssuesWithDetails(
  capitalizationIssuesList: string[],
  definedTermsMap: Map<string, string>,
  sentences: ExtractedSentence[]
): CapitalizationIssue[] {
  const issues: CapitalizationIssue[] = [];

  for (const term of capitalizationIssuesList) {
    const expectedForm = term;
    const issueDetails: { foundForm: string; sectionReference: string; sentence: string }[] = [];

    if (!/^[A-Z]/.test(term)) {
      const snippet = definedTermsMap.get(term);
      if (snippet) {
        const sentence = findSentenceContainingSnippet(sentences, snippet);
        issueDetails.push({
          foundForm: term,
          sectionReference: sentence ? sentence.sectionReference : 'Unknown',
          sentence: sentence ? sentence.sentence : snippet,
        });
      }
    }

    const termPattern = new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi');
    const lowerTerm = term.toLowerCase();

    for (const extractedSentence of sentences) {
      const text = extractedSentence.sentence;
      let match: RegExpExecArray | null;

      while ((match = termPattern.exec(text)) !== null) {
        const foundForm = match[0];
        if (foundForm !== term && foundForm.toLowerCase() === lowerTerm) {
          issueDetails.push({
            foundForm,
            sectionReference: extractedSentence.sectionReference,
            sentence: extractedSentence.sentence,
          });

          if (issueDetails.length >= 5) break;
        }
      }

      if (issueDetails.length >= 5) break;
    }

    if (issueDetails.length > 0) {
      issues.push({
        term,
        expectedForm,
        issues: issueDetails,
      });
    }
  }

  return issues;
}

function findCaseVariations(
  sentences: ExtractedSentence[],
  term: string
): { variant: string; count: number; occurrences: TermOccurrence[] }[] {
  const variationsMap = new Map<string, TermOccurrence[]>();

  for (const extractedSentence of sentences) {
    const text = extractedSentence.sentence;
    const pattern = new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi');
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const variant = match[0];

      if (!variationsMap.has(variant)) {
        variationsMap.set(variant, []);
      }

      variationsMap.get(variant)!.push({
        sentence: extractedSentence.sentence,
        sectionReference: extractedSentence.sectionReference,
      });
    }
  }

  return Array.from(variationsMap.entries())
    .map(([variant, occurrences]) => ({
      variant,
      count: occurrences.length,
      occurrences,
    }))
    .sort((a, b) => b.count - a.count);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function findTermOccurrences(
  sentences: ExtractedSentence[],
  term: string,
  maxOccurrences: number
): TermOccurrence[] {
  const occurrences: TermOccurrence[] = [];
  const pattern = new RegExp(`\\b${escapeRegex(term)}\\b`, 'g');

  for (const extractedSentence of sentences) {
    if (occurrences.length >= maxOccurrences) break;

    const text = extractedSentence.sentence;
    if (pattern.test(text)) {
      occurrences.push({
        sentence: extractedSentence.sentence,
        sectionReference: extractedSentence.sectionReference,
      });
      pattern.lastIndex = 0;
    }
  }

  return occurrences;
}

function findSentenceContainingSnippet(
  sentences: ExtractedSentence[],
  snippet: string
): ExtractedSentence | null {
  const cleanSnippet = snippet.replace(/\.\.\./g, '').trim();

  for (const sentence of sentences) {
    if (sentence.sentence.includes(cleanSnippet)) {
      return sentence;
    }
  }

  return null;
}

function getSnippet(text: string, position: number, length: number): string {
  const start = Math.max(0, position - length / 2);
  const end = Math.min(text.length, position + length / 2);
  let snippet = text.substring(start, end).trim();

  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export function healthCheck(): { status: string; timestamp: string } {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}
