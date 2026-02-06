import React, { useState, useMemo, useRef } from "react";
import {
  makeStyles,
  Button as FButton,
  PositioningImperativeRef,
  Tooltip,
} from "@fluentui/react-components";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  PanelLeftClose,
  PanelLeft,
  CheckCircle,
  Info,
  X,
  BarChart3,
} from "lucide-react";
import { CiLocationArrow1 } from "react-icons/ci";
import { AiOutlineDelete } from "react-icons/ai";
import { Button } from "../../components/ui/button";
import {
  generateDiffHtml,
  getDiffStyles,
  createParagraphDiffProposal,
  applyWordLevelTrackChanges,
  addComment,
} from "../../taskpane";
import { getTextRange, getTextRangeAcrossParagraphs } from "@/src/taskpane/taskpane";
import type { FormattedAmendment } from "@/src/services/api";
import { ReferenceDocumentViewer } from "./ReferenceDocumentViewer";

// ============================================
// PROPS INTERFACE
// ============================================
interface PrecedentResultsPageProps {
  onBack: () => void;
  results: FormattedAmendment[];
  referenceParsed: any;
}

// ============================================
// CONSOLIDATED SECTION TYPE
// ============================================
interface ConsolidatedSection {
  originalSection: string;
  originalLanguage: string;
  amendedLanguage: string;
  referenceSections: string[];
  changeType: "addition" | "deletion" | "mixed";
  isFullDeletion?: boolean;
  isNewSection?: boolean;
}

// ============================================
// HELPER: Check if section is a new section addition
// ============================================
const isNewSectionAddition = (originalSection: string): boolean => {
  return originalSection.toLowerCase().startsWith('after section');
};

// ============================================
// HELPER: Compare section numbers for sorting
// ============================================
const compareSectionNumbers = (a: string, b: string): number => {
  const parseSection = (s: string): { base: number[]; isAfter: boolean } => {
    const afterMatch = s.match(/After Section ([\d.]+)/i);
    if (afterMatch && afterMatch[1]) {
      const parts = afterMatch[1].replace(/\.$/, '').split('.').map(Number);
      return { base: parts, isAfter: true };
    }
    const parts = s.replace(/\.$/, '').split('.').map(Number);
    return { base: parts, isAfter: false };
  };
  
  const aParsed = parseSection(a);
  const bParsed = parseSection(b);
  
  const maxLen = Math.max(aParsed.base.length, bParsed.base.length);
  for (let i = 0; i < maxLen; i++) {
    const aNum = aParsed.base[i] || 0;
    const bNum = bParsed.base[i] || 0;
    if (aNum !== bNum) return aNum - bNum;
  }
  
  if (aParsed.isAfter !== bParsed.isAfter) {
    return aParsed.isAfter ? 1 : -1;
  }
  
  return 0;
};

// ============================================
// HELPER: Format section number for display
// ============================================
const formatSectionDisplay = (sectionNum: string): string => {
  if (sectionNum.toLowerCase().startsWith('after section')) {
    return sectionNum;
  }
  return `Section ${sectionNum}`;
};

// ============================================
// HELPER: Normalize section number for comparison
// ============================================
const normalizeSectionForComparison = (section: string): string => {
  if (!section) return '';
  return section
    .trim()
    .toLowerCase()
    .replace(/^section\s*/i, '')
    .replace(/\.+$/, '')
    .replace(/\s+/g, '');
};

// ============================================
// HELPER: Find section text from reference structure
// ============================================
const findSectionTextInStructure = (
  structure: any[],
  targetSectionNumber: string
): string | null => {
  if (!structure || !targetSectionNumber) return null;

  const normalizedTarget = normalizeSectionForComparison(targetSectionNumber);

  const searchInNodes = (nodes: any[]): string | null => {
    for (const node of nodes) {
      const normalizedNode = normalizeSectionForComparison(node.sectionNumber || '');
      
      if (normalizedNode === normalizedTarget) {
        return node.text || '';
      }
      
      if (node.children && node.children.length > 0) {
        const found = searchInNodes(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  return searchInNodes(structure);
};

// ============================================
// DIFF VIEWER COMPONENT
// ============================================
interface DiffViewerProps {
  before: string;
  after: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ before, after }) => {
  const diffHtml = generateDiffHtml(before, after);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: getDiffStyles() }} />
      <div
        className="diff-container"
        dangerouslySetInnerHTML={{ __html: diffHtml }}
        style={{
          fontFamily: "inherit",
          lineHeight: "1.5",
        }}
      />
    </>
  );
};

// ============================================
// EMPTY STATE COMPONENT
// ============================================
import warnning from "@/src/assets/warnning.png";

const NoChangesFound: React.FC = () => {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "30px 20px",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          backgroundColor: "#f5f7fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <img
          src={warnning}
          alt="icon"
          style={{ width: 50, height: 50 }}
        />
      </div>

      <h2
        style={{
          fontSize: "18px",
          fontWeight: 600,
          margin: "0 0 8px",
          color: "#333",
        }}
      >
        No changes found
      </h2>

      <p
        style={{
          fontSize: "14px",
          color: "#6c6c6c",
          maxWidth: 260,
          margin: "0 auto",
          lineHeight: "20px",
        }}
      >
        The documents appear to be identical or no differences were detected between your draft and the precedent.
      </p>
    </div>
  );
};

// ============================================
// STYLES (aligned with Figma design)
// ============================================
const useStyles = makeStyles({
  // Layout
  pageRoot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    overflow: "hidden",
  },
  
  // ===========================================================================
  // NOTE 11-28-2025:
  // Reference panel - added box-sizing to ensure padding doesn't cause overflow
  // ===========================================================================
  referencePanel: {
    width: "350px",
    minWidth: "350px",
    maxWidth: "350px",
    height: "100%",
    borderRight: "1px solid #e1e1e1",
    backgroundColor: "#fff",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    transition: "width 0.3s ease, min-width 0.3s ease, max-width 0.3s ease",
    overflow: "hidden",
    boxSizing: "border-box",
  },
  referencePanelCollapsed: {
    width: "0px",
    minWidth: "0px",
    maxWidth: "0px",
    borderRight: "none",
    padding: "0",
  },
  // ===========================================================================
  // NOTE 11-28-2025:
  // Reference panel header - reduced padding and ensured proper width containment
  // ===========================================================================
  referencePanelHeader: {
    padding: "12px 12px 12px 16px",
    borderBottom: "1px solid #e1e1e1",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    flexShrink: 0,
    overflow: "hidden",
    boxSizing: "border-box",
    width: "100%",
    gap: "8px",
  },
  referencePanelContent: {
    flex: 1,
    overflow: "auto",
    padding: "0",
    minHeight: 0,
  },
  
  // ===========================================================================
  // NOTE 11-28-2025:
  // Tip banner - fixed width to stay within panel bounds, updated wording
  // ===========================================================================
  tipBanner: {
    backgroundColor: "#fff3cd",
    color: "#856404",
    padding: "8px 12px",
    borderBottom: "1px solid #ffeeba",
    fontSize: "12px",
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    flexShrink: 0,
    boxSizing: "border-box",
    width: "100%",
    overflow: "hidden",
  },
  tipBannerContent: {
    flex: 1,
    minWidth: 0,
    wordWrap: "break-word",
    overflowWrap: "break-word",
  },
  tipBannerCloseButton: {
    minWidth: '24px',
    width: '24px',
    height: '24px',
    padding: '0',
    marginTop: '-4px',
    flexShrink: 0,
  },
  
  // Main content
  mainContent: {
    flex: 1,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minWidth: "0",
  },
  pageHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px 12px 20px",
    borderBottom: "1px solid #e1e1e1",
    backgroundColor: "#fff",
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  title: {
    fontSize: "15px",
    fontWeight: 600,
    margin: 0,
    whiteSpace: "nowrap",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    minHeight: 0,
  },

  // ===========================================================================
  // NOTE 11-28-2025:
  // Summary section - title above box with icon, per Figma
  // ===========================================================================
  summarySection: {
    marginBottom: "24px",
  },
  summaryTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  // ===========================================================================
  // NOTE 11-28-2025:
  // Updated colors to match Figma selection colors
  // ===========================================================================
  summaryTitleIcon: {
    width: "20px",
    height: "20px",
    color: "#0F62FE",
  },
  summaryTitleText: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#333",
    margin: 0,
  },
  // ===========================================================================
  // NOTE 11-28-2025:
  // Summary banner - FIXED: continuous border on all 4 sides per Figma
  // Changed from borderLeft only to full border with border-radius
  // ===========================================================================
  summaryBanner: {
    backgroundColor: "#F6F9FF",
    border: "1px solid #0F62FE",
    borderRadius: "8px",
    padding: "12px 16px",
  },
  summaryText: {
    color: "#666",
    fontSize: "14px",
    margin: 0,
  },
  summaryHighlight: {
    color: "#0F62FE",
    fontWeight: 600,
  },
  
  // Change card - styled like Figma
  changeCard: {
    border: "1px solid #4f8bd4",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    marginBottom: "12px",
    overflow: "hidden",
    transition: "box-shadow 0.3s ease",
  },
  cardHeader: {
    backgroundColor: "#ffffff",
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
  },
  cardHeaderTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 600,
  },
  cardContent: {
    padding: "0 16px 16px 16px",
    backgroundColor: "#ffffff",
  },

  // ===========================================================================
  // NOTE 11-28-2025:
  // Change label - black text per Figma, reduced spacing
  // ===========================================================================
  changeLabel: {
    fontSize: "14px",
    fontWeight: 500,
    marginBottom: "8px",
    marginTop: "0",
    color: "#333",
  },

  // ===========================================================================
  // NOTE 11-28-2025:
  // Diff container - FIXED: increased left padding for better margin
  // Changed padding from "12px" to "12px 12px 12px 16px" for more left space
  // ===========================================================================
  diffContainer: {
    padding: "12px 12px 12px 16px",
    backgroundColor: "#ffffff",
    border: "1px solid #4f8bd4",
    borderRadius: "4px",
    fontSize: "14px",
    marginBottom: "12px",
  },
  
  // ===========================================================================
  // NOTE 11-28-2025:
  // Full deletion container - FIXED: increased left padding
  // ===========================================================================
  deletionContainer: {
    padding: "12px 12px 12px 16px",
    backgroundColor: "#f8d7da",
    border: "1px solid #f5c6cb",
    borderRadius: "4px",
    fontSize: "14px",
    marginBottom: "12px",
  },
  
  // ===========================================================================
  // NOTE 11-28-2025:
  // New section container - FIXED: increased left padding
  // ===========================================================================
  newSectionContainer: {
    padding: "12px 12px 12px 16px",
    backgroundColor: "#d4edda",
    border: "1px solid #c3e6cb",
    borderRadius: "4px",
    fontSize: "14px",
    marginBottom: "12px",
    color: "#155724",
    fontWeight: "bold",
    whiteSpace: "pre-wrap",
  },

  // ===========================================================================
  // NOTE 11-28-2025:
  // Reference section links - moved above divider per Figma
  // ===========================================================================
  referenceSectionLinks: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "12px",
  },
  referenceSectionLabel: {
    fontSize: "12px",
    color: "#666",
  },
  referenceSectionButton: {
    background: "none",
    border: "1px solid #4080FF",
    borderRadius: "4px",
    padding: "2px 8px",
    cursor: "pointer",
    color: "#0F62FE",
    fontSize: "12px",
    fontWeight: 500,
    minWidth: 'max-content',
    "&:hover": {
      backgroundColor: "#F6F9FF",
    },
  },

  // ===========================================================================
  // NOTE 11-28-2025:
  // Divider line between reference links and action buttons
  // ===========================================================================
  cardDivider: {
    borderTop: "1px solid #e1e1e1",
    paddingTop: "12px",
  },
  
  // Action footer - styled like Figma
  actionFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionLeft: {
    display: "flex",
    gap: "8px",
  },
  actionRight: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  
  // ===========================================================================
  // NOTE 11-28-2025:
  // Icon button - reduced size per feedback
  // ===========================================================================
  iconBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: "4px",
    border: "1px solid #4080FF",
    backgroundColor: "transparent",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    "&:hover": {
      backgroundColor: "#F6F9FF",
    },
  },
  
  // Applied badge
  appliedBadge: {
    color: "#22c55e",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  
  // Animation
  animateSpin: {
    animationName: {
      "0%": { transform: "rotate(0deg)" },
      "100%": { transform: "rotate(360deg)" },
    },
    animationDuration: "1s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
  
  // Chevron
  customChevron: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: "16px",
    height: "16px",
    color: "#666",
  },

  // ===========================================================================
  // NOTE 11-28-2025:
  // Show/Hide Precedent button - consistent styling for both states
  // ===========================================================================
  precedentToggleButton: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "13px",
    padding: "4px 8px",
    minWidth: "auto",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
});

// ============================================
// MAIN COMPONENT
// ============================================
export const PrecedentResultsPage: React.FC<PrecedentResultsPageProps> = ({
  onBack,
  results,
  referenceParsed,
}) => {
  const styles = useStyles();

  // ============================================
  // STATE
  // ============================================
  const [isReferencePanelOpen, setIsReferencePanelOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [isApplyingChanges, setIsApplyingChanges] = useState<{ [key: string]: boolean }>({});
  const [appliedSections, setAppliedSections] = useState<Set<string>>(new Set());
  const [deletedSections, setDeletedSections] = useState<Set<string>>(new Set());
  const [referenceSearchText, setReferenceSearchText] = useState<string | null>(null);
  const [showTipBanner, setShowTipBanner] = useState(true);

  // ============================================
  // CONSOLIDATE RESULTS BY ORIGINAL SECTION
  // ============================================
  const consolidatedSections = useMemo(() => {
    const sectionMap = new Map<string, ConsolidatedSection>();

    for (const result of results) {
      const sectionKey = result.original_section;

      if (!sectionMap.has(sectionKey)) {
        sectionMap.set(sectionKey, {
          originalSection: result.original_section,
          originalLanguage: result.original_language,
          amendedLanguage: result.amended_language,
          referenceSections: result.reference_section ? [result.reference_section] : [],
          changeType: result.change_type,
          isFullDeletion: result.isFullDeletion,
          isNewSection: isNewSectionAddition(result.original_section),
        });
      } else {
        const existing = sectionMap.get(sectionKey)!;
        
        if (result.reference_section && !existing.referenceSections.includes(result.reference_section)) {
          existing.referenceSections.push(result.reference_section);
        }
        
        if (existing.changeType !== result.change_type) {
          existing.changeType = "mixed";
        }
      }
    }

    return Array.from(sectionMap.values()).sort((a, b) =>
      compareSectionNumbers(a.originalSection, b.originalSection)
    );
  }, [results]);

  // ===========================================================================
  // NOTE 11-28-2025:
  // Simplified stats - just locations and changes count per Figma
  // ===========================================================================
  const totalLocations = consolidatedSections.length;
  const totalChanges = results.length;

  // Expand ALL cards by default
  useMemo(() => {
    if (consolidatedSections.length > 0 && expandedCards.size === 0) {
      const allSectionKeys = consolidatedSections.map(s => s.originalSection);
      setExpandedCards(new Set(allSectionKeys));
    }
  }, [consolidatedSections]);

  // ============================================
  // HANDLERS
  // ============================================
  const toggleCard = (sectionKey: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  };

  const handleLocateInDraft = async (text: string) => {
    try {
      return await Word.run(async (context) => {
        let targetRange = await getTextRange(context, text);
        if (!targetRange) {
          targetRange = await getTextRangeAcrossParagraphs(context, text);
        }
        if (targetRange) {
          targetRange.select();
          await context.sync();
        } else {
          throw new Error(`Unable to locate text in draft`);
        }
      });
    } catch (error) {
      console.error("Error locating text in draft:", error);
    }
  };

  const handleNavigateToReference = (referenceSection: string) => {
    if (!isReferencePanelOpen) {
      setIsReferencePanelOpen(true);
    }

    let searchText: string | null = null;
    
    if (referenceParsed?.structure) {
      searchText = findSectionTextInStructure(referenceParsed.structure, referenceSection);
    }

    if (searchText) {
      setReferenceSearchText(searchText);
    } else {
      setReferenceSearchText(referenceSection);
    }
  };

  const handleDeleteSection = (sectionKey: string) => {
    setDeletedSections((prev) => new Set([...Array.from(prev), sectionKey]));
  };

  const handleApplyTrackChanges = async (section: ConsolidatedSection) => {
    const sectionKey = section.originalSection;
    setIsApplyingChanges((prev) => ({ ...prev, [sectionKey]: true }));

    try {
      // Full deletion
      if (section.isFullDeletion) {
        await Word.run(async (context) => {
          let targetRange = await getTextRange(context, section.originalLanguage);
          if (!targetRange) {
            targetRange = await getTextRangeAcrossParagraphs(context, section.originalLanguage);
          }
          if (!targetRange) {
            throw new Error("Unable to locate text for deletion");
          }
          
          targetRange.insertText("[INTENTIONALLY DELETED]", "Replace");
          await context.sync();
        });

        setAppliedSections((prev) => new Set([...Array.from(prev), sectionKey]));
        return;
      }

      // New section insertion
      if (section.isNewSection) {
        await Word.run(async (context) => {
          let targetRange = await getTextRange(context, section.originalLanguage);
          if (!targetRange) {
            targetRange = await getTextRangeAcrossParagraphs(context, section.originalLanguage);
          }
          if (!targetRange) {
            throw new Error("Unable to locate previous section");
          }
          
          const targetRangeParagraphs = targetRange.paragraphs;
          targetRangeParagraphs.load("items");
          await context.sync();
          const endRange = targetRangeParagraphs.getLast().getRange("After");
          const insertedRange = endRange.insertText(section.amendedLanguage + "\n", "After");
          await context.sync();
          
          const insertedParagraphs = insertedRange.paragraphs;
          insertedParagraphs.load("items");
          await context.sync();
          
          for (const paragraph of insertedParagraphs.items) {
            try {
              const listItem = paragraph.listItemOrNullObject;
              listItem.load("isNullObject");
              await context.sync();
              
              if (!listItem.isNullObject) {
                paragraph.detachFromList();
                paragraph.leftIndent = 0;
                await context.sync();
              }
            } catch (detachError) {
              console.log("Could not detach paragraph from list:", detachError);
            }
          }
        });

        setAppliedSections((prev) => new Set([...Array.from(prev), sectionKey]));
        return;
      }

      // Regular amendment
      const proposal = createParagraphDiffProposal(
        section.originalLanguage,
        section.amendedLanguage
      );

      if (!proposal.isValid || !proposal.hasChanges) {
        return;
      }

      await handleLocateInDraft(section.originalLanguage);

      const success = await applyWordLevelTrackChanges(
        proposal,
        section.originalLanguage
      );

      if (success) {
        setAppliedSections((prev) => new Set([...Array.from(prev), sectionKey]));
      }
    } catch (error) {
      console.error("Error applying tracked changes:", error);
    } finally {
      setIsApplyingChanges((prev) => ({ ...prev, [sectionKey]: false }));
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className={styles.pageRoot}>
      {/* ============================================ */}
      {/* LEFT: REFERENCE PANEL */}
      {/* ============================================ */}
      <div
        className={`${styles.referencePanel} ${
          !isReferencePanelOpen ? styles.referencePanelCollapsed : ""
        }`}
      >
        {isReferencePanelOpen && (
          <>
            {/* ===========================================================================
                NOTE 11-28-2025:
                Header - fixed button styling to match "Show Precedent" button
                =========================================================================== */}
            <div className={styles.referencePanelHeader}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, flexShrink: 0 }}>Precedent</h3>
              <FButton
                appearance="subtle"
                icon={<PanelLeftClose style={{ width: "16px", height: "16px" }} />}
                onClick={() => setIsReferencePanelOpen(false)}
                title="Hide Precedent Panel"
                className={styles.precedentToggleButton}
              >
                Hide
              </FButton>
            </div>

            {/* ===========================================================================
                NOTE 11-28-2025:
                Tip banner - updated wording per user feedback:
                - Removed "task pane" (users don't know what it is)
                - Changed to "view your precedent and the comparison results side-by-side"
                - Changed "drag the add-in border" to "drag the left border of this panel"
                =========================================================================== */}
            {showTipBanner && (
              <div className={styles.tipBanner}>
                <Info style={{ width: "16px", height: "16px", flexShrink: 0 }} />
                <span className={styles.tipBannerContent}>
                  <strong>Tip:</strong> To view your precedent and the comparison results side-by-side, drag the left border of this panel to widen it.
                </span>
                <FButton
                  appearance="subtle"
                  icon={<X style={{ width: "14px", height: "14px" }} />}
                  onClick={() => setShowTipBanner(false)}
                  className={styles.tipBannerCloseButton}
                  title="Dismiss tip"
                />
              </div>
            )}

            <div className={styles.referencePanelContent}>
              {referenceParsed && referenceParsed.structure ? (
                <ReferenceDocumentViewer
                  structure={referenceParsed.structure}
                  recitals={referenceParsed.recitals}
                  searchText={referenceSearchText}
                />
              ) : (
                <p style={{ color: "#999", fontSize: "14px", padding: "16px" }}>
                  No precedent document loaded
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* ============================================ */}
      {/* RIGHT: MAIN CONTENT */}
      {/* ============================================ */}
      <div className={styles.mainContent}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              style={{ padding: "4px 8px", fontSize: "12px" }}
            >
              <ArrowLeft style={{ width: "14px", height: "14px", marginRight: "4px" }} />
              Back
            </Button>
          </div>
          {/* ===========================================================================
              NOTE 11-28-2025:
              Show Precedent button - using same className for consistent styling
              =========================================================================== */}
          {!isReferencePanelOpen && (
            <FButton
              appearance="subtle"
              icon={<PanelLeft style={{ width: "16px", height: "16px" }} />}
              onClick={() => setIsReferencePanelOpen(true)}
              className={styles.precedentToggleButton}
            >
              Show Precedent
            </FButton>
          )}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* ===========================================================================
              NOTE 11-28-2025:
              Summary section - title above box with icon, per Figma
              =========================================================================== */}
          <div className={styles.summarySection}>
            <div className={styles.summaryTitle}>
              <BarChart3 className={styles.summaryTitleIcon} />
              <h3 className={styles.summaryTitleText}>Comparison Summary</h3>
            </div>
            {/* ===========================================================================
                NOTE 11-28-2025:
                Summary banner - FIXED: now has continuous border on all 4 sides
                =========================================================================== */}
            <div className={styles.summaryBanner}>
              <p className={styles.summaryText}>
                Found <span className={styles.summaryHighlight}>{totalLocations}</span> location{totalLocations !== 1 ? 's' : ''} with <span className={styles.summaryHighlight}>{totalChanges}</span> change{totalChanges !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Change Cards */}
          {consolidatedSections.length === 0 ? (
            <NoChangesFound />
          ) : (
            consolidatedSections
              .filter((section) => !deletedSections.has(section.originalSection))
              .map((section) => {
                const sectionKey = section.originalSection;
                const isExpanded = expandedCards.has(sectionKey);
                const isApplying = isApplyingChanges[sectionKey];
                const isApplied = appliedSections.has(sectionKey);

                return (
                  <div key={sectionKey} className={styles.changeCard}>
                    {/* Card Header */}
                    <div
                      className={styles.cardHeader}
                      onClick={() => toggleCard(sectionKey)}
                    >
                      <h4 className={styles.cardHeaderTitle}>
                        {formatSectionDisplay(section.originalSection)}
                      </h4>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {isApplied && (
                          <span className={styles.appliedBadge}>
                            <CheckCircle style={{ width: "14px", height: "14px" }} />
                            Applied
                          </span>
                        )}
                        <div className={styles.customChevron}>
                          {isExpanded ? (
                            <ChevronUp className={styles.icon} />
                          ) : (
                            <ChevronDown className={styles.icon} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Content */}
                    {isExpanded && (
                      <div className={styles.cardContent}>
                        {/* ===========================================================================
                            NOTE 11-28-2025:
                            Change label - black text per Figma
                            =========================================================================== */}
                        <p className={styles.changeLabel}>
                          {section.isNewSection
                            ? "New Section to Add:"
                            : section.isFullDeletion
                              ? "Section to Delete:"
                              : "Recommended Changes:"}
                        </p>

                        {/* ===========================================================================
                            NOTE 11-28-2025:
                            Diff Display - FIXED: increased left padding in styles above
                            =========================================================================== */}
                        {section.isFullDeletion ? (
                          <div className={styles.deletionContainer}>
                            <span style={{ textDecoration: "line-through", color: "#721c24" }}>
                              {section.originalLanguage}
                            </span>
                            <br /><br />
                            <span style={{ color: "#155724", fontWeight: "bold" }}>
                              [INTENTIONALLY DELETED]
                            </span>
                          </div>
                        ) : section.isNewSection ? (
                          <div className={styles.newSectionContainer}>
                            {section.amendedLanguage}
                          </div>
                        ) : (
                          <div className={styles.diffContainer}>
                            <DiffViewer
                              before={section.originalLanguage}
                              after={section.amendedLanguage}
                            />
                          </div>
                        )}

                        {/* ===========================================================================
                            NOTE 11-28-2025:
                            Reference Section Links - moved above divider per Figma
                            =========================================================================== */}
                        {section.referenceSections.length > 0 ? (
                          <div className={styles.referenceSectionLinks}>
                            <span className={styles.referenceSectionLabel}>View in Precedent:</span>
                            {section.referenceSections.map((refSection) => (
                              <button
                                key={refSection}
                                onClick={() => handleNavigateToReference(refSection)}
                                className={styles.referenceSectionButton}
                              >
                                Section {refSection}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.referenceSectionLinks}>
                            <span className={styles.referenceSectionLabel}>
                              <em>No corresponding section in precedent</em>
                            </span>
                          </div>
                        )}

                        {/* ===========================================================================
                            NOTE 11-28-2025:
                            Divider and action buttons below per Figma
                            =========================================================================== */}
                        <div className={styles.cardDivider}>
                          <div className={styles.actionFooter}>
                            <div className={styles.actionLeft}>
                              <Tooltip
                                content="Remove this change"
                                relationship="label"
                                positioning="above"
                                withArrow
                              >
                                <button
                                  className={styles.iconBtn}
                                  onClick={() => handleDeleteSection(sectionKey)}
                                >
                                  <AiOutlineDelete size={16} color="#4080FF" />
                                </button>
                              </Tooltip>
                            </div>

                            <div className={styles.actionRight}>
                              <Tooltip
                                content={section.isNewSection ? "Locate Insert Point" : "Locate in Draft"}
                                relationship="label"
                                positioning="above"
                                withArrow
                              >
                                <button
                                  className={styles.iconBtn}
                                  onClick={() => handleLocateInDraft(section.originalLanguage)}
                                >
                                  <CiLocationArrow1 size={16} color="#4080FF" />
                                </button>
                              </Tooltip>

                              {/* ===========================================================================
                                  NOTE 11-29-2025:
                                  Apply Redline button - CHANGED: 
                                  - Stays blue after being clicked (removed green color)
                                  - Remains enabled after being clicked (removed isApplied from disabled)
                                  - Shows "Re-apply" instead of "Applied" after being clicked
                                  =========================================================================== */}
                              <FButton
                                appearance="primary"
                                disabled={isApplying}
                                onClick={() => handleApplyTrackChanges(section)}
                                style={{ 
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  backgroundColor: "#0F62FE",
                                  minWidth: "auto",
                                  height: "28px",
                                  padding: "0 12px",
                                }}
                              >
                                {isApplyingChanges[sectionKey] ? (
                                  <>
                                    <Loader2
                                      style={{ width: 14, height: 14, marginRight: 6 }}
                                      className={styles.animateSpin}
                                    />
                                    <span style={{ fontSize: "12px" }}>Applying...</span>
                                  </>
                                ) : (
                                  <span style={{ fontSize: "12px" }}>
                                    {isApplied ? "Re-apply" : "Apply Redline"}
                                  </span>
                                )}
                              </FButton>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
};
