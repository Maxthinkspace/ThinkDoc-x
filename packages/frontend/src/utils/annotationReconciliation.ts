/**
 * Annotation Reconciliation Utility
 *
 * This module provides functionality to preserve user's annotation selections
 * when the document cache is refreshed due to document changes.
 *
 * The approach:
 * 1. When refresh happens, document is re-parsed and annotations are re-extracted
 * 2. We compare previously selected annotations with newly extracted annotations
 * 3. If an annotation is UNCHANGED (all fields match), it stays selected
 * 4. If an annotation changed in ANY way, it's removed from selection
 *
 * For comments and highlights: strict exact match (all fields must be identical).
 *
 * For word-level track changes: SUBSET matching is used because track changes
 * are grouped by sentence. If the user adds new edits to a sentence that already
 * has track changes, the existing changes are preserved as long as their original
 * deleted/added items still exist in the new version.
 */

import type { FilterableAnnotations } from './annotationFilter';
import type {
  CommentExtractionResult,
  HighlightExtractionResult,
  WordLevelTrackChangeResults,
  FullSentenceDeletion,
  FullSentenceInsertion,
  StructuralChange,
} from '../types/documents';
import type { AnnotationScope, SelectionRange, AnnotationPreview } from '../types/annotationScope';

// ============================================================================
// ANNOTATION SERIALIZATION
// ============================================================================

/**
 * Serialize a comment to a stable string (excluding auto-generated fields).
 * Two comments are "the same" if their serialization matches.
 *
 * NOTE: We exclude offsets because they change when text is added/removed
 * elsewhere in the document, even if this specific annotation is unchanged.
 */
function serializeComment(comment: CommentExtractionResult): string {
  return JSON.stringify({
    // commentId is from Word's OOXML - should be stable
    commentId: comment.commentId,
    sectionNumber: comment.sectionNumber,
    selectedText: comment.selectedText,
    commentContent: comment.commentContent,
    author: comment.author,
    // EXCLUDE offsets - they shift when other parts of document change
  });
}

/**
 * Serialize a highlight to a stable string.
 * Note: highlightId is auto-generated and changes on each extraction, so we exclude it.
 *
 * NOTE: We exclude offsets because they change when text is added/removed
 * elsewhere in the document, even if this specific annotation is unchanged.
 */
function serializeHighlight(highlight: HighlightExtractionResult): string {
  return JSON.stringify({
    // Exclude highlightId - it's auto-generated (ooxml-hl-0, etc.)
    sectionNumber: highlight.sectionNumber,
    selectedText: highlight.selectedText,
    highlightColor: highlight.highlightColor,
    // EXCLUDE offsets - they shift when other parts of document change
  });
}

/**
 * Serialize a single change item (deleted or added) for comparison.
 */
function serializeChangeItem(item: { text: string; sectionNumber: string }): string {
  return JSON.stringify({
    text: item.text,
    sectionNumber: item.sectionNumber,
    // EXCLUDE offsets - they shift when other parts of document change
  });
}

/**
 * Check if an old word-level track change is "contained in" a new one.
 *
 * Track changes are grouped by sentence, so adding new text to a sentence
 * modifies the existing track change object. We need subset matching:
 * - The OLD annotation is preserved if ALL its original deleted/added items
 *   still exist in the NEW annotation
 * - The NEW annotation may have additional items (user added more edits)
 *   but that doesn't invalidate the original selection
 *
 * Returns the matching new track change if all items are found, null otherwise.
 */
function findMatchingWordLevelTrackChange(
  oldTc: WordLevelTrackChangeResults,
  newTrackChanges: WordLevelTrackChangeResults[]
): WordLevelTrackChangeResults | null {
  // Find candidates in the same section
  const candidates = newTrackChanges.filter(
    newTc => newTc.sectionNumber === oldTc.sectionNumber
  );

  if (candidates.length === 0) {
    console.log(`[Reconciliation]       No candidates in section ${oldTc.sectionNumber}`);
    return null;
  }

  for (const candidate of candidates) {
    // Check if ALL old deleted items exist in the candidate
    const candidateDeletedSet = new Set(
      candidate.deleted.map(d => serializeChangeItem(d))
    );
    const allDeletedFound = oldTc.deleted.every(
      oldD => candidateDeletedSet.has(serializeChangeItem(oldD))
    );

    if (!allDeletedFound) {
      console.log(`[Reconciliation]       Candidate ${candidate.sentenceId} missing some deleted items`);
      continue;
    }

    // Check if ALL old added items exist in the candidate
    const candidateAddedSet = new Set(
      candidate.added.map(a => serializeChangeItem(a))
    );
    const allAddedFound = oldTc.added.every(
      oldA => candidateAddedSet.has(serializeChangeItem(oldA))
    );

    if (!allAddedFound) {
      console.log(`[Reconciliation]       Candidate ${candidate.sentenceId} missing some added items`);
      continue;
    }

    // Found a match!
    console.log(`[Reconciliation]       Found match: ${candidate.sentenceId}`);
    if (candidate.deleted.length > oldTc.deleted.length ||
        candidate.added.length > oldTc.added.length) {
      console.log(`[Reconciliation]         New version has additional changes (old: ${oldTc.deleted.length} del/${oldTc.added.length} add, new: ${candidate.deleted.length} del/${candidate.added.length} add)`);
    }
    return candidate;
  }

  return null;
}

/**
 * Serialize a full sentence deletion to a stable string.
 *
 * NOTE: We exclude offsets because they change when text is added/removed
 * elsewhere in the document, even if this specific annotation is unchanged.
 */
function serializeFullSentenceDeletion(fsd: FullSentenceDeletion): string {
  return JSON.stringify({
    // Exclude id - it's auto-generated (fsd-0, etc.)
    sectionNumber: fsd.sectionNumber,
    topLevelSectionNumber: fsd.topLevelSectionNumber,
    deletedText: fsd.deletedText,
    // EXCLUDE offsets - they shift when other parts of document change
  });
}

/**
 * Serialize a full sentence insertion to a stable string.
 *
 * NOTE: We exclude offsets because they change when text is added/removed
 * elsewhere in the document, even if this specific annotation is unchanged.
 */
function serializeFullSentenceInsertion(fsi: FullSentenceInsertion): string {
  return JSON.stringify({
    // Exclude id - it's auto-generated (fsi-0, etc.)
    sectionNumber: fsi.sectionNumber,
    inferredTopLevelSection: fsi.inferredTopLevelSection,
    insertedText: fsi.insertedText,
    // EXCLUDE offsets - they shift when other parts of document change
  });
}

/**
 * Serialize a structural change to a stable string.
 */
function serializeStructuralChange(sc: StructuralChange): string {
  return JSON.stringify({
    type: sc.type,
    sectionNumber: sc.sectionNumber,
    sectionTitle: sc.sectionTitle,
    fullContent: sc.fullContent,
  });
}

// ============================================================================
// RECONCILIATION RESULT TYPES
// ============================================================================

export interface ReconciliationResult {
  /** Updated scope with reconciled selections */
  reconciledScope: AnnotationScope;
  /** Summary of what changed */
  summary: ReconciliationSummary;
}

export interface ReconciliationSummary {
  /** Selections that were preserved (annotation unchanged) */
  preserved: {
    comments: number;
    highlights: number;
    wordLevelTrackChanges: number;
    fullSentenceDeletions: number;
    fullSentenceInsertions: number;
    structuralChanges: number;
  };
  /** Selections that were removed (annotation changed or deleted) */
  removed: {
    comments: CommentExtractionResult[];
    highlights: HighlightExtractionResult[];
    wordLevelTrackChanges: WordLevelTrackChangeResults[];
    fullSentenceDeletions: FullSentenceDeletion[];
    fullSentenceInsertions: FullSentenceInsertion[];
    structuralChanges: StructuralChange[];
  };
  /** New annotations in the document (not previously selected) */
  added: {
    comments: number;
    highlights: number;
    wordLevelTrackChanges: number;
    fullSentenceDeletions: number;
    fullSentenceInsertions: number;
    structuralChanges: number;
  };
}

// ============================================================================
// MAIN RECONCILIATION FUNCTION
// ============================================================================

/**
 * Reconcile user's annotation selections with newly extracted annotations.
 *
 * This performs a STRICT comparison:
 * - If an annotation is exactly the same (all fields match), it stays selected
 * - If an annotation changed in ANY way, it's removed from selection
 *
 * @param oldScope - The user's current scope with selections
 * @param newAnnotations - Freshly extracted annotations from the document
 * @returns Reconciled scope and summary of changes
 */
export function reconcileAnnotationSelections(
  oldScope: AnnotationScope,
  newAnnotations: FilterableAnnotations
): ReconciliationResult {
  console.log('[Reconciliation] ========== STARTING RECONCILIATION ==========');
  console.log('[Reconciliation] Old scope mode:', oldScope.mode);
  console.log('[Reconciliation] Old scope ranges:', oldScope.ranges.length);

  // Build lookup sets for new annotations (using serialized strings as keys)
  const newCommentSet = new Map<string, CommentExtractionResult>();
  for (const c of newAnnotations.comments) {
    newCommentSet.set(serializeComment(c), c);
  }

  const newHighlightSet = new Map<string, HighlightExtractionResult>();
  for (const h of newAnnotations.highlights) {
    newHighlightSet.set(serializeHighlight(h), h);
  }

  // For word-level track changes, we use subset matching, not exact serialization
  // Store as array for the subset matching function
  const newWordLevelTcArray = newAnnotations.trackChanges.wordLevelTrackChanges;

  const newFsdSet = new Map<string, FullSentenceDeletion>();
  for (const fsd of newAnnotations.trackChanges.fullSentenceDeletions) {
    newFsdSet.set(serializeFullSentenceDeletion(fsd), fsd);
  }

  const newFsiSet = new Map<string, FullSentenceInsertion>();
  for (const fsi of newAnnotations.trackChanges.fullSentenceInsertions) {
    newFsiSet.set(serializeFullSentenceInsertion(fsi), fsi);
  }

  const newScSet = new Map<string, StructuralChange>();
  for (const sc of newAnnotations.trackChanges.structuralChanges || []) {
    newScSet.set(serializeStructuralChange(sc), sc);
  }

  // Log new annotations
  logNewAnnotations(newAnnotations);

  // Initialize summary
  const summary: ReconciliationSummary = {
    preserved: {
      comments: 0,
      highlights: 0,
      wordLevelTrackChanges: 0,
      fullSentenceDeletions: 0,
      fullSentenceInsertions: 0,
      structuralChanges: 0,
    },
    removed: {
      comments: [],
      highlights: [],
      wordLevelTrackChanges: [],
      fullSentenceDeletions: [],
      fullSentenceInsertions: [],
      structuralChanges: [],
    },
    added: {
      comments: newAnnotations.comments.length,
      highlights: newAnnotations.highlights.length,
      wordLevelTrackChanges: newAnnotations.trackChanges.wordLevelTrackChanges.length,
      fullSentenceDeletions: newAnnotations.trackChanges.fullSentenceDeletions.length,
      fullSentenceInsertions: newAnnotations.trackChanges.fullSentenceInsertions.length,
      structuralChanges: newAnnotations.trackChanges.structuralChanges?.length || 0,
    },
  };

  // Reconcile each range
  const reconciledRanges: SelectionRange[] = [];

  for (const range of oldScope.ranges) {
    console.log(`[Reconciliation] Processing range: ${range.id} (${range.label})`);

    const reconciledAnnotations = reconcileRangeAnnotations(
      range.matchedAnnotations,
      newCommentSet,
      newHighlightSet,
      newWordLevelTcArray,
      newFsdSet,
      newFsiSet,
      newScSet,
      summary
    );

    // Calculate new counts
    const newCounts = {
      comments: reconciledAnnotations.comments.length,
      highlights: reconciledAnnotations.highlights.length,
      trackChanges:
        reconciledAnnotations.wordLevelTrackChanges.length +
        reconciledAnnotations.fullSentenceDeletions.length +
        reconciledAnnotations.fullSentenceInsertions.length +
        (reconciledAnnotations.structuralChanges?.length || 0),
    };

    const totalRemaining = newCounts.comments + newCounts.highlights + newCounts.trackChanges;

    if (totalRemaining > 0) {
      // Range still has annotations - keep it
      reconciledRanges.push({
        ...range,
        annotationCounts: newCounts,
        matchedAnnotations: reconciledAnnotations,
      });
      console.log(`[Reconciliation]   Range preserved with ${totalRemaining} annotations`);
    } else {
      // Range is empty - remove it
      console.log(`[Reconciliation]   Range removed (no annotations remaining)`);
    }
  }

  // Adjust "added" counts by subtracting preserved
  summary.added.comments -= summary.preserved.comments;
  summary.added.highlights -= summary.preserved.highlights;
  summary.added.wordLevelTrackChanges -= summary.preserved.wordLevelTrackChanges;
  summary.added.fullSentenceDeletions -= summary.preserved.fullSentenceDeletions;
  summary.added.fullSentenceInsertions -= summary.preserved.fullSentenceInsertions;
  summary.added.structuralChanges -= summary.preserved.structuralChanges;

  // Log summary
  logReconciliationSummary(summary);

  const reconciledScope = {
    ...oldScope,
    ranges: reconciledRanges,
  };

  console.log('[Reconciliation] ========== RECONCILIATION COMPLETE ==========');
  console.log('[Reconciliation] Final reconciledScope:');
  console.log('[Reconciliation]   Mode:', reconciledScope.mode);
  console.log('[Reconciliation]   Ranges count:', reconciledScope.ranges.length);
  for (const range of reconciledScope.ranges) {
    const total =
      range.matchedAnnotations.comments.length +
      range.matchedAnnotations.highlights.length +
      range.matchedAnnotations.wordLevelTrackChanges.length +
      range.matchedAnnotations.fullSentenceDeletions.length +
      range.matchedAnnotations.fullSentenceInsertions.length;
    console.log(`[Reconciliation]     Range "${range.label}": ${total} annotations`);
  }

  return {
    reconciledScope,
    summary,
  };
}

// ============================================================================
// HELPER: RECONCILE RANGE ANNOTATIONS
// ============================================================================

function reconcileRangeAnnotations(
  oldAnnotations: AnnotationPreview,
  newCommentSet: Map<string, CommentExtractionResult>,
  newHighlightSet: Map<string, HighlightExtractionResult>,
  newWordLevelTcArray: WordLevelTrackChangeResults[],
  newFsdSet: Map<string, FullSentenceDeletion>,
  newFsiSet: Map<string, FullSentenceInsertion>,
  newScSet: Map<string, StructuralChange>,
  summary: ReconciliationSummary
): AnnotationPreview {
  // Reconcile comments
  const reconciledComments: CommentExtractionResult[] = [];
  for (const oldComment of oldAnnotations.comments) {
    const key = serializeComment(oldComment);
    const newComment = newCommentSet.get(key);

    if (newComment) {
      reconciledComments.push(newComment);
      summary.preserved.comments++;
      console.log(`[Reconciliation]     COMMENT PRESERVED: ${oldComment.commentId}`);
      console.log(`[Reconciliation]       Section: ${newComment.sectionNumber}`);
      console.log(`[Reconciliation]       Content: "${newComment.commentContent.substring(0, 50)}..."`);
    } else {
      summary.removed.comments.push(oldComment);
      console.log(`[Reconciliation]     COMMENT REMOVED (changed): ${oldComment.commentId}`);
      console.log(`[Reconciliation]       Was in section: ${oldComment.sectionNumber}`);
    }
  }

  // Reconcile highlights
  const reconciledHighlights: HighlightExtractionResult[] = [];
  for (const oldHighlight of oldAnnotations.highlights) {
    const key = serializeHighlight(oldHighlight);
    const newHighlight = newHighlightSet.get(key);

    if (newHighlight) {
      reconciledHighlights.push(newHighlight);
      summary.preserved.highlights++;
      console.log(`[Reconciliation]     HIGHLIGHT PRESERVED: ${oldHighlight.highlightId} -> ${newHighlight.highlightId}`);
      console.log(`[Reconciliation]       Section: ${newHighlight.sectionNumber}`);
      console.log(`[Reconciliation]       Text: "${newHighlight.selectedText.substring(0, 50)}..."`);
    } else {
      summary.removed.highlights.push(oldHighlight);
      console.log(`[Reconciliation]     HIGHLIGHT REMOVED (changed): ${oldHighlight.highlightId}`);
      console.log(`[Reconciliation]       Was in section: ${oldHighlight.sectionNumber}`);
    }
  }

  // Reconcile word-level track changes (using subset matching)
  // Track changes are grouped by sentence, so we need to check if all
  // original changes still exist, even if new changes were added to the same sentence
  const reconciledWordLevelTc: WordLevelTrackChangeResults[] = [];
  for (const oldTc of oldAnnotations.wordLevelTrackChanges) {
    console.log(`[Reconciliation]     Checking WORD-LEVEL TC: ${oldTc.sentenceId}`);
    console.log(`[Reconciliation]       Section: ${oldTc.sectionNumber}`);
    console.log(`[Reconciliation]       Deleted items: ${oldTc.deleted.map(d => `"${d.text}"`).join(', ') || '(none)'}`);
    console.log(`[Reconciliation]       Added items: ${oldTc.added.map(a => `"${a.text}"`).join(', ') || '(none)'}`);

    const matchingTc = findMatchingWordLevelTrackChange(oldTc, newWordLevelTcArray);

    if (matchingTc) {
      reconciledWordLevelTc.push(matchingTc);
      summary.preserved.wordLevelTrackChanges++;
      console.log(`[Reconciliation]     WORD-LEVEL TC PRESERVED: ${oldTc.sentenceId} -> ${matchingTc.sentenceId}`);
      console.log(`[Reconciliation]       New version has ${matchingTc.deleted.length} deleted, ${matchingTc.added.length} added`);
    } else {
      summary.removed.wordLevelTrackChanges.push(oldTc);
      console.log(`[Reconciliation]     WORD-LEVEL TC REMOVED (original changes not found)`);
      console.log(`[Reconciliation]       Expected deleted: ${oldTc.deleted.map(d => `"${d.text}"`).join(', ') || '(none)'}`);
      console.log(`[Reconciliation]       Expected added: ${oldTc.added.map(a => `"${a.text}"`).join(', ') || '(none)'}`);
    }
  }

  // Reconcile full sentence deletions
  const reconciledFsd: FullSentenceDeletion[] = [];
  for (const oldFsd of oldAnnotations.fullSentenceDeletions) {
    const key = serializeFullSentenceDeletion(oldFsd);
    const newFsd = newFsdSet.get(key);

    if (newFsd) {
      reconciledFsd.push(newFsd);
      summary.preserved.fullSentenceDeletions++;
      console.log(`[Reconciliation]     FSD PRESERVED: ${oldFsd.id} -> ${newFsd.id}`);
    } else {
      summary.removed.fullSentenceDeletions.push(oldFsd);
      console.log(`[Reconciliation]     FSD REMOVED (changed): ${oldFsd.id}`);
    }
  }

  // Reconcile full sentence insertions
  const reconciledFsi: FullSentenceInsertion[] = [];
  for (const oldFsi of oldAnnotations.fullSentenceInsertions) {
    const key = serializeFullSentenceInsertion(oldFsi);
    const newFsi = newFsiSet.get(key);

    if (newFsi) {
      reconciledFsi.push(newFsi);
      summary.preserved.fullSentenceInsertions++;
      console.log(`[Reconciliation]     FSI PRESERVED: ${oldFsi.id} -> ${newFsi.id}`);
    } else {
      summary.removed.fullSentenceInsertions.push(oldFsi);
      console.log(`[Reconciliation]     FSI REMOVED (changed): ${oldFsi.id}`);
    }
  }

  // Reconcile structural changes
  const reconciledSc: StructuralChange[] = [];
  for (const oldSc of oldAnnotations.structuralChanges || []) {
    const key = serializeStructuralChange(oldSc);
    const newSc = newScSet.get(key);

    if (newSc) {
      reconciledSc.push(newSc);
      summary.preserved.structuralChanges++;
      console.log(`[Reconciliation]     STRUCTURAL CHANGE PRESERVED: ${oldSc.type} ${oldSc.sectionNumber}`);
    } else {
      summary.removed.structuralChanges.push(oldSc);
      console.log(`[Reconciliation]     STRUCTURAL CHANGE REMOVED (changed): ${oldSc.type} ${oldSc.sectionNumber}`);
    }
  }

  return {
    comments: reconciledComments,
    highlights: reconciledHighlights,
    wordLevelTrackChanges: reconciledWordLevelTc,
    fullSentenceDeletions: reconciledFsd,
    fullSentenceInsertions: reconciledFsi,
    structuralChanges: reconciledSc.length > 0 ? reconciledSc : undefined,
    sectionDisplayInfo: oldAnnotations.sectionDisplayInfo,
    topLevelSections: oldAnnotations.topLevelSections,
  };
}

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

function logNewAnnotations(annotations: FilterableAnnotations): void {
  console.log('[Reconciliation] New annotations from document:');

  console.log(`[Reconciliation]   COMMENTS (${annotations.comments.length}):`);
  for (const c of annotations.comments) {
    console.log(`[Reconciliation]     - ${c.commentId} | Section: ${c.sectionNumber} | "${c.commentContent.substring(0, 40)}..."`);
  }

  console.log(`[Reconciliation]   HIGHLIGHTS (${annotations.highlights.length}):`);
  for (const h of annotations.highlights) {
    console.log(`[Reconciliation]     - ${h.highlightId} | Section: ${h.sectionNumber} | Color: ${h.highlightColor} | "${h.selectedText.substring(0, 40)}..."`);
  }

  console.log(`[Reconciliation]   WORD-LEVEL TRACK CHANGES (${annotations.trackChanges.wordLevelTrackChanges.length}):`);
  for (const tc of annotations.trackChanges.wordLevelTrackChanges) {
    const deleted = tc.deleted.map(d => d.text).join(', ');
    const added = tc.added.map(a => a.text).join(', ');
    console.log(`[Reconciliation]     - ${tc.sentenceId} | Section: ${tc.sectionNumber} | Del: "${deleted}" | Add: "${added}"`);
  }

  console.log(`[Reconciliation]   FULL SENTENCE DELETIONS (${annotations.trackChanges.fullSentenceDeletions.length}):`);
  for (const fsd of annotations.trackChanges.fullSentenceDeletions) {
    console.log(`[Reconciliation]     - ${fsd.id} | Section: ${fsd.sectionNumber} | "${fsd.deletedText.substring(0, 40)}..."`);
  }

  console.log(`[Reconciliation]   FULL SENTENCE INSERTIONS (${annotations.trackChanges.fullSentenceInsertions.length}):`);
  for (const fsi of annotations.trackChanges.fullSentenceInsertions) {
    console.log(`[Reconciliation]     - ${fsi.id} | Section: ${fsi.sectionNumber || fsi.inferredTopLevelSection} | "${fsi.insertedText.substring(0, 40)}..."`);
  }

  const scCount = annotations.trackChanges.structuralChanges?.length || 0;
  console.log(`[Reconciliation]   STRUCTURAL CHANGES (${scCount}):`);
  for (const sc of annotations.trackChanges.structuralChanges || []) {
    console.log(`[Reconciliation]     - ${sc.type} | Section: ${sc.sectionNumber} | "${sc.sectionTitle}"`);
  }
}

function logReconciliationSummary(summary: ReconciliationSummary): void {
  console.log('[Reconciliation] ========== SUMMARY ==========');

  console.log('[Reconciliation] PRESERVED (unchanged):');
  console.log(`[Reconciliation]   Comments: ${summary.preserved.comments}`);
  console.log(`[Reconciliation]   Highlights: ${summary.preserved.highlights}`);
  console.log(`[Reconciliation]   Word-Level Track Changes: ${summary.preserved.wordLevelTrackChanges}`);
  console.log(`[Reconciliation]   Full Sentence Deletions: ${summary.preserved.fullSentenceDeletions}`);
  console.log(`[Reconciliation]   Full Sentence Insertions: ${summary.preserved.fullSentenceInsertions}`);
  console.log(`[Reconciliation]   Structural Changes: ${summary.preserved.structuralChanges}`);

  console.log('[Reconciliation] REMOVED (changed or deleted):');
  console.log(`[Reconciliation]   Comments: ${summary.removed.comments.length}`);
  console.log(`[Reconciliation]   Highlights: ${summary.removed.highlights.length}`);
  console.log(`[Reconciliation]   Word-Level Track Changes: ${summary.removed.wordLevelTrackChanges.length}`);
  console.log(`[Reconciliation]   Full Sentence Deletions: ${summary.removed.fullSentenceDeletions.length}`);
  console.log(`[Reconciliation]   Full Sentence Insertions: ${summary.removed.fullSentenceInsertions.length}`);
  console.log(`[Reconciliation]   Structural Changes: ${summary.removed.structuralChanges.length}`);

  console.log('[Reconciliation] NEW (in document, not previously selected):');
  console.log(`[Reconciliation]   Comments: ${summary.added.comments}`);
  console.log(`[Reconciliation]   Highlights: ${summary.added.highlights}`);
  console.log(`[Reconciliation]   Word-Level Track Changes: ${summary.added.wordLevelTrackChanges}`);
  console.log(`[Reconciliation]   Full Sentence Deletions: ${summary.added.fullSentenceDeletions}`);
  console.log(`[Reconciliation]   Full Sentence Insertions: ${summary.added.fullSentenceInsertions}`);
  console.log(`[Reconciliation]   Structural Changes: ${summary.added.structuralChanges}`);
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Check if a scope has any selections that need reconciliation.
 */
export function scopeHasSelections(scope: AnnotationScope): boolean {
  if (scope.mode === 'all') return false;
  return scope.ranges.some(range => {
    const total =
      range.matchedAnnotations.comments.length +
      range.matchedAnnotations.highlights.length +
      range.matchedAnnotations.wordLevelTrackChanges.length +
      range.matchedAnnotations.fullSentenceDeletions.length +
      range.matchedAnnotations.fullSentenceInsertions.length +
      (range.matchedAnnotations.structuralChanges?.length || 0);
    return total > 0;
  });
}
