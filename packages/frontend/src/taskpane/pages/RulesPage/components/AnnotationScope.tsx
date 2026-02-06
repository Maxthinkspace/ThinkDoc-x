import * as React from 'react';
import {
  Checkbox,
  Radio,
  RadioGroup,
  Button,
  makeStyles,
  Text,
  Spinner,
} from '@fluentui/react-components';
import {
  Dismiss16Regular,
  Add16Regular,
  Info16Regular,
  ChevronDown16Regular,
  ChevronRight16Regular,
} from '@fluentui/react-icons';
import type { AnnotationScope, SelectionRange, AnnotationPreview } from '../../../../types/annotationScope';
import { DEFAULT_ANNOTATION_SCOPE } from '../../../../types/annotationScope';
import type { FilterableAnnotations } from '../../../../utils/annotationFilter';
import type { DocumentNodeWithRange } from '../../../../types/documents';
import {
  getSelectionWithCoordinates,
  findAnnotationsInSelection,
} from '../../../../utils/annotationFilter';

// Import shared component for annotation display
import { AnnotationDisplay } from '../../../components/AnnotationDisplay/AnnotationDisplay';

// ============================================================================
// STYLES (kept from original - only for scope selection UI, not annotation display)
// ============================================================================

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionTitle: {
    fontWeight: 600,
    fontSize: '13px',
    color: '#333',
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  rangeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '8px',
  },
  rangeItem: {
    display: 'flex',
    flexDirection: 'column',
    padding: '10px 12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '6px',
    fontSize: '13px',
    gap: '4px',
  },
  rangeHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rangeLabel: {
    fontWeight: 500,
  },
  rangeCounts: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    color: '#666',
  },
  removeButton: {
    minWidth: 'auto',
    padding: '2px',
    color: '#666',
    ':hover': {
      color: '#d32f2f',
      backgroundColor: 'transparent',
    },
  },
  addButton: {
    marginTop: '4px',
  },
  infoBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '10px',
    backgroundColor: '#e3f2fd',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#1565c0',
  },
  infoIcon: {
    flexShrink: 0,
    marginTop: '2px',
  },
  emptyState: {
    padding: '12px',
    textAlign: 'center' as const,
    color: '#666',
    fontSize: '13px',
    backgroundColor: '#fafafa',
    borderRadius: '6px',
    border: '1px dashed #ddd',
  },
  expandButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#666ff6',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: '4px 0',
    ':hover': {
      textDecoration: 'underline',
    },
  },
  annotationDetailsContainer: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #e0e0e0',
  },
});

// ============================================================================
// TYPES
// ============================================================================

interface AnnotationScopeSelectorProps {
  scope: AnnotationScope;
  onChange: (scope: AnnotationScope) => void;
  /** Pre-extracted annotations for matching selections */
  annotations: FilterableAnnotations | null;
  /** Parsed document structure for section-position mapping */
  combinedStructure: DocumentNodeWithRange[] | null;
  /** Recitals/preamble text (before first numbered section) */
  recitals?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const AnnotationScopeSelector: React.FC<AnnotationScopeSelectorProps> = ({
  scope,
  onChange,
  annotations,
  combinedStructure,
  recitals,
}) => {
  const styles = useStyles();
  const [isAddingRange, setIsAddingRange] = React.useState(false);
  const [addRangeError, setAddRangeError] = React.useState<string | null>(null);
  const [expandedRanges, setExpandedRanges] = React.useState<Set<string>>(new Set());

  // Calculate totals from annotations
  const totalComments = annotations?.comments.length ?? 0;
  const totalHighlights = annotations?.highlights.length ?? 0;
  const totalTrackChanges =
    (annotations?.trackChanges.wordLevelTrackChanges.length ?? 0) +
    (annotations?.trackChanges.fullSentenceDeletions.length ?? 0) +
    (annotations?.trackChanges.fullSentenceInsertions.length ?? 0) +
    (annotations?.trackChanges.structuralChanges?.length ?? 0);

  // Toggle expanded state for a range
  const toggleExpanded = (rangeId: string) => {
    setExpandedRanges((prev) => {
      const next = new Set(prev);
      if (next.has(rangeId)) {
        next.delete(rangeId);
      } else {
        next.add(rangeId);
      }
      return next;
    });
  };

  // Handle annotation type toggle
  const handleTypeChange = (type: 'comments' | 'trackChanges' | 'highlights', checked: boolean) => {
    onChange({
      ...scope,
      types: {
        ...scope.types,
        [type]: checked,
      },
    });
  };

  // Handle mode change
  const handleModeChange = (newMode: 'all' | 'include-only' | 'exclude') => {
    onChange({
      ...scope,
      mode: newMode,
      ranges: [],
    });
    setExpandedRanges(new Set());
  };

  // Add current selection as a range
  const handleAddRange = async () => {
    if (!annotations) {
      setAddRangeError('Annotations not loaded yet. Please wait.');
      return;
    }

    setIsAddingRange(true);
    setAddRangeError(null);

    try {
      const selectionData = await getSelectionWithCoordinates();

      if (!selectionData) {
        setAddRangeError('Please select text with annotations in the document.');
        return;
      }

      const { text: selectedText, startOffset, endOffset } = selectionData;

      // DEBUG: Log what annotations we have
      console.log('[AnnotationScope] handleAddRange - annotations available:');
      console.log('[AnnotationScope]   Comments:', annotations.comments.length);
      console.log('[AnnotationScope]   Highlights:', annotations.highlights.length);
      console.log('[AnnotationScope]   Word-level TCs:', annotations.trackChanges.wordLevelTrackChanges.length);
      console.log('[AnnotationScope]   Full sentence deletions:', annotations.trackChanges.fullSentenceDeletions.length);
      console.log('[AnnotationScope]   Full sentence insertions:', annotations.trackChanges.fullSentenceInsertions.length);

      // Log each track change for debugging
      console.log('[AnnotationScope] All track changes in annotations:');
      for (const tc of annotations.trackChanges.wordLevelTrackChanges) {
        console.log(`[AnnotationScope]   WLTC: ${tc.sentenceId} | Section: ${tc.sectionNumber}`);
        console.log(`[AnnotationScope]     Deleted: ${tc.deleted.map(d => `"${d.text}" [${d.startOffset}-${d.endOffset}]`).join(', ')}`);
        console.log(`[AnnotationScope]     Added: ${tc.added.map(a => `"${a.text}" [${a.startOffset}-${a.endOffset}]`).join(', ')}`);
      }
      for (const fsd of annotations.trackChanges.fullSentenceDeletions) {
        console.log(`[AnnotationScope]   FSD: ${fsd.id} | Section: ${fsd.sectionNumber} | "${fsd.deletedText.substring(0, 50)}..."`);
      }
      for (const fsi of annotations.trackChanges.fullSentenceInsertions) {
        console.log(`[AnnotationScope]   FSI: ${fsi.id} | Section: ${fsi.sectionNumber || fsi.inferredTopLevelSection} | "${fsi.insertedText.substring(0, 50)}..."`);
      }

      console.log('[AnnotationScope] Selection data:');
      console.log(`[AnnotationScope]   Text: "${selectedText.substring(0, 100)}..."`);
      console.log(`[AnnotationScope]   Offsets: ${startOffset} - ${endOffset}`);
      console.log('[AnnotationScope]   combinedStructure available:', !!combinedStructure, combinedStructure?.length || 0, 'nodes');

      // Find annotations that match this selection (uses YOUR annotationFilter.ts)
      const preview = findAnnotationsInSelection(
        selectedText,
        annotations,
        { startOffset, endOffset },
        combinedStructure || undefined,
        recitals
      );

      const totalMatched =
        preview.comments.length +
        preview.highlights.length +
        preview.wordLevelTrackChanges.length +
        preview.fullSentenceDeletions.length +
        preview.fullSentenceInsertions.length +
        (preview.structuralChanges?.length || 0);

      console.log('[AnnotationScope] Match results:');
      console.log(`[AnnotationScope]   Matched comments: ${preview.comments.length}`);
      console.log(`[AnnotationScope]   Matched highlights: ${preview.highlights.length}`);
      console.log(`[AnnotationScope]   Matched word-level TCs: ${preview.wordLevelTrackChanges.length}`);
      console.log(`[AnnotationScope]   Matched FSDs: ${preview.fullSentenceDeletions.length}`);
      console.log(`[AnnotationScope]   Matched FSIs: ${preview.fullSentenceInsertions.length}`);
      console.log(`[AnnotationScope]   Total matched: ${totalMatched}`);

      if (totalMatched === 0) {
        setAddRangeError(
          'No annotations found in the selected text. Try selecting text that contains comments, highlights, or track changes.'
        );
        return;
      }

      if (preview.topLevelSections.length === 0) {
        setAddRangeError('Could not determine section numbers for the selected annotations.');
        return;
      }

      // Generate label
      const label = generateLabel(preview.topLevelSections);

      // Collect granular section numbers
      const sectionNumbers = new Set<string>();
      for (const tc of preview.wordLevelTrackChanges) {
        for (const d of tc.deleted) {
          sectionNumbers.add(d.sectionNumber);
        }
        for (const a of tc.added) {
          sectionNumbers.add(a.sectionNumber);
        }
      }

      const newRange: SelectionRange = {
        id: `range-${Date.now()}`,
        label,
        selectedText: selectedText,
        topLevelSections: preview.topLevelSections,
        sectionNumbers: Array.from(sectionNumbers),
        annotationCounts: {
          comments: preview.comments.length,
          highlights: preview.highlights.length,
          trackChanges:
            preview.wordLevelTrackChanges.length +
            preview.fullSentenceDeletions.length +
            preview.fullSentenceInsertions.length +
            (preview.structuralChanges?.length || 0),
        },
        matchedAnnotations: {
          comments: preview.comments,
          highlights: preview.highlights,
          wordLevelTrackChanges: preview.wordLevelTrackChanges,
          fullSentenceDeletions: preview.fullSentenceDeletions,
          fullSentenceInsertions: preview.fullSentenceInsertions,
          structuralChanges: preview.structuralChanges,
          sectionDisplayInfo: preview.sectionDisplayInfo,
          topLevelSections: preview.topLevelSections,
        },
      };

      onChange({
        ...scope,
        ranges: [...scope.ranges, newRange],
      });
      setExpandedRanges((prev) => new Set(prev).add(newRange.id));
    } catch (error) {
      console.error('Error getting selection:', error);
      setAddRangeError('Failed to get selection. Please try again.');
    } finally {
      setIsAddingRange(false);
    }
  };

  // Remove a range
  const handleRemoveRange = (rangeId: string) => {
    onChange({
      ...scope,
      ranges: scope.ranges.filter((r) => r.id !== rangeId),
    });
    setExpandedRanges((prev) => {
      const next = new Set(prev);
      next.delete(rangeId);
      return next;
    });
  };

  // Create removal handlers for AnnotationDisplay
  const createRemovalHandlers = (rangeId: string) => ({
    onRemoveComment: (commentId: string) => {
      onChange({
        ...scope,
        ranges: scope.ranges
          .map((range) => {
            if (range.id !== rangeId) return range;
            const updatedComments = range.matchedAnnotations.comments.filter(
              (c) => c.commentId !== commentId
            );
            return {
              ...range,
              annotationCounts: {
                ...range.annotationCounts,
                comments: updatedComments.length,
              },
              matchedAnnotations: {
                ...range.matchedAnnotations,
                comments: updatedComments,
              },
            };
          })
          .filter((range) => {
            const total =
              range.annotationCounts.comments +
              range.annotationCounts.highlights +
              range.annotationCounts.trackChanges;
            return total > 0;
          }),
      });
    },

    onRemoveHighlight: (highlightId: string) => {
      onChange({
        ...scope,
        ranges: scope.ranges
          .map((range) => {
            if (range.id !== rangeId) return range;
            const updatedHighlights = range.matchedAnnotations.highlights.filter(
              (h) => h.highlightId !== highlightId
            );
            return {
              ...range,
              annotationCounts: {
                ...range.annotationCounts,
                highlights: updatedHighlights.length,
              },
              matchedAnnotations: {
                ...range.matchedAnnotations,
                highlights: updatedHighlights,
              },
            };
          })
          .filter((range) => {
            const total =
              range.annotationCounts.comments +
              range.annotationCounts.highlights +
              range.annotationCounts.trackChanges;
            return total > 0;
          }),
      });
    },

    onRemoveTrackChange: (tcIndex: number, itemIndex: number, type: 'deleted' | 'added') => {
      onChange({
        ...scope,
        ranges: scope.ranges
          .map((range) => {
            if (range.id !== rangeId) return range;

            const updatedWordLevel = range.matchedAnnotations.wordLevelTrackChanges
              .map((tc, tIdx) => {
                if (tIdx !== tcIndex) return tc;
                if (type === 'deleted') {
                  return { ...tc, deleted: tc.deleted.filter((_, i) => i !== itemIndex) };
                } else {
                  return { ...tc, added: tc.added.filter((_, i) => i !== itemIndex) };
                }
              })
              .filter((tc) => tc.deleted.length > 0 || tc.added.length > 0);

            const newTrackChangeCount =
              updatedWordLevel.length +
              range.matchedAnnotations.fullSentenceDeletions.length +
              range.matchedAnnotations.fullSentenceInsertions.length +
              (range.matchedAnnotations.structuralChanges?.length || 0);

            return {
              ...range,
              annotationCounts: {
                ...range.annotationCounts,
                trackChanges: newTrackChangeCount,
              },
              matchedAnnotations: {
                ...range.matchedAnnotations,
                wordLevelTrackChanges: updatedWordLevel,
              },
            };
          })
          .filter((range) => {
            const total =
              range.annotationCounts.comments +
              range.annotationCounts.highlights +
              range.annotationCounts.trackChanges;
            return total > 0;
          }),
      });
    },

    onRemoveFullSentenceDeletion: (fsdIndex: number) => {
      onChange({
        ...scope,
        ranges: scope.ranges
          .map((range) => {
            if (range.id !== rangeId) return range;
            const updatedFsd = range.matchedAnnotations.fullSentenceDeletions.filter(
              (_, i) => i !== fsdIndex
            );
            const newTrackChangeCount =
              range.matchedAnnotations.wordLevelTrackChanges.length +
              updatedFsd.length +
              range.matchedAnnotations.fullSentenceInsertions.length +
              (range.matchedAnnotations.structuralChanges?.length || 0);
            return {
              ...range,
              annotationCounts: { ...range.annotationCounts, trackChanges: newTrackChangeCount },
              matchedAnnotations: { ...range.matchedAnnotations, fullSentenceDeletions: updatedFsd },
            };
          })
          .filter((r) => r.annotationCounts.comments + r.annotationCounts.highlights + r.annotationCounts.trackChanges > 0),
      });
    },

    onRemoveFullSentenceInsertion: (fsiIndex: number) => {
      onChange({
        ...scope,
        ranges: scope.ranges
          .map((range) => {
            if (range.id !== rangeId) return range;
            const updatedFsi = range.matchedAnnotations.fullSentenceInsertions.filter(
              (_, i) => i !== fsiIndex
            );
            const newTrackChangeCount =
              range.matchedAnnotations.wordLevelTrackChanges.length +
              range.matchedAnnotations.fullSentenceDeletions.length +
              updatedFsi.length +
              (range.matchedAnnotations.structuralChanges?.length || 0);
            return {
              ...range,
              annotationCounts: { ...range.annotationCounts, trackChanges: newTrackChangeCount },
              matchedAnnotations: { ...range.matchedAnnotations, fullSentenceInsertions: updatedFsi },
            };
          })
          .filter((r) => r.annotationCounts.comments + r.annotationCounts.highlights + r.annotationCounts.trackChanges > 0),
      });
    },

    onRemoveStructuralChange: (scIndex: number) => {
      onChange({
        ...scope,
        ranges: scope.ranges
          .map((range) => {
            if (range.id !== rangeId) return range;
            const updatedSc = (range.matchedAnnotations.structuralChanges || []).filter(
              (_, i) => i !== scIndex
            );
            const newTrackChangeCount =
              range.matchedAnnotations.wordLevelTrackChanges.length +
              range.matchedAnnotations.fullSentenceDeletions.length +
              range.matchedAnnotations.fullSentenceInsertions.length +
              updatedSc.length;
            return {
              ...range,
              annotationCounts: { ...range.annotationCounts, trackChanges: newTrackChangeCount },
              matchedAnnotations: { ...range.matchedAnnotations, structuralChanges: updatedSc },
            };
          })
          .filter((r) => r.annotationCounts.comments + r.annotationCounts.highlights + r.annotationCounts.trackChanges > 0),
      });
    },
  });

  // Reset to defaults
  const handleReset = () => {
    onChange(DEFAULT_ANNOTATION_SCOPE);
    setExpandedRanges(new Set());
  };

  return (
    <div className={styles.container}>
      {/* Annotation Types */}
      <div className={styles.section}>
        <Text className={styles.sectionTitle}>Annotation Types</Text>
        <div className={styles.checkboxGroup}>
          {totalComments > 0 && (
            <Checkbox
              checked={scope.types.comments}
              onChange={(_, data) => handleTypeChange('comments', !!data.checked)}
              label="Comments"
            />
          )}
          {totalTrackChanges > 0 && (
            <Checkbox
              checked={scope.types.trackChanges}
              onChange={(_, data) => handleTypeChange('trackChanges', !!data.checked)}
              label="Track Changes"
            />
          )}
          {totalHighlights > 0 && (
            <Checkbox
              checked={scope.types.highlights}
              onChange={(_, data) => handleTypeChange('highlights', !!data.checked)}
              label="Highlights"
            />
          )}
        </div>
      </div>

      {/* Document Scope */}
      <div className={styles.section}>
        <Text className={styles.sectionTitle}>Document Scope</Text>
        <RadioGroup
          value={scope.mode}
          onChange={(_, data) => handleModeChange(data.value as 'all' | 'include-only' | 'exclude')}
          className={styles.radioGroup}
        >
          <Radio value="all" label="All sections" />
          <Radio value="include-only" label="Include selected scope only" />
          <Radio value="exclude" label="Exclude selected scope" />
        </RadioGroup>
      </div>

      {/* Range Selection */}
      {scope.mode !== 'all' && (
        <div className={styles.section}>
          <Text className={styles.sectionTitle}>
            {scope.mode === 'include-only' ? 'Included Sections' : 'Excluded Sections'}
          </Text>

          <div className={styles.infoBox}>
            <Info16Regular className={styles.infoIcon} />
            <span>
              Select text containing annotations in Word, then click "Add Current Selection" to{' '}
              {scope.mode === 'include-only' ? 'include' : 'exclude'} annotations in the selected
              text.
            </span>
          </div>

          {/* Range List */}
          {scope.ranges.length > 0 ? (
            <div className={styles.rangeList}>
              {scope.ranges.map((range) => {
                const isExpanded = expandedRanges.has(range.id);
                const handlers = createRemovalHandlers(range.id);

                return (
                  <div key={range.id} className={styles.rangeItem}>
                    <button
                      className={styles.expandButton}
                      onClick={() => toggleExpanded(range.id)}
                    >
                      {isExpanded ? <ChevronDown16Regular /> : <ChevronRight16Regular />}
                      {isExpanded ? 'Hide details' : 'Show details'}
                    </button>

                    {/* Use SHARED AnnotationDisplay component */}
                    {isExpanded && (
                      <div className={styles.annotationDetailsContainer}>
                        {/* Debug: Log the data */}
                        {(() => {
                          console.log('[AnnotationScope] range.matchedAnnotations:', {
                            comments: range.matchedAnnotations.comments.map(c => ({
                              commentId: c.commentId,
                              selectedText: c.selectedText,
                              sectionNumber: c.sectionNumber,
                            })),
                            highlights: range.matchedAnnotations.highlights.map(h => ({
                              highlightId: h.highlightId,
                              selectedText: h.selectedText,
                              sectionNumber: h.sectionNumber,
                            })),
                            trackChanges: range.matchedAnnotations.wordLevelTrackChanges.map(tc => ({
                              sectionNumber: tc.sectionNumber,
                              deleted: tc.deleted.map(d => ({ text: d.text, sectionNumber: d.sectionNumber })),
                              added: tc.added.map(a => ({ text: a.text, sectionNumber: a.sectionNumber })),
                            })),
                          });
                          return null;
                        })()}
                        <AnnotationDisplay
                          text={range.selectedText}
                          annotations={range.matchedAnnotations}
                          showInlinePreview={true}
                          showExpandableSections={true}
                          defaultExpanded={true}
                          allowRemoval={true}
                          {...handlers}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>No text selected.</div>
          )}

          {addRangeError && (
            <Text style={{ color: '#d32f2f', fontSize: '12px', marginTop: '4px' }}>
              {addRangeError}
            </Text>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <Button
              appearance="secondary"
              size="small"
              icon={isAddingRange ? <Spinner size="tiny" /> : <Add16Regular />}
              onClick={handleAddRange}
              disabled={isAddingRange || !annotations}
            >
              {isAddingRange ? 'Finding annotations...' : 'Add Current Selection'}
            </Button>
            {scope.ranges.length > 0 && (
              <Button appearance="secondary" size="small" onClick={handleReset}>
                Clear All
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HELPERS
// ============================================================================

function generateLabel(sections: number[]): string {
  if (sections.length === 0) return 'Unknown';
  if (sections.length === 1) return `Section ${sections[0]}`;

  const sorted = [...sections].sort((a, b) => a - b);
  let isConsecutive = true;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      isConsecutive = false;
      break;
    }
  }

  if (isConsecutive) {
    return `Sections ${sorted[0]}–${sorted[sorted.length - 1]}`;
  }

  return `Sections ${sorted.join(', ')}`;
}

function mergeRanges(existing: SelectionRange, newRange: SelectionRange): SelectionRange {
  // Dedupe comments
  const existingCommentIds = new Set(existing.matchedAnnotations.comments.map((c) => c.commentId));
  const newComments = newRange.matchedAnnotations.comments.filter(
    (c) => !existingCommentIds.has(c.commentId)
  );
  const mergedComments = [...existing.matchedAnnotations.comments, ...newComments];

  // Dedupe highlights
  const existingHighlightIds = new Set(
    existing.matchedAnnotations.highlights.map((h) => h.highlightId)
  );
  const newHighlights = newRange.matchedAnnotations.highlights.filter(
    (h) => !existingHighlightIds.has(h.highlightId)
  );
  const mergedHighlights = [...existing.matchedAnnotations.highlights, ...newHighlights];

  // Dedupe track changes (simplified)
  const getTcKey = (tc: typeof newRange.matchedAnnotations.wordLevelTrackChanges[0]) => {
    const deletedTexts = tc.deleted.map((d) => d.text).sort().join('|');
    const addedTexts = tc.added.map((a) => a.text).sort().join('|');
    return `${tc.sectionNumber}::${deletedTexts}::${addedTexts}`;
  };
  const existingTcKeys = new Set(
    existing.matchedAnnotations.wordLevelTrackChanges.map(getTcKey)
  );
  const newTrackChanges = newRange.matchedAnnotations.wordLevelTrackChanges.filter(
    (tc) => !existingTcKeys.has(getTcKey(tc))
  );
  const mergedTrackChanges = [
    ...existing.matchedAnnotations.wordLevelTrackChanges,
    ...newTrackChanges,
  ];

  // Merge full sentence deletions/insertions (simplified)
  const mergedFsd = [
    ...existing.matchedAnnotations.fullSentenceDeletions,
    ...newRange.matchedAnnotations.fullSentenceDeletions,
  ];
  const mergedFsi = [
    ...existing.matchedAnnotations.fullSentenceInsertions,
    ...newRange.matchedAnnotations.fullSentenceInsertions,
  ];
  const mergedSc = [
    ...(existing.matchedAnnotations.structuralChanges || []),
    ...(newRange.matchedAnnotations.structuralChanges || []),
  ];

  // Merge sections
  const mergedSections = Array.from(
    new Set([...existing.topLevelSections, ...newRange.topLevelSections])
  ).sort((a, b) => a - b);

  const selectedText = existing.selectedText || newRange.selectedText || '';

  return {
    ...existing,
    label: generateLabel(mergedSections),
    selectedText: selectedText,
    topLevelSections: mergedSections,
    sectionNumbers: Array.from(
      new Set([...(existing.sectionNumbers || []), ...(newRange.sectionNumbers || [])])
    ),
    annotationCounts: {
      comments: mergedComments.length,
      highlights: mergedHighlights.length,
      trackChanges: mergedTrackChanges.length + mergedFsd.length + mergedFsi.length + mergedSc.length,
    },
    matchedAnnotations: {
      comments: mergedComments,
      highlights: mergedHighlights,
      wordLevelTrackChanges: mergedTrackChanges,
      fullSentenceDeletions: mergedFsd,
      fullSentenceInsertions: mergedFsi,
      structuralChanges: mergedSc,
    },
  };
}

export default AnnotationScopeSelector;
