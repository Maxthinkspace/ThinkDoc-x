import * as React from 'react';
import { Button, makeStyles } from '@fluentui/react-components';
import {
  Dismiss16Regular,
  ChevronDown16Regular,
  ChevronRight16Regular,
  Comment16Regular,
  Highlight16Regular,
  TextChangeCase16Regular,
} from '@fluentui/react-icons';
import type {
  CommentExtractionResult,
  HighlightExtractionResult,
} from '../../../types/documents';
import type { AnnotationPreview, SectionDisplayInfo } from '../../../types/annotationScope';

// ============================================================================
// STYLES
// ============================================================================

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  // Inline text preview
  textPreview: {
    padding: '12px',
    backgroundColor: '#fafafa',
    borderRadius: '6px',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#333',
  },

  // Track change inline styles
  deletion: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    textDecoration: 'line-through',
    padding: '1px 4px',
    borderRadius: '2px',
    marginLeft: '2px',
    marginRight: '2px',
  },
  insertion: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    fontWeight: 'bold' as const,
    padding: '1px 4px',
    borderRadius: '2px',
    marginLeft: '2px',
    marginRight: '2px',
  },

  // Section for each annotation type
  annotationSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    padding: '8px 0',
  },
  sectionHeaderTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: '600' as const,
    color: '#555',
  },

  // Group by section number
  sectionGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '8px',
  },
  sectionLabel: {
    fontSize: '12px',
    fontWeight: '500' as const,
    color: '#666',
    marginBottom: '4px',
  },

  // Individual annotation item
  annotationItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '8px 10px',
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    fontSize: '12px',
  },
  annotationItemContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },

  // Labels
  itemLabel: {
    color: '#666',
    marginRight: '4px',
  },
  itemText: {
    fontStyle: 'italic',
    color: '#333',
  },

  // Track change specific
  trackChangeDeleted: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    textDecoration: 'line-through',
    padding: '2px 6px',
    borderRadius: '3px',
    display: 'inline',
  },
  trackChangeAdded: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    fontWeight: 'bold' as const,
    padding: '2px 6px',
    borderRadius: '3px',
    display: 'inline',
  },

  // Comment specific
  commentContent: {
    marginTop: '4px',
  },
  commentReplies: {
    marginTop: '4px',
    paddingLeft: '12px',
    borderLeft: '2px solid #e0e0e0',
    fontSize: '11px',
    color: '#666',
  },

  // Highlight specific
  highlightColor: {
    width: '12px',
    height: '12px',
    borderRadius: '2px',
    display: 'inline-block',
    marginRight: '6px',
    verticalAlign: 'middle',
  },

  // Remove button
  removeButton: {
    minWidth: 'auto',
    padding: '2px',
    color: '#999',
    flexShrink: 0,
    marginLeft: '8px',
    ':hover': {
      color: '#d32f2f',
      backgroundColor: 'transparent',
    },
  },

  // Empty state
  emptyState: {
    padding: '12px',
    textAlign: 'center' as const,
    color: '#888',
    fontSize: '13px',
  },

  // Section display for cross-section selections
  sectionContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionBlock: {
    padding: '10px 12px',
    backgroundColor: '#fafafa',
    borderRadius: '6px',
    fontSize: '13px',
    lineHeight: '1.6',
    color: '#333',
    position: 'relative' as const,
  },
  sectionBlockHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
    paddingBottom: '6px',
    borderBottom: '1px solid #e8e8e8',
  },
  sectionBlockLabel: {
    fontSize: '11px',
    fontWeight: '600' as const,
    color: '#666',
    backgroundColor: '#e8e8e8',
    padding: '2px 6px',
    borderRadius: '3px',
  },
  ellipsis: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: '12px',
  },
  sectionTextContent: {
    whiteSpace: 'pre-wrap' as const,
  },
});

// ============================================================================
// TYPES
// ============================================================================

/**
 * Flattened track change for display
 */
interface FlattenedTrackChange {
  id: string;
  type:
    | 'word-deleted'
    | 'word-added'
    | 'sentence-deleted'
    | 'sentence-inserted'
    | 'section-deleted'
    | 'section-inserted';
  text: string;
  sectionNumber: string;
  topLevelSectionNumber: string;
  startOffset: number;
  // Indices for removal callbacks
  tcIndex?: number;
  itemIndex?: number;
  fsdIndex?: number;
  fsiIndex?: number;
  scIndex?: number;
}

export interface AnnotationDisplayProps {
  /** The full text to display with inline changes */
  text: string;
  /** Annotations to display */
  annotations: AnnotationPreview;
  /** Show inline preview with highlighted changes */
  showInlinePreview?: boolean;
  /** Show expandable sections for each annotation type */
  showExpandableSections?: boolean;
  /** Default expanded state for sections (default: false) */
  defaultExpanded?: boolean;
  /** Whether removal is enabled (default: false) */
  allowRemoval?: boolean;
  /** Callback when a comment is removed */
  onRemoveComment?: (commentId: string) => void;
  /** Callback when a highlight is removed */
  onRemoveHighlight?: (highlightId: string) => void;
  /** Callback when a word-level track change is removed */
  onRemoveTrackChange?: (tcIndex: number, itemIndex: number, type: 'deleted' | 'added') => void;
  /** Callback when a full sentence deletion is removed */
  onRemoveFullSentenceDeletion?: (fsdIndex: number) => void;
  /** Callback when a full sentence insertion is removed */
  onRemoveFullSentenceInsertion?: (fsiIndex: number) => void;
  /** Callback when a structural change is removed */
  onRemoveStructuralChange?: (scIndex: number) => void;
  /** Show plain text when no annotations exist (instead of empty message) */
  showTextWhenEmpty?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Group items by section number and return sorted array of [section, items] tuples
 */
function groupBySection<T>(
  items: T[],
  getSectionNumber: (item: T) => string
): Array<[string, T[]]> {
  const groups: Record<string, T[]> = {};

  items.forEach((item) => {
    const section = getSectionNumber(item) || 'Unknown';
    if (!groups[section]) {
      groups[section] = [];
    }
    groups[section].push(item);
  });

  // Sort sections hierarchically and return as array of tuples
  return Object.entries(groups).sort((a, b) =>
    a[0].localeCompare(b[0], undefined, { numeric: true })
  );
}

/**
 * Strip Word control characters (comment anchors, field markers, etc.)
 */
const stripWordControlCharacters = (text: string): string => {
  return text.replace(/[\u0005\u0013\u0014\u0015\u0001\u0002]/g, '');
};

/**
 * Render text with \r converted to <br /> for section breaks
 */
const renderTextWithLineBreaks = (text: string, keyPrefix: string): React.ReactNode => {
  if (!text.includes('\r')) {
    return text;
  }

  const parts = text.split('\r');
  return parts.map((part, index) => (
    <React.Fragment key={`${keyPrefix}-${index}`}>
      {part}
      {index < parts.length - 1 && <br />}
    </React.Fragment>
  ));
};

/**
 * Render section text with inline annotations (section-relative offsets)
 */
const renderSectionTextWithAnnotations = (
  sectionInfo: SectionDisplayInfo,
  styles: ReturnType<typeof useStyles>,
  keyPrefix: string
): React.ReactNode => {
  const { text, annotations } = sectionInfo;
  const cleanText = stripWordControlCharacters(text);

  // Collect all inline changes with their offsets
  interface InlineAnnotation {
    id: string;
    type: 'deleted' | 'added' | 'comment' | 'highlight';
    text: string;
    startOffset: number;
    endOffset: number;
    tooltip?: string;
    color?: string;
  }

  const inlineAnnotations: InlineAnnotation[] = [];

  // Add word-level track changes
  annotations.wordLevelTrackChanges.forEach((tc, tcIndex) => {
    tc.deleted.forEach((d, idx) => {
      inlineAnnotations.push({
        id: `del-${tcIndex}-${idx}`,
        type: 'deleted',
        text: d.text,
        startOffset: d.startOffset ?? 0,
        endOffset: d.endOffset ?? d.text.length,
        tooltip: 'Deleted',
      });
    });
    tc.added.forEach((a, idx) => {
      inlineAnnotations.push({
        id: `add-${tcIndex}-${idx}`,
        type: 'added',
        text: a.text,
        startOffset: a.startOffset ?? 0,
        endOffset: a.endOffset ?? a.text.length,
        tooltip: 'Added',
      });
    });
  });

  // Add full sentence deletions
  annotations.fullSentenceDeletions.forEach((fsd, idx) => {
    inlineAnnotations.push({
      id: `fsd-${idx}`,
      type: 'deleted',
      text: fsd.deletedText,
      startOffset: fsd.startOffset ?? 0,
      endOffset: fsd.endOffset ?? fsd.deletedText.length,
      tooltip: 'Sentence deleted',
    });
  });

  // Add full sentence insertions
  annotations.fullSentenceInsertions.forEach((fsi, idx) => {
    inlineAnnotations.push({
      id: `fsi-${idx}`,
      type: 'added',
      text: fsi.insertedText,
      startOffset: fsi.startOffset ?? 0,
      endOffset: fsi.endOffset ?? fsi.insertedText.length,
      tooltip: 'Sentence added',
    });
  });

  // Sort by start offset
  inlineAnnotations.sort((a, b) => a.startOffset - b.startOffset);

  // If no annotations, return plain text
  if (inlineAnnotations.length === 0) {
    return <span className={styles.sectionTextContent}>{renderTextWithLineBreaks(cleanText, keyPrefix)}</span>;
  }

  // Build parts with annotations inline
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;

  for (const annotation of inlineAnnotations) {
    const startIdx = Math.max(0, annotation.startOffset);
    if (startIdx < currentIndex) continue;

    // Add text before this annotation
    if (startIdx > currentIndex) {
      const textBefore = cleanText.substring(currentIndex, startIdx);
      parts.push(
        <React.Fragment key={`${keyPrefix}-text-${currentIndex}`}>
          {renderTextWithLineBreaks(textBefore, `${keyPrefix}-text-${currentIndex}`)}
        </React.Fragment>
      );
    }

    // Add the annotated text
    const annotationText = stripWordControlCharacters(annotation.text);
    const isDeleted = annotation.type === 'deleted';
    parts.push(
      <span
        key={`${keyPrefix}-${annotation.id}`}
        className={isDeleted ? styles.deletion : styles.insertion}
        title={annotation.tooltip}
      >
        {annotationText}
      </span>
    );

    currentIndex = startIdx + annotationText.length;
  }

  // Add remaining text
  if (currentIndex < cleanText.length) {
    const remaining = cleanText.substring(currentIndex);
    parts.push(
      <React.Fragment key={`${keyPrefix}-text-end`}>
        {renderTextWithLineBreaks(remaining, `${keyPrefix}-text-end`)}
      </React.Fragment>
    );
  }

  return <span className={styles.sectionTextContent}>{parts}</span>;
};

// ============================================================================
// COMPONENT
// ============================================================================

export const AnnotationDisplay: React.FC<AnnotationDisplayProps> = ({
  text,
  annotations,
  showInlinePreview = true,
  showExpandableSections = true,
  defaultExpanded = false,
  allowRemoval = false,
  onRemoveComment,
  onRemoveTrackChange,
  onRemoveFullSentenceDeletion,
  onRemoveFullSentenceInsertion,
  onRemoveStructuralChange,
  showTextWhenEmpty = false,
}) => {
  const styles = useStyles();
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(() => 
    defaultExpanded ? new Set(['trackChanges', 'comments', 'highlights']) : new Set()
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Flatten all track changes for inline rendering
  const flattenedTrackChanges = React.useMemo((): FlattenedTrackChange[] => {
    const changes: FlattenedTrackChange[] = [];

    annotations.wordLevelTrackChanges.forEach((tc, tcIndex) => {
      tc.deleted.forEach((d, itemIndex) => {
        changes.push({
          id: `del-${tcIndex}-${itemIndex}`,
          type: 'word-deleted',
          text: d.text,
          sectionNumber: d.sectionNumber || tc.sectionNumber,
          topLevelSectionNumber: d.topLevelSectionNumber || tc.topLevelSectionNumber,
          startOffset: d.startOffset ?? 0,
          tcIndex,
          itemIndex,
        });
      });
      tc.added.forEach((a, itemIndex) => {
        changes.push({
          id: `add-${tcIndex}-${itemIndex}`,
          type: 'word-added',
          text: a.text,
          sectionNumber: a.sectionNumber || tc.sectionNumber,
          topLevelSectionNumber: a.topLevelSectionNumber || tc.topLevelSectionNumber,
          startOffset: a.startOffset ?? 0,
          tcIndex,
          itemIndex,
        });
      });
    });

    annotations.fullSentenceDeletions.forEach((fsd, fsdIndex) => {
      changes.push({
        id: `fsd-${fsdIndex}`,
        type: 'sentence-deleted',
        text: fsd.deletedText,
        sectionNumber: fsd.sectionNumber,
        topLevelSectionNumber: fsd.topLevelSectionNumber,
        startOffset: fsd.startOffset ?? Number.MAX_SAFE_INTEGER,
        fsdIndex,
      });
    });

    annotations.fullSentenceInsertions.forEach((fsi, fsiIndex) => {
      changes.push({
        id: `fsi-${fsiIndex}`,
        type: 'sentence-inserted',
        text: fsi.insertedText,
        sectionNumber: fsi.sectionNumber || fsi.inferredTopLevelSection,
        topLevelSectionNumber: fsi.inferredTopLevelSection,
        startOffset: fsi.startOffset ?? Number.MAX_SAFE_INTEGER,
        fsiIndex,
      });
    });

    (annotations.structuralChanges || []).forEach((sc, scIndex) => {
      changes.push({
        id: `sc-${scIndex}`,
        type: sc.type === 'section-deleted' ? 'section-deleted' : 'section-inserted',
        text: sc.fullContent,
        sectionNumber: sc.sectionNumber,
        topLevelSectionNumber: sc.sectionNumber,
        startOffset: 0,
        scIndex,
      });
    });

    // Sort by offset
    changes.sort((a, b) => a.startOffset - b.startOffset);

    return changes;
  }, [annotations]);

  // Render inline text with track changes highlighted
  const renderInlineText = React.useMemo(() => {
    if (flattenedTrackChanges.length === 0) {
      return <span>{text}</span>;
    }

    const parts: React.ReactNode[] = [];
    let currentIndex = 0;

    for (const change of flattenedTrackChanges) {
      // Skip structural changes in inline view
      if (change.type === 'section-deleted' || change.type === 'section-inserted') {
        continue;
      }

      // Use offset-based positioning
      const index = change.startOffset;

      if (index === undefined || index < currentIndex) continue;

      // Add text before this change
      if (index > currentIndex) {
        parts.push(
          <span key={`text-${currentIndex}`}>{text.substring(currentIndex, index)}</span>
        );
      }

      // Add the change
      const isDeleted = change.type === 'word-deleted' || change.type === 'sentence-deleted';
      parts.push(
        <span
          key={change.id}
          className={isDeleted ? styles.deletion : styles.insertion}
          title={`${isDeleted ? 'Deleted' : 'Added'}${
            change.sectionNumber ? ` in Section ${change.sectionNumber}` : ''
          }`}
        >
          {change.text}
        </span>
      );

      currentIndex = index + change.text.length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(<span key="text-end">{text.substring(currentIndex)}</span>);
    }

    return <>{parts}</>;
  }, [text, flattenedTrackChanges, styles]);

  // Group changes by section
  const groupedTrackChanges = React.useMemo(
    () => groupBySection(flattenedTrackChanges, (change) => change.sectionNumber),
    [flattenedTrackChanges]
  );

  // Group comments by section
  const groupedComments = React.useMemo(
    () =>
      groupBySection(
        annotations.comments,
        (comment) => comment.sectionNumber || comment.topLevelSectionNumbers[0] || 'Unknown'
      ),
    [annotations.comments]
  );

  // Group highlights by section
  const groupedHighlights = React.useMemo(
    () =>
      groupBySection(
        annotations.highlights,
        (highlight) =>
          highlight.sectionNumber || highlight.topLevelSectionNumbers[0] || 'Unknown'
      ),
    [annotations.highlights]
  );

  // Count totals
  const totalTrackChanges = flattenedTrackChanges.length;
  const totalComments = annotations.comments.length;
  const totalHighlights = annotations.highlights.length;

  // Handle removal
  const handleRemoveTrackChange = (change: FlattenedTrackChange) => {
    if (
      change.type === 'word-deleted' &&
      change.tcIndex !== undefined &&
      change.itemIndex !== undefined
    ) {
      onRemoveTrackChange?.(change.tcIndex, change.itemIndex, 'deleted');
    } else if (
      change.type === 'word-added' &&
      change.tcIndex !== undefined &&
      change.itemIndex !== undefined
    ) {
      onRemoveTrackChange?.(change.tcIndex, change.itemIndex, 'added');
    } else if (change.type === 'sentence-deleted' && change.fsdIndex !== undefined) {
      onRemoveFullSentenceDeletion?.(change.fsdIndex);
    } else if (change.type === 'sentence-inserted' && change.fsiIndex !== undefined) {
      onRemoveFullSentenceInsertion?.(change.fsiIndex);
    } else if (
      (change.type === 'section-deleted' || change.type === 'section-inserted') &&
      change.scIndex !== undefined
    ) {
      onRemoveStructuralChange?.(change.scIndex);
    }
  };

  // Check if we have section display info (single or multiple sections)
  const hasSectionDisplayInfo = annotations.sectionDisplayInfo && annotations.sectionDisplayInfo.length > 0;

  // Render text with section headers and ellipsis markers for partial selections
  const renderSectionFormattedText = () => {
    if (!annotations.sectionDisplayInfo) return null;

    return (
      <div>
        {annotations.sectionDisplayInfo.map((sectionInfo, idx) => (
          <div key={`section-${sectionInfo.sectionNumber}`} className={styles.sectionGroup}>
            <div className={styles.sectionLabel}>
              Section {sectionInfo.sectionNumber.replace(/\.$/, '')}
            </div>
            <div className={styles.textPreview} style={{ fontSize: '13px' }}>
              {sectionInfo.hasEllipsisBefore && (
                <span className={styles.ellipsis}>... </span>
              )}
              {renderSectionTextWithAnnotations(sectionInfo, styles, `section-${idx}`)}
              {sectionInfo.hasEllipsisAfter && (
                <span className={styles.ellipsis}> ...</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Section-formatted Text Preview - shows section numbers and ellipsis for partial selections */}
      {showInlinePreview && hasSectionDisplayInfo && !showExpandableSections && renderSectionFormattedText()}

      {/* Fallback Inline Text Preview - when no section display info available */}
      {showInlinePreview && text && !showExpandableSections && !hasSectionDisplayInfo && (
        <div className={styles.textPreview}>{renderInlineText}</div>
      )}

      {/* Track Changes Section */}
      {showExpandableSections && totalTrackChanges > 0 && (
        <div className={styles.annotationSection}>
          <div className={styles.sectionHeader} onClick={() => toggleSection('trackChanges')}>
            <div className={styles.sectionHeaderTitle}>
              {expandedSections.has('trackChanges') ? (
                <ChevronDown16Regular />
              ) : (
                <ChevronRight16Regular />
              )}
              <TextChangeCase16Regular />
              <span>Track Changes ({totalTrackChanges})</span>
            </div>
          </div>

          {expandedSections.has('trackChanges') && (
            <div>
              {/* Use section display info if available for better cross-section handling */}
              {hasSectionDisplayInfo ? (
                // Section-formatted display with ellipsis markers
                annotations.sectionDisplayInfo!.map((sectionInfo, sectionIdx) => {
                  const sectionTrackChanges = sectionInfo.annotations.wordLevelTrackChanges;
                  const sectionFSD = sectionInfo.annotations.fullSentenceDeletions;
                  const sectionFSI = sectionInfo.annotations.fullSentenceInsertions;
                  const hasChanges = sectionTrackChanges.length > 0 || sectionFSD.length > 0 || sectionFSI.length > 0;

                  return (
                    <div key={`tc-section-${sectionInfo.sectionNumber}`} className={styles.sectionGroup}>
                      <div className={styles.sectionLabel}>
                        Section {sectionInfo.sectionNumber.replace(/\.$/, '')}
                      </div>

                      {/* Inline preview using per-section text and offsets */}
                      {showInlinePreview && sectionInfo.text && (
                        <div className={styles.textPreview} style={{ marginBottom: '8px', fontSize: '13px' }}>
                          {sectionInfo.hasEllipsisBefore && (
                            <span className={styles.ellipsis}>... </span>
                          )}
                          {renderSectionTextWithAnnotations(sectionInfo, styles, `tc-section-${sectionIdx}`)}
                          {sectionInfo.hasEllipsisAfter && (
                            <span className={styles.ellipsis}> ...</span>
                          )}
                        </div>
                      )}


                      {/* Individual changes list */}
                      {sectionTrackChanges.map((tc, tcIdx) => (
                        <React.Fragment key={`tc-${tcIdx}`}>
                          {tc.deleted.map((d, dIdx) => (
                            <div key={`del-${tcIdx}-${dIdx}`} className={styles.annotationItem}>
                              <div className={styles.annotationItemContent}>
                                <span className={styles.itemLabel}>Deleted:</span>
                                <span className={styles.trackChangeDeleted}>
                                  {stripWordControlCharacters(d.text)}
                                </span>
                              </div>
                            </div>
                          ))}
                          {tc.added.map((a, aIdx) => (
                            <div key={`add-${tcIdx}-${aIdx}`} className={styles.annotationItem}>
                              <div className={styles.annotationItemContent}>
                                <span className={styles.itemLabel}>Added:</span>
                                <span className={styles.trackChangeAdded}>
                                  {stripWordControlCharacters(a.text)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </React.Fragment>
                      ))}
                      {sectionFSD.map((fsd, fsdIdx) => (
                        <div key={`fsd-${fsdIdx}`} className={styles.annotationItem}>
                          <div className={styles.annotationItemContent}>
                            <span className={styles.itemLabel}>Sentence Deleted:</span>
                            <span className={styles.trackChangeDeleted}>
                              {stripWordControlCharacters(fsd.deletedText)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {sectionFSI.map((fsi, fsiIdx) => (
                        <div key={`fsi-${fsiIdx}`} className={styles.annotationItem}>
                          <div className={styles.annotationItemContent}>
                            <span className={styles.itemLabel}>Sentence Added:</span>
                            <span className={styles.trackChangeAdded}>
                              {stripWordControlCharacters(fsi.insertedText)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })
              ) : (
                // Original single-section display
                groupedTrackChanges.map(([section, items]) => {
                  // Build inline preview for this section's changes
                  const sectionChanges = items.filter(
                    (c) => c.type !== 'section-deleted' && c.type !== 'section-inserted'
                  );

                  return (
                    <div key={`tc-section-${section}`} className={styles.sectionGroup}>
                      <div className={styles.sectionLabel}>
                        Section {section.replace(/\.$/, '')}
                      </div>

                      {/* Inline preview for this section */}
                      {showInlinePreview && text && sectionChanges.length > 0 && (
                        <div className={styles.textPreview} style={{ marginBottom: '8px', fontSize: '13px' }}>
                          {(() => {
                            const cleanText = stripWordControlCharacters(text);
                            const parts: React.ReactNode[] = [];
                            let currentIndex = 0;

                            // Sort changes by offset
                            const sortedChanges = [...sectionChanges].sort(
                              (a, b) => (a.startOffset ?? 0) - (b.startOffset ?? 0)
                            );

                            for (const change of sortedChanges) {
                              const index = change.startOffset ?? -1;
                              if (index === -1 || index < currentIndex) continue;

                              // Add text before this change (convert \r to <br />)
                              if (index > currentIndex) {
                                const textBefore = cleanText.substring(currentIndex, index);
                                parts.push(
                                  <React.Fragment key={`text-${currentIndex}`}>
                                    {renderTextWithLineBreaks(textBefore, `text-${currentIndex}`)}
                                  </React.Fragment>
                                );
                              }

                              const cleanChangeText = stripWordControlCharacters(change.text);
                              const isDeleted = change.type.includes('deleted');
                              parts.push(
                                <span
                                  key={change.id}
                                  className={isDeleted ? styles.deletion : styles.insertion}
                                >
                                  {cleanChangeText}
                                </span>
                              );
                              currentIndex = index + cleanChangeText.length;
                            }

                            // Add remaining text
                            if (currentIndex < cleanText.length) {
                              const remaining = cleanText.substring(currentIndex);
                              parts.push(
                                <React.Fragment key="text-end">
                                  {renderTextWithLineBreaks(remaining, 'text-end')}
                                </React.Fragment>
                              );
                            }

                            return <>{parts}</>;
                          })()}
                        </div>
                      )}

                      {/* Individual changes list */}
                      {items.map((change) => (
                        <div key={change.id} className={styles.annotationItem}>
                          <div className={styles.annotationItemContent}>
                            <span className={styles.itemLabel}>
                              {change.type.includes('deleted') ? 'Deleted:' : 'Added:'}
                            </span>
                            <span
                              className={
                                change.type.includes('deleted')
                                  ? styles.trackChangeDeleted
                                  : styles.trackChangeAdded
                              }
                            >
                              {stripWordControlCharacters(change.text)}
                            </span>
                          </div>
                          {allowRemoval && (
                            <Button
                              appearance="subtle"
                              size="small"
                              icon={<Dismiss16Regular />}
                              className={styles.removeButton}
                              onClick={() => handleRemoveTrackChange(change)}
                              aria-label="Remove this change"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Comments Section */}
      {showExpandableSections && totalComments > 0 && (
        <div className={styles.annotationSection}>
          <div className={styles.sectionHeader} onClick={() => toggleSection('comments')}>
            <div className={styles.sectionHeaderTitle}>
              {expandedSections.has('comments') ? (
                <ChevronDown16Regular />
              ) : (
                <ChevronRight16Regular />
              )}
              <Comment16Regular />
              <span>Comments ({totalComments})</span>
            </div>
          </div>

          {expandedSections.has('comments') && (
            <div>
              {hasSectionDisplayInfo ? (
                // Section-formatted display with ellipsis markers
                annotations.sectionDisplayInfo!.map((sectionInfo, sectionIdx) => {
                  const sectionComments = sectionInfo.annotations.comments;
                  if (sectionComments.length === 0) return null;

                  return (
                    <div key={`comment-section-${sectionInfo.sectionNumber}`} className={styles.sectionGroup}>
                      <div className={styles.sectionLabel}>
                        Section {sectionInfo.sectionNumber.replace(/\.$/, '')}
                      </div>

                      {/* Inline preview using per-section text and offsets */}
                      {showInlinePreview && sectionInfo.text && (
                        <div className={styles.textPreview} style={{ marginBottom: '8px', fontSize: '13px' }}>
                          {sectionInfo.hasEllipsisBefore && (
                            <span className={styles.ellipsis}>... </span>
                          )}
                          {(() => {
                            const cleanText = stripWordControlCharacters(sectionInfo.text);
                            const parts: React.ReactNode[] = [];
                            let currentIndex = 0;

                            const sortedComments = [...sectionComments].sort(
                              (a, b) => (a.startOffset ?? 0) - (b.startOffset ?? 0)
                            );

                            for (const comment of sortedComments) {
                              const index = comment.startOffset ?? -1;
                              const cleanSelected = stripWordControlCharacters(comment.selectedText || '');
                              if (index === -1 || !cleanSelected || index < currentIndex) continue;

                              if (index > currentIndex) {
                                const textBefore = cleanText.substring(currentIndex, index);
                                parts.push(
                                  <React.Fragment key={`ctext-${sectionIdx}-${currentIndex}`}>
                                    {renderTextWithLineBreaks(textBefore, `ctext-${sectionIdx}-${currentIndex}`)}
                                  </React.Fragment>
                                );
                              }

                              parts.push(
                                <span
                                  key={`comment-hl-${comment.commentId}`}
                                  style={{
                                    backgroundColor: '#fff3cd',
                                    borderBottom: '2px solid #ffc107',
                                    padding: '1px 2px',
                                    borderRadius: '2px',
                                  }}
                                  title={comment.commentContent}
                                >
                                  {cleanSelected}
                                </span>
                              );
                              currentIndex = index + cleanSelected.length;
                            }

                            if (currentIndex < cleanText.length) {
                              const remaining = cleanText.substring(currentIndex);
                              parts.push(
                                <React.Fragment key={`ctext-${sectionIdx}-end`}>
                                  {renderTextWithLineBreaks(remaining, `ctext-${sectionIdx}-end`)}
                                </React.Fragment>
                              );
                            }

                            return <>{parts}</>;
                          })()}
                          {sectionInfo.hasEllipsisAfter && (
                            <span className={styles.ellipsis}> ...</span>
                          )}
                        </div>
                      )}

                      {sectionComments.map((comment) => (
                        <div key={comment.commentId} className={styles.annotationItem}>
                          <div className={styles.annotationItemContent}>
                            <div className={styles.commentContent}>
                              <span className={styles.itemLabel}>Comment:</span>
                              <span>{comment.commentContent}</span>
                            </div>
                            {comment.replies && comment.replies.length > 0 && (
                              <div className={styles.commentReplies}>
                                {comment.replies.map((reply, idx) => (
                                  <div key={`reply-${idx}`}>
                                    <strong>{reply.author}:</strong> {reply.content}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {allowRemoval && onRemoveComment && (
                            <Button
                              appearance="subtle"
                              size="small"
                              icon={<Dismiss16Regular />}
                              className={styles.removeButton}
                              onClick={() => onRemoveComment(comment.commentId)}
                              aria-label="Remove this comment"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })
              ) : (
                // Original single-section display
                groupedComments.map(([section, items]) => (
                  <div key={`comment-section-${section}`} className={styles.sectionGroup}>
                    <div className={styles.sectionLabel}>
                      Section {section.replace(/\.$/, '')}
                    </div>

                    {/* Inline preview for comments in this section */}
                    {showInlinePreview && text && (
                      <div className={styles.textPreview} style={{ marginBottom: '8px', fontSize: '13px' }}>
                        {(() => {
                          const cleanText = stripWordControlCharacters(text);
                          const parts: React.ReactNode[] = [];
                          let currentIndex = 0;

                          // Sort comments by offset
                          const sortedComments = [...items].sort(
                            (a, b) => (a.startOffset ?? 0) - (b.startOffset ?? 0)
                          );

                          for (const comment of sortedComments) {
                            const index = comment.startOffset ?? -1;
                            const cleanSelected = stripWordControlCharacters(comment.selectedText || '');
                            if (index === -1 || !cleanSelected || index < currentIndex) continue;

                            // Add text before this comment
                            if (index > currentIndex) {
                              const textBefore = cleanText.substring(currentIndex, index);
                              parts.push(
                                <React.Fragment key={`ctext-${currentIndex}`}>
                                  {renderTextWithLineBreaks(textBefore, `ctext-${currentIndex}`)}
                                </React.Fragment>
                              );
                            }

                            parts.push(
                              <span
                                key={`comment-hl-${comment.commentId}`}
                                style={{
                                  backgroundColor: '#fff3cd',
                                  borderBottom: '2px solid #ffc107',
                                  padding: '1px 2px',
                                  borderRadius: '2px',
                                }}
                                title={comment.commentContent}
                              >
                                {cleanSelected}
                              </span>
                            );
                            currentIndex = index + cleanSelected.length;
                          }

                          // Add remaining text
                          if (currentIndex < cleanText.length) {
                            const remaining = cleanText.substring(currentIndex);
                            parts.push(
                              <React.Fragment key="ctext-end">
                                {renderTextWithLineBreaks(remaining, 'ctext-end')}
                              </React.Fragment>
                            );
                          }

                          return <>{parts}</>;
                        })()}
                      </div>
                    )}

                    {items.map((comment) => (
                      <div key={comment.commentId} className={styles.annotationItem}>
                        <div className={styles.annotationItemContent}>
                          <div className={styles.commentContent}>
                            <span className={styles.itemLabel}>Comment:</span>
                            <span>{comment.commentContent}</span>
                          </div>
                          {comment.replies && comment.replies.length > 0 && (
                            <div className={styles.commentReplies}>
                              {comment.replies.map((reply, idx) => (
                                <div key={`reply-${idx}`}>
                                  <strong>{reply.author}:</strong> {reply.content}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {allowRemoval && onRemoveComment && (
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<Dismiss16Regular />}
                            className={styles.removeButton}
                            onClick={() => onRemoveComment(comment.commentId)}
                            aria-label="Remove this comment"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Highlights Section */}
      {showExpandableSections && totalHighlights > 0 && (
        <div className={styles.annotationSection}>
          <div className={styles.sectionHeader} onClick={() => toggleSection('highlights')}>
            <div className={styles.sectionHeaderTitle}>
              {expandedSections.has('highlights') ? (
                <ChevronDown16Regular />
              ) : (
                <ChevronRight16Regular />
              )}
              <Highlight16Regular />
              <span>Highlights ({totalHighlights})</span>
            </div>
          </div>

          {expandedSections.has('highlights') && (
            <div>
              {hasSectionDisplayInfo ? (
                // Section-formatted display with ellipsis markers
                annotations.sectionDisplayInfo!.map((sectionInfo, sectionIdx) => {
                  const sectionHighlights = sectionInfo.annotations.highlights;
                  if (sectionHighlights.length === 0) return null;

                  return (
                    <div key={`highlight-section-${sectionInfo.sectionNumber}`} className={styles.sectionGroup}>
                      <div className={styles.sectionLabel}>
                        Section {sectionInfo.sectionNumber.replace(/\.$/, '')}
                      </div>

                      {/* Inline preview using per-section text and offsets */}
                      {showInlinePreview && sectionInfo.text && (
                        <div className={styles.textPreview} style={{ marginBottom: '8px', fontSize: '13px' }}>
                          {sectionInfo.hasEllipsisBefore && (
                            <span className={styles.ellipsis}>... </span>
                          )}
                          {(() => {
                            const cleanText = stripWordControlCharacters(sectionInfo.text);
                            const parts: React.ReactNode[] = [];
                            let currentIndex = 0;

                            const sortedHighlights = [...sectionHighlights].sort(
                              (a, b) => (a.startOffset ?? 0) - (b.startOffset ?? 0)
                            );

                            for (const highlight of sortedHighlights) {
                              const index = highlight.startOffset ?? -1;
                              const cleanSelected = stripWordControlCharacters(highlight.selectedText || '');
                              if (index === -1 || !cleanSelected || index < currentIndex) continue;

                              if (index > currentIndex) {
                                const textBefore = cleanText.substring(currentIndex, index);
                                parts.push(
                                  <React.Fragment key={`htext-${sectionIdx}-${currentIndex}`}>
                                    {renderTextWithLineBreaks(textBefore, `htext-${sectionIdx}-${currentIndex}`)}
                                  </React.Fragment>
                                );
                              }

                              parts.push(
                                <span
                                  key={`highlight-hl-${highlight.highlightId}`}
                                  style={{
                                    backgroundColor: highlight.highlightColor || '#FFFF00',
                                    padding: '1px 2px',
                                    borderRadius: '2px',
                                  }}
                                >
                                  {cleanSelected}
                                </span>
                              );
                              currentIndex = index + cleanSelected.length;
                            }

                            if (currentIndex < cleanText.length) {
                              const remaining = cleanText.substring(currentIndex);
                              parts.push(
                                <React.Fragment key={`htext-${sectionIdx}-end`}>
                                  {renderTextWithLineBreaks(remaining, `htext-${sectionIdx}-end`)}
                                </React.Fragment>
                              );
                            }

                            return <>{parts}</>;
                          })()}
                          {sectionInfo.hasEllipsisAfter && (
                            <span className={styles.ellipsis}> ...</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                // Original single-section display
                groupedHighlights.map(([section, highlightItems]) => (
                  <div key={`highlight-section-${section}`} className={styles.sectionGroup}>
                    <div className={styles.sectionLabel}>
                      Section {section.replace(/\.$/, '')}
                    </div>

                    {/* Inline preview for highlights in this section */}
                    {showInlinePreview && text && (
                      <div className={styles.textPreview} style={{ marginBottom: '8px', fontSize: '13px' }}>
                        {(() => {
                          const cleanText = stripWordControlCharacters(text);
                          const parts: React.ReactNode[] = [];
                          let currentIndex = 0;

                          // Sort highlights by offset
                          const sortedHighlights = [...highlightItems].sort(
                            (a, b) => (a.startOffset ?? 0) - (b.startOffset ?? 0)
                          );

                          for (const highlight of sortedHighlights) {
                            const index = highlight.startOffset ?? -1;
                            const cleanSelected = stripWordControlCharacters(highlight.selectedText || '');
                            if (index === -1 || !cleanSelected || index < currentIndex) continue;

                            // Add text before this highlight
                            if (index > currentIndex) {
                              const textBefore = cleanText.substring(currentIndex, index);
                              parts.push(
                                <React.Fragment key={`htext-${currentIndex}`}>
                                  {renderTextWithLineBreaks(textBefore, `htext-${currentIndex}`)}
                                </React.Fragment>
                              );
                            }

                            parts.push(
                              <span
                                key={`highlight-hl-${highlight.highlightId}`}
                                style={{
                                  backgroundColor: highlight.highlightColor || '#FFFF00',
                                  padding: '1px 2px',
                                  borderRadius: '2px',
                                }}
                              >
                                {cleanSelected}
                              </span>
                            );
                            currentIndex = index + cleanSelected.length;
                          }

                          // Add remaining text
                          if (currentIndex < cleanText.length) {
                            const remaining = cleanText.substring(currentIndex);
                            parts.push(
                              <React.Fragment key="htext-end">
                                {renderTextWithLineBreaks(remaining, 'htext-end')}
                              </React.Fragment>
                            );
                          }

                          return <>{parts}</>;
                        })()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state - show text or message */}
      {totalTrackChanges === 0 && totalComments === 0 && totalHighlights === 0 && (
        showTextWhenEmpty && text ? (
          hasSectionDisplayInfo ? (
            // Show section-formatted text with ellipsis markers (same style as annotation sections)
            <div>
              {annotations.sectionDisplayInfo!.map((sectionInfo, idx) => (
                <div key={`empty-section-${sectionInfo.sectionNumber}`} className={styles.sectionGroup}>
                  <div className={styles.sectionLabel}>
                    Section {sectionInfo.sectionNumber.replace(/\.$/, '')}
                  </div>
                  <div className={styles.textPreview} style={{ fontSize: '13px' }}>
                    {sectionInfo.hasEllipsisBefore && (
                      <span className={styles.ellipsis}>... </span>
                    )}
                    {renderTextWithLineBreaks(stripWordControlCharacters(sectionInfo.text), `empty-section-${idx}`)}
                    {sectionInfo.hasEllipsisAfter && (
                      <span className={styles.ellipsis}> ...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Fallback: plain text without section info
            <div className={styles.textPreview}>
              {renderTextWithLineBreaks(stripWordControlCharacters(text), 'empty-text')}
            </div>
          )
        ) : (
          <div className={styles.emptyState}>No annotations in this selection.</div>
        )
      )}
    </div>
  );
};

export default AnnotationDisplay;
