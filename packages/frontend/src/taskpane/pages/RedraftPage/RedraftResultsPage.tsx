import React, { useState, useMemo } from "react";
import {
  makeStyles,
  Button as FButton,
  Tooltip,
} from "@fluentui/react-components";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { FootnotePopup } from "./FootnotePopup";
import { downloadRedraftedDocument } from "@/src/services/redraftExport";
import type { DraftedSection, SkeletonSection, DraftedSentence } from "@/src/types/redraft";

interface RedraftResultsPageProps {
  onBack: () => void;
  draftedSections: DraftedSection[];
  skeleton: SkeletonSection[];
  originalParsed: any;
}

const useStyles = makeStyles({
  pageRoot: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#f8f9fa",
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
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    minHeight: 0,
  },

  // Summary section
  summarySection: {
    marginBottom: "24px",
  },
  summaryTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
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
  
  // Section card
  sectionCard: {
    border: "1px solid #4f8bd4",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    marginBottom: "12px",
    overflow: "hidden",
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
  cardHeaderBadge: {
    fontSize: "11px",
    padding: "2px 8px",
    borderRadius: "4px",
    marginLeft: "8px",
  },
  legalBadge: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
  },
  businessBadge: {
    backgroundColor: "#fff3e0",
    color: "#ef6c00",
  },
  cardContent: {
    padding: "0 16px 16px 16px",
    backgroundColor: "#ffffff",
  },

  // Clause styling
  clauseContainer: {
    marginBottom: "16px",
    paddingBottom: "16px",
    borderBottom: "1px solid #eee",
  },
  clauseContainerLast: {
    borderBottom: "none",
    paddingBottom: "0",
  },
  clauseHeader: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#333",
    marginBottom: "8px",
  },
  sentenceContainer: {
    marginBottom: "4px",
    lineHeight: "1.6",
  },
  sentenceText: {
    fontSize: "14px",
    color: "#333",
  },
  footnoteRef: {
    fontSize: "11px",
    cursor: "pointer",
    verticalAlign: "super",
    marginLeft: "2px",
    fontWeight: 600,
    color: "#666ff6",
    "&:hover": {
      textDecoration: "underline",
      textDecorationColor: "#666ff6",
    },
  },
  footnoteOriginal: {
    color: "#0F62FE",
  },
  footnoteAddition: {
    color: "#2e7d32",
  },

  // Source sections link
  sourceSectionLinks: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "12px",
    paddingTop: "12px",
    borderTop: "1px solid #eee",
  },
  sourceSectionLabel: {
    fontSize: "12px",
    color: "#666",
  },
  sourceSectionButton: {
    background: "none",
    border: "1px solid #4080FF",
    borderRadius: "4px",
    padding: "2px 8px",
    cursor: "pointer",
    color: "#0F62FE",
    fontSize: "12px",
    fontWeight: 500,
    "&:hover": {
      backgroundColor: "#F6F9FF",
    },
  },

  icon: {
    width: "16px",
    height: "16px",
    color: "#666",
  },
});

export const RedraftResultsPage: React.FC<RedraftResultsPageProps> = ({
  onBack,
  draftedSections,
  skeleton,
  originalParsed,
}) => {
  const styles = useStyles();

  // State
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [activePopup, setActivePopup] = useState<{
    sentence: DraftedSentence;
    position: { x: number; y: number };
  } | null>(null);

  // Expand all cards by default
  useMemo(() => {
    if (draftedSections.length > 0 && expandedCards.size === 0) {
      const allKeys = draftedSections.map(s => s.sectionNumber);
      setExpandedCards(new Set(allKeys));
    }
  }, [draftedSections]);

  // Get skeleton info for a section
  const getSkeletonForSection = (sectionNumber: string): SkeletonSection | undefined => {
    return skeleton.find(s => s.newSectionNumber === sectionNumber);
  };

  // Handlers
  const toggleCard = (sectionKey: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  };

  const scrollToSourceInWord = async (sectionRef: string) => {
    try {
      await Word.run(async (context) => {
        // Find section text in original structure
        const sectionText = findSectionText(originalParsed?.structure, sectionRef);
        if (!sectionText) {
          console.warn(`Section ${sectionRef} not found in original structure`);
          return;
        }

        // Search for text in document (use first 100 chars to avoid issues)
        const searchText = sectionText.substring(0, 100);
        const results = context.document.body.search(searchText, {
          matchCase: false,
          matchWholeWord: false,
        });
        results.load("items");
        await context.sync();

        if (results.items.length > 0) {
          results.items[0].select();
          await context.sync();
        }
      });
    } catch (error) {
      console.error("Error scrolling to source:", error);
    }
  };

  const findSectionText = (structure: any[], sectionRef: string): string | null => {
    if (!structure) return null;
    
    const normalizedRef = sectionRef.replace(/\.+$/, '').trim().toLowerCase();
    
    const search = (nodes: any[]): string | null => {
      for (const node of nodes) {
        const normalizedNode = (node.sectionNumber || '').replace(/\.+$/, '').trim().toLowerCase();
        if (normalizedNode === normalizedRef) {
          let text = node.text || '';
          if (node.additionalParagraphs?.length > 0) {
            text += ' ' + node.additionalParagraphs.join(' ');
          }
          return text;
        }
        if (node.children) {
          const found = search(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    return search(structure);
  };

  const handleFootnoteClick = (
    sentence: DraftedSentence,
    event: React.MouseEvent
  ) => {
    if (sentence.footnoteType === 'original' && sentence.originalSectionRef) {
      // Scroll to source in Word document
      scrollToSourceInWord(sentence.originalSectionRef);
    } else {
      // Show popup for additions
      setActivePopup({
        sentence,
        position: { x: event.clientX, y: event.clientY },
      });
    }
  };

  const handleSourceSectionClick = (sectionRef: string) => {
    scrollToSourceInWord(sectionRef);
  };

  const handleDownload = async () => {
    try {
      await downloadRedraftedDocument(draftedSections);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  // Stats
  const totalSections = draftedSections.length;
  const totalClauses = draftedSections.reduce(
    (sum, s) => sum + s.clauses.length,
    0
  );

  return (
    <div className={styles.pageRoot}>
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
        <div className={styles.headerRight}>
          <FButton
            appearance="primary"
            icon={<Download style={{ width: "16px", height: "16px" }} />}
            onClick={handleDownload}
            style={{ fontSize: "13px" }}
          >
            Download
          </FButton>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Summary */}
        <div className={styles.summarySection}>
          <div className={styles.summaryTitle}>
            <FileText className={styles.summaryTitleIcon} />
            <h3 className={styles.summaryTitleText}>Re-Drafted Agreement</h3>
          </div>
          <div className={styles.summaryBanner}>
            <p className={styles.summaryText}>
              Generated <span className={styles.summaryHighlight}>{totalSections}</span> section{totalSections !== 1 ? 's' : ''} with <span className={styles.summaryHighlight}>{totalClauses}</span> clause{totalClauses !== 1 ? 's' : ''}. 
              Click <span className={styles.footnoteOriginal}>[blue]</span> footnotes to locate source in Word.
            </p>
          </div>
        </div>

        {/* Section Cards */}
        {draftedSections.map(section => {
          const sectionKey = section.sectionNumber;
          const isExpanded = expandedCards.has(sectionKey);
          const skeletonInfo = getSkeletonForSection(sectionKey);

          return (
            <div key={sectionKey} className={styles.sectionCard}>
              {/* Card Header */}
              <div
                className={styles.cardHeader}
                onClick={() => toggleCard(sectionKey)}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <h4 className={styles.cardHeaderTitle}>
                    {section.sectionNumber}. {section.sectionHeading}
                  </h4>
                  {skeletonInfo && (
                    <span
                      className={`${styles.cardHeaderBadge} ${
                        skeletonInfo.isLegalSection
                          ? styles.legalBadge
                          : styles.businessBadge
                      }`}
                    >
                      {skeletonInfo.isLegalSection ? "Legal" : "Business"}
                    </span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className={styles.icon} />
                ) : (
                  <ChevronDown className={styles.icon} />
                )}
              </div>

              {/* Card Content */}
              {isExpanded && (
                <div className={styles.cardContent}>
                  {section.clauses.map((clause, clauseIdx) => (
                    <div
                      key={clause.clauseNumber || clauseIdx}
                      className={`${styles.clauseContainer} ${
                        clauseIdx === section.clauses.length - 1 ? styles.clauseContainerLast : ''
                      }`}
                    >
                      {clause.clauseHeading && (
                        <div className={styles.clauseHeader}>
                          {clause.clauseNumber} {clause.clauseHeading}
                        </div>
                      )}

                      {clause.sentences.map((sentence, sentenceIdx) => (
                        <div
                          key={sentenceIdx}
                          className={styles.sentenceContainer}
                        >
                          <span className={styles.sentenceText}>
                            {!clause.clauseHeading && sentenceIdx === 0 && (
                              <strong>{clause.clauseNumber} </strong>
                            )}
                            {sentence.text}
                          </span>
                          <sup
                            className={`${styles.footnoteRef} ${
                              sentence.footnoteType === 'original'
                                ? styles.footnoteOriginal
                                : styles.footnoteAddition
                            }`}
                            onClick={(e) => handleFootnoteClick(sentence, e)}
                            title={
                              sentence.footnoteType === 'original'
                                ? `Click to locate source (${sentence.originalSectionRef})`
                                : "Click to see reason for addition"
                            }
                          >
                            [{sentence.footnoteNumber}]
                          </sup>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Source sections */}
                  {skeletonInfo && skeletonInfo.oldSectionNumbers.length > 0 && (
                    <div className={styles.sourceSectionLinks}>
                      <span className={styles.sourceSectionLabel}>
                        Source in Word:
                      </span>
                      {skeletonInfo.oldSectionNumbers.map(ref => (
                        <button
                          key={ref}
                          onClick={() => handleSourceSectionClick(ref)}
                          className={styles.sourceSectionButton}
                        >
                          {ref}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footnote Popup */}
      {activePopup && (
        <FootnotePopup
          sentence={activePopup.sentence}
          position={activePopup.position}
          onClose={() => setActivePopup(null)}
        />
      )}
    </div>
  );
};