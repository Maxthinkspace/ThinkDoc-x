import type { ExtractedSentence } from '@/services/sentence-extractor';
import { extractSentences, extractSentencesWithDefinitionAwareness, extractFragments, buildFullSectionText } from '@/services/sentence-extractor';
import { generateTextWithJsonParsing } from '@/controllers/generate';
import { buildSectionTree } from '@/controllers/contract-review-prompts';
import { findSectionInOutline, buildSectionTextWithChildren } from '@/services/contract-review';
import { normalizeSectionNumber } from '@/services/sentence-extractor';
import type { ParsedDocument, SectionNode } from '@/types/documents';
import type { GenerateDefinitionRequest, GenerateDefinitionResult, ResolveDuplicatesRequest, ResolveDuplicateAmendment, ResolveDuplicatesResult } from '@/types/definition-checker';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DefinitionCheckResult {
  unusedDefinitions: UnusedDefinition[];
  duplicateDefinitions: DuplicateDefinition[];
  undefinedTerms: UndefinedTerm[];
  inconsistentTerms: InconsistentTerm[];
  missingQuoteTerms: MissingQuoteTerm[];
  capitalizationIssues: CapitalizationIssue[];
  summary: {
    totalIssues: number;
    unusedCount: number;
    duplicateCount: number;
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

export interface DuplicateDefinition {
  term: string;
  totalOccurrences: number;
  occurrences: TermOccurrence[];
}

export interface UndefinedTerm {
  term: string;
  totalOccurrences: number;
  occurrences: TermOccurrence[];
}

export interface InconsistentTerm {
  term: string;
  totalOccurrences: number;
  definedForm?: string;
  variations: {
    variant: string;
    count: number;
    occurrences: TermOccurrence[];
  }[];
}

export interface TermOccurrence {
  sentence: string;
  sectionReference: string;
  isInDefinitionSection?: boolean;
}

export interface MissingQuoteTerm {
  term: string;
  totalOccurrences: number;
  occurrences: TermOccurrence[];  // Where term appears without quotes
}

export interface CapitalizationIssue {
  term: string;
  expectedForm: string;           // The properly capitalized form
  issues: {
    foundForm: string;            // What was found (e.g., "agreement")
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
  console.log('📖 Definition section:', parsedDocument?.definitionSection || '(not identified)');

  // Validate input
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
  
  // ========================================================================
  // INTERIM TEST 3: List All Headings
  // ========================================================================
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

  const { definedTermsMap, duplicateTermNames } = extractDefinedTerms(documentText);

  // ========================================================================
  // Log All Definitions (single consolidated log)
  // ========================================================================
  console.log(`\n=== 📖 ALL DEFINITIONS (${definedTermsMap.size}) ===`);
  if (definedTermsMap.size > 0) {
    Array.from(definedTermsMap.keys()).forEach((term, idx) => {
      console.log(`  ${idx + 1}. "${term}"`);
    });
  }
  console.log('=====================================\n');

  const nonHeadingChunks = chunks.filter(c => !c.isHeading);
  const capitalizedTerms = findCapitalizedTerms(nonHeadingChunks, definedTermsMap);
  
  // ========================================================================
  // Log All Capitalized Terms (Before LLM Filtering)
  // ========================================================================
  console.log(`\n=== 📊 CAPITALIZED TERMS PRE-LLM (${capitalizedTerms.size}) ===`);
  if (capitalizedTerms.size > 0) {
    Array.from(capitalizedTerms.entries()).forEach(([term, sections], idx) => {
      const deepest = Array.from(sections).map(s => s.includes(' > ') ? s.split(' > ').pop()! : s);
      console.log(`  ${idx + 1}. "${term}" - ${deepest.slice(0, 3).join(', ')}${deepest.length > 3 ? '...' : ''}`);
    });
  }
  console.log('=====================================\n');

  const filteredTerms = await filterTermsWithLLM(Array.from(capitalizedTerms.keys()));

  // Build a set of heading texts for filtering (case-insensitive, trimmed)
  const headingTexts = new Set(
    headingChunks.map(h => h.text.trim().toLowerCase())
  );

  const filteredCapitalizedTerms = new Map<string, Set<string>>();
  filteredTerms.forEach(term => {
    if (capitalizedTerms.has(term)) {
      filteredCapitalizedTerms.set(term, capitalizedTerms.get(term)!);
    }
  });

  // ========================================================================
  // Log Capitalized Terms After LLM Filtering
  // ========================================================================
  console.log(`\n=== 📊 CAPITALIZED TERMS POST-LLM (${filteredCapitalizedTerms.size}) ===`);
  if (filteredCapitalizedTerms.size > 0) {
    Array.from(filteredCapitalizedTerms.entries()).forEach(([term, sections], idx) => {
      const deepest = Array.from(sections).map(s => s.includes(' > ') ? s.split(' > ').pop()! : s);
      console.log(`  ${idx + 1}. "${term}" - ${deepest.join(', ')}`);
    });
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
    duplicateTermNames.length > 0 ||
    undefinedTermsList.length > 0 ||
    inconsistentTermsList.length > 0 ||
    missingQuoteTermsList.length > 0 ||
    capitalizationIssuesList.length > 0;

  if (!hasIssues) {
    console.log('✅ No issues found - perfect document!');
    return {
      unusedDefinitions: [],
      duplicateDefinitions: [],
      undefinedTerms: [],
      inconsistentTerms: [],
      missingQuoteTerms: [],
      capitalizationIssues: [],
      summary: {
        totalIssues: 0,
        unusedCount: 0,
        duplicateCount: 0,
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
  console.log(`   - Duplicate definitions: ${duplicateTermNames.length}`);
  console.log(`   - Undefined terms: ${undefinedTermsList.length}`);
  console.log(`   - Inconsistent terms: ${inconsistentTermsList.length}`);
  console.log(`   - Missing quotes: ${missingQuoteTermsList.length}`);
  console.log(`   - Capitalization issues: ${capitalizationIssuesList.length}`);

  // ========================================================================
  // PHASE 3: EXTRACT SENTENCES (ONLY IF ISSUES FOUND)
  // ========================================================================

  console.log('📝 Calling sentence extractor for detailed locations...');
  const sentences = extractAllSentences(parsedDocument);
  console.log(`📝 Extracted ${sentences.length} sentences (full, with parent-child combining)`);

  const fragments = extractAllFragments(parsedDocument);
  console.log(`📝 Extracted ${fragments.length} fragments (standalone, no parent prepending)`);

  const unusedDefinitions = buildUnusedDefinitionsWithDetails(
    unusedTerms,
    definedTermsMap,
    fragments
  );

  const duplicateDefinitions = buildDuplicateDefinitionsWithDetails(
    duplicateTermNames,
    fragments
  );

  const undefinedTerms = buildUndefinedTermsWithDetails(
    undefinedTermsList,
    fragments,
    headingTexts
  );

  const inconsistentTerms = buildInconsistentTermsWithDetails(
    inconsistentTermsList,
    fragments,
    nonHeadingChunks,
    definedTermsMap
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
    duplicateDefinitions,
    undefinedTerms,
    inconsistentTerms,
    missingQuoteTerms,
    capitalizationIssues,
    summary: {
      totalIssues: unusedDefinitions.length + duplicateDefinitions.length + undefinedTerms.length + inconsistentTerms.length + missingQuoteTerms.length + capitalizationIssues.length,
      unusedCount: unusedDefinitions.length,
      duplicateCount: duplicateDefinitions.length,
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

  // Validate input
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

    // Exclude document name from recitals to avoid detecting its words as defined terms
    // The document name (e.g., "SHARE PURCHASE AGREEMENT") typically appears at the start
    if (parsedDocument.documentName && parsedDocument.documentName.trim().length > 0) {
      const docName = parsedDocument.documentName.trim();
      // Remove document name from recitals (case-insensitive, to handle variations)
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

    // Use sectionHeading from document parser (heading detection done in frontend)
    if (node.sectionHeading && node.sectionHeading.trim().length > 0) {
      chunks.push({
        text: node.sectionHeading.trim(),
        sectionReference: sectionRef,
        isHeading: true,
      });
    }

    // Content text (heading already separated by document parser)
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
// STEP 1: FIND CAPITALIZED TERMS (ENHANCED)
// ============================================================================

/**
 * Connector words that can appear between capitalized words in a term.
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
 * Document structure terms that should NOT be treated as defined terms.
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
 * Check if a word is a year (1800-2099)
 */
function isYear(word: string): boolean {
  return /^(18|19|20)\d{2}$/.test(word);
}

/**
 * Check if a word is capitalized and valid for term detection.
 * Handles:
 * - Regular capitalized words: "Agreement", "Transfer"
 * - ALL CAPS acronyms: "ACRA", "SFRS", "LLC"
 * - Words with apostrophes: "Shareholders'", "Company's"
 * - Words with hyphens: "Post-completion" (checks first part)
 *
 * Rejects:
 * - Single-letter words (like "X" from "202712345X")
 * - Term breaker words (like "This", "That", "The")
 */
function isCapitalizedWord(word: string): boolean {
  if (!word || word.length === 0) return false;

  // Remove trailing punctuation for checking (includes straight and curly quotes)
  const cleanWord = word.replace(/[.,;:!?''""\)\]]+$/, '');
  if (cleanWord.length === 0) return false;

  // Reject single-letter words (prevents "X" from "202712345X" being detected)
  // Exception: Don't apply this to hyphenated words where first part might be single letter
  if (cleanWord.length === 1) return false;

  // Check if this is a term breaker word (This, That, etc.)
  if (TERM_BREAKER_WORDS.has(cleanWord)) return false;

  // Handle hyphenated words - check first part
  const firstPart = cleanWord.split('-')[0];
  if (!firstPart || firstPart.length === 0) return false;

  // Remove apostrophe (straight or curly) and possessive suffix for checking
  const withoutPossessive = firstPart.replace(/['']s?$/, '');
  if (withoutPossessive.length === 0) return false;

  // Must have at least 2 letters (after removing possessive)
  const letters = withoutPossessive.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 2) return false;

  // Check if starts with uppercase
  const firstChar = withoutPossessive.charAt(0);
  return /[A-Z]/.test(firstChar);
}

/**
 * Check if word is ALL CAPS (like ACRA, SFRS, LLC)
 */
function isAllCapsWord(word: string): boolean {
  const cleanWord = word.replace(/[.,;:!?''""\)\]]+$/, '').replace(/['']s?$/, '');
  if (cleanWord.length < 2) return false;
  // All letters must be uppercase
  const letters = cleanWord.replace(/[^a-zA-Z]/g, '');
  return letters.length >= 2 && letters === letters.toUpperCase();
}

/**
 * Check if the separator between two words contains a breaking symbol.
 * Breaking symbols: ( ) [ ] { } " " " ' ' « » ; : / \ , # . "
 * Non-breaking: space, apostrophe (within words), hyphen (within words)
 *
 * Note: Period is a breaking symbol, but company suffixes are handled separately
 * by isCompanySuffixContinuation()
 */
function hasBreakingSymbol(text: string, startPos: number, endPos: number): boolean {
  const separator = text.substring(startPos, endPos);
  // Breaking symbols that should end a term
  // Includes: parentheses, brackets, braces, all quote types, semicolon, colon,
  // slash, backslash, comma, hash, period, straight double quote
  const breakingSymbols = /[()[\]{}""''«»;:\/\\,#."]/;
  return breakingSymbols.test(separator);
}

/**
 * Check if two consecutive words form a company suffix pattern where periods should NOT break.
 * Examples: "Pte. Ltd.", "Co. Ltd.", "Co., Ltd.", "Sdn. Bhd."
 *
 * @param lastWord - The last word in the current term (e.g., "Pte")
 * @param separator - The text between the words (e.g., ". " or "., ")
 * @param nextWord - The next word being considered (e.g., "Ltd")
 * @returns true if this is a company suffix continuation (don't break)
 */
function isCompanySuffixContinuation(lastWord: string, separator: string, nextWord: string): boolean {
  // Only applies if separator contains a period
  if (!separator.includes('.')) return false;

  const lastLower = lastWord.toLowerCase();
  const nextLower = nextWord.toLowerCase();

  // Company suffix patterns where period should NOT break:
  // Format: [wordBeforePeriod, wordAfterPeriod]
  const suffixPairs: [string, string][] = [
    // Singapore / Commonwealth
    ['pte', 'ltd'],      // Pte. Ltd.

    // General
    ['co', 'ltd'],       // Co. Ltd., Co., Ltd.

    // Malaysia
    ['sdn', 'bhd'],      // Sdn. Bhd.

    // Note: Single-word suffixes like "Inc.", "Corp.", "Ltd." at end of term
    // are handled by the company name filter, not here
  ];

  for (const [first, second] of suffixPairs) {
    if (lastLower === first && nextLower === second) {
      return true;
    }
  }

  return false;
}

/**
 * Terms are broken by:
 * - Symbols: ( ) [ ] { } " ; : etc.
 * - Term breaker words: This, That, The (at start), etc.
 */
function findCapitalizedTerms(
  chunks: TextChunk[],
  definedTerms: Map<string, string>
): Map<string, Set<string>> {
  const capitalizedTerms = new Map<string, Set<string>>();
  const ignoredTerms = new Set<string>();

  for (const chunk of chunks) {
    const text = chunk.text;

    // Tokenize while preserving word positions
    // Match words including those with apostrophes (straight and curly) and hyphens (min 2 chars)
    // Includes: ' (straight), ' (curly), - (hyphen)
    const wordPattern = /[A-Za-z][A-Za-z''\-]+(?:['']s?)?|\d{4}/g;
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

      // Skip if at sentence start
      if (isAtSentenceStart(text, position)) {
        i++;
        continue;
      }

      // Check if this is a capitalized word (or ALL CAPS)
      if (!isCapitalizedWord(word)) {
        i++;
        continue;
      }

      // Start building a potential multi-word term
      const termParts: string[] = [word];
      const termStartIndex = position;  // Track start position for exact text extraction
      let lastEndIndex = endIndex;
      let j = i + 1;

      // Look ahead for connector words and more capitalized words
      while (j < words.length) {
        const nextWordInfo = words[j];
        if (!nextWordInfo) break;

        const nextWord = nextWordInfo.word;
        const lowerNext = nextWord.toLowerCase();
        const separator = text.substring(lastEndIndex, nextWordInfo.index);
        const lastTermWord = termParts[termParts.length - 1] ?? '';

        // Check for breaking symbols between this word and the previous one
        // Exception: Company suffix patterns like "Pte. Ltd." should NOT break
        if (hasBreakingSymbol(text, lastEndIndex, nextWordInfo.index)) {
          if (!isCompanySuffixContinuation(lastTermWord, separator, nextWord)) {
            break; // Symbol breaks the term
          }
          // Company suffix continuation - don't break, continue to include this word
        }

        // Check if next word is a year
        // Years are included in terms and we continue looking
        if (isYear(nextWord)) {
          termParts.push(nextWord);
          lastEndIndex = nextWordInfo.endIndex;
          j++;
          continue;
        }

        // Check if next word is a connector (e.g., "of", "and", "the")
        if (CONNECTOR_WORDS.has(lowerNext)) {
          // Look at the word after the connector
          const afterConnectorInfo = words[j + 1];
          if (afterConnectorInfo) {
            const afterConnector = afterConnectorInfo.word;
            const connectorSeparator = text.substring(nextWordInfo.endIndex, afterConnectorInfo.index);

            // Check for breaking symbols between connector and next word
            // Exception: Company suffix patterns should NOT break
            if (hasBreakingSymbol(text, nextWordInfo.endIndex, afterConnectorInfo.index)) {
              if (!isCompanySuffixContinuation(nextWord, connectorSeparator, afterConnector)) {
                break;
              }
            }

            // After a connector, accept either a capitalized word OR a year
            if (isCapitalizedWord(afterConnector) || isYear(afterConnector)) {
              // Include connector and continue
              termParts.push(nextWord);
              termParts.push(afterConnector);
              lastEndIndex = afterConnectorInfo.endIndex;
              j += 2;
              continue;
            }
          }
          // Connector without following capitalized word or year - stop
          break;
        }

        // Check if next word is capitalized (continues the term)
        if (isCapitalizedWord(nextWord)) {
          termParts.push(nextWord);
          lastEndIndex = nextWordInfo.endIndex;
          j++;
          continue;
        }

        // Next word is not capitalized and not a connector - stop
        break;
      }

      // Build the complete term - use substring to preserve exact text including apostrophes
      const term = text.substring(termStartIndex, lastEndIndex);

      // Skip if should be ignored
      if (shouldIgnoreTerm(term)) {
        ignoredTerms.add(term);
        i = j; // Skip to after the term
        continue;
      }

      // Add term to map
      if (!capitalizedTerms.has(term)) {
        capitalizedTerms.set(term, new Set());
      }
      capitalizedTerms.get(term)!.add(chunk.sectionReference);

      // Move to after this term
      i = j;
    }
  }

  if (ignoredTerms.size > 0) {
    console.log(`  🚫 Filtered out ${ignoredTerms.size} common terms:`, Array.from(ignoredTerms).join(', '));
  }

  // Apply plural normalization to group singular/plural forms
  const normalizedTerms = normalizePlurals(capitalizedTerms);

  // Filter out company names (terms ending with Pte Ltd, Co. Ltd., Inc, etc.)
  const withoutCompanies = filterCompanyNames(normalizedTerms);

  // Filter out ALL CAPS terms (warnings, highlights, headers)
  const withoutAllCaps = filterAllCapsTerms(withoutCompanies);

  // Filter out cross-references (Section X, Article Y, Schedule Z, etc.)
  const withoutCrossRefs = filterCrossReferences(withoutAllCaps);

  // Filter out component words that ONLY appear as part of longer terms
  // e.g., "Information" only appears in "Confidential Information" → filter out
  // But "Completion" appears standalone AND in "Completion Date" → keep it
  return filterComponentWords(withoutCrossRefs, chunks, definedTerms);
}

/**
 * Normalize plural forms to group "Business Day" and "Business Days" as the same term.
 * Handles:
 * - Regular plurals: Day/Days, Term/Terms
 * - -ies plurals: Party/Parties, Company/Companies
 * - -es plurals: Business/Businesses (though rare in legal terms)
 */
function normalizePlurals(
  terms: Map<string, Set<string>>
): Map<string, Set<string>> {
  const normalized = new Map<string, Set<string>>();
  const termsList = Array.from(terms.keys());
  const processed = new Set<string>();

  for (const term of termsList) {
    if (processed.has(term)) continue;

    // Find all plural/singular variants
    const variants = findPluralVariants(term, termsList);

    // Use singular form as the canonical term (or shortest form)
    const canonicalTerm = variants.reduce((a, b) => a.length <= b.length ? a : b);

    // Merge all sections from all variants
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

/**
 * Find all plural/singular variants of a term in the terms list.
 */
function findPluralVariants(term: string, allTerms: string[]): string[] {
  const variants: string[] = [term];
  const lowerTerm = term.toLowerCase();

  for (const other of allTerms) {
    if (other === term) continue;

    const lowerOther = other.toLowerCase();

    // Check if they're plural variants of each other
    if (arePluralVariants(lowerTerm, lowerOther)) {
      variants.push(other);
    }
  }

  return variants;
}

/**
 * Check if two terms are singular/plural variants of each other.
 */
function arePluralVariants(term1: string, term2: string): boolean {
  // Handle multi-word terms - compare last words
  const words1 = term1.split(' ');
  const words2 = term2.split(' ');

  // Must have same number of words
  if (words1.length !== words2.length) return false;

  // All words except last must be identical
  for (let i = 0; i < words1.length - 1; i++) {
    const w1 = words1[i];
    const w2 = words2[i];
    if (w1 !== w2) return false;
  }

  // Check last words for plural relationship
  const last1 = words1[words1.length - 1] ?? '';
  const last2 = words2[words2.length - 1] ?? '';

  return areWordPluralVariants(last1, last2);
}

/**
 * Check if two single words are singular/plural variants.
 */
function areWordPluralVariants(word1: string, word2: string): boolean {
  const [shorter, longer] = word1.length <= word2.length
    ? [word1, word2]
    : [word2, word1];

  // Regular plural: add 's' (day → days)
  if (longer === shorter + 's') return true;

  // -ies plural: y → ies (party → parties, company → companies)
  if (shorter.endsWith('y') && longer === shorter.slice(0, -1) + 'ies') return true;

  // -es plural: add 'es' (business → businesses)
  if (longer === shorter + 'es') return true;

  // -ves plural: f/fe → ves (though rare: shelf → shelves)
  if (shorter.endsWith('f') && longer === shorter.slice(0, -1) + 'ves') return true;
  if (shorter.endsWith('fe') && longer === shorter.slice(0, -2) + 'ves') return true;

  return false;
}

/**
 * Generate plural variants of a term.
 * For multi-word terms, only the last word is pluralized.
 * Returns array including the original term and its plural form(s).
 *
 * Examples:
 * - "Business Day" → ["Business Day", "Business Days"]
 * - "Party" → ["Party", "Parties"]
 * - "Encumbrance" → ["Encumbrance", "Encumbrances"]
 */
function generatePluralVariants(term: string): string[] {
  const variants: string[] = [term];
  const words = term.split(' ');
  const lastWord = words[words.length - 1];
  if (!lastWord) return variants;

  const prefix = words.length > 1 ? words.slice(0, -1).join(' ') + ' ' : '';

  // Generate plural form
  let plural: string | null = null;

  // -y → -ies (Party → Parties)
  if (lastWord.endsWith('y') && lastWord.length > 1) {
    const beforeY = lastWord.charAt(lastWord.length - 2);
    // Only if preceded by consonant (not "ay", "ey", "oy", "uy")
    if (!/[aeiou]/i.test(beforeY)) {
      plural = lastWord.slice(0, -1) + 'ies';
    }
  }

  // -f → -ves (rare: Shelf → Shelves)
  if (!plural && lastWord.endsWith('f')) {
    plural = lastWord.slice(0, -1) + 'ves';
  }

  // -fe → -ves (rare: Wife → Wives)
  if (!plural && lastWord.endsWith('fe')) {
    plural = lastWord.slice(0, -2) + 'ves';
  }

  // -s, -x, -z, -ch, -sh → -es (Business → Businesses)
  if (!plural && /(?:s|x|z|ch|sh)$/i.test(lastWord)) {
    plural = lastWord + 'es';
  }

  // Default: add 's' (Day → Days)
  if (!plural) {
    plural = lastWord + 's';
  }

  variants.push(prefix + plural);

  // Also generate singular if term looks plural
  // -ies → -y (Parties → Party)
  if (lastWord.endsWith('ies') && lastWord.length > 3) {
    const singular = lastWord.slice(0, -3) + 'y';
    variants.push(prefix + singular);
  }
  // -ves → -f (Shelves → Shelf)
  else if (lastWord.endsWith('ves') && lastWord.length > 3) {
    const singular = lastWord.slice(0, -3) + 'f';
    variants.push(prefix + singular);
  }
  // -es → remove 'es' (Businesses → Business)
  else if (lastWord.endsWith('es') && lastWord.length > 2) {
    const singular = lastWord.slice(0, -2);
    if (singular.length > 0) {
      variants.push(prefix + singular);
    }
  }
  // -s → remove 's' (Days → Day)
  else if (lastWord.endsWith('s') && lastWord.length > 1) {
    const singular = lastWord.slice(0, -1);
    variants.push(prefix + singular);
  }

  // Remove duplicates
  return [...new Set(variants)];
}

/**
 * Filter out component words that ONLY appear as part of longer terms.
 *
 * Example:
 * - "Information" only appears in "Confidential Information" → FILTER OUT
 * - "Completion" appears standalone AND in "Completion Date" → KEEP
 *
 * This prevents false positives where a word like "Information" is flagged
 * as undefined when it's actually only used as part of a defined compound term.
 */
function filterComponentWords(
  allTerms: Map<string, Set<string>>,
  chunks: TextChunk[],
  definedTerms: Map<string, string>
): Map<string, Set<string>> {
  const termsList = Array.from(allTerms.keys());
  const definedTermsList = Array.from(definedTerms.keys());

  // Build map of each term to longer terms that contain it
  const componentMap = new Map<string, Set<string>>();

  for (const term of termsList) {
    componentMap.set(term, new Set());

    // Check against other capitalized terms
    for (const otherTerm of termsList) {
      if (otherTerm !== term && otherTerm.includes(term)) {
        const regex = new RegExp(`\\b${escapeRegex(term)}\\b`);
        if (regex.test(otherTerm)) {
          componentMap.get(term)!.add(otherTerm);
        }
      }
    }

    // Check against defined terms
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

    // No longer terms contain this word - keep it
    if (longerTerms.size === 0) {
      filteredTerms.set(term, sections);
      continue;
    }

    // Check if term ever appears standalone (not as part of a longer term)
    let appearsStandalone = false;
    const termPattern = new RegExp(`\\b${escapeRegex(term)}\\b`, 'g');

    for (const chunk of chunks) {
      const text = chunk.text;
      const matches = Array.from(text.matchAll(termPattern));

      for (const match of matches) {
        let isPartOfLonger = false;

        // Check if this occurrence is part of any longer term
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
  // Note: Colon (:) is NOT included - words after colons should still be detected
  // (e.g., "The parties are: (1) Sunflower Pte. Ltd." - we want to detect "Sunflower")
  // Company names are filtered out separately by filterCompanyNames()
  return /[.!?]/.test(lastChar);
}

// ============================================================================
// COMPANY NAME DETECTION
// ============================================================================

/**
 * Company suffixes that indicate a term is a company name.
 * These patterns match common corporate entity indicators worldwide.
 * When detected, the ENTIRE term should be filtered out (not just the suffix).
 */
const COMPANY_SUFFIX_PATTERNS = [
  // Singapore / Malaysia / Commonwealth
  /\bPte\.?\s*Ltd\.?$/i,           // Pte Ltd, Pte. Ltd.
  /\bSdn\.?\s*Bhd\.?$/i,           // Sdn Bhd, Sdn. Bhd. (Malaysia)

  // General Limited companies
  /\bCo\.?,?\s*Ltd\.?$/i,          // Co. Ltd., Co., Ltd., Co Ltd
  /\bLtd\.?$/i,                    // Ltd, Ltd.
  /\bLimited$/i,                   // Limited
  /\bPLC$/i,                       // PLC (Public Limited Company)
  /\bLLC$/i,                       // LLC (Limited Liability Company)
  /\bLLP$/i,                       // LLP (Limited Liability Partnership)
  /\bLP$/i,                        // LP (Limited Partnership)

  // US corporations
  /\bInc\.?$/i,                    // Inc, Inc.
  /\bCorp\.?$/i,                   // Corp, Corp.
  /\bCorporation$/i,               // Corporation
  /\bIncorporated$/i,              // Incorporated

  // European
  /\bGmbH$/i,                      // GmbH (Germany)
  /\bAG$/i,                        // AG (Germany/Switzerland)
  /\bS\.?A\.?$/i,                  // S.A., SA (France/Spain)
  /\bS\.?A\.?R\.?L\.?$/i,          // S.A.R.L., SARL (France)
  /\bB\.?V\.?$/i,                  // B.V., BV (Netherlands)
  /\bN\.?V\.?$/i,                  // N.V., NV (Netherlands/Belgium)

  // Asia
  /\bK\.?K\.?$/i,                  // K.K., KK (Japan - Kabushiki Kaisha)
  /\bPT\.?$/i,                     // PT (Indonesia)
];

/**
 * Check if a term appears to be a company name based on common corporate suffixes.
 * Returns true if the term should be filtered out.
 */
function isCompanyName(term: string): boolean {
  for (const pattern of COMPANY_SUFFIX_PATTERNS) {
    if (pattern.test(term)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a term is a MULTI-WORD ALL CAPS phrase (like "IT IS HEREBY AGREED").
 * These are typically warnings, highlights, or document headers - not defined terms.
 *
 * Single-word ALL CAPS terms (like "ACRA", "SIAC", "SFRS") are KEPT because
 * they are usually abbreviations/acronyms which are legitimate defined terms.
 *
 * Returns true only if:
 * - Term has multiple words (excluding connectors)
 * - ALL words are uppercase
 */
function isAllCapsTerm(term: string): boolean {
  const words = term.split(/\s+/);

  // Need at least one word
  if (words.length === 0) return false;

  // Count non-connector, non-year words that are uppercase
  let uppercaseWordCount = 0;

  // Check each word
  for (const word of words) {
    const lowerWord = word.toLowerCase();

    // Skip connector words (they're lowercase by nature)
    if (CONNECTOR_WORDS.has(lowerWord)) continue;

    // Skip years
    if (isYear(word)) continue;

    // Extract only letters for checking
    const letters = word.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) continue;

    // If any word has lowercase letters, it's not an ALL CAPS term
    if (letters !== letters.toUpperCase()) {
      return false;
    }

    uppercaseWordCount++;
  }

  // Only filter if there are MULTIPLE uppercase words (not single-word abbreviations)
  // Single-word ALL CAPS like "ACRA", "SIAC" are abbreviations - keep them
  return uppercaseWordCount >= 2;
}

/**
 * Filter out company names from the terms map.
 * This should be called after collecting all capitalized terms.
 */
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

/**
 * Filter out ALL CAPS terms (warnings, highlights, headers).
 * Examples: "IT IS HEREBY AGREED", "CONFIDENTIAL", "IMPORTANT NOTICE"
 */
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

/**
 * Check if a term is a cross-reference (contains Section, Article, Schedule, etc.)
 * Examples: "Section 5.1", "Article III", "Schedule A", "Clause 2.3"
 */
function isCrossReference(term: string): boolean {
  const words = term.split(/\s+/);
  return words.some(word => {
    // Normalize to title case for comparison
    const titleCase = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    return STRUCTURE_WORDS.has(titleCase);
  });
}

/**
 * Filter out cross-reference terms from the terms map.
 * These are document structure references, not defined terms.
 * Examples: "Section 5", "Article III", "Schedule A", "Clause 2.3"
 */
function filterCrossReferences(
  terms: Map<string, Set<string>>
): Map<string, Set<string>> {
  const filtered = new Map<string, Set<string>>();
  const removedRefs: string[] = [];

  for (const [term, sections] of terms.entries()) {
    if (isCrossReference(term)) {
      removedRefs.push(term);
    } else {
      filtered.set(term, sections);
    }
  }

  if (removedRefs.length > 0) {
    console.log(`  📎 Filtered out ${removedRefs.length} cross-reference terms:`);
    removedRefs.forEach(ref => console.log(`     - "${ref}"`));
  }

  return filtered;
}

function shouldIgnoreTerm(term: string): boolean {
  // Always keep Party/Parties - common defined terms in contracts
  if (term === 'Party' || term === 'Parties') return false;

  // Check against list of common terms to ignore
  const commonTerms = new Set([
    // Months
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
    // Days
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    // Titles
    'Mr', 'Mrs', 'Ms', 'Dr', 'Prof',
    // Countries (common ones)
    'United', 'States', 'America', 'China', 'Chinese',
    'Singapore', 'Malaysia', 'Indonesia', 'Thailand', 'Vietnam',
    'India', 'Japan', 'Korea', 'Australia', 'Canada',
    'England', 'Britain', 'France', 'Germany', 'Italy',
    'Republic of Singapore', 'People\'s Republic of China',
    // Cities and multi-word locations
    'Hong', 'Kong', 'Hong Kong',
    'New', 'York', 'New York',
    'Los', 'Angeles', 'Los Angeles',
    'San', 'Francisco', 'San Francisco',
    'United States', 'United Kingdom', 'United States of America',
    'London', 'Tokyo', 'Beijing', 'Shanghai', 'Kuala Lumpur',
    // Languages
    'English', 'Chinese', 'Mandarin', 'Japanese', 'Korean',
    'French', 'Spanish', 'German', 'Italian', 'Portuguese',
    // Legal document structure terms
    'Schedule', 'Exhibit', 'Appendix', 'Annex', 'Section', 'Article',
    'Clause', 'Paragraph', 'Chapter', 'Part', 'Recital', 'Preamble',
  ]);

  if (commonTerms.has(term)) return true;

  // Check for patterns like "Schedule A", "Exhibit 1", "Appendix B"
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

Your task is to REMOVE terms that should NOT be flagged as needing definitions:

REMOVE these types of terms:
1. Names of specific people (e.g. "John Smith")
2. Geographic locations - countries, cities, states, regions (e.g., "Singapore", "Hong Kong", "United States", "California")
3. Languages - names of languages (e.g., "English", "Chinese", "French")
4. Months and days of the week (e.g., "January", "Monday")
5. Titles (e.g., "Mr", "Mrs", "Dr")

Terms to analyze:
${terms.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Return your response as a JSON object with this structure:
{
  "filtered_terms": ["term1", "term2", ...]
}
`;

  try {
    const response = await generateTextWithJsonParsing(systemPrompt, userContent);
    
    if (response.filtered_terms && Array.isArray(response.filtered_terms)) {
      console.log(`🤖 LLM kept ${response.filtered_terms.length} terms out of ${terms.length}`);
      
      // DEBUG: Show what was filtered out
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
// STEP 3: EXTRACT DEFINED TERMS
// ============================================================================

function extractDefinedTerms(text: string): { definedTermsMap: Map<string, string>; duplicateTermNames: string[] } {
  const definedTerms = new Map<string, string>();
  const termCounts = new Map<string, number>();

  // ENHANCED: Added more quote pattern variations
  const quotePatterns = [
    // Double quotes (straight)
    /"([A-Z][^"]{0,48})"/g,

    // Smart double quotes (curly quotes)
    /\u201C([A-Z][^\u201D]{0,48})\u201D/g,  // " and "
    /"\u201D([A-Z][^\u201D]{0,48})\u201D/g,
    /\u201C([A-Z][^"]{0,48})"/g,

    // Single quotes (straight) - ADDED
    /'([A-Z][^']{0,48})'/g,

    // Smart single quotes (curly quotes) - ADDED
    /\u2018([A-Z][^\u2019]{0,48})\u2019/g,  // ' and '
  ];

  for (const pattern of quotePatterns) {
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const captured = match[1];
      if (!captured) continue;
      const term = captured.trim();

      if (term.length === 0 || term.length > 50) continue;
      if (!/^[A-Z]/.test(term)) continue;

      const snippet = getSnippet(text, match.index, 80);

      termCounts.set(term, (termCounts.get(term) || 0) + 1);

      if (!definedTerms.has(term)) {
        definedTerms.set(term, snippet);
      }
    }
  }

  const duplicateTermNames: string[] = [];
  termCounts.forEach((count, term) => {
    if (count >= 2) {
      duplicateTermNames.push(term);
    }
  });

  return { definedTermsMap: definedTerms, duplicateTermNames };
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
    // Generate plural variants to search for both singular and plural forms
    // e.g., "Business Day" → ["Business Day", "Business Days"]
    const variants = generatePluralVariants(term);

    let totalCount = 0;
    for (const variant of variants) {
      const termPattern = new RegExp(buildTermSearchPattern(variant), 'g');
      const matches = documentText.match(termPattern);
      totalCount += matches ? matches.length : 0;
    }

    // A term is "unused" if it appears only once (the definition itself) or never
    if (totalCount <= 1) {
      unused.push(term);
    }
  });

  return unused;
}

function findUndefinedTermsQuick(
  capitalizedTerms: Map<string, Set<string>>,
  definedTerms: Map<string, string>
): string[] {
  const definedTermsList = Array.from(definedTerms.keys()).map(t => t.trim());
  const definedTermSet = new Set(definedTermsList);

  const undefinedList: string[] = [];

  capitalizedTerms.forEach((sections, term) => {
    const trimmedTerm = term.trim();

    // Check 1: Exact match
    if (definedTermSet.has(trimmedTerm)) {
      console.log(`  ✅ "${trimmedTerm}"`);
      return;
    }

    // Check 2: Plural/singular variant match
    // e.g., "Seller Indemnified Party" should match "Seller Indemnified Parties"
    let foundPluralMatch = false;
    for (const definedTerm of definedTermsList) {
      if (arePluralVariants(trimmedTerm, definedTerm)) {
        console.log(`  ✅ "${trimmedTerm}"`);
        foundPluralMatch = true;
        break;
      }
    }
    if (foundPluralMatch) return;

    console.log(`  ❌ "${term}"`);
    undefinedList.push(term);
  });

  return undefinedList;
}

// ============================================================================
// CASE INCONSISTENCY DETECTION
// ============================================================================

function findInconsistentTermsQuick(
  capitalizedTerms: Map<string, Set<string>>,
  chunks: TextChunk[]
): string[] {
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

  capitalizedTerms.forEach((sections, term) => {
    const lowerTerm = term.toLowerCase();

    if (processedTerms.has(lowerTerm)) return;
    processedTerms.add(lowerTerm);

    const variations = findCaseVariationsInContent(nonHeadingChunks, term, headingTermVariants);

    if (variations.length > 1) {
      inconsistent.push(term);
    }
  });

  return inconsistent;
}

/**
 * Find case variations in non-heading content only
 * 
 * IMPORTANT: We check for inconsistencies WITHIN the content itself.
 * The heading capitalization does NOT matter.
 * 
 * Example 1:
 * - Heading: "PURCHASE PRICE"
 * - Content: "purchase price" everywhere (consistent)
 * Result: 1 variation → NOT inconsistent ✓
 * 
 * Example 2:
 * - Heading: "PURCHASE PRICE"
 * - Content: "Purchase Price" (5x) + "purchase price" (3x)
 * Result: 2 variations → INCONSISTENT ⚠️
 * 
 * The heading style difference is ignored - we only care about
 * whether the content itself is consistent.
 */
function findCaseVariationsInContent(
  nonHeadingChunks: TextChunk[],
  term: string,
  headingTermVariants: Set<string>
): string[] {
  // Search for the term itself plus its plural/singular variants
  const searchTerms = generatePluralVariants(term);
  const variationsMap = new Map<string, number>();

  for (const chunk of nonHeadingChunks) {
    const text = chunk.text;
    for (const searchTerm of searchTerms) {
      const pattern = new RegExp(`\\b${escapeRegex(searchTerm)}\\b`, 'gi');
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(text)) !== null) {
        const variant = match[0];

        // Simply count all variations in content
        // Do NOT filter based on headings - we only care about content consistency
        variationsMap.set(variant, (variationsMap.get(variant) || 0) + 1);
      }
    }
  }

  return Array.from(variationsMap.keys());
}

// ============================================================================
// STEP 8: FIND MISSING QUOTE TERMS (QUICK CHECK)
// ============================================================================

function findMissingQuoteTermsQuick(
  capitalizedTerms: Map<string, Set<string>>,
  definedTerms: Map<string, string>
): string[] {
  console.log('\n=== 🔍 STEP 8: Checking for Missing Quotes ===');
  
  const definedTermSet = new Set(
    Array.from(definedTerms.keys()).map(t => t.trim())
  );
  
  const missingQuotes: string[] = [];
  
  // Terms that appear capitalized (passed LLM filter) but are NOT in defined terms
  // These likely need quotes
  capitalizedTerms.forEach((sections, term) => {
    const trimmedTerm = term.trim();
    const isDefined = definedTermSet.has(trimmedTerm);
    
    if (!isDefined) {
      // Check if term appears frequently (more than 2 times suggests it should be defined)
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

// ============================================================================
// STEP 9: FIND CAPITALIZATION ISSUES (QUICK CHECK)
// ============================================================================

function findCapitalizationIssuesQuick(
  definedTerms: Map<string, string>,
  chunks: TextChunk[]
): string[] {
  console.log('\n=== 🔍 STEP 9: Checking Capitalization Issues ===');
  
  const issues: string[] = [];
  const nonHeadingChunks = chunks.filter(c => !c.isHeading);
  
  definedTerms.forEach((snippet, term) => {
    // Check 1: Defined term must start with capital letter
    if (!/^[A-Z]/.test(term)) {
      issues.push(term);
      console.log(`  ⚠️  "${term}" - definition doesn't start with capital`);
      return;
    }
    
    // Check 2: Usages must match the defined capitalization
    const termPattern = new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi');
    const lowerTerm = term.toLowerCase();
    let foundIncorrectCase = false;
    
    for (const chunk of nonHeadingChunks) {
      const text = chunk.text;
      let match: RegExpExecArray | null;
      
      while ((match = termPattern.exec(text)) !== null) {
        const foundForm = match[0];
        // If found form doesn't match the defined term exactly (case-sensitive)
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

  // Use definition-aware extraction if definitionSection is available
  // This treats semicolons as sentence terminators within the definition section
  const definitionSection = parsedDocument.definitionSection;

  if (definitionSection) {
    console.log(`📖 Using definition-aware sentence extraction (definition section: ${definitionSection})`);
    const structuredSentences = extractSentencesWithDefinitionAwareness(
      parsedDocument.structure,
      definitionSection
    );
    sentences.push(...structuredSentences);
  } else {
    console.log(`📖 Using standard sentence extraction (no definition section identified)`);
    const structuredSentences = extractSentences(parsedDocument.structure);
    sentences.push(...structuredSentences);
  }

  return sentences;
}

/**
 * Extracts fragments from the parsed document (no parent-child combining).
 * Mirrors extractAllSentences() but uses extractFragments() instead.
 * Each section node's own text is extracted independently.
 */
function extractAllFragments(parsedDocument: ParsedDocument): ExtractedSentence[] {
  const fragments: ExtractedSentence[] = [];

  // Include recitals (same as extractAllSentences)
  if (parsedDocument.recitals && parsedDocument.recitals.trim().length > 0) {
    const recitalLines = parsedDocument.recitals.split('\n');
    recitalLines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        fragments.push({
          sentence: trimmed,
          sectionReference: 'Recitals',
        });
      }
    });
  }

  // Use fragment extraction (no parent-child combining)
  const definitionSection = parsedDocument.definitionSection;
  const structuredFragments = extractFragments(
    parsedDocument.structure,
    definitionSection
  );
  fragments.push(...structuredFragments);

  return fragments;
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
    // Count occurrences including plural variants
    const variants = generatePluralVariants(term);
    let count = 0;
    for (const variant of variants) {
      const termPattern = new RegExp(buildTermSearchPattern(variant), 'g');
      const matches = documentText.match(termPattern);
      count += matches ? matches.length : 0;
    }

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

function findQuotedTermOccurrences(
  fragments: ExtractedSentence[],
  term: string
): TermOccurrence[] {
  const occurrences: TermOccurrence[] = [];
  const escaped = escapeRegex(term);
  const quotePattern = new RegExp(
    `(?:"|\\u201C|'|\\u2018)${escaped}(?:"|\\u201D|'|\\u2019)`
  );

  for (const frag of fragments) {
    if (quotePattern.test(frag.sentence)) {
      const occ: TermOccurrence = {
        sentence: frag.sentence,
        sectionReference: frag.sectionReference,
      };
      if (frag.isInDefinitionSection != null) {
        occ.isInDefinitionSection = frag.isInDefinitionSection;
      }
      occurrences.push(occ);
    }
  }
  return occurrences;
}

function buildDuplicateDefinitionsWithDetails(
  duplicateTermNames: string[],
  fragments: ExtractedSentence[]
): DuplicateDefinition[] {
  const results: DuplicateDefinition[] = [];

  for (const term of duplicateTermNames) {
    const occurrences = findQuotedTermOccurrences(fragments, term);
    if (occurrences.length >= 2) {
      results.push({
        term,
        totalOccurrences: occurrences.length,
        occurrences,
      });
    }
  }

  results.sort((a, b) => b.totalOccurrences - a.totalOccurrences || a.term.localeCompare(b.term));
  return results;
}

function buildUndefinedTermsWithDetails(
  undefinedTermsList: string[],
  sentences: ExtractedSentence[],
  headingTexts: Set<string>
): UndefinedTerm[] {
  console.log('\n=== 📝 Undefined Terms with Sentences ===');
  console.log(`📖 Filtering: occurrences in definition section will be removed (using isInDefinitionSection flag)`);

  const undefinedResults: UndefinedTerm[] = [];
  const skippedAsHeadingRefs: string[] = [];
  const skippedAsDefinitionSection: string[] = [];

  for (const term of undefinedTermsList) {
    const allOccurrences = findTermOccurrences(sentences, term, 5);

    // Check if term matches a heading (case-insensitive)
    const isHeading = headingTexts.has(term.toLowerCase());

    // Filter occurrences: if term matches heading, remove those wrapped in parentheses
    let occurrences = allOccurrences;
    if (isHeading) {
      const parenPattern = new RegExp(`\\(\\s*${escapeRegex(term)}\\s*\\)`, 'i');
      occurrences = allOccurrences.filter(occ => !parenPattern.test(occ.sentence));

      const removedCount = allOccurrences.length - occurrences.length;
      if (removedCount > 0) {
        console.log(`\n📋 "${term}" matches heading - removed ${removedCount} occurrence(s) wrapped in parentheses`);
      }
    }

    // Filter occurrences: remove those in the definition section
    // Uses the isInDefinitionSection flag set during sentence extraction
    if (occurrences.length > 0) {
      const beforeCount = occurrences.length;
      const definitionOccurrences = occurrences.filter(occ => occ.isInDefinitionSection === true);
      occurrences = occurrences.filter(occ => occ.isInDefinitionSection !== true);

      if (definitionOccurrences.length > 0) {
        console.log(`\n📖 "${term}" - removed ${definitionOccurrences.length} occurrence(s) in definition section:`);
        for (const occ of definitionOccurrences) {
          console.log(`   [${occ.sectionReference}] "${occ.sentence.substring(0, 80)}..."`);
        }
        if (occurrences.length === 0) {
          skippedAsDefinitionSection.push(term);
        }
      }
    }

    // Skip this term entirely if all occurrences were filtered out
    if (occurrences.length === 0) {
      if (isHeading && allOccurrences.length > 0) {
        skippedAsHeadingRefs.push(term);
      }
      continue;
    }

    console.log(`\n❌ "${term}" (${occurrences.length} occurrence${occurrences.length !== 1 ? 's' : ''}):`);
    for (const occ of occurrences) {
      console.log(`   [${occ.sectionReference}] "${occ.sentence}"`);
    }

    undefinedResults.push({
      term,
      totalOccurrences: occurrences.length,
      occurrences,
    });
  }

  if (skippedAsHeadingRefs.length > 0) {
    console.log(`\n📋 Skipped ${skippedAsHeadingRefs.length} term(s) entirely (heading refs in parentheses): ${skippedAsHeadingRefs.join(', ')}`);
  }

  if (skippedAsDefinitionSection.length > 0) {
    console.log(`\n📖 Skipped ${skippedAsDefinitionSection.length} term(s) entirely (only in definition section): ${skippedAsDefinitionSection.join(', ')}`);
  }

  undefinedResults.sort((a, b) => b.totalOccurrences - a.totalOccurrences);

  console.log('\n=========================================\n');

  return undefinedResults;
}

function buildInconsistentTermsWithDetails(
  inconsistentTermsList: string[],
  sentences: ExtractedSentence[],
  nonHeadingChunks: TextChunk[],
  definedTermsMap: Map<string, string>
): InconsistentTerm[] {
  console.log('\n=== 🔍 INCONSISTENT TERMS (with sentences) ===');
  const inconsistent: InconsistentTerm[] = [];

  for (const term of inconsistentTermsList) {
    const variations = findCaseVariations(sentences, term, nonHeadingChunks);

    if (variations.length > 1) {
      const totalCount = variations.reduce((sum, v) => sum + v.count, 0);

      // Check if any variation matches a defined term exactly
      let definedForm: string | undefined;
      for (const v of variations) {
        if (definedTermsMap.has(v.variant)) {
          definedForm = v.variant;
          break;
        }
      }

      inconsistent.push({
        term,
        totalOccurrences: totalCount,
        ...(definedForm && { definedForm }),
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

  // Sort by occurrence count (most frequent first)
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
    const expectedForm = term; // The properly capitalized form from defined terms
    const issueDetails: { foundForm: string; sectionReference: string; sentence: string }[] = [];
    
    // Check if definition itself is wrong
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
    
    // Check usages with incorrect capitalization
    const termPattern = new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi');
    const lowerTerm = term.toLowerCase();
    
    for (const extractedSentence of sentences) {
      const text = extractedSentence.sentence;
      let match: RegExpExecArray | null;
      
      while ((match = termPattern.exec(text)) !== null) {
        const foundForm = match[0];
        // If found form doesn't match the defined term exactly (case-sensitive)
        if (foundForm !== term && foundForm.toLowerCase() === lowerTerm) {
          issueDetails.push({
            foundForm,
            sectionReference: extractedSentence.sectionReference,
            sentence: extractedSentence.sentence,
          });
          
          // Limit to first 5 occurrences per term
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
  term: string,
  nonHeadingChunks: TextChunk[]
): { variant: string; count: number; occurrences: TermOccurrence[] }[] {
  // Build search terms: the term itself plus its plural/singular variants
  const searchTerms = generatePluralVariants(term);

  // Step 1: Count each variation accurately using raw document chunks.
  // Extracted sentences can repeat parent text across child sections,
  // which inflates the count. Chunks reflect the actual document text.
  const variationCounts = new Map<string, number>();
  for (const chunk of nonHeadingChunks) {
    for (const searchTerm of searchTerms) {
      const pattern = new RegExp(`\\b${escapeRegex(searchTerm)}\\b`, 'gi');
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(chunk.text)) !== null) {
        const variant = match[0];
        variationCounts.set(variant, (variationCounts.get(variant) || 0) + 1);
      }
    }
  }

  // Step 2: Collect sentence-level occurrences for display, but deduplicate.
  // When multiple extracted sentences share the same parent text containing
  // the term, only keep the first (highest-level) sentence to avoid duplicates.
  const variationsOccurrences = new Map<string, TermOccurrence[]>();
  const seenSentenceFragments = new Map<string, Set<string>>();

  for (const extractedSentence of sentences) {
    const text = extractedSentence.sentence;
    for (const searchTerm of searchTerms) {
      const pattern = new RegExp(`\\b${escapeRegex(searchTerm)}\\b`, 'gi');
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(text)) !== null) {
        const variant = match[0];

        if (!variationsOccurrences.has(variant)) {
          variationsOccurrences.set(variant, []);
          seenSentenceFragments.set(variant, new Set());
        }

        // Deduplicate: extract a context window around the match to identify
        // whether this is the same occurrence repeated across child sentences.
        const contextStart = Math.max(0, match.index - 60);
        const contextEnd = Math.min(text.length, match.index + variant.length + 60);
        const contextKey = text.substring(contextStart, contextEnd);

        const seen = seenSentenceFragments.get(variant)!;
        if (!seen.has(contextKey)) {
          seen.add(contextKey);
          variationsOccurrences.get(variant)!.push({
            sentence: extractedSentence.sentence,
            sectionReference: extractedSentence.sectionReference,
          });
        }
      }
    }
  }

  // Step 3: Build results using chunk-based counts and deduplicated occurrences.
  const allVariants = new Set([
    ...variationCounts.keys(),
    ...variationsOccurrences.keys(),
  ]);

  return Array.from(allVariants)
    .map((variant) => ({
      variant,
      count: variationCounts.get(variant) || 0,
      occurrences: variationsOccurrences.get(variant) || [],
    }))
    .filter(v => v.count > 0)
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
      const occ: TermOccurrence = {
        sentence: extractedSentence.sentence,
        sectionReference: extractedSentence.sectionReference,
      };
      if (extractedSentence.isInDefinitionSection != null) {
        occ.isInDefinitionSection = extractedSentence.isInDefinitionSection;
      }
      occurrences.push(occ);
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

/**
 * Build a regex pattern for searching a term in text.
 * Handles special cases:
 * - Terms ending with non-word chars (like "S$") - don't require trailing \b
 * - Terms starting with non-word chars - don't require leading \b
 * - Currency patterns (like "S$") - allow digits to follow
 *
 * @param term - The term to search for
 * @returns RegExp pattern string (without flags)
 */
function buildTermSearchPattern(term: string): string {
  const escaped = escapeRegex(term);

  // Check if term starts with a word character (letter, digit, underscore)
  const startsWithWord = /^\w/.test(term);
  // Check if term ends with a word character
  const endsWithWord = /\w$/.test(term);

  // Build pattern with appropriate boundaries
  let pattern = escaped;

  if (startsWithWord) {
    pattern = '\\b' + pattern;
  } else {
    // For terms starting with non-word char, use negative lookbehind for word chars
    pattern = '(?<!\\w)' + pattern;
  }

  if (endsWithWord) {
    pattern = pattern + '\\b';
  } else {
    // For terms ending with non-word char (like "S$"), don't require boundary
    // This allows "S$450,000" to match "S$"
    // But still prevent matching in middle of other terms
    // We DON'T add anything - the non-word char itself acts as a natural boundary
  }

  return pattern;
}

// ============================================================================
// HEALTH CHECK (for route monitoring)
// ============================================================================

export function healthCheck(): { status: string; timestamp: string } {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// GENERATE DEFINITION (for undefined terms)
// ============================================================================

export async function generateDefinition(
  request: GenerateDefinitionRequest
): Promise<GenerateDefinitionResult> {
  const { term, occurrences, structure, recitals, definitionSection } = request;

  console.log(`\n📝 Generating definition for "${term}"...`);
  console.log(`   Occurrences provided: ${occurrences.length}`);
  console.log(`   Has recitals: ${!!recitals}`);
  console.log(`   Definition section: ${definitionSection || '(none)'}`);

  try {
    // Build full agreement text for context
    const agreementTree = buildSectionTree(structure);
    const fullAgreementText = recitals
      ? `RECITALS:\n${recitals}\n\nAGREEMENT BODY:\n${agreementTree}`
      : agreementTree;

    // If there's an existing definitions section, extract its text for style matching
    let definitionSectionText = '';
    if (definitionSection) {
      const defNode = findSectionInOutline(normalizeSectionNumber(definitionSection), structure);
      if (defNode) {
        definitionSectionText = buildFullSectionText(defNode);
        console.log(`   Found definition section text (${definitionSectionText.length} chars)`);
      }
    }

    // ========================================================================
    // LLM CALL 1: Generate the definition text
    // ========================================================================

    const occurrencesText = occurrences
      .slice(0, 5)
      .map((occ, i) => `${i + 1}. [${occ.sectionReference}] "${occ.sentence}"`)
      .join('\n');

    const generateSystemPrompt = `You are a legal drafting assistant specialized in contract definitions. You write precise, clear definitions that match the style and conventions of the document.`;

    const generateUserPrompt = `You are drafting a definition for the undefined term "${term}" in a legal agreement.

Here are up to 5 occurrences of the term in the document, showing how it is used:
${occurrencesText}

Here is the full agreement text for context:
${fullAgreementText}
${definitionSectionText ? `\nHere is the existing definitions section for style reference:\n${definitionSectionText}` : ''}

Write a definition for "${term}" that:
1. Matches the style and formatting conventions used in this agreement
2. Is consistent with how the term is used throughout the document
3. Uses the standard format: "${term}" means [definition text];
4. If the existing definitions use quotation marks (e.g. "Term" means...), follow the same quoting style

Return your response as a JSON object:
{
  "definitionText": "\"${term}\" means [your definition here];"
}`;

    console.log('   🤖 LLM Call 1: Generating definition text...');
    console.log('   === LLM CALL 1 SYSTEM PROMPT ===');
    console.log(generateSystemPrompt);
    console.log('   === LLM CALL 1 USER PROMPT ===');
    console.log(generateUserPrompt);
    console.log('   === END LLM CALL 1 PROMPTS ===');

    const generateResponse = await generateTextWithJsonParsing(
      generateSystemPrompt,
      generateUserPrompt
    );

    console.log('   === LLM CALL 1 FULL RESPONSE ===');
    console.log(JSON.stringify(generateResponse, null, 2));
    console.log('   === END LLM CALL 1 RESPONSE ===');

    const definitionText = generateResponse.definitionText;
    if (!definitionText) {
      return {
        status: 'error',
        definitionText: '',
        originalText: '',
        amendedText: '',
        sectionNumber: '',
        errorMessage: 'LLM did not return a definition text',
      };
    }

    console.log(`   ✅ Generated definition: "${definitionText}"`);

    // ========================================================================
    // LLM CALL 2: Map definition to document location
    // ========================================================================

    const outlineText = buildSectionTree(structure);

    const mapSystemPrompt = `You are a legal document structure analyst. You determine where to insert new definitions in a legal agreement.`;

    // Determine the section of the first occurrence (used as fallback insertion point)
    const firstOccurrenceSection = occurrences[0]?.sectionReference
      ?.replace(/^Section\s+/i, '').replace(/[.,;]$/, '') || '';

    const mapUserPrompt = `You need to determine where to insert a new definition in a legal agreement.

The definition to insert:
${definitionText}

Here is the document outline:
${outlineText}
${definitionSection ? `\nThe document already has a definitions section at: Section ${definitionSection}` : '\nThe document does NOT have an existing definitions section.'}
${definitionSectionText ? `\nExisting definitions section content:\n${definitionSectionText}` : ''}

The term first appears in: ${occurrences[0]?.sectionReference || 'unknown'}

Determine where this definition should be inserted:

Option A - If there IS an existing definitions section:
- Insert into that section
- Place the definition in ALPHABETICAL ORDER among existing definitions
- Specify the text of the definition AFTER which the new definition should be inserted (for alphabetical placement)
- Return: { "insertionType": "existing_section", "sectionNumber": "${definitionSection || ''}", "insertAfterText": "[the full text of the definition that comes before alphabetically]" }
- If the new definition should come FIRST (alphabetically before all existing definitions), set insertAfterText to ""

Option B - If there is NO existing definitions section:
- Insert the definition at the BEGINNING of the section where the term first appears (Section ${firstOccurrenceSection})
- The definition should be prepended before the existing content of that section
- Return: { "insertionType": "existing_section", "sectionNumber": "${firstOccurrenceSection}", "insertAfterText": "" }

Return ONLY the JSON object, no other text.`;

    console.log('   🤖 LLM Call 2: Mapping definition to document location...');
    console.log('   === LLM CALL 2 SYSTEM PROMPT ===');
    console.log(mapSystemPrompt);
    console.log('   === LLM CALL 2 USER PROMPT ===');
    console.log(mapUserPrompt);
    console.log('   === END LLM CALL 2 PROMPTS ===');

    const mapResponse = await generateTextWithJsonParsing(
      mapSystemPrompt,
      mapUserPrompt
    );

    console.log('   === LLM CALL 2 FULL RESPONSE ===');
    console.log(JSON.stringify(mapResponse, null, 2));
    console.log('   === END LLM CALL 2 RESPONSE ===');

    // ========================================================================
    // Build original/amended text based on insertion type
    // ========================================================================

    if (mapResponse.insertionType === 'existing_section') {
      const rawTargetSectionNumber = mapResponse.sectionNumber || definitionSection;
      if (!rawTargetSectionNumber) {
        return {
          status: 'error',
          definitionText,
          originalText: '',
          amendedText: '',
          sectionNumber: '',
          errorMessage: 'Could not determine target section number',
        };
      }
      const targetSectionNumber = normalizeSectionNumber(rawTargetSectionNumber);

      const targetSection = findSectionInOutline(targetSectionNumber, structure);
      if (!targetSection) {
        return {
          status: 'error',
          definitionText,
          originalText: '',
          amendedText: '',
          sectionNumber: targetSectionNumber,
          errorMessage: `Section ${targetSectionNumber} not found in document`,
        };
      }

      // Use buildSectionTextWithChildren (no section number prefix) so the text
      // matches what Word's document.body.search() can find. buildFullSectionText
      // prepends "1.1." etc. which are auto-numbered list items in Word, not searchable text.
      const originalText = buildSectionTextWithChildren(targetSection);
      let amendedText: string;

      if (mapResponse.insertAfterText && mapResponse.insertAfterText.trim().length > 0) {
        // Insert after the specified text (alphabetical placement)
        const insertAfter = mapResponse.insertAfterText.trim();
        const insertionIndex = originalText.indexOf(insertAfter);

        if (insertionIndex >= 0) {
          const insertPoint = insertionIndex + insertAfter.length;
          // Find the end of the line after the insertion point
          const nextNewline = originalText.indexOf('\n', insertPoint);
          const actualInsertPoint = nextNewline >= 0 ? nextNewline : insertPoint;
          amendedText =
            originalText.substring(0, actualInsertPoint) +
            '\n' + definitionText +
            originalText.substring(actualInsertPoint);
        } else {
          // Fallback: append at the end of the section
          console.log('   ⚠️ Could not find insertAfterText, appending at end');
          amendedText = originalText + '\n' + definitionText;
        }
      } else {
        // Insert at the beginning of the section content (before all definitions)
        // Find the first newline after the section heading to insert after it
        const firstNewline = originalText.indexOf('\n');
        if (firstNewline >= 0) {
          amendedText =
            originalText.substring(0, firstNewline) +
            '\n' + definitionText +
            originalText.substring(firstNewline);
        } else {
          amendedText = originalText + '\n' + definitionText;
        }
      }

      console.log('   === EXISTING SECTION RESULT ===');
      console.log(`   Target section: ${targetSectionNumber}`);
      console.log(`   insertAfterText from LLM: ${JSON.stringify(mapResponse.insertAfterText || '')}`);
      console.log(`   Original text (${originalText.length} chars):`);
      console.log(originalText);
      console.log(`   Amended text (${amendedText.length} chars):`);
      console.log(amendedText);
      console.log('   === END EXISTING SECTION RESULT ===');

      return {
        status: 'amended',
        definitionText,
        originalText,
        amendedText,
        sectionNumber: targetSectionNumber,
      };
    }

    if (mapResponse.insertionType === 'new_section') {
      const suggestedLocation = mapResponse.suggestedLocation || '';
      const suggestedHeading = mapResponse.suggestedHeading || 'Definitions';

      // Parse section number from "After Section X" and normalize trailing dot
      const locationMatch = suggestedLocation.match(/After Section\s+([\d.A-Za-z]+)/i);
      const rawPreviousSectionNum = locationMatch?.[1];

      if (!rawPreviousSectionNum) {
        return {
          status: 'error',
          definitionText,
          originalText: '',
          amendedText: '',
          sectionNumber: '',
          errorMessage: `Could not parse section number from: ${suggestedLocation}`,
        };
      }
      const previousSectionNum = normalizeSectionNumber(rawPreviousSectionNum);

      const previousSection = findSectionInOutline(previousSectionNum, structure);
      if (!previousSection) {
        return {
          status: 'error',
          definitionText,
          originalText: '',
          amendedText: '',
          sectionNumber: previousSectionNum,
          errorMessage: `Previous section ${previousSectionNum} not found in document`,
        };
      }

      // Use buildSectionTextWithChildren (no section number prefix) — same as Module 2.
      const originalText = buildSectionTextWithChildren(previousSection);
      // amendedText is ONLY the new content to insert (not concatenated with original).
      // The frontend uses originalText to locate the insertion point, then inserts
      // amendedText after it — matching how Module 2 handles new sections.
      const amendedText = suggestedHeading + '\n' + definitionText;

      console.log('   === NEW SECTION RESULT ===');
      console.log(`   Insert after section: ${previousSectionNum}`);
      console.log(`   Suggested heading: ${suggestedHeading}`);
      console.log(`   Original text (${originalText.length} chars) — used to locate insertion point:`);
      console.log(originalText);
      console.log(`   Amended text (${amendedText.length} chars) — new content to insert:`);
      console.log(amendedText);
      console.log('   === END NEW SECTION RESULT ===');

      return {
        status: 'new_section',
        definitionText,
        originalText,
        amendedText,
        sectionNumber: suggestedLocation,
        suggestedHeading,
      };
    }

    return {
      status: 'error',
      definitionText,
      originalText: '',
      amendedText: '',
      sectionNumber: '',
      errorMessage: `Unknown insertion type: ${mapResponse.insertionType}`,
    };
  } catch (error) {
    console.error(`❌ Error generating definition for "${term}":`, error);
    return {
      status: 'error',
      definitionText: '',
      originalText: '',
      amendedText: '',
      sectionNumber: '',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// RESOLVE DUPLICATE DEFINITIONS (LLM)
// ============================================================================

export async function resolveDuplicateDefinitions(
  request: ResolveDuplicatesRequest
): Promise<ResolveDuplicatesResult> {
  const { term, occurrences, structure, recitals, previousAmendments } = request;

  const isRerun = previousAmendments && previousAmendments.length > 0;
  console.log(`\n📝 ${isRerun ? 'Re-running' : 'Resolving'} duplicate definitions for "${term}"...`);
  console.log(`   Occurrences provided: ${occurrences.length}`);
  if (isRerun) {
    console.log(`   Previous amendments: ${previousAmendments.length}`);
  }

  try {
    // Build the agreement text for context
    const agreementTree = buildSectionTree(structure);
    const fullAgreementText = recitals
      ? `RECITALS:\n${recitals}\n\nAGREEMENT BODY:\n${agreementTree}`
      : agreementTree;

    // Format the duplicate occurrences for the prompt
    const occurrencesText = occurrences
      .map((occ, i) => `${i + 1}. [${occ.sectionReference}] "${occ.sentence}"`)
      .join('\n');

    let systemPrompt: string;
    let userPrompt: string;

    if (isRerun) {
      // Re-run prompt - ask for different interpretation
      const previousAmendmentsText = previousAmendments
        .map((a, i) => `${i + 1}. [${a.sectionReference}]\n   Original: "${a.originalText}"\n   Amended: "${a.amendedText}"`)
        .join('\n\n');

      systemPrompt = `You are a legal drafting assistant specializing in resolving duplicate definitions in contracts. The user is NOT satisfied with your previous suggestions and wants you to try a DIFFERENT approach.`;

      userPrompt = `The term "${term}" is defined (appears in quotation marks) ${occurrences.length} times in this legal agreement. The user previously asked you to resolve these duplicates, but is NOT satisfied with your suggestions. Please try a DIFFERENT approach.

Here are all the places where "${term}" is defined (appears in quotes):
${occurrencesText}

Here is the full agreement text for context:
${fullAgreementText}

## PREVIOUS SUGGESTIONS (User is NOT satisfied with these):
${previousAmendmentsText}

## TASK

Generate NEW amendments with a DIFFERENT approach. Consider:

1. **If you previously kept one definition and removed others:**
   - Consider keeping a DIFFERENT definition instead
   - Or consider merging/consolidating definitions differently

2. **If your previous revisions were extensive:**
   - Consider more minimal changes that just remove the quotes
   - Or consider restructuring the sentence differently

3. **Alternative interpretations:**
   - Is there a different way to revise each sentence?
   - Could you preserve more of the original wording?
   - Could you be more aggressive in simplifying?

Instructions:
1. Generate suggestions that are DIFFERENT from your previous ones.
2. When removing a duplicate definition, revise the sentence so it reads naturally.
3. Only return entries for sentences that need revision. Do NOT return unchanged sentences.

Return a JSON object with this structure:
{
  "amendments": [
    {
      "sectionReference": "[the section reference exactly as provided above]",
      "originalText": "[the exact original sentence fragment as provided above, copied verbatim]",
      "amendedText": "[the revised sentence with a DIFFERENT approach than before]"
    }
  ]
}

If no changes are needed, return: { "amendments": [] }`;
    } else {
      // Initial run prompt
      systemPrompt = `You are a legal drafting assistant specializing in resolving duplicate definitions in contracts. When a term is defined more than once in a contract, you determine which definitions to keep and which to remove, then produce revised sentence fragments.`;

      userPrompt = `The term "${term}" is defined (appears in quotation marks) ${occurrences.length} times in this legal agreement. Having multiple definitions for the same term creates ambiguity. Please analyze the duplicates and suggest how to remove the redundancy.

Here are all the places where "${term}" is defined (appears in quotes):
${occurrencesText}

Here is the full agreement text for context:
${fullAgreementText}

Instructions:
1. Decide which definition(s) to keep and which to remove or revise.
2. Typically, keep the definition in the Definitions section (if one exists) and remove the duplicate definitions elsewhere. If the term is not in a Definitions section, keep the most comprehensive definition and remove the others.
3. When removing a duplicate definition from a sentence, revise the sentence so it still reads naturally — for example, replace the quoted defined term with a simple reference to the term (without quotes), or restructure the sentence. Do NOT simply delete the sentence; revise it to remove only the definition while preserving the substantive content.
4. Only return entries for sentences that need to be revised. Do NOT return sentences that should stay unchanged.

Return a JSON object with this structure:
{
  "amendments": [
    {
      "sectionReference": "[the section reference exactly as provided above]",
      "originalText": "[the exact original sentence fragment as provided above, copied verbatim]",
      "amendedText": "[the revised sentence with the duplicate definition removed]"
    }
  ]
}

If no changes are needed (e.g., the duplicates are actually necessary cross-references), return:
{ "amendments": [] }`;
    }

    console.log(`   🤖 LLM Call: ${isRerun ? 'Re-running' : 'Resolving'} duplicate definitions...`);
    console.log('   === RESOLVE DUPLICATES SYSTEM PROMPT ===');
    console.log(systemPrompt);
    console.log('   === RESOLVE DUPLICATES USER PROMPT ===');
    console.log(userPrompt);
    console.log('   === END RESOLVE DUPLICATES PROMPTS ===');

    const response = await generateTextWithJsonParsing(
      systemPrompt,
      userPrompt
    );

    console.log('   === RESOLVE DUPLICATES FULL LLM RESPONSE ===');
    console.log(JSON.stringify(response, null, 2));
    console.log('   === END RESOLVE DUPLICATES RESPONSE ===');

    if (!response.amendments || !Array.isArray(response.amendments)) {
      console.log('   ⚠️ LLM returned unexpected format');
      return {
        status: 'error',
        term,
        amendments: [],
        errorMessage: 'LLM did not return amendments in the expected format',
      };
    }

    // Validate and clean amendments
    const amendments: ResolveDuplicateAmendment[] = [];
    for (const amendment of response.amendments) {
      if (!amendment.sectionReference || !amendment.originalText || !amendment.amendedText) {
        console.log('   ⚠️ Skipping invalid amendment:', amendment);
        continue;
      }
      // Skip if original and amended are identical
      if (amendment.originalText.trim() === amendment.amendedText.trim()) {
        console.log(`   ⚠️ Skipping no-op amendment for [${amendment.sectionReference}]`);
        continue;
      }
      amendments.push({
        sectionReference: amendment.sectionReference,
        originalText: amendment.originalText,
        amendedText: amendment.amendedText,
      });
    }

    console.log(`   ✅ ${isRerun ? 'Re-run' : 'Resolved'}: ${amendments.length} amendment(s) for "${term}"`);

    return {
      status: 'success',
      term,
      amendments,
    };
  } catch (error) {
    console.error(`❌ Error resolving duplicates for "${term}":`, error);
    return {
      status: 'error',
      term,
      amendments: [],
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}