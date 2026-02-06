import {
  makeStyles,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Tooltip,
} from "@fluentui/react-components";
import { ChevronDown, ChevronUp, RefreshCw, Trash2, ChevronLeft, ChevronRight, Check, X, SquarePenIcon } from "lucide-react";
import {
  ChevronDown16Regular,
  ChevronRight16Regular,
} from "@fluentui/react-icons";
import { CiLocationArrow1 } from "react-icons/ci";
import * as React from "react";
import { DeleteDialog } from "./SummaryDeleteDialog";
import { SummaryEditDialog } from "./SummaryEditDialog";
import { getTextRange, getTextRangeAcrossParagraphs } from "../../../taskpane";
import type { FlattenedSummaryItem } from "..";
import { AnnotationPreviewInline } from './AnnotationPreviewInline';

interface SummaryCardProps {
  item: FlattenedSummaryItem;
  onDelete: () => void;
  onUpdate: (updates: Partial<FlattenedSummaryItem>) => void;
  onRerun: () => void;
  isRerunning?: boolean;
  // Carousel props
  isInCarousel?: boolean;
  onPrevVersion?: () => void;
  onNextVersion?: () => void;
  onAcceptVersion?: () => void;
  onCancelCarousel?: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  currentVersionIndex?: number;
  totalVersions?: number;
  // Config
  showRecommendation?: boolean;
}

const useStyles = makeStyles({
  root: {
    marginBottom: "1px",
    alignSelf: "stretch",
  },
  accordionItem: {
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#F6F6F6",
    marginBottom: "1px",
    transition: "opacity 0.2s ease, background-color 0.2s ease",
  },
  accordionHeader: {
    backgroundColor: "#F6F6F6",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    paddingRight: "40px",
    "&:hover": {
      backgroundColor: "#F6F6F6",
    },
  },
  customChevron: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#666",
    fontSize: "14px",
  },
  // Panel with NO grey background
  accordionPanel: {
    backgroundColor: "transparent !important",
    border: "none",
    borderRadius: "0 0 8px 8px",
    padding: "0 12px 12px 12px",
  },
  sectionNumber: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#333",
    margin: 0,
  },
  icon: {
    width: "16px",
    height: "16px",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "4px",
  },
  actionsButton: {
    background: "white",
    border: "1px solid grey",
    cursor: "pointer",
    marginLeft: "3px",
    boxShadow: "none",
    outline: "none",
    transition: "background-color 0.3s, color 0.3s",
    padding: "4px",
    borderRadius: "5px",
    display: "grid",
    placeContent: "center",
    color: "#0F62FE",
    "&:hover": {
      backgroundColor: "#eef3f8ff",
    },
  },
  carouselContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    padding: "8px 10px",
    marginBottom: "8px",
    backgroundColor: "#E8F0FE",
    borderRadius: "6px",
  },
  carouselButton: {
    minWidth: "28px",
    height: "28px",
    padding: "4px",
    backgroundColor: "white",
    border: "1px solid #ccc",
    borderRadius: "4px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  carouselAcceptButton: {
    minWidth: "28px",
    height: "28px",
    padding: "4px",
    backgroundColor: "#0F62FE",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  carouselCancelButton: {
    minWidth: "28px",
    height: "28px",
    padding: "4px",
    backgroundColor: "white",
    border: "1px solid #dc3545",
    borderRadius: "4px",
    cursor: "pointer",
    color: "#dc3545",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  carouselVersionText: {
    fontSize: "12px",
    color: "#333",
    minWidth: "40px",
    textAlign: "center" as const,
  },
  summaryContent: {
    marginTop: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  // Inline preview - white background, no border
  inlinePreview: {
    padding: "8px 10px",
    backgroundColor: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    fontSize: "13px",
    lineHeight: "1.6",
    color: "#333",
  },
  // Track change inline styles (matching AnnotationDisplay.tsx exactly)
  deletion: {
    backgroundColor: "#ffebee",
    color: "#c62828",
    textDecoration: "line-through",
    padding: "1px 4px",
    borderRadius: "2px",
    marginLeft: "2px",
    marginRight: "2px",
  },
  insertion: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
    fontWeight: "bold" as const,
    padding: "1px 4px",
    borderRadius: "2px",
    marginLeft: "2px",
    marginRight: "2px",
  },
  // Comment highlight style (matching AnnotationDisplay.tsx)
  commentHighlight: {
    backgroundColor: "#fff3cd",
    borderBottom: "2px solid #ffc107",
    padding: "1px 2px",
    borderRadius: "2px",
  },
  // Annotation item box (matching AnnotationDisplay.tsx annotationItem exactly)
  annotationItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "8px 10px",
    backgroundColor: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    fontSize: "12px",
  },
  annotationItemContent: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
  },
  // Labels (matching AnnotationDisplay.tsx)
  itemLabel: {
    color: "#666",
    marginRight: "4px",
  },
  // Track change specific styles (matching AnnotationDisplay.tsx)
  trackChangeDeleted: {
    backgroundColor: "#ffebee",
    color: "#c62828",
    textDecoration: "line-through",
    padding: "2px 6px",
    borderRadius: "3px",
    display: "inline",
  },
  trackChangeAdded: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
    fontWeight: "bold" as const,
    padding: "2px 6px",
    borderRadius: "3px",
    display: "inline",
  },
  // Collapsible field box - white background with border
  collapsibleBox: {
    position: "relative" as const,
    padding: "8px 10px",
    paddingRight: "32px",
    backgroundColor: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    fontSize: "12px",
    lineHeight: "1.6",
  },
  // Collapse button in top-right corner
  collapseButton: {
    position: "absolute" as const,
    top: "8px",
    right: "8px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "2px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#666",
    "&:hover": {
      color: "#333",
    },
  },
  // Inline label+content - no indentation on wrap
  collapsibleInlineContent: {
    color: "#333",
  },
  collapsibleLabel: {
    color: "#666",
    fontWeight: 600,
  },
  queryList: {
    margin: "4px 0",
    paddingLeft: "20px",
  },
  queryItem: {
    color: "#5E687A",
    fontSize: "13px",
    lineHeight: "1.5",
  },
  carouselNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 0",
    borderTop: "1px solid #e0e0e0",
    marginTop: "8px",
  },
  carouselButtons: {
    display: "flex",
    gap: "8px",
  },
  versionIndicator: {
    fontSize: "12px",
    color: "#666",
  },
});

/**
 * Strip Word control characters (matching AnnotationDisplay.tsx exactly)
 */
const stripWordControlCharacters = (text: string): string => {
  return text.replace(/[\u0005\u0013\u0014\u0015\u0001\u0002]/g, '');
};

// Collapsible field component - label and content inline, no indentation on wrap
interface CollapsibleFieldProps {
  label: string;
  content: React.ReactNode;
  defaultExpanded?: boolean;
}

const CollapsibleField: React.FC<CollapsibleFieldProps> = ({
  label,
  content,
  defaultExpanded = true,
}) => {
  const styles = useStyles();
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <div className={styles.collapsibleBox}>
      <button
        className={styles.collapseButton}
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        {isExpanded ? <ChevronDown16Regular /> : <ChevronRight16Regular />}
      </button>
      <div className={styles.collapsibleInlineContent}>
        <span className={styles.collapsibleLabel}>{label}: </span>
        {isExpanded && <span>{content}</span>}
      </div>
    </div>
  );
};

export const SummaryCard: React.FC<SummaryCardProps> = ({
  item,
  onDelete,
  onUpdate,
  onRerun,
  isRerunning = false,
  isInCarousel = false,
  onPrevVersion,
  onNextVersion,
  onAcceptVersion,
  onCancelCarousel,
  canGoPrev = false,
  canGoNext = false,
  currentVersionIndex = 0,
  totalVersions = 1,
  showRecommendation = true,
}) => {
  const styles = useStyles();
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
  const [openEditDialog, setOpenEditDialog] = React.useState(false);

  // Get section number from sourceAnnotation
  const getSectionNumber = (): string => {
    const { sourceAnnotation } = item;
    const sectionNum = sourceAnnotation.sectionNumber;
    if (sectionNum) {
      return sectionNum.replace(/\.$/, '');
    }
    return 'Unknown';
  };

  /**
   * Locate text in the document and highlight the appropriate selection.
   *
   * Strategy by annotation type:
   * - trackChange: Find originalSentence, select whole sentence (Word shows track change markup)
   * - comment: Find sentence first (unique context), then highlight selectedText within it
   * - fullSentenceDeletion: Find and select deletedText
   * - fullSentenceInsertion: Find and select insertedText
   */
  const handleLocateText = async () => {
    const { sourceAnnotation } = item;

    try {
      await Word.run(async (context) => {
        let sentenceText: string | null = null;
        let textToHighlight: string | null = null;

        // Determine what to search for and what to highlight based on annotation type
        if (sourceAnnotation.type === 'trackChange') {
          // Use originalSentence for searching (matches Word's view with track changes)
          // Highlight the whole sentence - Word will show the track change markup
          sentenceText = sourceAnnotation.originalSentence;
          textToHighlight = null; // Select whole sentence
          console.log("[Locate] TrackChange - using originalSentence:", sentenceText?.substring(0, 80) + "...");
        } else if (sourceAnnotation.type === 'comment') {
          // Use affectedSentence (from deepest section) as unique context
          // Then highlight just the selectedText within it
          sentenceText = sourceAnnotation.affectedSentence || null;
          textToHighlight = sourceAnnotation.selectedText;
          console.log("[Locate] Comment - affectedSentence:", sentenceText?.substring(0, 80) + "...");
          console.log("[Locate] Comment - selectedText to highlight:", textToHighlight);
        } else if (sourceAnnotation.type === 'fullSentenceDeletion') {
          // Search for and highlight the deleted text
          sentenceText = sourceAnnotation.deletedText;
          textToHighlight = null; // Select whole deleted text
          console.log("[Locate] FullSentenceDeletion - using deletedText");
        } else if (sourceAnnotation.type === 'fullSentenceInsertion') {
          // Search for and highlight the inserted text
          sentenceText = sourceAnnotation.insertedText;
          textToHighlight = null; // Select whole inserted text
          console.log("[Locate] FullSentenceInsertion - using insertedText");
        }

        if (!sentenceText) {
          console.log("[Locate] No sentence text available for annotation type:", sourceAnnotation.type);
          console.log("[Locate] sourceAnnotation:", sourceAnnotation);
          return;
        }

        // Step 1: Find the sentence/context in the document
        console.log("[Locate] Step 1: Searching for sentence in document...");
        let sentenceRange = await getTextRange(context, sentenceText);
        if (!sentenceRange) {
          console.log("[Locate] getTextRange failed, trying getTextRangeAcrossParagraphs...");
          sentenceRange = await getTextRangeAcrossParagraphs(context, sentenceText);
        }

        if (!sentenceRange) {
          console.log("[Locate] FAILED - Could not find sentence in document:", sentenceText.substring(0, 80) + "...");
          return;
        }

        console.log("[Locate] Step 1 SUCCESS - Found sentence range");

        // Step 2: If we have specific text to highlight, search within the sentence
        if (textToHighlight) {
          console.log("[Locate] Step 2: Searching for selectedText within sentence...");
          const searchResults = sentenceRange.search(textToHighlight, {
            matchCase: true,
            matchWildcards: false
          });
          searchResults.load('items');
          await context.sync();

          if (searchResults.items.length > 0) {
            // Found the specific text - highlight just that
            searchResults.items[0].select();
            await context.sync();
            console.log("[Locate] Step 2 SUCCESS - Selected specific text within sentence");
            return;
          }

          // Fallback: if selectedText not found within sentence, select whole sentence
          console.log("[Locate] Step 2 FALLBACK - selectedText not found within sentence, selecting whole sentence");
        }

        // Select the whole sentence
        sentenceRange.select();
        await context.sync();
        console.log("[Locate] SUCCESS - Selected sentence range");
      });
    } catch (error) {
      console.error("[Locate] Error locating text:", error);
    }
  };

  /**
   * Render inline preview based on annotation type
   */
  const renderInlinePreview = (): React.ReactNode => {
    // [DEBUG] Log what data reaches SummaryCard
    console.log(`[DEBUG SummaryCard] Rendering item.id: ${item.id}`);
    console.log(`[DEBUG SummaryCard] item.sentence: "${item.sentence?.substring(0, 50)}..."`);
    console.log(`[DEBUG SummaryCard] item.sourceAnnotation:`, item.sourceAnnotation);
    
    return (
      <AnnotationPreviewInline
        sourceAnnotation={item.sourceAnnotation}
        sentence={item.sentence}
        defaultExpanded={true}
      />
    );
  };

  /**
   * Render track change inline preview
   * Following AnnotationPreviewInline.tsx logic exactly:
   * 1. Show deletions first (struck through)
   * 2. Then show amendedSentence with additions highlighted using indexOf
   */
  const renderTrackChangePreview = (): React.ReactNode => {
    const { sourceAnnotation } = item;
    if (sourceAnnotation.type !== 'trackChange') return null;

    const { originalSentence, amendedSentence, deleted, added } = sourceAnnotation;
    
    // Get base text - use amended sentence if available, otherwise original
    const baseText = stripWordControlCharacters(amendedSentence || originalSentence || '');

    if (!baseText && (!deleted?.length) && (!added?.length)) {
      return <span>No preview available</span>;
    }

    // If no base text but we have changes, show changes only
    if (!baseText) {
      return (
        <>
          {deleted?.map((d, idx) => (
            <React.Fragment key={`del-${idx}`}>
              <span className={styles.deletion}>{stripWordControlCharacters(d.text)}</span>
              {idx < deleted.length - 1 && ' '}
            </React.Fragment>
          ))}
          {deleted && deleted.length > 0 && added && added.length > 0 && ' '}
          {added?.map((a, idx) => (
            <React.Fragment key={`add-${idx}`}>
              <span className={styles.insertion}>{stripWordControlCharacters(a.text)}</span>
              {idx < added.length - 1 && ' '}
            </React.Fragment>
          ))}
        </>
      );
    }

    // Following AnnotationPreviewInline.tsx pattern exactly:
    const parts: React.ReactNode[] = [];

    // Clean deletions and additions
    const cleanedDeletions = (deleted || []).map(d => ({
      text: d.text,
      cleanText: stripWordControlCharacters(d.text),
    }));

    const cleanedAdditions = (added || []).map(a => ({
      text: a.text,
      cleanText: stripWordControlCharacters(a.text),
    }));

    // Step 1: Render deletions first (they're removed from amended text)
    if (cleanedDeletions.length > 0) {
      for (const del of cleanedDeletions) {
        parts.push(
          <span key={`del-${parts.length}`} className={styles.deletion}>
            {del.cleanText}
          </span>
        );
        parts.push(<span key={`space-del-${parts.length}`}> </span>);
      }
    }

    // Step 2: Find additions in baseText and sort by position (using indexOf)
    const additionsWithPos = cleanedAdditions
      .map(a => ({
        ...a,
        position: baseText.indexOf(a.cleanText),
      }))
      .filter(a => a.position >= 0)
      .sort((a, b) => a.position - b.position);

    // Step 3: Render the amended text with additions highlighted
    let currentIndex = 0;
    for (const addition of additionsWithPos) {
      const index = baseText.indexOf(addition.cleanText, currentIndex);
      if (index === -1) continue;

      // Add text before this addition
      if (index > currentIndex) {
        parts.push(
          <span key={`text-${currentIndex}`}>
            {baseText.substring(currentIndex, index)}
          </span>
        );
      }

      // Add the highlighted addition
      parts.push(
        <span key={`add-${index}`} className={styles.insertion}>
          {addition.cleanText}
        </span>
      );

      currentIndex = index + addition.cleanText.length;
    }

    // Add remaining text after last addition
    if (currentIndex < baseText.length) {
      parts.push(
        <span key="text-end">{baseText.substring(currentIndex)}</span>
      );
    }

    // If no parts were added (no additions found in text), just show the base text
    if (parts.length === 0) {
      return <span>{baseText}</span>;
    }

    return <>{parts}</>;
  };

  /**
   * Render comment inline preview (matching AnnotationDisplay.tsx)
   */
  const renderCommentPreview = (): React.ReactNode => {
    const { sourceAnnotation } = item;
    if (sourceAnnotation.type !== 'comment') return null;

    const { selectedText, commentContent } = sourceAnnotation;
    const displayText = item.sentence || selectedText || '';
    const cleanDisplayText = stripWordControlCharacters(displayText);
    const cleanSelectedText = stripWordControlCharacters(selectedText || '');

    if (cleanDisplayText && cleanSelectedText) {
      const index = cleanDisplayText.indexOf(cleanSelectedText);
      if (index !== -1) {
        return (
          <>
            {index > 0 && <span>{cleanDisplayText.substring(0, index)}</span>}
            <span className={styles.commentHighlight} title={commentContent}>
              {cleanSelectedText}
            </span>
            {index + cleanSelectedText.length < cleanDisplayText.length && (
              <span>{cleanDisplayText.substring(index + cleanSelectedText.length)}</span>
            )}
          </>
        );
      }
    }

    if (cleanSelectedText) {
      return (
        <span className={styles.commentHighlight} title={commentContent}>
          {cleanSelectedText}
        </span>
      );
    }

    return <span>{cleanDisplayText || 'No preview available'}</span>;
  };

  /**
   * Render annotation details (Added/Deleted/Comment boxes)
   * Matching AnnotationDisplay.tsx annotationItem style exactly
   */
  const renderAnnotationDetails = (): React.ReactNode => {
    const { sourceAnnotation } = item;

    if (sourceAnnotation.type === 'trackChange') {
      const { deleted, added } = sourceAnnotation;
      const hasDetails = (deleted && deleted.length > 0) || (added && added.length > 0);

      if (!hasDetails) return null;

      return (
        <>
          {deleted && deleted.length > 0 && (
            <div className={styles.annotationItem}>
              <div className={styles.annotationItemContent}>
                <div>
                  <span className={styles.itemLabel}>Deleted:</span>
                  {deleted.map((d, idx) => (
                    <span key={idx} className={styles.trackChangeDeleted} style={{ marginRight: '4px' }}>
                      {stripWordControlCharacters(d.text)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          {added && added.length > 0 && (
            <div className={styles.annotationItem}>
              <div className={styles.annotationItemContent}>
                <div>
                  <span className={styles.itemLabel}>Added:</span>
                  {added.map((a, idx) => (
                    <span key={idx} className={styles.trackChangeAdded} style={{ marginRight: '4px' }}>
                      {stripWordControlCharacters(a.text)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      );
    }

    if (sourceAnnotation.type === 'comment') {
      return (
        <div className={styles.annotationItem}>
          <div className={styles.annotationItemContent}>
            <div>
              <span className={styles.itemLabel}>Comment:</span>
              <span>{sourceAnnotation.commentContent}</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={styles.root} id={`summary-card-${item.id}`}>
      <Accordion
        collapsible
        openItems={isExpanded ? ["summary"] : []}
        onToggle={(_, data) => {
          setIsExpanded(data.openItems.includes("summary"));
        }}
      >
        <AccordionItem value="summary" className={styles.accordionItem}>
          <AccordionHeader
            className={styles.accordionHeader}
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ position: "relative" }}
            expandIcon={null}
          >
            <p className={styles.sectionNumber}>
              Section {getSectionNumber()}
            </p>
            <div className={styles.customChevron}>
              {isExpanded ? (
                <ChevronUp className={styles.icon} />
              ) : (
                <ChevronDown className={styles.icon} />
              )}
            </div>
          </AccordionHeader>

          <AccordionPanel className={styles.accordionPanel}>
            {/* Inline Preview - white background */}
            <div className={styles.inlinePreview}>
              {renderInlinePreview()}
            </div>

            {/* Annotation Details + Summary Fields */}
            <div className={styles.summaryContent}>
              {renderAnnotationDetails()}

              {/* Summary Fields */}
              {item.type === 'substantive' ? (
                <>
                  {item.changeDescription && (
                    <CollapsibleField
                      label="Change Description"
                      content={item.changeDescription}
                      defaultExpanded={true}
                    />
                  )}

                  {item.implication && (
                    <CollapsibleField
                      label="Implication"
                      content={item.implication}
                      defaultExpanded={true}
                    />
                  )}

                  {showRecommendation && item.recommendation && (
                    <CollapsibleField
                      label="Recommendation"
                      content={item.recommendation}
                      defaultExpanded={true}
                    />
                  )}
                </>
              ) : (
                <CollapsibleField
                  label="Instruction Requests"
                  content={
                    <ul className={styles.queryList}>
                      {item.queryItems?.map((queryItem, idx) => (
                        <li key={idx} className={styles.queryItem}>
                          {queryItem}
                        </li>
                      ))}
                    </ul>
                  }
                  defaultExpanded={true}
                />
              )}
            </div>

            {/* Carousel Navigation - shown when in carousel mode */}
            {isInCarousel && totalVersions > 1 && (
              <div className={styles.carouselContainer}>
                <Tooltip content="Previous version" relationship="label" positioning="above">
                  <button
                    className={styles.carouselButton}
                    onClick={onPrevVersion}
                    disabled={!canGoPrev}
                    style={{ opacity: canGoPrev ? 1 : 0.5, cursor: canGoPrev ? "pointer" : "not-allowed" }}
                  >
                    <ChevronLeft className={styles.icon} />
                  </button>
                </Tooltip>

                <span className={styles.carouselVersionText}>
                  ({currentVersionIndex + 1}/{totalVersions})
                </span>

                <Tooltip content="Next version" relationship="label" positioning="above">
                  <button
                    className={styles.carouselButton}
                    onClick={onNextVersion}
                    disabled={!canGoNext}
                    style={{ opacity: canGoNext ? 1 : 0.5, cursor: canGoNext ? "pointer" : "not-allowed" }}
                  >
                    <ChevronRight className={styles.icon} />
                  </button>
                </Tooltip>

                <Tooltip content="Accept this version" relationship="label" positioning="above">
                  <button
                    className={styles.carouselAcceptButton}
                    onClick={onAcceptVersion}
                  >
                    <Check className={styles.icon} />
                  </button>
                </Tooltip>

                <Tooltip content="Remove this version" relationship="label" positioning="above">
                  <button
                    className={styles.carouselCancelButton}
                    onClick={onCancelCarousel}
                  >
                    <X className={styles.icon} />
                  </button>
                </Tooltip>
              </div>
            )}

            {/* Actions - always shown */}
            <div
              style={{
                padding: "12px 0 0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div className={styles.actions}>
                <Tooltip content="Delete" relationship="label" positioning="above">
                  <button
                    className={styles.actionsButton}
                    onClick={() => setOpenDeleteDialog(true)}
                  >
                    <Trash2 className={styles.icon} />
                  </button>
                </Tooltip>

                <Tooltip content="Regenerate" relationship="label" positioning="above">
                  <button
                    className={styles.actionsButton}
                    onClick={onRerun}
                    disabled={isRerunning}
                    style={{ opacity: isRerunning ? 0.5 : 1 }}
                  >
                    <RefreshCw
                      className={styles.icon}
                      style={{
                        animation: isRerunning ? "spin 1s linear infinite" : "none",
                      }}
                    />
                  </button>
                </Tooltip>
              </div>

              <div className={styles.actions}>
                <Tooltip content="Edit" relationship="label" positioning="above">
                  <button
                    className={styles.actionsButton}
                    onClick={() => setOpenEditDialog(true)}
                  >
                    <SquarePenIcon className={styles.icon} />
                  </button>
                </Tooltip>

                <Tooltip content="Locate in document" relationship="label" positioning="above">
                  <button
                    className={styles.actionsButton}
                    onClick={handleLocateText}
                  >
                    <CiLocationArrow1 className={styles.icon} />
                  </button>
                </Tooltip>
              </div>
            </div>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

      {/* Delete Dialog */}
      <DeleteDialog
        open={openDeleteDialog}
        title="Delete Annotation Summary"
        message="Are you sure you want to delete this annotation summary?"
        previewContent={
          <div className={styles.inlinePreview}>
            {renderInlinePreview()}
          </div>
        }
        onConfirm={() => {
          onDelete();
          setOpenDeleteDialog(false);
        }}
        onCancel={() => setOpenDeleteDialog(false)}
      />

      {/* Edit Dialog */}
      <SummaryEditDialog
        open={openEditDialog}
        item={item}
        onSave={(updates) => {
          onUpdate(updates);
          setOpenEditDialog(false);
        }}
        onCancel={() => setOpenEditDialog(false)}
      />
    </div>
  );
};

export default SummaryCard;
