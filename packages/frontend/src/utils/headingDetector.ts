/**
 * Heading Detection Utility
 *
 * Detects section headings in legal documents based on capitalization patterns.
 * Used by documentParser.ts to separate headings from content in DocumentNode.
 *
 * Rules:
 * 1. ALL CAPS → heading (e.g., "DEFINITIONS", "CONFIDENTIALITY")
 * 2. Single capitalized word → heading (e.g., "Confidentiality")
 * 3. Title Case (80%+ significant words capitalized, 2+ words) → heading 
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Small connector words that are typically lowercase in Title Case headings.
 * These are ignored when calculating the Title Case percentage.
 * Note: The first word is always checked regardless of whether it's in this list.
 */
const HEADING_IGNORE_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from',
  'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'with', 'yet'
]);

// ============================================================================
// TYPES
// ============================================================================

export interface HeadingDetectionResult {
  /** The detected heading text, or null if no heading found */
  heading: string | null;
  /** The remaining content after the heading */
  content: string;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Detects if the beginning of text is a section heading.
 * The punctuation (. or :) is included in the heading.
 *
 * IMPORTANT: A heading is ONLY detected if followed by "." or ":".
 * Text followed by "," is NOT a heading.
 *
 * Examples:
 * - "Initial Franchise Fee. The Franchisee shall pay..."
 *   → { heading: "Initial Franchise Fee.", content: "The Franchisee shall pay..." }
 *
 * - "Confidentiality. The parties agree..."
 *   → { heading: "Confidentiality.", content: "The parties agree..." }
 *
 * - "DEFINITIONS: In this Agreement..."
 *   → { heading: "DEFINITIONS:", content: "In this Agreement..." }
 *
 * - "Upon the Completion, the Parties shall..."
 *   → { heading: null, content: "Upon the Completion, the Parties shall..." }
 *   (NOT a heading because followed by comma, not period)
 *
 * - "The parties agree to the following terms."
 *   → { heading: null, content: "The parties agree to the following terms." }
 *
 * @param fullText The full text of a section node
 * @returns Object with detected heading (if any) and remaining content
 */
export function detectHeading(fullText: string): HeadingDetectionResult {
  if (!fullText || fullText.trim().length === 0) {
    return { heading: null, content: fullText || '' };
  }

  const trimmed = fullText.trim();

  // First, check if the text starts with a pattern that LOOKS like a heading but is followed by a comma.
  // Pattern: Title Case text followed by comma - NOT a heading
  // Example: "Upon the Completion, the Parties shall..." - comma after potential heading
  const commaCheck = trimmed.match(/^([A-Z][A-Za-z\s]+?),\s/);
  if (commaCheck) {
    const potentialHeading = commaCheck[1].trim();
    // If this looks like a heading (Title Case) but is followed by comma, reject it
    if (isTitleCase(potentialHeading) || isSingleCapitalizedWord(potentialHeading)) {
      // This is NOT a heading - it's followed by comma, not period
      return { heading: null, content: fullText };
    }
  }

  // Try to split at first "." or ":" (ONLY these count as heading terminators)
  // Capture: (text before punctuation)(punctuation)(text after)
  // Using [\s\S]* instead of .* with 's' flag for cross-environment compatibility
  const match = trimmed.match(/^([^.:]+)([.:])(\s*)([\s\S]*)$/);

  if (!match) {
    // No "." or ":" found - check if entire text is a heading (standalone heading)
    // But first, reject if it ends with a comma (incomplete phrase)
    if (trimmed.endsWith(',')) {
      return { heading: null, content: fullText };
    }
    if (isAllCaps(trimmed) || isSingleCapitalizedWord(trimmed) || isTitleCase(trimmed)) {
      return { heading: trimmed, content: '' };
    }
    return { heading: null, content: fullText };
  }

  const beforePunctuation = match[1].trim();
  const punctuation = match[2];  // "." or ":" (comma is never matched)
  const afterPunctuation = match[4].trim();

  // Check if the text before punctuation qualifies as a heading
  // If so, include the punctuation in the heading
  if (isAllCaps(beforePunctuation)) {
    return { heading: beforePunctuation + punctuation, content: afterPunctuation };
  }

  if (isSingleCapitalizedWord(beforePunctuation)) {
    return { heading: beforePunctuation + punctuation, content: afterPunctuation };
  }

  if (isTitleCase(beforePunctuation)) {
    return { heading: beforePunctuation + punctuation, content: afterPunctuation };
  }

  // Not a heading - return original text as content
  return { heading: null, content: fullText };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Checks if text is ALL CAPS (all letters are uppercase).
 *
 * Examples:
 * - "DEFINITIONS" → true
 * - "PURCHASE PRICE" → true
 * - "Purchase Price" → false
 * - "123" → false (no letters)
 *
 * @param text The text to check
 * @returns true if all letters are uppercase
 */
export function isAllCaps(text: string): boolean {
  const lettersOnly = text.replace(/[^a-zA-Z]/g, '');

  // Must have at least one letter
  if (lettersOnly.length === 0) {
    return false;
  }

  return lettersOnly === lettersOnly.toUpperCase();
}

/**
 * Checks if text is a single capitalized word.
 *
 * Examples:
 * - "Confidentiality" → true
 * - "Definitions" → true
 * - "Initial Franchise Fee" → false (multiple words)
 * - "confidentiality" → false (starts with lowercase)
 *
 * @param text The text to check
 * @returns true if text is a single word starting with capital letter
 */
export function isSingleCapitalizedWord(text: string): boolean {
  const words = text.trim().split(/\s+/);

  // Must be exactly one word
  if (words.length !== 1) {
    return false;
  }

  const word = words[0];
  const lettersOnly = word.replace(/[^a-zA-Z]/g, '');

  // Must have at least one letter and start with capital
  if (lettersOnly.length === 0) {
    return false;
  }

  return /^[A-Z]/.test(lettersOnly);
}

/**
 * Checks if text is Title Case (most significant words start with capital).
 *
 * Rules:
 * - Must have at least 2 significant words
 * - At least 80% of significant words must start with a capital letter
 * - Connector words (a, an, the, of, etc.) are ignored except as the first word
 *
 * Examples:
 * - "Initial Franchise Fee" → true (3/3 significant words capitalized)
 * - "Term and Termination" → true ("and" ignored, 2/2 capitalized)
 * - "the quick brown fox" → false (only 1 significant word if "the" is first)
 * - "Purchase" → false (only 1 word, need at least 2)
 *
 * @param text The text to check
 * @returns true if text follows Title Case pattern
 */
export function isTitleCase(text: string): boolean {
  const words = text.split(/\s+/);

  if (words.length === 0) {
    return false;
  }

  let significantWordCount = 0;
  let titleCaseWordCount = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Remove punctuation from word for checking
    const cleanWord = word.replace(/[.,;:!?()[\]{}'"]/g, '');
    if (cleanWord.length === 0) {
      continue;
    }

    // Extract only letters for capitalization check
    const lettersOnly = cleanWord.replace(/[^a-zA-Z]/g, '');
    if (lettersOnly.length === 0) {
      continue;
    }

    // Check if this is a connector word (ignore except for first word)
    const lowerWord = lettersOnly.toLowerCase();
    if (i > 0 && HEADING_IGNORE_WORDS.has(lowerWord)) {
      continue;
    }

    // This is a significant word
    significantWordCount++;

    // Check if it starts with a capital letter
    if (/^[A-Z]/.test(lettersOnly)) {
      titleCaseWordCount++;
    }
  }

  // Must have at least 2 significant words to be considered Title Case
  if (significantWordCount < 2) {
    return false;
  }

  // At least 80% of significant words must be capitalized
  return titleCaseWordCount >= significantWordCount * 0.8;
}

/**
 * Checks if a single word starts with a capital letter.
 * Utility function for external use.
 *
 * @param word The word to check
 * @returns true if word starts with uppercase letter
 */
export function startsWithCapital(word: string): boolean {
  const lettersOnly = word.replace(/[^a-zA-Z]/g, '');
  if (lettersOnly.length === 0) {
    return false;
  }
  return /^[A-Z]/.test(lettersOnly);
}
