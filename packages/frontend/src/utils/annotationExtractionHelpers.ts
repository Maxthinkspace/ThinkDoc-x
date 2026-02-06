import type {
  DocumentNodeWithRange,
  SentenceWithSource,
  SentenceSourceComponent,
  TextToken,
} from '@/src/types/documents';

/**
 * Token with its position in the combined text
 */
export interface TokenWithPosition {
  text: string;
  status: 'unchanged' | 'inserted' | 'deleted';
  startPos: number;  // Start position in combined text (paragraph-level)
  endPos: number;    // End position in combined text (paragraph-level, exclusive)
  docStartOffset?: number;  // Document-level start offset
  docEndOffset?: number;    // Document-level end offset
}

/**
 * Fragment within a sentence (for full-sentence detection)
 */
export interface SentenceFragment {
  text: string;
  normalizedText: string;
  startPos: number;
  endPos: number;
  sectionNumber: string;
  isComplete: boolean;  // True if ends with sentence-ending punctuation
}

/**
 * Sentence extracted from combined text with token mappings
 */
export interface SentenceWithTokens {
  id: string;
  combinedText: string;           // Full sentence including all tokens
  originalText: string;           // unchanged + deleted
  amendedText: string;            // unchanged + inserted
  tokens: TokenWithPosition[];    // Tokens belonging to this sentence
  fragments: SentenceFragment[];  // Fragment boundaries for full-sentence detection
  sectionNumber: string;
  topLevelSectionNumber: string;
  sentenceBoundaryPos: number;    // Position of sentence-ending punctuation in combined text
}

export interface ChangeSpan {
  text: string;
  startOffset: number;
  endOffset: number;
}

/**
 * Result of sentence-based change detection
 */
export interface SentenceChangeResult {
  sentenceId: string;
  sectionNumber: string;
  topLevelSectionNumber: string;
  originalText: string;
  amendedText: string;
  changeType: 'unchanged' | 'word-level' | 'full-sentence-deletion' | 'full-sentence-insertion';
  deletions: ChangeSpan[];
  insertions: ChangeSpan[];
  // For full-sentence changes, which fragment was affected
  affectedFragment?: SentenceFragment;
}

// ============================================================================
// SENTENCE EXTRACTION HELPERS
// ============================================================================

/**
 * Common abbreviations that don't end sentences
 */
export const COMMON_ABBREVIATIONS = new Set([
  'ltd', 'inc', 'corp', 'co', 'llc', 'llp', 'plc', 'pte', 'pty', 'gmbh',
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'esq',
  'etc', 'i.e', 'ie', 'e.g', 'eg', 'vs', 'v', 'cf',
  'st', 'ave', 'rd', 'blvd', 'u.s', 'us', 'u.k', 'uk',
  'ph.d', 'phd', 'm.d', 'md', 'mba',
  'fig', 'no', 'nos', 'vol', 'p', 'pp', 'dept', 'art', 'sec', 'para'
]);

export const MULTI_DOT_ABBREVIATIONS = [
  'i.e.', 'e.g.', 'a.m.', 'p.m.', 'ph.d.', 'u.s.', 'u.k.'
];

/**
 * Extract sentences from text
 */
export function extractCompleteSentencesAndIncomplete(text: string): {
  complete: string[];
  incomplete: string | null;
} {
  const complete: string[] = [];
  let currentSentence = '';
  
  for (let i = 0; i < text.length; i++) {
    currentSentence += text[i];
    
    if (isSentenceEndingPeriod(text, i)) {
      const trimmed = currentSentence.trim();
      if (trimmed) {
        complete.push(trimmed);
      }
      currentSentence = '';
    }
  }
  
  const incomplete = currentSentence.trim() || null;
  return { complete, incomplete };
}

/**
 * Check if period at position ends a sentence
 */
export function isSentenceEndingPeriod(text: string, index: number): boolean {
  const char = text[index];
  if (char !== '.' && char !== '。') return false;
  
  const prevChar = index > 0 ? text[index - 1] : null;
  const nextChar = index + 1 < text.length ? text[index + 1] : null;
  const charAfterNext = index + 2 < text.length ? text[index + 2] : null;
  
  // Ellipsis
  if (prevChar === '.' || nextChar === '.') {
    return index >= text.length - 3;
  }
  
  // Decimal
  if (nextChar && /\d/.test(nextChar)) return false;
  
  // Check multi-dot abbreviations
  for (const abbrev of MULTI_DOT_ABBREVIATIONS) {
    const startPos = index - abbrev.length + 1;
    if (startPos >= 0) {
      const candidate = text.substring(startPos, index + 1).toLowerCase();
      if (candidate === abbrev.toLowerCase()) {
        if (nextChar === ' ' && charAfterNext && /[A-Z]/.test(charAfterNext)) {
          return true;
        }
        return false;
      }
    }
  }
  
  // Extract word before period
  let wordStart = index - 1;
  let wordBefore = '';
  while (wordStart >= 0 && wordStart > index - 15) {
    const c = text[wordStart];
    if (!c || /[\s,;:()\[\]{}]/.test(c)) break;
    wordBefore = c + wordBefore;
    wordStart--;
  }
  
  if (wordBefore && COMMON_ABBREVIATIONS.has(wordBefore.toLowerCase())) {
    return false;
  }
  
  // Period + space + capital = new sentence
  if (nextChar === ' ' && charAfterNext && /[A-Z]/.test(charAfterNext)) {
    return true;
  }
  
  // End of text
  if (!nextChar) return true;
  
  return nextChar === ' ' || nextChar === '\n';
}

// ============================================================================
// SENTENCE EXTRACTION WITH SOURCE TRACKING
// ============================================================================

/**
 * Extract sentences from the document with source component tracking
 */
export function extractAllSentencesWithSources(
  structure: DocumentNodeWithRange[],
  _debugLabel: string = 'unknown'
): SentenceWithSource[] {
  const allSentences: SentenceWithSource[] = [];
  
  for (const topLevelNode of structure) {
    const topLevelSectionNumber = topLevelNode.sectionNumber;
    let sentenceCounter = 0;
    
    const nodeSentences = extractNodeSentencesWithSources(
      topLevelNode,
      topLevelSectionNumber,
      '',
      []
    );
    
    for (const sentence of nodeSentences) {
      sentenceCounter++;
      allSentences.push({
        ...sentence,
        id: `${topLevelSectionNumber.replace(/\.$/, '')}-s${sentenceCounter}`,
        topLevelSectionNumber,
      });
    }
  }
  
  // // DEBUG 3.1: ALL sentences with label
  // console.log(`[DEBUG 3.1] === SENTENCE EXTRACTION [${debugLabel}] ===`);
  // console.log(`[DEBUG 3.1] Total sentences: ${allSentences.length}`);
  // console.log(`[DEBUG 3.1] Top-level sections in structure: ${structure.map(n => n.sectionNumber).join(', ')}`);
  
  // for (const s of allSentences) {
  //   console.log(`[DEBUG 3.1] [${s.id}] section=${s.sectionNumber} topLevel=${s.topLevelSectionNumber}`);
  //   console.log(`[DEBUG 3.1]   text: "${s.sentence}"`);
  //   console.log(`[DEBUG 3.1]   sourceComponents (${s.sourceComponents.length}):`);
  //   for (const comp of s.sourceComponents) {
  //     console.log(`[DEBUG 3.1]     L${comp.level} [${comp.sectionNumber}] isParent=${comp.isFromParent} "${comp.textFragment}"`);
  //   }
  // }
  
  // console.log(`[DEBUG 3.1] === END [${debugLabel}] ===`);
  
  return allSentences;
}

/**
 * Recursively extract sentences from a node with source tracking and offset tracking
 */
export function extractNodeSentencesWithSources(
  node: DocumentNodeWithRange,
  topLevelSectionNumber: string,
  inheritedText: string,
  inheritedComponents: SentenceSourceComponent[],
  nodeTextStartOffsetInSection: number = 0  // Track where node text starts in section
): Omit<SentenceWithSource, 'id' | 'topLevelSectionNumber'>[] {
  const results: Omit<SentenceWithSource, 'id' | 'topLevelSectionNumber'>[] = [];
  const nodeText = getNodeText(node);
  
  const combinedText = inheritedText 
    ? inheritedText + ' ' + nodeText 
    : nodeText;
  
  const { complete, incomplete } = extractCompleteSentencesAndIncomplete(combinedText);
  
  // Calculate cumulative length from inherited components
  const inheritedCumulativeLength = inheritedComponents.reduce(
    (sum, c) => sum + c.textFragment.length + 1, // +1 for space separator
    0
  );
  
  let inheritedUsed = false;
  let processedLengthInNode = 0;
  
  // Process complete sentences
  for (let i = 0; i < complete.length; i++) {
    const sentenceText = complete[i];
    const isFirstSentence = i === 0 && inheritedComponents.length > 0;
    
    if (isFirstSentence && !inheritedUsed) {
      // First sentence combines inherited + node contribution
      const nodeContribution = inheritedText 
        ? sentenceText.substring(inheritedText.length).trim()
        : sentenceText;
      
      // Build components with proper offsets
      let cumulativeOffset = 0;
      const componentsWithOffsets: SentenceSourceComponent[] = [];
      
      // Add inherited components with their offsets
      for (const comp of inheritedComponents) {
        componentsWithOffsets.push({
          ...comp,
          isFromParent: true,
          cumulativeStartOffset: cumulativeOffset,
          sectionStartOffset: comp.sectionStartOffset,
          sectionEndOffset: comp.sectionEndOffset,
        });
        cumulativeOffset += comp.textFragment.length + 1; // +1 for space
      }
      
      // Add current node's contribution
      if (nodeContribution) {
        componentsWithOffsets.push({
          sectionNumber: node.sectionNumber,
          level: node.level,
          textFragment: nodeContribution,
          isFromParent: false,
          cumulativeStartOffset: cumulativeOffset,
          sectionStartOffset: nodeTextStartOffsetInSection,
          sectionEndOffset: nodeTextStartOffsetInSection + nodeContribution.length,
        });
      }
      
      results.push({
        sentence: sentenceText,
        sectionNumber: node.sectionNumber,
        sourceComponents: componentsWithOffsets,
      });
      
      processedLengthInNode = nodeContribution.length;
      inheritedUsed = true;
    } else {
      // Sentence entirely from this node
      const sentenceStartInNode = nodeText.indexOf(sentenceText, processedLengthInNode > 0 ? processedLengthInNode : 0);
      const actualStart = sentenceStartInNode >= 0 ? sentenceStartInNode : processedLengthInNode;
      
      results.push({
        sentence: sentenceText,
        sectionNumber: node.sectionNumber,
        sourceComponents: [{
          sectionNumber: node.sectionNumber,
          level: node.level,
          textFragment: sentenceText,
          isFromParent: false,
          cumulativeStartOffset: 0,
          sectionStartOffset: nodeTextStartOffsetInSection + actualStart,
          sectionEndOffset: nodeTextStartOffsetInSection + actualStart + sentenceText.length,
        }],
      });
      
      processedLengthInNode = actualStart + sentenceText.length;
      inheritedUsed = true;
    }
  }
  
  // Handle incomplete text
  if (incomplete) {
    const incompleteStartInNode = inheritedUsed 
      ? nodeText.lastIndexOf(incomplete)
      : 0;
    const actualIncompleteStart = incompleteStartInNode >= 0 ? incompleteStartInNode : processedLengthInNode;
    
    // Calculate cumulative offset for the new component
    let cumulativeForNew = 0;
    if (!inheritedUsed && inheritedComponents.length > 0) {
      cumulativeForNew = inheritedComponents.reduce(
        (sum, c) => sum + c.textFragment.length + 1, 
        0
      );
    }
    
    const newInheritedComponents: SentenceSourceComponent[] = [
      ...(inheritedUsed ? [] : inheritedComponents.map((c, idx) => {
        const prevCumulative = inheritedComponents.slice(0, idx).reduce(
          (sum, prev) => sum + prev.textFragment.length + 1, 
          0
        );
        return { 
          ...c, 
          isFromParent: true,
          cumulativeStartOffset: c.cumulativeStartOffset ?? prevCumulative,
          sectionStartOffset: c.sectionStartOffset,
          sectionEndOffset: c.sectionEndOffset,
        };
      })),
      {
        sectionNumber: node.sectionNumber,
        level: node.level,
        textFragment: inheritedUsed ? incomplete : nodeText,
        isFromParent: false,
        cumulativeStartOffset: cumulativeForNew,
        sectionStartOffset: nodeTextStartOffsetInSection + actualIncompleteStart,
        sectionEndOffset: nodeTextStartOffsetInSection + actualIncompleteStart + (inheritedUsed ? incomplete.length : nodeText.length),
      }
    ];
    
    const newInheritedText = inheritedUsed 
      ? incomplete 
      : (inheritedText ? inheritedText + ' ' + nodeText : nodeText);
    
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childResults = extractNodeSentencesWithSources(
          child,
          topLevelSectionNumber,
          newInheritedText,
          newInheritedComponents,
          0  // Child starts at offset 0 in its own section
        );
        results.push(...childResults);
      }
    } else {
      results.push({
        sentence: newInheritedText,
        sectionNumber: node.sectionNumber,
        sourceComponents: newInheritedComponents,
      });
    }
  } else if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const childResults = extractNodeSentencesWithSources(
        child,
        topLevelSectionNumber,
        '',
        [],
        0
      );
      results.push(...childResults);
    }
  }
  
  return results;
}

// ============================================================================
// UTILITY HELPERS
// ============================================================================

/**
 * Get text content from a node (uses combined text for track change mapping)
 */
export function getNodeText(node: DocumentNodeWithRange): string {
  // Use combinedText (includes both insertions and deletions) for annotation mapping
  let text = node.combinedText || node.text || '';
  const additionalParas = node.combinedAdditionalParagraphs || node.additionalParagraphs || [];
  if (additionalParas.length > 0) {
    text += ' ' + additionalParas.join(' ');
  }
  return text.trim();
}

/**
 * Get ORIGINAL text content from a node (for track change comparison)
 */
export function getNodeOriginalText(node: DocumentNodeWithRange): string {
  let text = node.originalText || node.text || '';
  if (node.originalAdditionalParagraphs && node.originalAdditionalParagraphs.length > 0) {
    text += ' ' + node.originalAdditionalParagraphs.join(' ');
  } else if (node.additionalParagraphs && node.additionalParagraphs.length > 0) {
    // Fallback to amended if original not available
    text += ' ' + node.additionalParagraphs.join(' ');
  }
  return text.trim();
}

/**
 * Extract ORIGINAL sentences from parsed structure
 * Uses originalText instead of text, but same structure/indices
 */
export function extractOriginalSentencesFromStructure(
  structure: DocumentNodeWithRange[]
): Map<string, string[]> {
  const sentenceMap = new Map<string, string[]>();
  
  function processNode(node: DocumentNodeWithRange) {
    const originalText = getNodeOriginalText(node);
    const { complete } = extractCompleteSentencesAndIncomplete(originalText);
    
    const normalizedKey = node.sectionNumber.replace(/\.+$/, '') + '.';
    const existing = sentenceMap.get(normalizedKey) || [];
    sentenceMap.set(normalizedKey, [...existing, ...complete]);
    
    if (node.children) {
      for (const child of node.children) {
        processNode(child);
      }
    }
  }
  
  for (const topNode of structure) {
    processNode(topNode);
  }
  
  return sentenceMap;
}

/**
 * Get top-level section number from any section number
 */
export function getTopLevelSectionNumber(sectionNumber: string): string {
  const match = sectionNumber.match(/^(\d+)\./);
  return match ? match[0] : sectionNumber;
}

// ============================================================================
// TEXT MATCHING HELPERS (used by commentExtractor)
// ============================================================================

/**
 * Normalize text for comparison
 * Removes extra whitespace and lowercases
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize text for fragment matching
 * Trims whitespace and normalizes internal spaces
 */
export function normalizeFragmentText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two texts have significant word overlap
 * Returns true if at least 50% of the shorter text's words are found in the longer text
 */
export function hasSignificantOverlap(text1: string, text2: string): boolean {
  const words1 = extractSignificantWords(text1);
  const words2 = new Set(extractSignificantWords(text2));
  
  if (words1.length === 0) return false;
  
  let matchCount = 0;
  for (const word of words1) {
    if (words2.has(word)) {
      matchCount++;
    }
  }
  
  // Require at least 50% overlap and at least 3 matching words
  const overlapRatio = matchCount / words1.length;
  return overlapRatio >= 0.5 && matchCount >= 3;
}

/**
 * Extract significant words (length > 2) from text
 */
export function extractSignificantWords(text: string): string[] {
  return text
    .split(/\s+/)
    .filter(word => word.length > 2)
    .map(word => word.replace(/[.,;:!?()[\]{}'"]/g, ''));
}

/**
 * Count common words between two strings
 */
export function countCommonWords(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  let count = 0;
  for (const word of words1) {
    if (words2.has(word)) {
      count++;
    }
  }
  return count;
}

// ============================================================================
// FLAT DOCUMENT SENTENCE EXTRACTION
// ============================================================================

/**
 * Extract sentences from flat document structure
 * Each paragraph is a section - no inheritance, no parent tracking
 */
export function extractFlatDocumentSentences(
  structure: DocumentNodeWithRange[],
  _debugLabel: string = 'unknown'
): SentenceWithSource[] {
  const allSentences: SentenceWithSource[] = [];

  for (const node of structure) {
    const nodeText = node.text || '';
    const { complete, incomplete } = extractCompleteSentencesAndIncomplete(nodeText);
    
    // All sentences (complete + incomplete remainder) belong to this section
    const allNodeSentences = [...complete];
    if (incomplete) {
      allNodeSentences.push(incomplete);
    }

    let currentOffsetInSection = 0;
    for (let i = 0; i < allNodeSentences.length; i++) {
      const sentenceText = allNodeSentences[i];
      // Find where this sentence starts in the node text
      const sentenceStartInNode = nodeText.indexOf(sentenceText, currentOffsetInSection);
      const actualStart = sentenceStartInNode >= 0 ? sentenceStartInNode : currentOffsetInSection;
      
      allSentences.push({
        id: `${node.sectionNumber.replace(/\.$/, '')}-s${i + 1}`,
        sentence: sentenceText,
        sectionNumber: node.sectionNumber,
        topLevelSectionNumber: node.sectionNumber, // Same as section for flat docs
        sourceComponents: [{
          sectionNumber: node.sectionNumber,
          level: 1,
          textFragment: sentenceText,
          isFromParent: false,
          cumulativeStartOffset: 0,  // Single-section sentence, starts at 0
          sectionStartOffset: actualStart,
          sectionEndOffset: actualStart + sentenceText.length,
        }],
      });
      
      currentOffsetInSection = actualStart + sentenceText.length;
    }
  }

  // // DEBUG 3.3: Flat document sentences
  // console.log(`[DEBUG 3.3] === FLAT SENTENCE EXTRACTION [${debugLabel}] ===`);
  // console.log(`[DEBUG 3.3] Total sections: ${structure.length}`);
  // console.log(`[DEBUG 3.3] Total sentences: ${allSentences.length}`);
  // for (const s of allSentences) {
  //   console.log(`[DEBUG 3.3] [${s.id}] section=${s.sectionNumber}`);
  //   console.log(`[DEBUG 3.3]   text: "${s.sentence.substring(0, 100)}..."`);
  // }
  // console.log(`[DEBUG 3.3] === END FLAT SENTENCES [${debugLabel}] ===`);

  return allSentences;
}

/**
 * Extract ORIGINAL sentences from flat document structure
 */
export function extractFlatDocumentOriginalSentences(
  structure: DocumentNodeWithRange[]
): Map<string, string[]> {
  const sentenceMap = new Map<string, string[]>();

  for (const node of structure) {
    const originalText = node.originalText || node.text || '';
    const { complete, incomplete } = extractCompleteSentencesAndIncomplete(originalText);
    
    const allSentences = [...complete];
    if (incomplete) {
      allSentences.push(incomplete);
    }

    const normalizedKey = node.sectionNumber.replace(/\.+$/, '') + '.';
    sentenceMap.set(normalizedKey, allSentences);
  }

  return sentenceMap;
}

/**
 * Result of token-based sentence extraction
 */
export interface SentenceWithChanges {
  id: string;
  originalSentence: string;    // unchanged + deleted
  amendedSentence: string;     // unchanged + inserted
  deletions: string[];
  insertions: string[];
  sectionNumber: string;
  topLevelSectionNumber: string;
}

/**
 * Segment tokens into sentences based on ORIGINAL text boundaries.
 * Returns sentences with their track changes properly attributed.
 */
export function segmentTokensIntoSentences(
  tokens: TextToken[],
  sectionNumber: string,
  topLevelSectionNumber: string
): SentenceWithChanges[] {
  if (tokens.length === 0) return [];
  
  const results: SentenceWithChanges[] = [];
  let currentTokens: TextToken[] = [];
  let sentenceCounter = 0;
  
  // Build position map: for each char in original text, which token index?
  // Original = unchanged + deleted tokens
  let originalText = '';
  const charToTokenIndex: number[] = [];
  
  for (let ti = 0; ti < tokens.length; ti++) {
    const token = tokens[ti];
    if (token.status === 'unchanged' || token.status === 'deleted') {
      for (let ci = 0; ci < token.text.length; ci++) {
        charToTokenIndex.push(ti);
        originalText += token.text[ci];
      }
    }
  }
  
  // Find sentence boundaries in original text
  const boundaries: number[] = [];
  for (let i = 0; i < originalText.length; i++) {
    if (isSentenceEndingPeriod(originalText, i)) {
      boundaries.push(i);
    }
  }
  
  // If no boundaries, treat entire text as one sentence
  if (boundaries.length === 0) {
    boundaries.push(originalText.length - 1);
  }
  
  // Split tokens at sentence boundaries
  let lastBoundaryTokenIdx = -1;
  let processedUpToToken = 0;
  
  for (const boundaryCharIdx of boundaries) {
    const boundaryTokenIdx = charToTokenIndex[boundaryCharIdx];
    if (boundaryTokenIdx === undefined) continue;
    
    // Collect tokens from processedUpToToken to boundaryTokenIdx (inclusive)
    const sentenceTokens: TextToken[] = [];
    
    for (let ti = processedUpToToken; ti <= boundaryTokenIdx; ti++) {
      sentenceTokens.push({ ...tokens[ti] });
    }
    
    // Handle token that spans boundary - split it
    const boundaryToken = tokens[boundaryTokenIdx];
    if (boundaryToken && (boundaryToken.status === 'unchanged' || boundaryToken.status === 'deleted')) {
      // Find where in this token the boundary falls
      let charCountBefore = 0;
      for (let ti = 0; ti < boundaryTokenIdx; ti++) {
        if (tokens[ti].status === 'unchanged' || tokens[ti].status === 'deleted') {
          charCountBefore += tokens[ti].text.length;
        }
      }
      const splitPoint = boundaryCharIdx - charCountBefore + 1; // +1 to include the period
      
      if (splitPoint > 0 && splitPoint < boundaryToken.text.length) {
      // Split: this sentence gets up to splitPoint, next gets rest
      sentenceTokens[sentenceTokens.length - 1] = {
        ...boundaryToken,
        text: boundaryToken.text.substring(0, splitPoint),
      };
      // Create remainder for next sentence
      tokens[boundaryTokenIdx] = {
        ...boundaryToken,
        text: boundaryToken.text.substring(splitPoint),
      };
      processedUpToToken = boundaryTokenIdx; // Re-process this token
    } else {
      processedUpToToken = boundaryTokenIdx + 1;
    }
  } else {
    processedUpToToken = boundaryTokenIdx + 1;
  }
  
  // Use sentenceTokens directly - it already has the correct tokens including split
  if (sentenceTokens.length > 0 && sentenceTokens.some(t => t.text.trim())) {
    sentenceCounter++;
    results.push(buildSentenceFromTokens(
      sentenceTokens,
      `${sectionNumber.replace(/\.$/, '')}-s${sentenceCounter}`,
      sectionNumber,
      topLevelSectionNumber
    ));
  }
  
  lastBoundaryTokenIdx = boundaryTokenIdx;
}
  
  // Handle remaining tokens (incomplete sentence)
  if (processedUpToToken < tokens.length) {
    const remainingTokens = tokens.slice(processedUpToToken);
    if (remainingTokens.length > 0 && remainingTokens.some(t => t.text.trim())) {
      sentenceCounter++;
      results.push(buildSentenceFromTokens(
        remainingTokens,
        `${sectionNumber.replace(/\.$/, '')}-s${sentenceCounter}`,
        sectionNumber,
        topLevelSectionNumber
      ));
    }
  }
  
  return results;
}

// ============================================================================
// COMBINED TEXT SENTENCE EXTRACTION (for track change detection)
// ============================================================================

/**
 * Build combined text from tokens and assign positions to each token.
 * Returns tokens with their start/end positions in the combined text.
 */
export function buildTokensWithPositions(tokens: TextToken[]): {
  combinedText: string;
  tokensWithPositions: TokenWithPosition[];
} {
  let combinedText = '';
  const tokensWithPositions: TokenWithPosition[] = [];
  
  for (const token of tokens) {
    if (!token.text) continue;
    
    const startPos = combinedText.length;
    combinedText += token.text;
    const endPos = combinedText.length;
    
    tokensWithPositions.push({
      text: token.text,
      status: token.status,
      startPos,
      endPos,
      // Preserve document-level offsets from input tokens
      docStartOffset: token.startOffset,
      docEndOffset: token.endOffset,
    });
  }
  
  return { combinedText, tokensWithPositions };
}

/**
 * Find all sentence boundary positions in text.
 * Returns array of positions where sentences end (position of the period/punctuation).
 */
export function findSentenceBoundaries(text: string): number[] {
  const boundaries: number[] = [];
  
  for (let i = 0; i < text.length; i++) {
    if (isSentenceEndingPeriod(text, i)) {
      boundaries.push(i);
    }
  }
  
  return boundaries;
}

/**
 * Map tokens to sentences based on sentence boundaries.
 * Each sentence contains all tokens that fall within its boundary.
 * Handles tokens that span sentence boundaries by splitting them.
 */
export function mapTokensToSentences(
  tokensWithPositions: TokenWithPosition[],
  combinedText: string,
  boundaries: number[],
  sectionNumber: string,
  topLevelSectionNumber: string
): SentenceWithTokens[] {
  if (tokensWithPositions.length === 0) return [];
  
  // If no boundaries found, treat entire text as one sentence
  const effectiveBoundaries = boundaries.length > 0 
    ? boundaries 
    : [combinedText.length - 1];
  
  const sentences: SentenceWithTokens[] = [];
  let tokenIndex = 0;
  let sentenceStartPos = 0;
  
  // Create a working copy of tokens that we can split
  const workingTokens: TokenWithPosition[] = tokensWithPositions.map(t => ({ ...t }));
  
  for (let boundaryIdx = 0; boundaryIdx < effectiveBoundaries.length; boundaryIdx++) {
    const boundaryPos = effectiveBoundaries[boundaryIdx];
    const sentenceTokens: TokenWithPosition[] = [];
    
    // Collect tokens for this sentence
    while (tokenIndex < workingTokens.length) {
      const token = workingTokens[tokenIndex];
      
      // Token ends before or at boundary - include entirely
      if (token.endPos <= boundaryPos + 1) {
        sentenceTokens.push(token);
        tokenIndex++;
      }
      // Token starts after boundary - belongs to next sentence
      else if (token.startPos > boundaryPos) {
        break;
      }
      // Token spans the boundary - need to split it
      else {
        // Calculate where to split within the token text
        const splitPosInToken = boundaryPos - token.startPos + 1; // +1 to include the boundary char (period)
        
        if (splitPosInToken > 0 && splitPosInToken < token.text.length) {
          // Create first part for current sentence
          const firstPart: TokenWithPosition = {
            text: token.text.substring(0, splitPosInToken),
            status: token.status,
            startPos: token.startPos,
            endPos: token.startPos + splitPosInToken,
            docStartOffset: token.docStartOffset,
            docEndOffset: token.docStartOffset !== undefined 
              ? token.docStartOffset + splitPosInToken 
              : undefined,
          };
          sentenceTokens.push(firstPart);
          
          // Modify the token in place to be the remainder for next sentence
          workingTokens[tokenIndex] = {
            text: token.text.substring(splitPosInToken),
            status: token.status,
            startPos: token.startPos + splitPosInToken,
            endPos: token.endPos,
            docStartOffset: token.docStartOffset !== undefined 
              ? token.docStartOffset + splitPosInToken 
              : undefined,
            docEndOffset: token.docEndOffset,
          };
          // Don't advance tokenIndex - next sentence will pick up the remainder
        } else {
          // Edge case: split point at very start or end, just include whole token
          sentenceTokens.push(token);
          tokenIndex++;
        }
        break;
      }
    }
    
    if (sentenceTokens.length === 0) continue;
    
    // Build original and amended text for this sentence
    let originalText = '';
    let amendedText = '';
    
    for (const token of sentenceTokens) {
      if (token.status === 'unchanged' || token.status === 'deleted') {
        originalText += token.text;
      }
      if (token.status === 'unchanged' || token.status === 'inserted') {
        amendedText += token.text;
      }
    }
    
    // Extract sentence text from combined
    const sentenceEndPos = sentenceTokens[sentenceTokens.length - 1].endPos;
    const sentenceCombinedText = combinedText.substring(sentenceStartPos, sentenceEndPos);
    
    sentences.push({
      id: `${sectionNumber.replace(/\.$/, '')}-s${boundaryIdx + 1}`,
      combinedText: sentenceCombinedText.trim(),
      originalText: originalText.trim(),
      amendedText: amendedText.trim(),
      tokens: sentenceTokens,
      fragments: [],
      sectionNumber,
      topLevelSectionNumber,
      sentenceBoundaryPos: boundaryPos,
    });
    
    sentenceStartPos = sentenceEndPos;
  }
  
  // Handle any remaining tokens (incomplete sentence at end)
  if (tokenIndex < workingTokens.length) {
    const remainingTokens = workingTokens.slice(tokenIndex);
    
    if (remainingTokens.length > 0 && remainingTokens.some(t => t.text.trim())) {
      let originalText = '';
      let amendedText = '';
      
      for (const token of remainingTokens) {
        if (token.status === 'unchanged' || token.status === 'deleted') {
          originalText += token.text;
        }
        if (token.status === 'unchanged' || token.status === 'inserted') {
          amendedText += token.text;
        }
      }
      
      const sentenceCombinedText = combinedText.substring(sentenceStartPos);
      
      sentences.push({
        id: `${sectionNumber.replace(/\.$/, '')}-s${sentences.length + 1}`,
        combinedText: sentenceCombinedText.trim(),
        originalText: originalText.trim(),
        amendedText: amendedText.trim(),
        tokens: remainingTokens,
        fragments: [],
        sectionNumber,
        topLevelSectionNumber,
        sentenceBoundaryPos: combinedText.length - 1,
      });
    }
  }
  
  return sentences;
}

/**
 * Analyze a sentence and classify its changes.
 * Determines if changes are word-level or full-sentence based on fragment matching.
 * Uses SECTION-RELATIVE offsets from token's docStartOffset for correct filtering.
 */
export function classifySentenceChanges(
  sentence: SentenceWithTokens,
  originalFragments: Map<string, SentenceFragment>,
  amendedFragments: Map<string, SentenceFragment>
): SentenceChangeResult {
  const deletions: ChangeSpan[] = [];
  const insertions: ChangeSpan[] = [];
  let affectedFragment: SentenceFragment | undefined;

  // Collect changes using SECTION-RELATIVE offsets from tokens
  // docStartOffset was set by extractTokensFromParagraphWithOffsets and preserved through buildTokensWithPositions
  let currentDeletion = '';
  let currentDeletionStart = -1;
  let currentInsertion = '';
  let currentInsertionStart = -1;

  for (const token of sentence.tokens) {
    // Use section-relative offset from token (falls back to paragraph-relative if not available)
    const tokenSectionStart = token.docStartOffset ?? token.startPos;

    if (token.status === 'deleted') {
      if (currentDeletion === '') {
        currentDeletionStart = tokenSectionStart;
      }
      currentDeletion += token.text;

      // Flush any pending insertion
      if (currentInsertion.trim()) {
        flushChangeSpan(insertions, currentInsertion, currentInsertionStart);
        currentInsertion = '';
        currentInsertionStart = -1;
      }
    } else if (token.status === 'inserted') {
      if (currentInsertion === '') {
        currentInsertionStart = tokenSectionStart;
      }
      currentInsertion += token.text;

      // Flush any pending deletion
      if (currentDeletion.trim()) {
        flushChangeSpan(deletions, currentDeletion, currentDeletionStart);
        currentDeletion = '';
        currentDeletionStart = -1;
      }
    } else {
      // Unchanged: flush both pending changes
      if (currentDeletion.trim()) {
        flushChangeSpan(deletions, currentDeletion, currentDeletionStart);
        currentDeletion = '';
        currentDeletionStart = -1;
      }
      if (currentInsertion.trim()) {
        flushChangeSpan(insertions, currentInsertion, currentInsertionStart);
        currentInsertion = '';
        currentInsertionStart = -1;
      }
    }
  }

  // Flush remaining changes
  if (currentDeletion.trim()) {
    flushChangeSpan(deletions, currentDeletion, currentDeletionStart);
  }
  if (currentInsertion.trim()) {
    flushChangeSpan(insertions, currentInsertion, currentInsertionStart);
  }

  // Determine change type
  let changeType: SentenceChangeResult['changeType'] = 'unchanged';

  if (deletions.length === 0 && insertions.length === 0) {
    changeType = 'unchanged';
  } else if (sentence.originalText === '' && sentence.amendedText !== '') {
    changeType = 'full-sentence-insertion';
    const normalized = normalizeFragmentText(sentence.amendedText);
    if (amendedFragments.has(normalized)) {
      affectedFragment = amendedFragments.get(normalized);
    }
  } else if (sentence.amendedText === '' && sentence.originalText !== '') {
    changeType = 'full-sentence-deletion';
    const normalized = normalizeFragmentText(sentence.originalText);
    if (originalFragments.has(normalized)) {
      affectedFragment = originalFragments.get(normalized);
    }
  } else {
    changeType = 'word-level';
  }

  return {
    sentenceId: sentence.id,
    sectionNumber: sentence.sectionNumber,
    topLevelSectionNumber: sentence.topLevelSectionNumber,
    originalText: sentence.originalText,
    amendedText: sentence.amendedText,
    changeType,
    deletions,
    insertions,
    affectedFragment,
  };
}

/**
 * Helper to flush a change span, trimming whitespace and adjusting offset accordingly
 */
function flushChangeSpan(
  spans: ChangeSpan[],
  text: string,
  startOffset: number
): void {
  const trimmed = text.trim();
  if (!trimmed) return;

  const leadingSpaces = text.length - text.trimStart().length;
  spans.push({
    text: trimmed,
    startOffset: startOffset + leadingSpaces,
    endOffset: startOffset + leadingSpaces + trimmed.length,
  });
}

/**
 * Helper to flush a deletion span, trimming whitespace and adjusting offset
 */
function flushDeletion(
  deletions: ChangeSpan[],
  text: string,
  startOffset: number
): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  
  const leadingSpaces = text.length - text.trimStart().length;
  deletions.push({
    text: trimmed,
    startOffset: startOffset + leadingSpaces,
    endOffset: startOffset + leadingSpaces + trimmed.length,
  });
}

/**
 * Helper to flush an insertion span, trimming whitespace and adjusting offset
 */
function flushInsertion(
  insertions: ChangeSpan[],
  text: string,
  startOffset: number
): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  
  const leadingSpaces = text.length - text.trimStart().length;
  insertions.push({
    text: trimmed,
    startOffset: startOffset + leadingSpaces,
    endOffset: startOffset + leadingSpaces + trimmed.length,
  });
}

/**
 * Process a paragraph's tokens and extract sentence-level changes.
 * Main entry point for the new track change detection algorithm.
 */
export function extractSentenceChangesFromTokens(
  tokens: TextToken[],
  sectionNumber: string,
  topLevelSectionNumber: string,
  originalFragments?: Map<string, SentenceFragment>,
  amendedFragments?: Map<string, SentenceFragment>
): SentenceChangeResult[] {
  if (tokens.length === 0) return [];
  
  // Skip if no changes
  const hasChanges = tokens.some(t => t.status !== 'unchanged');
  if (!hasChanges) return [];
  
  // Step 1: Build combined text with token positions
  const { combinedText, tokensWithPositions } = buildTokensWithPositions(tokens);
  
  if (!combinedText.trim()) return [];
  
  // Step 2: Find sentence boundaries in combined text
  const boundaries = findSentenceBoundaries(combinedText);
  
  // Step 3: Map tokens to sentences
  const sentences = mapTokensToSentences(
    tokensWithPositions,
    combinedText,
    boundaries,
    sectionNumber,
    topLevelSectionNumber
  );
  
  // Step 4: Classify each sentence's changes
  const results: SentenceChangeResult[] = [];
  
  for (const sentence of sentences) {
    // Skip sentences with no changes
    const sentenceHasChanges = sentence.tokens.some(t => t.status !== 'unchanged');
    if (!sentenceHasChanges) continue;
    
    const result = classifySentenceChanges(
      sentence,
      originalFragments || new Map(),
      amendedFragments || new Map()
    );
    
    if (result.changeType !== 'unchanged') {
      results.push(result);
    }
  }
  
  return results;
}

/**
 * Build SentenceWithChanges from tokens
 */
function buildSentenceFromTokens(
  tokens: TextToken[],
  id: string,
  sectionNumber: string,
  topLevelSectionNumber: string
): SentenceWithChanges {
  let originalSentence = '';
  let amendedSentence = '';
  
  let currentDeletion = '';
  let currentInsertion = '';
  const deletions: string[] = [];
  const insertions: string[] = [];
  
  for (const token of tokens) {
    if (token.status === 'deleted') {
      currentDeletion += token.text;
      originalSentence += token.text;
      // Flush pending insertion (status changed from inserted to deleted)
      if (currentInsertion) {
        const trimmed = currentInsertion.trim();
        if (trimmed) insertions.push(trimmed);
        currentInsertion = '';
      }
    } else if (token.status === 'inserted') {
      currentInsertion += token.text;
      amendedSentence += token.text;
      // Flush pending deletion (status changed from deleted to inserted)
      if (currentDeletion) {
        const trimmed = currentDeletion.trim();
        if (trimmed) deletions.push(trimmed);
        currentDeletion = '';
      }
    } else {
      // Unchanged: flush BOTH pending changes
      if (currentDeletion) {
        const trimmed = currentDeletion.trim();
        if (trimmed) deletions.push(trimmed);
        currentDeletion = '';
      }
      if (currentInsertion) {
        const trimmed = currentInsertion.trim();
        if (trimmed) insertions.push(trimmed);
        currentInsertion = '';
      }
      originalSentence += token.text;
      amendedSentence += token.text;
    }
  }
  
  // Flush remaining
  if (currentDeletion) {
    const trimmed = currentDeletion.trim();
    if (trimmed) deletions.push(trimmed);
  }
  if (currentInsertion) {
    const trimmed = currentInsertion.trim();
    if (trimmed) insertions.push(trimmed);
  }
  
  return {
    id,
    originalSentence: originalSentence.trim(),
    amendedSentence: amendedSentence.trim(),
    deletions,
    insertions,
    sectionNumber,
    topLevelSectionNumber,
  };
}

// ============================================================================
// CROSS-SECTION SENTENCE HELPERS
// ============================================================================

/**
 * Build full sentence text from sourceComponents.
 * Joins all component textFragments with spaces.
 */
export function buildFullSentenceFromComponents(
  sourceComponents: SentenceSourceComponent[]
): string {
  if (!sourceComponents || sourceComponents.length === 0) {
    return '';
  }
  return sourceComponents.map(c => c.textFragment).join(' ');
}

/**
 * Build full sentence with text replacement for a specific section.
 * Used by track changes to build original/amended versions.
 *
 * @param sourceComponents - The sentence's source components
 * @param replacementSectionNumber - Section number to replace text for
 * @param replacementText - Text to use instead of the component's textFragment
 */
export function buildFullSentenceWithReplacement(
  sourceComponents: SentenceSourceComponent[],
  replacementSectionNumber: string,
  replacementText: string
): string {
  if (!sourceComponents || sourceComponents.length === 0) {
    return replacementText;
  }

  const normalizedReplacement = replacementSectionNumber.replace(/\.+$/, '');

  return sourceComponents.map(c => {
    const normalizedComponent = c.sectionNumber.replace(/\.+$/, '');
    if (normalizedComponent === normalizedReplacement) {
      return replacementText;
    }
    return c.textFragment;
  }).join(' ');
}

/**
 * Find a sentence that contains text from a specific section.
 * Returns the sentence with its full cross-section text.
 *
 * @param allSentences - All sentences from extractAllSentencesWithSources
 * @param sectionNumber - Section to find sentences for
 * @param startOffset - Optional: start offset within the section
 * @param endOffset - Optional: end offset within the section
 */
export function findSentencesContainingSection(
  allSentences: SentenceWithSource[],
  sectionNumber: string,
  startOffset?: number,
  endOffset?: number
): SentenceWithSource[] {
  const normalizedSection = sectionNumber.replace(/\.+$/, '');

  return allSentences.filter(sentence => {
    // Check if any source component is from the target section
    const matchingComponent = sentence.sourceComponents.find(c => {
      const normalizedComponent = c.sectionNumber.replace(/\.+$/, '');
      if (normalizedComponent !== normalizedSection) {
        return false;
      }

      // If offsets provided, check for overlap
      if (startOffset !== undefined && endOffset !== undefined) {
        const componentStart = c.sectionStartOffset;
        const componentEnd = c.sectionEndOffset;
        // Check if ranges overlap
        return startOffset < componentEnd && endOffset > componentStart;
      }

      return true;
    });

    return !!matchingComponent;
  });
}

/**
 * Find the best matching sentence for an annotation.
 * If multiple sentences contain the section, prefer the one with highest text overlap.
 *
 * @param allSentences - All sentences from extractAllSentencesWithSources
 * @param sectionNumber - Section the annotation is in
 * @param selectedText - The annotated text
 * @param startOffset - Start offset within the section
 * @param endOffset - End offset within the section
 */
export function findBestMatchingSentence(
  allSentences: SentenceWithSource[],
  sectionNumber: string,
  selectedText: string,
  startOffset?: number,
  endOffset?: number
): SentenceWithSource | null {
  const candidates = findSentencesContainingSection(
    allSentences,
    sectionNumber,
    startOffset,
    endOffset
  );

  if (candidates.length === 0) {
    return null;
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  // Multiple candidates - find best match by text overlap
  const normalizedSelected = normalizeText(selectedText);
  let bestMatch = candidates[0];
  let bestScore = 0;

  for (const candidate of candidates) {
    const normalizedSentence = normalizeText(candidate.sentence);

    // Check direct containment
    if (normalizedSentence.includes(normalizedSelected)) {
      return candidate; // Direct match - return immediately
    }

    // Calculate overlap score
    const score = countCommonWords(selectedText, candidate.sentence);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}