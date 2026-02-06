/**
 * Selection Context Builder
 * 
 * Detects what the user has selected in Word and builds the appropriate
 * context for LLM prompting.
 * 
 * Handles 4 scenarios:
 * (i) No selection → NoSelectionContext
 * (ii) Plain text (no annotations) → PlainTextSelectionContext  
 * (iii) Track changes → TrackChangeSelectionContext
 * (iv) Comments → CommentSelectionContext
 * (v) Mixed → MixedAnnotationContext
 */

import type { DocumentNodeWithRange } from '../types/documents';
import type { FilterableAnnotations } from '../utils/annotationFilter';
import type {
  SelectionContext,
  TrackChangeForLLM,
  CommentForLLM,
  FullSentenceDeletionForLLM,
  FullSentenceInsertionForLLM,
} from '../types/selectionContext';
import {
  getSelectionWithCoordinates,
  findAnnotationsInSelection,
  buildCombinedDocumentFromStructure,
  mapSelectionToSections,
} from '../utils/annotationFilter';

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Build selection context based on current Word selection
 * 
 * @param annotations - Pre-extracted document annotations
 * @param combinedStructure - Parsed document structure
 * @param recitals - Recitals/preamble text
 * @returns SelectionContext for the current selection
 */
export async function buildSelectionContext(
  annotations: FilterableAnnotations | null,
  combinedStructure: DocumentNodeWithRange[] | null,
  recitals?: string
): Promise<SelectionContext> {
  // Get current selection from Word
  const selection = await getSelectionWithCoordinates();

  // Scenario (i): No selection
  if (!selection || !selection.text.trim()) {
    return { type: 'none' };
  }

  const selectedText = selection.text;

  // If no annotations or structure, return plain text context
  if (!annotations || !combinedStructure || combinedStructure.length === 0) {
    return {
      type: 'plain-text',
      selectedText,
      topLevelSection: 'unknown',
      sectionContext: selectedText,
    };
  }

  // Find annotations in selection
  const matchedAnnotations = findAnnotationsInSelection(
    selectedText,
    annotations,
    { startOffset: selection.startOffset, endOffset: selection.endOffset },
    combinedStructure,
    recitals
  );

  // Determine which sections are covered
  const { combinedDocument, sectionPositions } = buildCombinedDocumentFromStructure(
    combinedStructure,
    recitals
  );
  const coveredSections = mapSelectionToSections(selectedText, combinedDocument, sectionPositions);
  
  // Get top-level section (use first covered section)
  const topLevelSection = coveredSections.length > 0 
    ? String(coveredSections[0].topLevelSection)
    : 'unknown';

  // Build section context (full text of the top-level section)
  const sectionContext = buildSectionContext(combinedStructure, topLevelSection);

  // Check what annotations exist
  const hasTrackChanges = 
    matchedAnnotations.wordLevelTrackChanges.length > 0 ||
    matchedAnnotations.fullSentenceDeletions.length > 0 ||
    matchedAnnotations.fullSentenceInsertions.length > 0;
  
  const hasComments = matchedAnnotations.comments.length > 0;

  // Scenario (v): Mixed - both track changes AND comments
  if (hasTrackChanges && hasComments) {
    return {
      type: 'mixed',
      selectedText,
      topLevelSection,
      sectionContext,
      trackChanges: formatTrackChangesForLLM(matchedAnnotations.wordLevelTrackChanges),
      fullSentenceDeletions: formatFullSentenceDeletionsForLLM(matchedAnnotations.fullSentenceDeletions),
      fullSentenceInsertions: formatFullSentenceInsertionsForLLM(matchedAnnotations.fullSentenceInsertions),
      comments: formatCommentsForLLM(matchedAnnotations.comments),
    };
  }

  // Scenario (iii): Track changes only
  if (hasTrackChanges) {
    return {
      type: 'track-changes',
      selectedText,
      topLevelSection,
      sectionContext,
      trackChanges: formatTrackChangesForLLM(matchedAnnotations.wordLevelTrackChanges),
      fullSentenceDeletions: formatFullSentenceDeletionsForLLM(matchedAnnotations.fullSentenceDeletions),
      fullSentenceInsertions: formatFullSentenceInsertionsForLLM(matchedAnnotations.fullSentenceInsertions),
    };
  }

  // Scenario (iv): Comments only
  if (hasComments) {
    return {
      type: 'comments',
      selectedText,
      topLevelSection,
      sectionContext,
      comments: formatCommentsForLLM(matchedAnnotations.comments),
    };
  }

  // Scenario (ii): Plain text (has selection but no annotations)
  return {
    type: 'plain-text',
    selectedText,
    topLevelSection,
    sectionContext,
  };
}

// ============================================================================
// FORMATTERS
// ============================================================================

/**
 * Format word-level track changes for LLM prompt
 */
function formatTrackChangesForLLM(
  trackChanges: FilterableAnnotations['trackChanges']['wordLevelTrackChanges']
): TrackChangeForLLM[] {
  return trackChanges.map(tc => ({
    originalSentence: tc.originalSentence || '',
    amendedSentence: tc.amendedSentence || '',
    added: tc.added.map(a => a.text),
    deleted: tc.deleted.map(d => d.text),
    sectionNumber: tc.sectionNumber,
    topLevelSection: tc.topLevelSectionNumber || extractTopLevel(tc.sectionNumber),
  }));
}

/**
 * Format full sentence deletions for LLM
 */
function formatFullSentenceDeletionsForLLM(
  deletions: FilterableAnnotations['trackChanges']['fullSentenceDeletions']
): FullSentenceDeletionForLLM[] {
  return deletions.map(fsd => ({
    deletedText: fsd.deletedText,
    sectionNumber: fsd.sectionNumber || 'unknown',
    topLevelSection: fsd.topLevelSectionNumber || extractTopLevel(fsd.sectionNumber || ''),
  }));
}

/**
 * Format full sentence insertions for LLM
 */
function formatFullSentenceInsertionsForLLM(
  insertions: FilterableAnnotations['trackChanges']['fullSentenceInsertions']
): FullSentenceInsertionForLLM[] {
  return (insertions || []).map(fsi => ({
    insertedText: fsi.insertedText,
    sectionNumber: fsi.sectionNumber || 'unknown',
    topLevelSection: fsi.inferredTopLevelSection || extractTopLevel(fsi.sectionNumber || ''),
  }));
}

/**
 * Format comments for LLM prompt
 */
function formatCommentsForLLM(
  comments: FilterableAnnotations['comments']
): CommentForLLM[] {
  return comments.map(c => ({
    selectedText: c.selectedText,
    commentContent: c.commentContent,
    replies: c.replies?.map(r => r.content) || [],
    sectionNumber: c.sectionNumber,
    topLevelSection: c.topLevelSectionNumbers?.[0] || extractTopLevel(c.sectionNumber),
  }));
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract top-level section number from full section number
 * e.g., "8.2.1" → "8"
 */
function extractTopLevel(sectionNumber: string): string {
  if (!sectionNumber) return 'unknown';
  const match = sectionNumber.match(/^(\d+)/);
  return match ? match[1] : 'unknown';
}

/**
 * Build full section context text from structure
 */
function buildSectionContext(
  structure: DocumentNodeWithRange[],
  topLevelSection: string
): string {
  if (topLevelSection === 'unknown') return '';

  const topLevelNum = parseInt(topLevelSection, 10);
  if (isNaN(topLevelNum)) return '';

  // Find the top-level section node
  const sectionNode = structure.find(node => {
    const nodeTopLevel = extractTopLevel(node.sectionNumber);
    return nodeTopLevel === topLevelSection;
  });

  if (!sectionNode) return '';

  // Build full text recursively
  return buildFullSectionText(sectionNode);
}

/**
 * Recursively build full text of a section including children
 */
function buildFullSectionText(node: DocumentNodeWithRange): string {
  const parts: string[] = [];

  // Add section header
  const headerText = node.combinedText || node.text || '';
  if (headerText) {
    parts.push(`${node.sectionNumber} ${headerText}`);
  }

  // Add additional paragraphs
  const additionalParas = node.combinedAdditionalParagraphs || node.additionalParagraphs || [];
  for (const para of additionalParas) {
    if (para) parts.push(para);
  }

  // Add children recursively
  if (node.children) {
    for (const child of node.children) {
      parts.push(buildFullSectionText(child));
    }
  }

  return parts.join('\n');
}

// ============================================================================
// PROMPT FORMATTER
// ============================================================================

/**
 * Format selection context into a string for LLM prompt
 */
export function formatSelectionContextForPrompt(context: SelectionContext): string {
  if (context.type === 'none') {
    return ''; // No selection context
  }

  const parts: string[] = [];

  parts.push('=== SELECTED TEXT ===');
  parts.push(context.selectedText);
  parts.push('');

  if (context.topLevelSection !== 'unknown') {
    parts.push(`=== LOCATION ===`);
    parts.push(`Section: ${context.topLevelSection}`);
    parts.push('');
  }

  if (context.type === 'track-changes' || context.type === 'mixed') {
    if (context.trackChanges.length > 0) {
      parts.push('=== TRACK CHANGES ===');
      for (const tc of context.trackChanges) {
        parts.push(`Original: "${tc.originalSentence}"`);
        parts.push(`Amended: "${tc.amendedSentence}"`);
        if (tc.deleted.length > 0) {
          parts.push(`Deleted: ${tc.deleted.map(d => `"${d}"`).join(', ')}`);
        }
        if (tc.added.length > 0) {
          parts.push(`Added: ${tc.added.map(a => `"${a}"`).join(', ')}`);
        }
        parts.push('');
      }
    }

    if (context.fullSentenceDeletions.length > 0) {
      parts.push('=== FULL SENTENCE DELETIONS ===');
      for (const fsd of context.fullSentenceDeletions) {
        parts.push(`Deleted: "${fsd.deletedText}"`);
      }
      parts.push('');
    }

    if (context.fullSentenceInsertions.length > 0) {
      parts.push('=== FULL SENTENCE INSERTIONS ===');
      for (const fsi of context.fullSentenceInsertions) {
        parts.push(`Inserted: "${fsi.insertedText}"`);
      }
      parts.push('');
    }
  }

  if (context.type === 'comments' || context.type === 'mixed') {
    parts.push('=== COMMENTS ===');
    for (const c of context.comments) {
      parts.push(`Selected Text: "${c.selectedText}"`);
      parts.push(`Comment: "${c.commentContent}"`);
      if (c.replies.length > 0) {
        parts.push(`Replies: ${c.replies.map(r => `"${r}"`).join(', ')}`);
      }
      parts.push('');
    }
  }

  if (context.sectionContext) {
    parts.push('=== SECTION CONTEXT ===');
    parts.push(context.sectionContext);
  }

  return parts.join('\n');
}

// ============================================================================
// SOURCE ANNOTATION BUILDERS (for rendering, preserves offsets)
// ============================================================================

import type { 
  WordLevelTrackChangeResults,
  FullSentenceDeletion,
  FullSentenceInsertion,
  CommentExtractionResult,
  HighlightExtractionResult,
} from '../types/documents';

/**
 * Source annotation types for rendering with precise offsets.
 * Unlike ForLLM types, these preserve offset information.
 */
export interface SourceAnnotationTrackChange {
  type: 'trackChange';
  annotationId: string;
  sectionNumber: string;
  originalSentence: string;
  amendedSentence: string;
  deleted: Array<{ text: string; startOffset: number; endOffset: number }>;
  added: Array<{ text: string; startOffset: number; endOffset: number }>;
  /** For multi-section sentences: maps section contributions to sentence positions */
  sentenceFragments?: Array<{
    sectionNumber: string;
    cumulativeStartOffset: number;
    sectionStartOffset: number;
    sectionEndOffset: number;
  }>;
}

export interface SourceAnnotationComment {
  type: 'comment';
  annotationId: string;
  sectionNumber: string;
  selectedText: string;
  commentContent: string;
  startOffset: number;
  endOffset: number;
  /** The full sentence containing the selected text (from deepest section) - used for locating */
  affectedSentence?: string;
}

export interface SourceAnnotationFullSentenceDeletion {
  type: 'fullSentenceDeletion';
  annotationId: string;
  sectionNumber: string;
  deletedText: string;
  startOffset: number;
  endOffset: number;
}

export interface SourceAnnotationFullSentenceInsertion {
  type: 'fullSentenceInsertion';
  annotationId: string;
  sectionNumber: string;
  insertedText: string;
  startOffset: number;
  endOffset: number;
}

export type SourceAnnotation =
  | SourceAnnotationTrackChange
  | SourceAnnotationComment
  | SourceAnnotationFullSentenceDeletion
  | SourceAnnotationFullSentenceInsertion;

/**
 * Build SourceAnnotation from word-level track change.
 * Preserves section-relative offsets for rendering.
 */
export function buildSourceAnnotationFromTrackChange(
  tc: WordLevelTrackChangeResults
): SourceAnnotationTrackChange {
  return {
    type: 'trackChange',
    annotationId: tc.sentenceId,
    sectionNumber: tc.sectionNumber,
    originalSentence: tc.originalSentence || '',
    amendedSentence: tc.amendedSentence || '',
    deleted: tc.deleted.map(d => ({
      text: d.text,
      startOffset: d.startOffset ?? 0,
      endOffset: d.endOffset ?? d.text.length,
    })),
    added: tc.added.map(a => ({
      text: a.text,
      startOffset: a.startOffset ?? 0,
      endOffset: a.endOffset ?? a.text.length,
    })),
    sentenceFragments: tc.sentenceFragments?.map(f => ({
      sectionNumber: f.sectionNumber,
      textFragment: f.textFragment || '',
      cumulativeStartOffset: f.cumulativeStartOffset,
      sectionStartOffset: f.sectionStartOffset,
      sectionEndOffset: f.sectionEndOffset,
    })),
  };
}

/**
 * Build SourceAnnotation from comment.
 * Includes affectedSentence for locate functionality.
 */
export function buildSourceAnnotationFromComment(
  comment: CommentExtractionResult
): SourceAnnotationComment {
  // Get the first affected sentence (from the deepest section level)
  const affectedSentence = comment.affectedSentences?.[0]?.sentence || '';

  return {
    type: 'comment',
    annotationId: comment.commentId,
    sectionNumber: comment.sectionNumber || comment.topLevelSectionNumbers?.[0] || '',
    selectedText: comment.selectedText || '',
    commentContent: comment.commentContent || '',
    startOffset: comment.startOffset ?? 0,
    endOffset: comment.endOffset ?? (comment.selectedText?.length || 0),
    affectedSentence,
  };
}

/**
 * Build SourceAnnotation from full sentence deletion.
 */
export function buildSourceAnnotationFromFullSentenceDeletion(
  fsd: FullSentenceDeletion
): SourceAnnotationFullSentenceDeletion {
  return {
    type: 'fullSentenceDeletion',
    annotationId: fsd.id || `fsd-${fsd.sectionNumber}`,
    sectionNumber: fsd.sectionNumber,
    deletedText: fsd.deletedText || '',
    startOffset: fsd.startOffset ?? 0,
    endOffset: fsd.endOffset ?? (fsd.deletedText?.length || 0),
  };
}

/**
 * Build SourceAnnotation from full sentence insertion.
 */
export function buildSourceAnnotationFromFullSentenceInsertion(
  fsi: FullSentenceInsertion
): SourceAnnotationFullSentenceInsertion {
  return {
    type: 'fullSentenceInsertion',
    annotationId: fsi.id || `fsi-${fsi.sectionNumber || fsi.inferredTopLevelSection}`,
    sectionNumber: fsi.sectionNumber || fsi.inferredTopLevelSection || '',
    insertedText: fsi.insertedText || '',
    startOffset: fsi.startOffset ?? 0,
    endOffset: fsi.endOffset ?? (fsi.insertedText?.length || 0),
  };
}

// ============================================================================
// SENTENCE-RELATIVE OFFSET CONVERSION (for Module 4 Summary display)
// ============================================================================

/**
 * Convert section-relative offsets to sentence-relative offsets.
 * Use this when building SourceAnnotation for Module 4 (Summary display).
 * 
 * @param tc - Track change with section-relative offsets and sentenceFragments
 * @returns Track change with sentence-relative offsets
 */
export function convertOffsetsToSentenceRelative(
  tc: WordLevelTrackChangeResults
): WordLevelTrackChangeResults {
  const { sentenceFragments } = tc;

  // If no sentenceFragments, offsets are already usable (single-section sentence)
  if (!sentenceFragments || sentenceFragments.length === 0) {
    return tc;
  }

  /**
   * Convert a single offset from section-relative to sentence-relative
   */
  const convertOffset = (sectionNumber: string, sectionRelativeOffset: number): number => {
    const normalizedSection = sectionNumber.replace(/\.+$/, '');

    for (const fragment of sentenceFragments) {
      const fragmentSection = fragment.sectionNumber.replace(/\.+$/, '');

      if (fragmentSection === normalizedSection) {
        // Check if offset falls within this fragment's section range
        if (
          sectionRelativeOffset >= fragment.sectionStartOffset &&
          sectionRelativeOffset <= fragment.sectionEndOffset
        ) {
          // Convert: sentence position = cumulative start + (offset - section start)
          const offsetWithinFragment = sectionRelativeOffset - fragment.sectionStartOffset;
          return fragment.cumulativeStartOffset + offsetWithinFragment;
        }
      }
    }

    // Fallback: return original offset if no matching fragment found
    console.warn(
      `[convertOffsetsToSentenceRelative] No fragment found for section ${sectionNumber} offset ${sectionRelativeOffset}`
    );
    return sectionRelativeOffset;
  };

  return {
    ...tc,
    deleted: tc.deleted.map(d => ({
      ...d,
      startOffset: convertOffset(d.sectionNumber, d.startOffset),
      endOffset: convertOffset(d.sectionNumber, d.endOffset),
    })),
    added: tc.added.map(a => ({
      ...a,
      startOffset: convertOffset(a.sectionNumber, a.startOffset),
      endOffset: convertOffset(a.sectionNumber, a.endOffset),
    })),
  };
}

/**
 * Build SourceAnnotation from track change with SENTENCE-RELATIVE offsets.
 * Use this for Module 4 Summary display.
 */
export function buildSourceAnnotationFromTrackChangeForSummary(
  tc: WordLevelTrackChangeResults
): SourceAnnotationTrackChange {
  // First convert to sentence-relative
  const converted = convertOffsetsToSentenceRelative(tc);

  return {
    type: 'trackChange',
    annotationId: converted.sentenceId,
    sectionNumber: converted.sectionNumber,
    originalSentence: converted.originalSentence || '',
    amendedSentence: converted.amendedSentence || '',
    deleted: converted.deleted.map(d => ({
      text: d.text,
      startOffset: d.startOffset,
      endOffset: d.endOffset,
    })),
    added: converted.added.map(a => ({
      text: a.text,
      startOffset: a.startOffset,
      endOffset: a.endOffset,
    })),
    sentenceFragments: converted.sentenceFragments?.map(f => ({
      sectionNumber: f.sectionNumber,
      cumulativeStartOffset: f.cumulativeStartOffset,
      sectionStartOffset: f.sectionStartOffset,
      sectionEndOffset: f.sectionEndOffset,
    })),
  };
}

/**
 * Build a map of all source annotations by ID.
 * Used when sending to backend so it can be passed through with LLM results.
 */
export function buildSourceAnnotationMap(
  annotations: FilterableAnnotations
): Record<string, SourceAnnotation> {
  const map: Record<string, SourceAnnotation> = {};

  // Track changes
  for (const tc of annotations.trackChanges.wordLevelTrackChanges) {
    map[tc.sentenceId] = buildSourceAnnotationFromTrackChange(tc);
  }

  // Comments
  for (const c of annotations.comments) {
    map[c.commentId] = buildSourceAnnotationFromComment(c);
  }

  // Full sentence deletions
  for (const fsd of annotations.trackChanges.fullSentenceDeletions || []) {
    const id = fsd.id || `fsd-${fsd.sectionNumber}`;
    map[id] = buildSourceAnnotationFromFullSentenceDeletion(fsd);
  }

  // Full sentence insertions
  for (const fsi of annotations.trackChanges.fullSentenceInsertions || []) {
    const id = fsi.id || `fsi-${fsi.sectionNumber || fsi.inferredTopLevelSection}`;
    map[id] = buildSourceAnnotationFromFullSentenceInsertion(fsi);
  }

  return map;
}