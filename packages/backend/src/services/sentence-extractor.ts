import type { SectionNode } from '@/types/documents';

export interface ExtractedSentence {
  sentence: string;
  sectionReference: string;  // e.g., "From 2. to 2.1." or "Section 3.2."
  isInDefinitionSection?: boolean;  // true if this sentence is from the definition section
}

/**
 * Extracts all sentences from a parsed document tree
 * @param sectionNodes - Array of root-level SectionNode objects from the parser
 * @returns Array of extracted sentences with their metadata
 */
export function extractSentences(sectionNodes: SectionNode[]): ExtractedSentence[] {
  const sentences: ExtractedSentence[] = [];
  
  for (const node of sectionNodes) {
    extractSentencesFromNode(node, sentences);
  }
  
  return sentences;
}

/**
 * Recursively extracts sentences from a node and its children
 * Following the specific extraction rules:
 * 1. If text reaches "." before end of paragraph - extract that sentence
 * 2. If text does NOT reach "." before end of paragraph:
 *    2.1. If has children - combine parent text with EACH child separately
 *    2.2. If no children - extract the text as is
 */
function extractSentencesFromNode(
  node: SectionNode,
  sentences: ExtractedSentence[]
): void {
  // Get all text from this node (main text + additional paragraphs)
  const nodeText = getNodeText(node);
  
  // Extract sentences from the node's own text content first
  const textSentences = extractSentencesFromText(nodeText);
  
  if (textSentences.complete.length > 0) {
    // Node has complete sentences (ending with periods)
    for (const sent of textSentences.complete) {
      sentences.push({
        sentence: sent,
        sectionReference: `Section ${node.sectionNumber}`
      });
    }
  }
  
  // Handle the incomplete part (text without period at the end)
  if (textSentences.incomplete) {
    const incompletePart = textSentences.incomplete;
    
    if (node.children && node.children.length > 0) {
      // Rule 2.1: Has children - combine parent incomplete text with EACH child
      for (const child of node.children) {
        const childSentences = extractSentenceWithChild(incompletePart, child);
        sentences.push(...childSentences);
      }
      // Children have been consumed by parent combination - don't process them again
      return;
    } else {
      // Rule 2.2: No children - extract the incomplete text as is
      sentences.push({
        sentence: incompletePart,
        sectionReference: `Section ${node.sectionNumber}`
      });
    }
  }
  
  // Only recursively process children if parent text was complete (ended with period)
  // If parent had incomplete text, children were already consumed above
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      extractSentencesFromNode(child, sentences);
    }
  }
}

/**
 * Combines parent's incomplete text with a child to form sentence(s)
 * Processes ALL text in the child, not just up to the first period:
 * 1. First complete sentence gets the combined parent+child reference
 * 2. Subsequent complete sentences are from the child alone
 * 3. Remaining incomplete text combines with the child's children
 */
function extractSentenceWithChild(
  parentIncompleteText: string,
  child: SectionNode,
  pathSoFar: string[] = []
): ExtractedSentence[] {
  const results: ExtractedSentence[] = [];
  const childText = getNodeText(child);
  const currentPath = [...pathSoFar, child.sectionNumber];
  
  // Combine parent incomplete text with full child text
  const combinedText = parentIncompleteText + ' ' + childText;
  
  // Extract all sentences from the combined text
  const extracted = extractSentencesFromText(combinedText);
  
  if (extracted.complete.length > 0) {
    // First complete sentence - use the child's section number (now hierarchical from parser)
    const childSectionNum = currentPath[currentPath.length - 1] || child.sectionNumber;
    const firstSentence = extracted.complete[0];
    if (firstSentence) {
      results.push({
        sentence: firstSentence,
        sectionReference: `Section ${childSectionNum}`
      });
    }

    // Any additional complete sentences are from the child alone
    // (they come after the first period, so parent was already "completed")
    for (let i = 1; i < extracted.complete.length; i++) {
      const sent = extracted.complete[i];
      if (sent) {
        results.push({
          sentence: sent,
          sectionReference: `Section ${child.sectionNumber}`
        });
      }
    }
  }
  
  // Handle remaining incomplete text from the child
  if (extracted.incomplete) {
    if (child.children && child.children.length > 0) {
      // Combine remaining incomplete text with EACH grandchild
      // Note: Now the "parent" is the child, and path starts fresh from child
      for (const grandchild of child.children) {
        const grandchildSentences = extractSentenceWithChild(
          extracted.incomplete,
          grandchild,
          []  // Reset path - start fresh from child
        );
        results.push(...grandchildSentences);
      }
    } else {
      // No children - extract the incomplete text
      const childSectionNum = currentPath[currentPath.length - 1];
      results.push({
        sentence: extracted.incomplete,
        sectionReference: `Section ${childSectionNum}`
      });
    }
  } else {
    // CRITICAL FIX: Even if there's no incomplete text (everything was complete),
    // we still need to recursively process the child's children!
    // This handles cases like:
    //   8. TITLE (incomplete)
    //     8.3. Subtitle. (complete when combined with parent)
    //       8.3.1. Content... (these were being missed!)
    if (child.children && child.children.length > 0) {
      for (const grandchild of child.children) {
        extractSentencesFromNode(grandchild, results);
      }
    }
  }
  
  return results;
}

/**
 * Gets all text content from a node (main text + additional paragraphs)
 */
function getNodeText(node: SectionNode): string {
  let text = node.text || '';
  
  if (node.additionalParagraphs && node.additionalParagraphs.length > 0) {
    text += ' ' + node.additionalParagraphs.join(' ');
  }
  
  return text.trim();
}

/**
 * Extracts sentences from a text string
 * Returns complete sentences (ending with period) and any incomplete remainder
 */
export function extractSentencesFromText(text: string): {
  complete: string[];
  incomplete: string | null;
} {
  const complete: string[] = [];
  let currentSentence = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    currentSentence += char;
    
    if (isSentenceEndingPeriod(text, i)) {
      // Found a complete sentence
      complete.push(currentSentence.trim());
      currentSentence = '';
    }
  }
  
  // Return any remaining incomplete text
  const incomplete = currentSentence.trim() || null;
  
  return { complete, incomplete };
}

/**
 * Common abbreviations that end with periods but don't end sentences
 * Includes company types, titles, common abbreviations, etc.
 */
const COMMON_ABBREVIATIONS = new Set([
  // Company types
  'ltd', 'inc', 'corp', 'co', 'llc', 'llp', 'plc', 'pte', 'pty', 'gmbh', 's.a', 'n.v', 'a.g', 'spa',
  // Titles  
  'mr', 'mrs', 'ms', 'dr', 'prof', 'rev', 'hon', 'sr', 'jr', 'esq',
  // Latin abbreviations - including versions with internal dots
  'etc', 'i.e', 'ie', 'e.g', 'eg', 'vs', 'v', 'et al', 'etal', 'cf', 'viz', 'ibid', 'id', 'op. cit', 'op cit',
  // Time - both with and without internal dot
  'a.m', 'am', 'p.m', 'pm',
  // Locations
  'st', 'ave', 'rd', 'blvd', 'ln', 'dr', 'ct', 'u.s', 'us', 'u.s.a', 'usa', 'u.k', 'uk', 'n.y', 'ny', 'ca', 'tx',
  // Academic/Professional - including versions with internal dots
  'ph.d', 'phd', 'm.d', 'md', 'll.b', 'llb', 'll.m', 'llm', 'b.a', 'ba', 'm.a', 'ma', 'm.sc', 'msc', 'b.sc', 'bsc', 'mba',
  // Other common
  'fig', 'no', 'nos', 'vol', 'p', 'pp', 'ed', 'eds', 'dept', 'gov', 'gen'
]);

/**
 * Multi-character abbreviations with internal dots
 * Must be checked as complete patterns (e.g., "i.e." as a whole, not just "i" or "e")
 */
const MULTI_DOT_ABBREVIATIONS = [
  'i.e.', 'e.g.', 'a.m.', 'p.m.', 'ph.d.', 'm.d.', 'll.b.', 'll.m.',
  'b.a.', 'm.a.', 'b.sc.', 'm.sc.', 'u.s.', 'u.k.', 'u.s.a.',
  'et al.', 'op. cit.', 'c.f.', 'viz.', 'ibid.'
];

/**
 * Checks if a character is a sentence-ending period
 * Must consider context to avoid false positives with decimals and section references
 */
function isPeriod(char: string): boolean {
  return char === '.' || char === '。';  // Includes Chinese period
}

/**
 * Checks if position is within a multi-dot abbreviation pattern
 * Returns the end index of the abbreviation if found, otherwise -1
 */
function getMultiDotAbbreviationEnd(text: string, index: number): number {
  const char = text[index];
  if (!char || !isPeriod(char)) {
    return -1;
  }
  
  // Check each multi-dot abbreviation pattern
  for (const abbrev of MULTI_DOT_ABBREVIATIONS) {
    // Try to match the pattern ending at this position
    const startPos = index - abbrev.length + 1;
    if (startPos >= 0) {
      const candidate = text.substring(startPos, index + 1).toLowerCase();
      if (candidate === abbrev.toLowerCase()) {
        return index;  // This dot is part of the abbreviation, not sentence-ending
      }
    }
    
    // Also check if this dot is part of a multi-dot abbreviation that continues
    // E.g., if we're at the first dot in "i.e.", we should skip it
    for (let len = 2; len <= abbrev.length; len++) {
      const startPos = index - len + 1;
      if (startPos >= 0 && startPos + abbrev.length <= text.length) {
        const candidate = text.substring(startPos, startPos + abbrev.length).toLowerCase();
        if (candidate === abbrev.toLowerCase() && index < startPos + abbrev.length - 1) {
          // This dot is an internal dot in a multi-dot abbreviation
          return -2;  // Special flag: skip this dot entirely (it's internal)
        }
      }
    }
  }
  
  return -1;
}

/**
 * Checks if a period at the given position is truly sentence-ending
 * Handles multiple cases:
 * 1. Multi-dot abbreviations (e.g., "i.e.", "a.m.", "Ph.D.")
 * 2. Decimals and section references (e.g., "8.4", "Section 3.2")
 * 3. Single-word abbreviations (e.g., "Ltd.", "Mr.", "etc.")
 * 4. Initials (e.g., "J.K. Smith")
 * 5. Ellipsis ("...")
 * 
 * @param text - The full text string
 * @param index - The index of the potential period
 */
function isSentenceEndingPeriod(text: string, index: number): boolean {
  const char = text[index];
  
  // First check if it's even a period character
  if (!char || !isPeriod(char)) {
    return false;
  }
  
  // Check for multi-dot abbreviations FIRST
  const multiDotCheck = getMultiDotAbbreviationEnd(text, index);
  if (multiDotCheck === -2) {
    // This is an internal dot in a multi-dot abbreviation (e.g., first dot in "i.e.")
    return false;
  }
  if (multiDotCheck >= 0) {
    // This is the final dot in a multi-dot abbreviation
    // Not sentence-ending UNLESS followed by end of text or sentence-starting pattern
    const nextChar = index + 1 < text.length ? text[index + 1] : null;
    const charAfterNext = index + 2 < text.length ? text[index + 2] : null;
    
    if (!nextChar) {
      return true;  // End of text
    }
    
    if (nextChar === ' ' && charAfterNext && /[A-Z]/.test(charAfterNext)) {
      return true;  // "i.e. The next sentence..."
    }
    
    return false;  // "i.e. the continuation" or "i.e. whatever"
  }
  
  // Get surrounding context
  const prevChar = index > 0 ? text[index - 1] : null;
  const nextChar = index + 1 < text.length ? text[index + 1] : null;
  const charAfterNext = index + 2 < text.length ? text[index + 2] : null;
  
  // Rule 1: Ellipsis (...) - not sentence-ending unless it's the last character
  if (prevChar === '.' || nextChar === '.') {
    // Part of ellipsis - only ends sentence if at end of text
    return index >= text.length - 3; // Allow for up to "..." at end
  }
  
  // Rule 2: Decimal points and section references (digit.digit)
  if (nextChar && /\d/.test(nextChar)) {
    return false;  // "8.4" or "3.14" - not sentence-ending
  }
  
  // Rule 3: Initials (single letter + period)
  // e.g., "J. K. Rowling" or "U. S. A."
  if (prevChar && /[A-Z]/.test(prevChar)) {
    // Check if this is a single capital letter followed by period
    const twoBack = index > 1 ? text[index - 2] : null;
    if (!twoBack || /[\s,]/.test(twoBack)) {
      // Single letter initial
      // Not sentence-ending if followed by space + capital (another initial or name)
      if (nextChar === ' ' && charAfterNext && /[A-Z]/.test(charAfterNext)) {
        return false;  // "J. K." or "U. S."
      }
      // Could be end of initials - check what comes after
      if (nextChar === ' ' && charAfterNext && /[a-z]/.test(charAfterNext)) {
        return false;  // "J. continues..." - middle of sentence
      }
    }
  }
  
  // Rule 4: Known abbreviations
  // Extract word before the period (up to 15 chars back or until whitespace/punctuation)
  let wordStart = index - 1;
  let wordBefore = '';
  while (wordStart >= 0 && wordStart > index - 15) {
    const c = text[wordStart];
    if (!c || /[\s,;:()\[\]{}]/.test(c)) {
      break;
    }
    wordBefore = c + wordBefore;
    wordStart--;
  }
  
  // Check if it's a known abbreviation (case-insensitive)
  if (wordBefore && COMMON_ABBREVIATIONS.has(wordBefore.toLowerCase())) {
    return false;  // "Ltd." or "etc." - not sentence-ending
  }
  
  // Rule 5: Check what follows the period
  if (nextChar === ' ' || nextChar === null) {
    // Period followed by space or end of text
    
    if (nextChar === null) {
      // End of text - definitely sentence-ending
      return true;
    }
    
    // Check the character after the space
    if (charAfterNext === null) {
      // Space then end of text - sentence-ending
      return true;
    }
    
    // If followed by lowercase letter, likely an abbreviation in middle of sentence
    if (charAfterNext && /[a-z]/.test(charAfterNext)) {
      // Exception: if the word before was very short (1-4 chars), might be abbreviation
      if (wordBefore && wordBefore.length <= 4) {
        return false;  // Likely abbreviation like "Inc. the company"
      }
    }
    
    // If followed by uppercase letter, likely new sentence
    if (charAfterNext && /[a-z]/.test(charAfterNext)) {
      // But check if word before is short (potential abbreviation)
      if (wordBefore && wordBefore.length <= 4 && /^[A-Z]/.test(wordBefore)) {
        // Could be abbreviation before a proper noun
        // Use heuristic: if prev word is all caps or very short, might be abbreviation
        if (wordBefore.length <= 3 && wordBefore === wordBefore.toUpperCase()) {
          return false;  // "U.S. Government" - not sentence-ending
        }
      }
      // Otherwise, uppercase after period usually means new sentence
      return true;
    }
    
    // If followed by number, could be either - use word length heuristic
    if (charAfterNext && /\d/.test(charAfterNext)) {
      if (wordBefore && wordBefore.length <= 4) {
        return false;  // "No. 5" or "Fig. 12"
      }
      return true;  // Probably sentence ending, new sentence starts with year/number
    }
  }
  
  // Rule 6: Numbers at end of sentence
  if (prevChar && /\d/.test(prevChar)) {
    // Period after number
    if (!nextChar || /[\s,;:]/.test(nextChar)) {
      return true;  // "price is $100." or "See Section 8."
    }
  }
  
  // Default: assume sentence-ending
  return true;
}

/**
 * Finds the index of the first sentence-ending period in a text string
 * Uses context-aware detection to avoid false positives with decimals
 * Returns -1 if no sentence-ending period found
 */
function findPeriodIndex(text: string): number {
  for (let i = 0; i < text.length; i++) {
    if (isSentenceEndingPeriod(text, i)) {
      return i;
    }
  }
  return -1;
}

/**
 * Helper function to extract sentences from a specific node only (not recursive)
 * Useful for testing or processing individual sections
 */
export function extractSentencesFromSingleNode(node: SectionNode): ExtractedSentence[] {
  const sentences: ExtractedSentence[] = [];
  extractSentencesFromNode(node, sentences);
  return sentences;
}

/**
 * Pretty-print extracted sentences for debugging/review
 */
export function formatExtractedSentences(sentences: ExtractedSentence[]): string {
  return sentences.map((s, index) => {
    return `[${index + 1}] ${s.sectionReference}\n${s.sentence}\n`;
  }).join('\n');
}

// ============================================================================
// FRAGMENT EXTRACTION (NO PARENT-CHILD COMBINING)
// ============================================================================
// Extracts each section node's own text as standalone fragments.
// Unlike extractSentences(), this NEVER prepends parent incomplete text
// to children. Used for undefined terms, unused definitions, and
// inconsistent terms where parent prepending inflates occurrence counts.
// ============================================================================

/**
 * Extracts fragments from a parsed document tree without parent-child combining.
 * Each node's own text is extracted independently — no parent text prepended.
 * Still splits on sentence-ending periods (and semicolons in definition sections).
 *
 * @param sectionNodes - Array of root-level SectionNode objects
 * @param definitionSectionNumber - Optional section number for definition section
 * @returns Array of extracted fragments with metadata
 */
export function extractFragments(
  sectionNodes: SectionNode[],
  definitionSectionNumber?: string
): ExtractedSentence[] {
  const fragments: ExtractedSentence[] = [];
  const normalizedDefSection = definitionSectionNumber
    ? normalizeSectionNumber(definitionSectionNumber)
    : null;

  for (const node of sectionNodes) {
    extractFragmentsFromNode(node, fragments, normalizedDefSection);
  }

  return fragments;
}

/**
 * Recursively extracts fragments from a node and all its children.
 * Each node's text stands alone — never combined with parent text.
 *
 * For definition section nodes: uses semicolon-aware splitting and marks
 * isInDefinitionSection: true.
 * For other nodes: uses standard period-based splitting.
 */
function extractFragmentsFromNode(
  node: SectionNode,
  fragments: ExtractedSentence[],
  definitionSectionNumber: string | null
): void {
  const normalizedNodeSection = normalizeSectionNumber(node.sectionNumber);

  const isInDefinitionSection = definitionSectionNumber != null && (
    normalizedNodeSection === definitionSectionNumber ||
    normalizedNodeSection.startsWith(definitionSectionNumber)
  );

  if (isInDefinitionSection) {
    // Definition mode: process main text and additional paragraphs separately,
    // use semicolon-aware splitting, mark as definition section
    if (node.text && node.text.trim()) {
      const mainExtracted = extractDefinitionSentencesFromText(node.text);

      for (const sent of mainExtracted.complete) {
        fragments.push({
          sentence: sent,
          sectionReference: `Section ${node.sectionNumber}`,
          isInDefinitionSection: true,
        });
      }

      if (mainExtracted.incomplete) {
        fragments.push({
          sentence: mainExtracted.incomplete,
          sectionReference: `Section ${node.sectionNumber}`,
          isInDefinitionSection: true,
        });
      }
    }

    if (node.additionalParagraphs && node.additionalParagraphs.length > 0) {
      for (const paragraph of node.additionalParagraphs) {
        if (paragraph && paragraph.trim()) {
          const paraExtracted = extractDefinitionSentencesFromText(paragraph);

          for (const sent of paraExtracted.complete) {
            fragments.push({
              sentence: sent,
              sectionReference: `Section ${node.sectionNumber}`,
              isInDefinitionSection: true,
            });
          }

          if (paraExtracted.incomplete) {
            fragments.push({
              sentence: paraExtracted.incomplete,
              sectionReference: `Section ${node.sectionNumber}`,
              isInDefinitionSection: true,
            });
          }
        }
      }
    }
  } else {
    // Standard mode: extract from node.text only (exclude additionalParagraphs
    // so fragments stay within the section's main text for accurate display/locate)
    const nodeText = (node.text || '').trim();

    if (nodeText) {
      const textSentences = extractSentencesFromText(nodeText);

      for (const sent of textSentences.complete) {
        fragments.push({
          sentence: sent,
          sectionReference: `Section ${node.sectionNumber}`,
        });
      }

      if (textSentences.incomplete) {
        fragments.push({
          sentence: textSentences.incomplete,
          sectionReference: `Section ${node.sectionNumber}`,
        });
      }
    }
  }

  // Always recurse into children — each child is independent
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      extractFragmentsFromNode(child, fragments, definitionSectionNumber);
    }
  }
}

// ============================================================================
// DEFINITION SECTION EXTRACTION
// ============================================================================
// In definition sections, semicolons (;) act as sentence terminators.
// Each definition like '"Term" means ...;' is treated as a complete sentence.
// ============================================================================

/**
 * Extracts sentences from a definition section where semicolons end sentences.
 * Each definition (ending with ";" or ".") is extracted as a separate sentence.
 * Does NOT combine parent text with children - each node is independent.
 *
 * @param definitionSectionNode - The root node of the definition section
 * @returns Array of extracted sentences (one per definition)
 */
export function extractDefinitionSentences(definitionSectionNode: SectionNode): ExtractedSentence[] {
  const sentences: ExtractedSentence[] = [];
  extractDefinitionSentencesFromNode(definitionSectionNode, sentences);
  return sentences;
}

/**
 * Recursively extracts sentences from a definition section node.
 * Treats both "." and ";" as sentence terminators.
 * Does NOT combine parent incomplete text with children.
 *
 * Key difference from standard extraction:
 * - Each additionalParagraph is processed separately (definitions are often separate paragraphs)
 * - Semicolons end sentences
 * - No parent-child text combining
 */
function extractDefinitionSentencesFromNode(
  node: SectionNode,
  sentences: ExtractedSentence[]
): void {
  // Process main text separately from additional paragraphs
  // This prevents the intro text from being combined with the first definition
  if (node.text && node.text.trim()) {
    const mainExtracted = extractDefinitionSentencesFromText(node.text);

    for (const sent of mainExtracted.complete) {
      sentences.push({
        sentence: sent,
        sectionReference: `Section ${node.sectionNumber}`
      });
    }

    // Extract incomplete main text as-is (e.g., "In this Agreement:" intro)
    if (mainExtracted.incomplete) {
      sentences.push({
        sentence: mainExtracted.incomplete,
        sectionReference: `Section ${node.sectionNumber}`
      });
    }
  }

  // Process each additional paragraph separately
  // In definition sections, each paragraph is typically one definition
  if (node.additionalParagraphs && node.additionalParagraphs.length > 0) {
    for (const paragraph of node.additionalParagraphs) {
      if (paragraph && paragraph.trim()) {
        const paraExtracted = extractDefinitionSentencesFromText(paragraph);

        for (const sent of paraExtracted.complete) {
          sentences.push({
            sentence: sent,
            sectionReference: `Section ${node.sectionNumber}`
          });
        }

        // Extract incomplete paragraph as-is
        if (paraExtracted.incomplete) {
          sentences.push({
            sentence: paraExtracted.incomplete,
            sectionReference: `Section ${node.sectionNumber}`
          });
        }
      }
    }
  }

  // Recursively process children (each child is independent, not combined with parent)
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      extractDefinitionSentencesFromNode(child, sentences);
    }
  }
}

/**
 * Extracts sentences from text where both "." and ";" are sentence terminators.
 * Used specifically for definition sections.
 */
export function extractDefinitionSentencesFromText(text: string): {
  complete: string[];
  incomplete: string | null;
} {
  const complete: string[] = [];
  let currentSentence = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    currentSentence += char;

    // Check for definition sentence ending: ";" or sentence-ending "."
    if (isDefinitionSentenceEnding(text, i)) {
      complete.push(currentSentence.trim());
      currentSentence = '';
    }
  }

  const incomplete = currentSentence.trim() || null;
  return { complete, incomplete };
}

/**
 * Checks if a character is a semicolon (including Unicode variants).
 * Handles: ; (regular), ； (fullwidth), ⁏ (reversed)
 */
function isSemicolon(char: string): boolean {
  return char === ';' || char === '；' || char === '⁏';
}

/**
 * Checks if a character at the given position ends a definition sentence.
 * Returns true for:
 * - Semicolon (;) - common definition terminator (including Unicode variants)
 * - Sentence-ending period (.) - using existing logic
 */
function isDefinitionSentenceEnding(text: string, index: number): boolean {
  const char = text[index];

  // Semicolon always ends a definition sentence (including Unicode variants)
  if (isSemicolon(char)) {
    return true;
  }

  // Period - use existing sentence-ending detection
  if (isPeriod(char)) {
    return isSentenceEndingPeriod(text, index);
  }

  return false;
}

/**
 * Extracts sentences with definition-aware handling.
 * Uses semicolon-as-terminator for sections within the definition section,
 * and standard extraction for all other sections.
 *
 * @param sectionNodes - All document sections
 * @param definitionSectionNumber - The section number of the definition section (e.g., "1.1")
 * @returns Array of extracted sentences
 */
export function extractSentencesWithDefinitionAwareness(
  sectionNodes: SectionNode[],
  definitionSectionNumber: string | undefined
): ExtractedSentence[] {
  const sentences: ExtractedSentence[] = [];
  const normalizedDefSection = definitionSectionNumber
    ? normalizeSectionNumber(definitionSectionNumber)
    : null;

  for (const node of sectionNodes) {
    extractSentencesWithDefinitionAwarenessFromNode(
      node,
      sentences,
      normalizedDefSection
    );
  }

  return sentences;
}

/**
 * Recursively extracts sentences, switching to definition mode when inside
 * the definition section.
 *
 * Key logic:
 * - If inside definition section: use semicolon as sentence terminator, no parent-child combining
 * - If outside definition section: use standard extraction with parent-child combining
 * - BUT: must check each child recursively in case definition section is nested
 */
function extractSentencesWithDefinitionAwarenessFromNode(
  node: SectionNode,
  sentences: ExtractedSentence[],
  definitionSectionNumber: string | null
): void {
  const normalizedNodeSection = normalizeSectionNumber(node.sectionNumber);

  // Check if this node is the definition section or a child of it
  const isInDefinitionSection = definitionSectionNumber && (
    normalizedNodeSection === definitionSectionNumber ||
    normalizedNodeSection.startsWith(definitionSectionNumber)
  );

  // Check if any child might contain the definition section
  // (definition section number starts with this section's number)
  const mightContainDefinitionSection = definitionSectionNumber &&
    definitionSectionNumber.startsWith(normalizedNodeSection) &&
    definitionSectionNumber !== normalizedNodeSection;

  if (isInDefinitionSection) {
    // === DEFINITION MODE ===
    // Use semicolon as terminator, no parent-child combining
    // Process main text and additional paragraphs separately

    // Process main text
    if (node.text && node.text.trim()) {
      const mainExtracted = extractDefinitionSentencesFromText(node.text);

      for (const sent of mainExtracted.complete) {
        sentences.push({
          sentence: sent,
          sectionReference: `Section ${node.sectionNumber}`,
          isInDefinitionSection: true
        });
      }

      if (mainExtracted.incomplete) {
        sentences.push({
          sentence: mainExtracted.incomplete,
          sectionReference: `Section ${node.sectionNumber}`,
          isInDefinitionSection: true
        });
      }
    }

    // Process each additional paragraph separately (each is typically one definition)
    if (node.additionalParagraphs && node.additionalParagraphs.length > 0) {
      for (const paragraph of node.additionalParagraphs) {
        if (paragraph && paragraph.trim()) {
          const paraExtracted = extractDefinitionSentencesFromText(paragraph);

          for (const sent of paraExtracted.complete) {
            sentences.push({
              sentence: sent,
              sectionReference: `Section ${node.sectionNumber}`,
              isInDefinitionSection: true
            });
          }

          if (paraExtracted.incomplete) {
            sentences.push({
              sentence: paraExtracted.incomplete,
              sectionReference: `Section ${node.sectionNumber}`,
              isInDefinitionSection: true
            });
          }
        }
      }
    }

    // Process children independently (definition mode continues)
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        extractSentencesWithDefinitionAwarenessFromNode(
          child,
          sentences,
          definitionSectionNumber
        );
      }
    }
  } else if (mightContainDefinitionSection) {
    // === MIXED MODE ===
    // This section is NOT in definition section, but a child might be
    // Process this node's text with standard extraction, then recurse on children
    const nodeText = getNodeText(node);
    const textSentences = extractSentencesFromText(nodeText);

    // Add complete sentences from this node
    for (const sent of textSentences.complete) {
      sentences.push({
        sentence: sent,
        sectionReference: `Section ${node.sectionNumber}`
      });
    }

    // Handle incomplete text - but we can't combine with children since
    // children need definition-aware processing
    if (textSentences.incomplete) {
      // Check if we have children to potentially combine with
      if (node.children && node.children.length > 0) {
        // We need to be careful here: some children might be in definition section
        // For now, extract incomplete text as-is if any child is the definition section
        const firstChild = node.children[0];
        const firstChildNormalized = firstChild ? normalizeSectionNumber(firstChild.sectionNumber) : '';
        const firstChildIsDefinition = definitionSectionNumber && (
          firstChildNormalized === definitionSectionNumber ||
          firstChildNormalized.startsWith(definitionSectionNumber)
        );

        if (firstChildIsDefinition) {
          // First child is definition section - don't combine
          sentences.push({
            sentence: textSentences.incomplete,
            sectionReference: `Section ${node.sectionNumber}`
          });
        } else {
          // First child is not definition section - use standard combining
          // but only for this one combination
          for (const child of node.children) {
            const childNormalized = normalizeSectionNumber(child.sectionNumber);
            const childIsOrContainsDefinition = definitionSectionNumber && (
              childNormalized === definitionSectionNumber ||
              childNormalized.startsWith(definitionSectionNumber) ||
              definitionSectionNumber.startsWith(childNormalized)
            );

            if (childIsOrContainsDefinition) {
              // This child is or contains definition section - process independently
              extractSentencesWithDefinitionAwarenessFromNode(
                child,
                sentences,
                definitionSectionNumber
              );
            } else {
              // Standard extraction for this child (with parent combining)
              const childSentences = extractSentenceWithChild(
                textSentences.incomplete,
                child
              );
              sentences.push(...childSentences);
            }
          }
          return; // Children already processed
        }
      } else {
        // No children - extract incomplete text as-is
        sentences.push({
          sentence: textSentences.incomplete,
          sectionReference: `Section ${node.sectionNumber}`
        });
      }
    }

    // Recursively process children with definition awareness
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        extractSentencesWithDefinitionAwarenessFromNode(
          child,
          sentences,
          definitionSectionNumber
        );
      }
    }
  } else {
    // === STANDARD MODE ===
    // This section and none of its children are in definition section
    // Use standard extraction (with parent-child combining)
    extractSentencesFromNode(node, sentences);
  }
}

// Additional helper functions for compatibility with existing code

export function extractSentencesFromSections(
  nodes: SectionNode[],
  sectionNumbers: string[]
): ExtractedSentence[] {
  const allSentences: ExtractedSentence[] = [];
  
  const normalizedSectionNumbers = sectionNumbers.map(normalizeSectionNumber);
  
  for (const sectionNumber of normalizedSectionNumbers) {
    const section = findSection(nodes, sectionNumber);
    if (section) {
      const sectionSentences = extractSentencesFromSingleNode(section);
      allSentences.push(...sectionSentences);
    }
  }
  
  return allSentences;
}

export function getSentenceCount(nodes: SectionNode[]): number {
  return extractSentences(nodes).length;
}

export function buildFullTextFromSections(
  nodes: SectionNode[],
  sectionNumbers: string[]
): string {
  let fullText = '';
  
  const normalizedSectionNumbers = sectionNumbers.map(normalizeSectionNumber);
  
  for (const sectionNumber of normalizedSectionNumbers) {
    const section = findSection(nodes, sectionNumber);
    if (section) {
      fullText += buildFullSectionText(section) + '\r\r';
    }
  }
  
  return fullText.trim();
}

export function findSection(nodes: SectionNode[], targetNumber: string): SectionNode | null {
  const normalizedTarget = normalizeSectionNumber(targetNumber);
  
  for (const node of nodes) {
    const normalizedNode = normalizeSectionNumber(node.sectionNumber);
    
    if (normalizedNode === normalizedTarget) {
      return node;
    }
    
    if (node.children) {
      const found = findSection(node.children, targetNumber);
      if (found) return found;
    }
  }
  return null;
}

function normalizeSectionNumber(section: string): string {
  if (!section) return section;
  const trimmed = section.trim();
  if (trimmed === 'NOT FOUND' || trimmed === '') return trimmed;
  return trimmed.endsWith('.') ? trimmed : trimmed + '.';
}

export { normalizeSectionNumber };

// ================================================
// SECTION TREE UTILITIES (SHARED ACROSS MODULES)
// ================================================

export function findTopLevelSection(
  targetSectionNum: string,
  structure: SectionNode[]
): SectionNode | null {
  for (const topLevel of structure) {
    if (topLevel.sectionNumber === targetSectionNum) {
      return topLevel;
    }
    
    if (sectionExistsInTree(targetSectionNum, topLevel.children || [])) {
      return topLevel;
    }
  }
  
  return null;
}

export function sectionExistsInTree(
  targetSectionNum: string,
  nodes: SectionNode[]
): boolean {
  for (const node of nodes) {
    if (node.sectionNumber === targetSectionNum) {
      return true;
    }
    if (node.children && sectionExistsInTree(targetSectionNum, node.children)) {
      return true;
    }
  }
  return false;
}

export function buildFullSectionText(section: SectionNode): string {
  let text = `${section.sectionNumber} ${section.text}`;
  
  if (section.additionalParagraphs && section.additionalParagraphs.length > 0) {
    text += '\n' + section.additionalParagraphs.join('\n');
  }
  
  if (section.children && section.children.length > 0) {
    for (const child of section.children) {
      text += '\n' + buildFullSectionText(child);
    }
  }
  
  return text;
}