import type { AnnotationScope, SelectionRange, SectionDisplayInfo } from '@/src/types/annotationScope';
import type {
  DocumentNodeWithRange,
  CommentExtractionResult,
  HighlightExtractionResult,
  TrackChangeExtractionResults,
  WordLevelTrackChangeResults,
  FullSentenceInsertion,
  FullSentenceDeletion,
  SectionTrackChangeMap,
  TrackChangeWithOffset,
  StructuralChange
} from '@/src/types/documents';
import type { 
  ParagraphTrackChange 
} from '@/src/utils/documentParserHelpers';
import { normalizeText, hasSignificantOverlap } from '@/src/utils/annotationExtractionHelpers';

export interface FilterableAnnotations {
  comments: CommentExtractionResult[];
  highlights: HighlightExtractionResult[];
  trackChanges: TrackChangeExtractionResults;
}

export interface FilteredAnnotations {
  comments: CommentExtractionResult[];
  highlights: HighlightExtractionResult[];
  trackChanges: TrackChangeExtractionResults;
}

/**
 * Preview of annotations matched by a selection
 */
export interface AnnotationMatchPreview {
  comments: CommentExtractionResult[];
  highlights: HighlightExtractionResult[];
  wordLevelTrackChanges: WordLevelTrackChangeResults[];
  fullSentenceDeletions: FullSentenceDeletion[];
  fullSentenceInsertions: FullSentenceInsertion[];
  structuralChanges?: StructuralChange[];
  topLevelSections: number[];
  /** Section display info for cross-section selections */
  sectionDisplayInfo?: SectionDisplayInfo[];
}

export interface SectionFilter {
  sectionNumbers: Set<string>;  // Normalized section numbers (e.g., "8.2.2.1")
  topLevelOnly: boolean;        // If true, use only top-level filtering
}

/**
 * Represents a section's position in the combined document string
 */
interface SectionPositionInCombined {
  sectionNumber: string;
  topLevelSection: number;
  /** Start position in combined document (0-indexed, inclusive) */
  startInCombined: number;
  /** End position in combined document (0-indexed, exclusive) */
  endInCombined: number;
  /** The section's combined text */
  text: string;
}

/**
 * Represents which portion of a section is covered by the selection
 */
export interface SectionCoverage {
  sectionNumber: string;
  topLevelSection: number;
  /** Start position within this section (0-indexed) */
  startInSection: number;
  /** End position within this section (0-indexed, exclusive) */
  endInSection: number;
  /** Full coverage of this section? */
  isFullyCovered: boolean;
}

// ============================================================================
// MAIN FILTER FUNCTION
// ============================================================================

/**
 * Filter annotations based on user-defined scope
 */
export function filterAnnotations(
  annotations: FilterableAnnotations,
  scope: AnnotationScope
): FilteredAnnotations {
  // Step 1: Filter by annotation type
  let comments = scope.types.comments ? annotations.comments : [];
  let highlights = scope.types.highlights ? annotations.highlights : [];
  let wordLevelTrackChanges = scope.types.trackChanges 
    ? annotations.trackChanges.wordLevelTrackChanges 
    : [];
  let fullSentenceInsertions = scope.types.trackChanges 
    ? annotations.trackChanges.fullSentenceInsertions || []
    : [];
  let fullSentenceDeletions = scope.types.trackChanges   
    ? annotations.trackChanges.fullSentenceDeletions || []
    : [];  

  // Step 2: Filter by range (only if mode is not 'all' and ranges exist)
  if (scope.mode !== 'all' && scope.ranges.length > 0) {
    // Collect all top-level sections from all ranges
    const allSections = new Set<number>();
    for (const range of scope.ranges) {
      for (const section of range.topLevelSections) {
        allSections.add(section);
      }
    }

    // Collect matched annotation IDs from all ranges
    const matchedCommentIds = new Set<string>();
    const matchedHighlightIds = new Set<string>();
    
    for (const range of scope.ranges) {
      for (const c of range.matchedAnnotations.comments) {
        matchedCommentIds.add(c.commentId);
      }
      for (const h of range.matchedAnnotations.highlights) {
        matchedHighlightIds.add(h.highlightId);
      }
    }

    // Filter comments by matched IDs (not by section)
    comments = filterByMatchedIds(
      comments,
      matchedCommentIds,
      scope.mode,
      (c) => c.commentId
    );
    
    // Filter highlights by matched IDs (not by section)
    highlights = filterByMatchedIds(
      highlights,
      matchedHighlightIds,
      scope.mode,
      (h) => h.highlightId
    );
    
    // Collect matched track change keys (sectionNumber::text) from all ranges
    const matchedChangeKeys = new Set<string>();
    
    for (const range of scope.ranges) {
      for (const tc of range.matchedAnnotations.wordLevelTrackChanges) {
        for (const d of tc.deleted) {
          matchedChangeKeys.add(`${normalizeSectionNumber(d.sectionNumber)}::${d.text}`);
        }
        for (const a of tc.added) {
          matchedChangeKeys.add(`${normalizeSectionNumber(a.sectionNumber)}::${a.text}`);
        }
      }
    }
    
    // Filter track changes by matched change keys (not by section alone)
    if (matchedChangeKeys.size > 0) {
      wordLevelTrackChanges = filterTrackChangesByMatchedKeys(
        wordLevelTrackChanges,
        matchedChangeKeys,
        scope.mode
      );
    } else {
      // Fallback to top-level section filtering if no granular matches
      wordLevelTrackChanges = filterByTopLevelSection(
        wordLevelTrackChanges, 
        allSections, 
        scope.mode, 
        getTopLevelSectionsFromTrackChange
      );
    }
    
    // Filter full sentence insertions by top-level section
    fullSentenceInsertions = filterByTopLevelSection(
      fullSentenceInsertions,
      allSections,
      scope.mode,
      getTopLevelSectionsFromFullSentenceInsertion
    );

    // Filter full sentence deletions by top-level section
    fullSentenceDeletions = filterByTopLevelSection(
      fullSentenceDeletions,
      allSections,
      scope.mode,
      getTopLevelSectionsFromFullSentenceDeletion
    ); 
  }   

  // Rebuild track changes result
  const filteredTrackChanges: TrackChangeExtractionResults = {
    wordLevelTrackChanges,
    fullSentenceInsertions,
    fullSentenceDeletions,
    structuralChanges: annotations.trackChanges.structuralChanges || [],
    summary: {
      totalSentencesWithChanges: wordLevelTrackChanges.length,
      totalFullSentenceInsertions: fullSentenceInsertions.length,
      totalFullSentenceDeletions: fullSentenceDeletions.length,
      totalDeletions: countDeletions(wordLevelTrackChanges, fullSentenceDeletions),
      totalInsertions: countInsertions(wordLevelTrackChanges, fullSentenceInsertions),
      totalSectionsDeleted: annotations.trackChanges.structuralChanges?.filter(c => c.type === 'section-deleted').length || 0,
      totalSectionsInserted: annotations.trackChanges.structuralChanges?.filter(c => c.type === 'section-inserted').length || 0,
    },
  };

  return {
    comments,
    highlights,
    trackChanges: filteredTrackChanges,
  };
}

// ============================================================================
// SELECTION MATCHING (for UI)
// ============================================================================

/**
 * Get currently selected text from Word
 */
export async function getSelectedText(): Promise<string | null> {
  return Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.load('text');
    await context.sync();
    
    const text = selection.text?.trim();
    return text && text.length > 0 ? text : null;
  });
}

/**
 * Get selection with absolute character coordinates
 */
export async function getSelectionWithCoordinates(): Promise<{
  text: string;
  startOffset: number;
  endOffset: number;
} | null> {
  return Word.run(async (context) => {
    const body = context.document.body;
    const selection = context.document.getSelection();
    
    // Get text from document start to selection start
    const docStart = body.getRange('Start');
    const selectionStart = selection.getRange('Start');
    const rangeBefore = docStart.expandTo(selectionStart);
    
    rangeBefore.load('text');
    selection.load('text');
    await context.sync();
    
    const textBefore = rangeBefore.text || '';
    const selectedText = selection.text || '';
    
    if (!selectedText.trim()) return null;
    
    const result = {
      text: selectedText,
      startOffset: textBefore.length,
      endOffset: textBefore.length + selectedText.length,
    };
    
    return result;
  });
}

// ============================================================================
// SELECTION-TO-SECTION POSITION MAPPING
// ============================================================================

/**
 * Build combined document string from parsed structure.
 * Joins all section texts (combined text = includes both insertions and deletions) with "\r".
 * Section numbers from w:numPr are NOT included (only actual text content).
 */
export function buildCombinedDocumentFromStructure(
  structure: DocumentNodeWithRange[],
  recitals?: string
): { combinedDocument: string; sectionPositions: SectionPositionInCombined[] } {
  const sectionPositions: SectionPositionInCombined[] = [];
  const parts: string[] = [];
  let currentPosition = 0;

  if (recitals && recitals.trim()) {
    const recitalsText = recitals.trim();
    parts.push(recitalsText);
    sectionPositions.push({
      sectionNumber: 'recitals',
      topLevelSection: 0,
      startInCombined: 0,
      endInCombined: recitalsText.length,
      text: recitalsText,
    });
    currentPosition = recitalsText.length;
  }

  function getTopLevelSection(sectionNumber: string): number {
    const match = sectionNumber.match(/^(\d+)\./);
    return match ? parseInt(match[1]) : 0;
  }

  function processNode(node: DocumentNodeWithRange): void {
    // Use originalText if available (includes deletions), else text
    const headerText = node.combinedText || node.text || '';
    
    // Get additional paragraphs (original version includes deleted paras)
    const additionalParas = node.combinedAdditionalParagraphs || node.additionalParagraphs || [];

    // Combine section header + additional paragraphs with \r
    const allParas = [headerText, ...additionalParas].filter(t => t && t.trim());
    const fullSectionText = allParas.join('\r');

    if (fullSectionText) {
      // Add separator if not first section
      if (parts.length > 0) {
        parts.push('\r');
        currentPosition += 1;
      }

      const startPos = currentPosition;
      parts.push(fullSectionText);
      currentPosition += fullSectionText.length;

      sectionPositions.push({
        sectionNumber: node.sectionNumber,
        topLevelSection: getTopLevelSection(node.sectionNumber),
        startInCombined: startPos,
        endInCombined: currentPosition,
        text: fullSectionText,
      });
    }

    // Process children recursively
    if (node.children) {
      for (const child of node.children) {
        processNode(child);
      }
    }
  }

  for (const node of structure) {
    processNode(node);
  }

  return {
    combinedDocument: parts.join(''),
    sectionPositions,
  };
}

/**
 * Map selected text to sections in the combined document.
 * Returns which sections are covered and the position range within each.
 */
export function mapSelectionToSections(
  selectedText: string,
  combinedDocument: string,
  sectionPositions: SectionPositionInCombined[]
): SectionCoverage[] {
  const coveredSections: SectionCoverage[] = [];

  if (!selectedText || !combinedDocument) {
    return coveredSections;
  }

  // Normalize: convert line endings to \r and strip Word control characters (e.g., \u0005 comment anchors)
  const normalizedSelection = selectedText
    .replace(/\r\n|\r|\n/g, '\r')
    .replace(/[\u0005\u0013\u0014\u0015]/g, '')  // Word field/comment markers
    .trim();
  
  // Find selection in combined document
  const selectionStart = findTextInCombinedDocument(normalizedSelection, combinedDocument);
  
  if (selectionStart === -1) {
    console.log('[mapSelectionToSections] Could not find selection in combined document');
    console.log('[mapSelectionToSections] Selection preview:', JSON.stringify(normalizedSelection.substring(0, 100)));
    console.log('[mapSelectionToSections] Combined doc preview:', JSON.stringify(combinedDocument.substring(0, 200)));
    return coveredSections;
  }

  const selectionEnd = selectionStart + normalizedSelection.length;

  // Find overlapping sections
  for (const section of sectionPositions) {
    if (selectionStart < section.endInCombined && selectionEnd > section.startInCombined) {
      // Calculate overlap within this section
      const overlapStart = Math.max(selectionStart, section.startInCombined);
      const overlapEnd = Math.min(selectionEnd, section.endInCombined);

      // Convert to positions within the section (0-indexed)
      const startInSection = overlapStart - section.startInCombined;
      const endInSection = overlapEnd - section.startInCombined;

      const isFullyCovered = (overlapStart === section.startInCombined) && 
                             (overlapEnd === section.endInCombined);

      coveredSections.push({
        sectionNumber: section.sectionNumber,
        topLevelSection: section.topLevelSection,
        startInSection,
        endInSection,
        isFullyCovered,
      });
    }
  }

  return coveredSections;
}

/**
 * Find text in combined document with flexible whitespace matching
 */
function findTextInCombinedDocument(searchText: string, combinedDocument: string): number {
  // Try exact match first
  let pos = combinedDocument.indexOf(searchText);
  if (pos !== -1) {
    return pos;
  }

  // Try case-insensitive
  const lowerSearch = searchText.toLowerCase();
  const lowerCombined = combinedDocument.toLowerCase();
  pos = lowerCombined.indexOf(lowerSearch);
  if (pos !== -1) {
    return pos;
  }

  // Try with normalized whitespace (collapse \r\n, multiple spaces, etc.)
  const normalizedSearch = searchText.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  const normalizedCombined = combinedDocument.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
  pos = normalizedCombined.toLowerCase().indexOf(normalizedSearch.toLowerCase());
  if (pos !== -1) {
    // Map back to original position (approximate)
    return mapNormalizedPositionToOriginal(pos, combinedDocument);
  }

  // Try substring matching - find longest matching prefix
  const minMatchLength = Math.min(50, searchText.length);
  for (let len = searchText.length; len >= minMatchLength; len--) {
    const substring = searchText.substring(0, len);
    const subPos = combinedDocument.toLowerCase().indexOf(substring.toLowerCase());
    if (subPos !== -1) {
      return subPos;
    }
  }

  return -1;
}

/**
 * Map position in normalized string back to original string position
 */
function mapNormalizedPositionToOriginal(normalizedPos: number, original: string): number {
  let origIdx = 0;
  let normIdx = 0;
  
  while (normIdx < normalizedPos && origIdx < original.length) {
    const char = original[origIdx];
    if (char === '\r' || char === '\n') {
      // In normalized, \r\n sequences become single space
      origIdx++;
      // Skip additional \r\n chars
      while (origIdx < original.length && (original[origIdx] === '\r' || original[origIdx] === '\n')) {
        origIdx++;
      }
      normIdx++; // Counts as one space in normalized
    } else if (/\s/.test(char)) {
      // Multiple spaces become one
      origIdx++;
      while (origIdx < original.length && /\s/.test(original[origIdx]) && original[origIdx] !== '\r' && original[origIdx] !== '\n') {
        origIdx++;
      }
      normIdx++;
    } else {
      origIdx++;
      normIdx++;
    }
  }
  
  return origIdx;
}

/**
 * Filter word-level track changes by selection coverage.
 * A change is included if its section is covered AND its position overlaps.
 */
export function filterWordLevelTrackChangesByCoverage(
  trackChanges: WordLevelTrackChangeResults[],
  coveredSections: SectionCoverage[]
): WordLevelTrackChangeResults[] {
  if (coveredSections.length === 0) return [];

  // Build lookup map
  const coverageMap = new Map<string, SectionCoverage>();
  for (const cov of coveredSections) {
    coverageMap.set(cov.sectionNumber, cov);
  }

  const results: WordLevelTrackChangeResults[] = [];

  for (const tc of trackChanges) {
    const coverage = coverageMap.get(tc.sectionNumber);
    if (!coverage) continue; // Section not in selection

    // Filter individual deletions/additions by position overlap
    const matchedDeleted = tc.deleted.filter(d => 
      d.startOffset < coverage.endInSection && d.endOffset > coverage.startInSection
    );
    
    const matchedAdded = tc.added.filter(a => 
      a.startOffset < coverage.endInSection && a.endOffset > coverage.startInSection
    );

    if (matchedDeleted.length > 0 || matchedAdded.length > 0) {
      results.push({
        ...tc,
        deleted: matchedDeleted,
        added: matchedAdded,
      });
    }
  }

  return results;
}

/**
 * Filter highlights by selection coverage.
 * A highlight is included if its section is covered AND its position overlaps.
 */
export function filterHighlightsByCoverage(
  highlights: HighlightExtractionResult[],
  coveredSections: SectionCoverage[]
): HighlightExtractionResult[] {
  if (coveredSections.length === 0) return [];

  // Build lookup map
  const coverageMap = new Map<string, SectionCoverage>();
  for (const cov of coveredSections) {
    coverageMap.set(cov.sectionNumber, cov);
  }

  return highlights.filter(h => {
    const coverage = coverageMap.get(h.sectionNumber);
    if (!coverage) return false; // Section not in selection
    
    // Check offset overlap
    return h.startOffset < coverage.endInSection && h.endOffset > coverage.startInSection;
  });
}

/**
 * Filter comments by selection coverage.
 * A comment is included if its section is covered AND its position overlaps.
 */
export function filterCommentsByCoverage(
  comments: CommentExtractionResult[],
  coveredSections: SectionCoverage[]
): CommentExtractionResult[] {
  if (coveredSections.length === 0) return [];

  // Build lookup map
  const coverageMap = new Map<string, SectionCoverage>();
  for (const cov of coveredSections) {
    coverageMap.set(cov.sectionNumber, cov);
  }

  return comments.filter(c => {
    const coverage = coverageMap.get(c.sectionNumber);
    if (!coverage) return false; // Section not in selection
    
    // Check offset overlap
    return c.startOffset < coverage.endInSection && c.endOffset > coverage.startInSection;
  });
}

/**
 * Recalculate annotation offsets to be relative to the selection, not the section.
 * This allows AnnotationDisplay to use offset-based rendering on selected text.
 *
 * Also clamps annotation bounds to the selection - if an annotation extends
 * beyond the selection, only the overlapping portion is included.
 */
export function recalculateOffsetsForSelection(
  matchedAnnotations: AnnotationMatchPreview,
  coveredSections: SectionCoverage[]
): AnnotationMatchPreview {
  if (coveredSections.length === 0) return matchedAnnotations;

  // Build maps for quick lookup
  const sectionToSelectionStart = new Map<string, number>();
  const sectionToCoverage = new Map<string, SectionCoverage>();
  let cumulativeOffset = 0;

  // Sort sections by document order
  const sortedSections = [...coveredSections].sort((a, b) =>
    a.sectionNumber.localeCompare(b.sectionNumber, undefined, { numeric: true })
  );

  for (const coverage of sortedSections) {
    sectionToSelectionStart.set(coverage.sectionNumber, cumulativeOffset);
    sectionToCoverage.set(coverage.sectionNumber, coverage);
    const coveredLength = coverage.endInSection - coverage.startInSection;
    cumulativeOffset += coveredLength;
  }

  /**
   * Transform and clamp a single annotation's offsets.
   * Returns null if annotation doesn't overlap with selection after clamping.
   */
  const transformOffset = (
    sectionNumber: string,
    startOffset: number,
    endOffset: number
  ): { startOffset: number; endOffset: number } | null => {
    const selectionStart = sectionToSelectionStart.get(sectionNumber);
    const coverage = sectionToCoverage.get(sectionNumber);

    if (selectionStart === undefined || !coverage) {
      return null;
    }

    // Clamp to selection bounds within section
    const clampedStart = Math.max(startOffset, coverage.startInSection);
    const clampedEnd = Math.min(endOffset, coverage.endInSection);

    // If no overlap after clamping, exclude this annotation
    if (clampedStart >= clampedEnd) {
      return null;
    }

    // Transform to selection-relative
    const newStart = selectionStart + (clampedStart - coverage.startInSection);
    const newEnd = selectionStart + (clampedEnd - coverage.startInSection);

    return { startOffset: newStart, endOffset: newEnd };
  };

  // Recalculate word-level track change offsets
  const recalculatedWordLevel = matchedAnnotations.wordLevelTrackChanges
    .map((tc) => {
      const recalculatedDeleted = tc.deleted
        .map((d) => {
          const sectionNum = d.sectionNumber || tc.sectionNumber;
          const transformed = transformOffset(sectionNum, d.startOffset, d.endOffset);
          if (!transformed) return null;
          return { ...d, ...transformed };
        })
        .filter((d): d is NonNullable<typeof d> => d !== null);

      const recalculatedAdded = tc.added
        .map((a) => {
          const sectionNum = a.sectionNumber || tc.sectionNumber;
          const transformed = transformOffset(sectionNum, a.startOffset, a.endOffset);
          if (!transformed) return null;
          return { ...a, ...transformed };
        })
        .filter((a): a is NonNullable<typeof a> => a !== null);

      // Only include if there are remaining changes
      if (recalculatedDeleted.length === 0 && recalculatedAdded.length === 0) {
        return null;
      }

      return {
        ...tc,
        deleted: recalculatedDeleted,
        added: recalculatedAdded,
      };
    })
    .filter((tc): tc is NonNullable<typeof tc> => tc !== null);

  // Recalculate comment offsets
  const recalculatedComments = matchedAnnotations.comments
    .map((c) => {
      const transformed = transformOffset(c.sectionNumber, c.startOffset, c.endOffset);
      if (!transformed) return null;
      return { ...c, ...transformed };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  // Recalculate highlight offsets
  const recalculatedHighlights = matchedAnnotations.highlights
    .map((h) => {
      const transformed = transformOffset(h.sectionNumber, h.startOffset, h.endOffset);
      if (!transformed) return null;
      return { ...h, ...transformed };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null);

  // Recalculate full sentence deletion offsets
  const recalculatedFSD = matchedAnnotations.fullSentenceDeletions
    .map((fsd) => {
      const transformed = transformOffset(
        fsd.sectionNumber,
        fsd.startOffset ?? 0,
        fsd.endOffset ?? fsd.deletedText.length
      );
      if (!transformed) return null;
      return { ...fsd, ...transformed };
    })
    .filter((fsd): fsd is NonNullable<typeof fsd> => fsd !== null);

  // Recalculate full sentence insertion offsets
  const recalculatedFSI = matchedAnnotations.fullSentenceInsertions
    .map((fsi) => {
      const sectionNum = fsi.sectionNumber || fsi.inferredTopLevelSection;
      const transformed = transformOffset(
        sectionNum,
        fsi.startOffset ?? 0,
        fsi.endOffset ?? fsi.insertedText.length
      );
      if (!transformed) return null;
      return { ...fsi, ...transformed };
    })
    .filter((fsi): fsi is NonNullable<typeof fsi> => fsi !== null);

  return {
    ...matchedAnnotations,
    wordLevelTrackChanges: recalculatedWordLevel,
    comments: recalculatedComments,
    highlights: recalculatedHighlights,
    fullSentenceDeletions: recalculatedFSD,
    fullSentenceInsertions: recalculatedFSI,
  };
}

/**
 * Build section display information for cross-section selections.
 * Returns info about each section with:
 * - The selected text within that section
 * - Whether to show "..." before/after
 * - Annotations with section-relative offsets (not cumulative)
 */
export function buildSectionDisplayInfo(
  selectedText: string,
  coveredSections: SectionCoverage[],
  sectionPositions: SectionPositionInCombined[],
  matchedAnnotations: AnnotationMatchPreview
): SectionDisplayInfo[] {
  if (coveredSections.length === 0) return [];

  // Build lookup for section positions
  const positionMap = new Map<string, SectionPositionInCombined>();
  for (const pos of sectionPositions) {
    positionMap.set(pos.sectionNumber, pos);
  }

  // Normalize selection line endings
  const normalizedSelection = selectedText.replace(/\r\n|\r|\n/g, '\r');

  const sectionDisplayInfo: SectionDisplayInfo[] = [];

  for (const coverage of coveredSections) {
    const sectionPos = positionMap.get(coverage.sectionNumber);
    if (!sectionPos) continue;

    // Extract the selected text portion from this section
    const sectionText = sectionPos.text;
    const selectedInSection = sectionText.substring(
      coverage.startInSection,
      coverage.endInSection
    );

    // Determine if we need ellipsis before/after
    const hasEllipsisBefore = coverage.startInSection > 0;
    const hasEllipsisAfter = coverage.endInSection < sectionText.length;

    // Filter annotations for this section only (keeping section-relative offsets)
    const sectionComments = matchedAnnotations.comments.filter(
      c => c.sectionNumber === coverage.sectionNumber
    ).map(c => ({
      ...c,
      // Adjust offset to be relative to the selected portion within the section
      startOffset: Math.max(0, c.startOffset - coverage.startInSection),
      endOffset: Math.min(
        coverage.endInSection - coverage.startInSection,
        c.endOffset - coverage.startInSection
      ),
    }));

    const sectionHighlights = matchedAnnotations.highlights.filter(
      h => h.sectionNumber === coverage.sectionNumber
    ).map(h => ({
      ...h,
      startOffset: Math.max(0, h.startOffset - coverage.startInSection),
      endOffset: Math.min(
        coverage.endInSection - coverage.startInSection,
        h.endOffset - coverage.startInSection
      ),
    }));

    const sectionWordLevel = matchedAnnotations.wordLevelTrackChanges
      .filter(tc => tc.sectionNumber === coverage.sectionNumber)
      .map(tc => ({
        ...tc,
        deleted: tc.deleted.map(d => ({
          ...d,
          startOffset: Math.max(0, d.startOffset - coverage.startInSection),
          endOffset: Math.min(
            coverage.endInSection - coverage.startInSection,
            d.endOffset - coverage.startInSection
          ),
        })).filter(d => d.endOffset > d.startOffset),
        added: tc.added.map(a => ({
          ...a,
          startOffset: Math.max(0, a.startOffset - coverage.startInSection),
          endOffset: Math.min(
            coverage.endInSection - coverage.startInSection,
            a.endOffset - coverage.startInSection
          ),
        })).filter(a => a.endOffset > a.startOffset),
      }))
      .filter(tc => tc.deleted.length > 0 || tc.added.length > 0);

    const sectionFSD = matchedAnnotations.fullSentenceDeletions
      .filter(fsd => fsd.sectionNumber === coverage.sectionNumber)
      .map(fsd => ({
        ...fsd,
        startOffset: fsd.startOffset !== undefined
          ? Math.max(0, fsd.startOffset - coverage.startInSection)
          : 0,
        endOffset: fsd.endOffset !== undefined
          ? Math.min(
              coverage.endInSection - coverage.startInSection,
              fsd.endOffset - coverage.startInSection
            )
          : fsd.deletedText.length,
      }));

    const sectionFSI = matchedAnnotations.fullSentenceInsertions
      .filter(fsi => (fsi.sectionNumber || fsi.inferredTopLevelSection) === coverage.sectionNumber)
      .map(fsi => ({
        ...fsi,
        startOffset: fsi.startOffset !== undefined
          ? Math.max(0, fsi.startOffset - coverage.startInSection)
          : 0,
        endOffset: fsi.endOffset !== undefined
          ? Math.min(
              coverage.endInSection - coverage.startInSection,
              fsi.endOffset - coverage.startInSection
            )
          : fsi.insertedText.length,
      }));

    sectionDisplayInfo.push({
      sectionNumber: coverage.sectionNumber,
      text: selectedInSection,
      startInSection: coverage.startInSection,
      endInSection: coverage.endInSection,
      sectionLength: sectionText.length,
      hasEllipsisBefore,
      hasEllipsisAfter,
      annotations: {
        comments: sectionComments,
        highlights: sectionHighlights,
        wordLevelTrackChanges: sectionWordLevel,
        fullSentenceDeletions: sectionFSD,
        fullSentenceInsertions: sectionFSI,
      },
    });
  }

  return sectionDisplayInfo;
}

/**
 * Find annotations that overlap with the selected text
 */
export function findAnnotationsInSelection(
  selectedText: string,
  annotations: FilterableAnnotations,
  selectionCoords?: { startOffset: number; endOffset: number },
  combinedStructure?: DocumentNodeWithRange[],
  recitals?: string
): AnnotationMatchPreview {
  const normalizedSelection = normalizeText(selectedText);
  
  // Track covered sections for offset recalculation
  let coveredSections: SectionCoverage[] = [];
  
  // Find matching comments - will be filtered by offset if structure available
  let matchedComments = annotations.comments.filter(comment => 
    textOverlaps(normalizedSelection, comment.selectedText)
  );
  
  // Find matching highlights - will be filtered by offset if structure available
  let matchedHighlights = annotations.highlights.filter(highlight =>
    textOverlaps(normalizedSelection, highlight.selectedText)
  );
  
  // Find matching word-level track changes
  let matchedWordLevel: WordLevelTrackChangeResults[] = [];
  
  // Use section-position mapping if structure is provided
  if (combinedStructure && combinedStructure.length > 0) {
    // Step 1: Build combined document from structure (including recitals)
    const { combinedDocument, sectionPositions } = buildCombinedDocumentFromStructure(combinedStructure, recitals);
    
    // Step 2: Map selection to sections
    coveredSections = mapSelectionToSections(selectedText, combinedDocument, sectionPositions);
    
    // Step 3: Filter track changes by coverage
    matchedWordLevel = filterWordLevelTrackChangesByCoverage(
      annotations.trackChanges.wordLevelTrackChanges,
      coveredSections
    );
    
    // Step 4: Filter highlights by coverage (offset-based)
    matchedHighlights = filterHighlightsByCoverage(
      annotations.highlights,
      coveredSections
    );
    
    // Step 5: Filter comments by coverage (offset-based)
    matchedComments = filterCommentsByCoverage(
      annotations.comments,
      coveredSections
    );
    
  } else {
    // Fallback: Use text-based matching (original approach)
    const usePositionMatching = selectionCoords && 
      annotations.trackChanges.wordLevelTrackChanges.length > 0 &&
      annotations.trackChanges.wordLevelTrackChanges[0].deleted[0]?.startOffset !== undefined;
    
    for (const tc of annotations.trackChanges.wordLevelTrackChanges) {
      const matchedDeleted = tc.deleted.filter(change => {
        return usePositionMatching && selectionCoords
          ? rangesOverlap(change.startOffset, change.endOffset, selectionCoords.startOffset, selectionCoords.endOffset)
          : textOverlaps(normalizedSelection, change.text);
      });
      const matchedAdded = tc.added.filter(change => {
        return usePositionMatching && selectionCoords
          ? rangesOverlap(change.startOffset, change.endOffset, selectionCoords.startOffset, selectionCoords.endOffset)
          : textOverlaps(normalizedSelection, change.text);
      });
      
      if (matchedDeleted.length > 0 || matchedAdded.length > 0) {
        matchedWordLevel.push({
          ...tc,
          deleted: matchedDeleted,
          added: matchedAdded,
        });
      }
    }
  }
  
  // Find matching structural changes (text-based)
  const matchedStructuralChanges = (annotations.trackChanges.structuralChanges || []).filter(sc =>
    textOverlaps(normalizedSelection, sc.fullContent) || textOverlaps(normalizedSelection, sc.sectionTitle)
  );
  
  // Find matching full sentence deletions (text-based)
  const matchedFullSentenceDeletions = (annotations.trackChanges.fullSentenceDeletions || []).filter(fsd =>
    textOverlaps(normalizedSelection, fsd.deletedText)
  );
  
  // Find matching full sentence insertions (text-based)
  const matchedFullSentenceInsertions = (annotations.trackChanges.fullSentenceInsertions || []).filter(fsi =>
    textOverlaps(normalizedSelection, fsi.insertedText)
  );
  
  // Collect unique top-level sections
  const sections = new Set<number>();
  
  for (const c of matchedComments) {
    for (const topLevel of c.topLevelSectionNumbers) {
      const section = parseTopLevelSection(topLevel);
      if (section !== null) sections.add(section);
    }
  }
  for (const h of matchedHighlights) {
    for (const topLevel of h.topLevelSectionNumbers) {
      const section = parseTopLevelSection(topLevel);
      if (section !== null) sections.add(section);
    }
  }
  for (const tc of matchedWordLevel) {
    const section = parseTopLevelSection(tc.topLevelSectionNumber);
    if (section !== null) sections.add(section);
  }
  
  // Add sections from full sentence deletions
  for (const fsd of matchedFullSentenceDeletions) {
    const section = parseTopLevelSection(fsd.topLevelSectionNumber || '');
    if (section !== null) sections.add(section);
  }
  
  // Add sections from full sentence insertions
  for (const fsi of matchedFullSentenceInsertions) {
    const section = parseTopLevelSection(fsi.inferredTopLevelSection || '');
    if (section !== null) sections.add(section);
  }
  
  // Add sections from structural changes
  for (const sc of matchedStructuralChanges) {
    const section = parseTopLevelSection(sc.sectionNumber);
    if (section !== null) sections.add(section);
  }

  const result: AnnotationMatchPreview = {
    comments: matchedComments,
    highlights: matchedHighlights,
    wordLevelTrackChanges: matchedWordLevel,
    fullSentenceDeletions: matchedFullSentenceDeletions,
    fullSentenceInsertions: matchedFullSentenceInsertions,
    structuralChanges: matchedStructuralChanges,
    topLevelSections: Array.from(sections).sort((a, b) => a - b),
  };

  // Build section display info for cross-section selections
  if (coveredSections.length > 0 && combinedStructure) {
    const { sectionPositions } = buildCombinedDocumentFromStructure(combinedStructure, recitals);

    // Build section display info with per-section offsets
    const sectionDisplayInfo = buildSectionDisplayInfo(
      selectedText,
      coveredSections,
      sectionPositions,
      result
    );

    // Recalculate cumulative offsets for backward compatibility
    const recalculatedResult = recalculateOffsetsForSelection(result, coveredSections);

    // Attach section display info
    return {
      ...recalculatedResult,
      sectionDisplayInfo,
    };
  }

  return result;
}

/**
 * Check if two texts overlap (one contains the other, or significant word overlap)
 */
function textOverlaps(normalizedA: string, textB: string): boolean {
  if (!textB) return false;
  const normalizedB = normalizeText(textB);
  
  // Direct containment
  if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) {
    return true;
  }
  
  // Significant word overlap
  return hasSignificantOverlap(normalizedA, normalizedB);
}

/**
 * Parse top-level section number from string (e.g., "8." -> 8, "8" -> 8)
 */
function parseTopLevelSection(topLevelSectionNumber: string): number | null {
  if (!topLevelSectionNumber || topLevelSectionNumber === 'unknown') {
    return null;
  }
  const match = topLevelSectionNumber.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// ============================================================================
// FILTER HELPERS
// ============================================================================

/**
 * Filter items by top-level section
 */
function filterByTopLevelSection<T>(
  items: T[],
  sections: Set<number>,
  mode: 'include-only' | 'exclude',
  getSections: (item: T) => number[]
): T[] {
  return items.filter((item) => {
    const itemSections = getSections(item);
    if (itemSections.length === 0) {
      // Unknown section - exclude if mode is 'include-only', include if mode is 'exclude'
      return mode === 'exclude';
    }
    // Check if ANY of the item's sections match
    const hasMatchingSection = itemSections.some(s => sections.has(s));
    return mode === 'include-only' ? hasMatchingSection : !hasMatchingSection;
  });
}

/**
 * Filter items by matched annotation IDs
 */
function filterByMatchedIds<T>(
  items: T[],
  matchedIds: Set<string>,
  mode: 'include-only' | 'exclude',
  getId: (item: T) => string
): T[] {
  // If no matched IDs and include-only mode, return empty
  if (matchedIds.size === 0) {
    return mode === 'include-only' ? [] : items;
  }
  
  return items.filter((item) => {
    const isMatched = matchedIds.has(getId(item));
    return mode === 'include-only' ? isMatched : !isMatched;
  });
}

function getTopLevelSectionsFromTrackChange(item: WordLevelTrackChangeResults): number[] {
  const parsed = parseTopLevelSection(item.topLevelSectionNumber);
  return parsed !== null ? [parsed] : [];
}

function countDeletions(
  wordLevel: WordLevelTrackChangeResults[],
  fullSentenceDeletions: FullSentenceDeletion[]
): number {
  const wordLevelDeletions = wordLevel.reduce((sum, tc) => sum + tc.deleted.length, 0);
  return wordLevelDeletions + fullSentenceDeletions.length;
}

function countInsertions(
  wordLevel: WordLevelTrackChangeResults[],
  fullSentenceInsertions: FullSentenceInsertion[]
): number {
  const wordLevelInsertions = wordLevel.reduce((sum, tc) => sum + tc.added.length, 0);
  return wordLevelInsertions + fullSentenceInsertions.length;
}

/**
 * Normalize section number for comparison (remove trailing dots)
 */
function normalizeSectionNumber(sectionNum: string): string {
  return sectionNum.trim().replace(/\.+$/, '');
}

/**
 * Filter track changes by matched change keys (sectionNumber::text)
 * Only includes individual changes that were explicitly matched
 */
function filterTrackChangesByMatchedKeys(
  trackChanges: WordLevelTrackChangeResults[],
  matchedKeys: Set<string>,
  mode: 'include-only' | 'exclude'
): WordLevelTrackChangeResults[] {
  const results: WordLevelTrackChangeResults[] = [];
  
  for (const tc of trackChanges) {
    const filteredDeleted = tc.deleted.filter(change => {
      const key = `${normalizeSectionNumber(change.sectionNumber)}::${change.text}`;
      const isMatched = matchedKeys.has(key);
      return mode === 'include-only' ? isMatched : !isMatched;
    });
    
    const filteredAdded = tc.added.filter(change => {
      const key = `${normalizeSectionNumber(change.sectionNumber)}::${change.text}`;
      const isMatched = matchedKeys.has(key);
      return mode === 'include-only' ? isMatched : !isMatched;
    });
    
    if (filteredDeleted.length > 0 || filteredAdded.length > 0) {
      results.push({
        ...tc,
        deleted: filteredDeleted,
        added: filteredAdded,
      });
    }
  }
  
  return results;
}

function getTopLevelSectionsFromFullSentenceInsertion(item: FullSentenceInsertion): number[] {
  const parsed = parseTopLevelSection(item.inferredTopLevelSection || '');
  return parsed !== null ? [parsed] : [];
}

function getTopLevelSectionsFromFullSentenceDeletion(item: FullSentenceDeletion): number[] {
  const parsed = parseTopLevelSection(item.topLevelSectionNumber || '');
  return parsed !== null ? [parsed] : [];
}

/**
 * Check if two ranges overlap (0-indexed, exclusive end)
 */
function rangesOverlap(
  aStart: number, 
  aEnd: number, 
  bStart: number, 
  bEnd: number
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

// ============================================================================
// OFFSET-BASED TRACK CHANGE MATCHING
// ============================================================================

/**
 * Find track changes that overlap with selected text.
 * 
 * @param selectedText - The text user selected
 * @param sectionTrackChangeMap - Map of sections to their track changes
 * @returns Track changes that overlap with the selection
 */
export function findTrackChangesBySelection(
  selectedText: string,
  sectionTrackChangeMap: SectionTrackChangeMap
): TrackChangeWithOffset[] {
  if (!selectedText || sectionTrackChangeMap.size === 0) {
    return [];
  }
  
  const normalizedSelection = normalizeText(selectedText);
  const matchedChanges: TrackChangeWithOffset[] = [];
  
  // Search each section for the selected text
  sectionTrackChangeMap.forEach((sectionData) => {
    const normalizedSectionText = normalizeText(sectionData.combinedText);
    
    // Check if selection appears in this section
    const selectionStart = findTextPosition(
      normalizedSelection, 
      normalizedSectionText
    );
    
    if (selectionStart === -1) return;
    
    const selectionEnd = selectionStart + selectedText.length;
    
    // Find overlapping track changes
    for (const tc of sectionData.trackChanges) {
      if (rangesOverlap(selectionStart, selectionEnd, tc.startOffset, tc.endOffset)) {
        matchedChanges.push(tc);
      }
    }
  });
  
  return matchedChanges;
}

/**
 * Find track changes by selection with section context.
 * Splits multi-paragraph selection and matches per section.
 * 
 * @param selectedText - The text user selected (may span paragraphs)
 * @param sectionTrackChangeMap - Map of sections to their track changes  
 * @returns Object with matched track changes grouped by section
 */
export function findTrackChangesBySelectionWithContext(
  selectedText: string,
  sectionTrackChangeMap: SectionTrackChangeMap
): Map<string, TrackChangeWithOffset[]> {
  const result = new Map<string, TrackChangeWithOffset[]>();
  
  if (!selectedText || sectionTrackChangeMap.size === 0) {
    return result;
  }
  
  // Split selection by paragraph boundaries
  const selectionParts = selectedText.split(/\r?\n/);
  
  for (const part of selectionParts) {
    const trimmedPart = part.trim();
    if (!trimmedPart) continue;
    
    const normalizedPart = normalizeText(trimmedPart);
    
    // Search each section
    sectionTrackChangeMap.forEach((sectionData, sectionNumber) => {
      const position = findTextPosition(
        normalizedPart,
        normalizeText(sectionData.combinedText)
      );
      
      if (position === -1) return;
      
      const partEnd = position + trimmedPart.length;
      
      // Find overlapping track changes
      for (const tc of sectionData.trackChanges) {
        if (rangesOverlap(position, partEnd, tc.startOffset, tc.endOffset)) {
          if (!result.has(sectionNumber)) {
            result.set(sectionNumber, []);
          }
          // Avoid duplicates
          const existing = result.get(sectionNumber)!;
          if (!existing.some(e => 
            e.startOffset === tc.startOffset && 
            e.endOffset === tc.endOffset &&
            e.type === tc.type
          )) {
            existing.push(tc);
          }
        }
      }
    });
  }
  
  return result;
}

/**
 * Find position of search text within target text.
 * Handles normalization differences by mapping back to original positions.
 */
function findTextPosition(
  normalizedSearch: string,
  normalizedTarget: string,
): number {
  // Direct search in normalized
  const normalizedPos = normalizedTarget.indexOf(normalizedSearch);
  if (normalizedPos === -1) return -1;
  
  // Map back to original position (approximate)
  // For now, use direct position - can be refined if normalization changes length significantly
  return normalizedPos;
}