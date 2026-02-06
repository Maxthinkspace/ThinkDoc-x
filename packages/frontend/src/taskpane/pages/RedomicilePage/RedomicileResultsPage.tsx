import React, { useState, useMemo } from "react";
import {
  makeStyles,
  Button as FButton,
} from "@fluentui/react-components";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Info,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { downloadRedomiciledDocument } from "@/src/services/redomicileExport";
import type { RedomiciledSection, RedomicileMetadata } from "@/src/types/redomicile";

interface RedomicileResultsPageProps {
  onBack: () => void;
  redomiciledSections: RedomiciledSection[];
  metadata: RedomicileMetadata;
  originalParsed: any;
  config: {
    sourceJurisdiction: string;
    targetJurisdiction: string;
    documentType: string;
    additionalGuidance?: string;
  };
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
    marginBottom: "12px",
  },
  summaryText: {
    color: "#666",
    fontSize: "14px",
    margin: 0,
    lineHeight: "1.6",
  },
  summaryHighlight: {
    color: "#0F62FE",
    fontWeight: 600,
  },
  metadataCard: {
    backgroundColor: "#fff",
    border: "1px solid #e1e1e1",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "16px",
  },
  metadataTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#333",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  metadataList: {
    margin: 0,
    paddingLeft: "20px",
    fontSize: "13px",
    color: "#666",
  },
  metadataItem: {
    marginBottom: "4px",
  },
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
  newBadge: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
  },
  adaptedBadge: {
    backgroundColor: "#fff3e0",
    color: "#ef6c00",
  },
  cardContent: {
    padding: "16px",
    backgroundColor: "#ffffff",
  },
  sectionContent: {
    fontSize: "14px",
    color: "#333",
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
  },
  notes: {
    marginTop: "12px",
    padding: "8px 12px",
    backgroundColor: "#f5f5f5",
    borderRadius: "4px",
    fontSize: "12px",
    color: "#666",
    fontStyle: "italic",
  },
  icon: {
    width: "16px",
    height: "16px",
    color: "#666",
  },
});

export const RedomicileResultsPage: React.FC<RedomicileResultsPageProps> = ({
  onBack,
  redomiciledSections,
  metadata,
  config,
}) => {
  const styles = useStyles();

  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useMemo(() => {
    if (redomiciledSections.length > 0 && expandedCards.size === 0) {
      const allKeys = redomiciledSections.map(s => s.sectionNumber);
      setExpandedCards(new Set(allKeys));
    }
  }, [redomiciledSections]);

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

  const handleDownload = async () => {
    try {
      await downloadRedomiciledDocument(redomiciledSections);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  const totalSections = redomiciledSections.length;
  const newSections = redomiciledSections.filter(s => s.isNewSection).length;
  const adaptedSections = redomiciledSections.filter(s => !s.isNewSection).length;

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
            <h3 className={styles.summaryTitleText}>Redomiciled Document</h3>
          </div>
          <div className={styles.summaryBanner}>
            <p className={styles.summaryText}>
              Document transformed from <span className={styles.summaryHighlight}>{config.sourceJurisdiction}</span> to <span className={styles.summaryHighlight}>{config.targetJurisdiction}</span>.
              Generated <span className={styles.summaryHighlight}>{totalSections}</span> section{totalSections !== 1 ? 's' : ''} 
              ({adaptedSections} adapted, {newSections} new).
            </p>
          </div>

          {/* Metadata */}
          {(metadata.removedClauses.length > 0 || metadata.addedClauses.length > 0 || metadata.adaptedClauses.length > 0) && (
            <div className={styles.metadataCard}>
              <div className={styles.metadataTitle}>
                <Info size={16} />
                Changes Summary
              </div>
              {metadata.removedClauses.length > 0 && (
                <div>
                  <strong style={{ fontSize: "13px", color: "#d32f2f" }}>
                    Removed Clauses ({metadata.removedClauses.length}):
                  </strong>
                  <ul className={styles.metadataList}>
                    {metadata.removedClauses.map((clause, idx) => (
                      <li key={idx} className={styles.metadataItem}>
                        Section {clause.sectionNumber}: {clause.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {metadata.addedClauses.length > 0 && (
                <div style={{ marginTop: "12px" }}>
                  <strong style={{ fontSize: "13px", color: "#2e7d32" }}>
                    Added Clauses ({metadata.addedClauses.length}):
                  </strong>
                  <ul className={styles.metadataList}>
                    {metadata.addedClauses.map((clause, idx) => (
                      <li key={idx} className={styles.metadataItem}>
                        Section {clause.sectionNumber}: {clause.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {metadata.adaptedClauses.length > 0 && (
                <div style={{ marginTop: "12px" }}>
                  <strong style={{ fontSize: "13px", color: "#ef6c00" }}>
                    Adapted Clauses ({metadata.adaptedClauses.length}):
                  </strong>
                  <ul className={styles.metadataList}>
                    {metadata.adaptedClauses.map((clause, idx) => (
                      <li key={idx} className={styles.metadataItem}>
                        Section {clause.sectionNumber}: {clause.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section Cards */}
        {redomiciledSections.map(section => {
          const sectionKey = section.sectionNumber;
          const isExpanded = expandedCards.has(sectionKey);

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
                  <span
                    className={`${styles.cardHeaderBadge} ${
                      section.isNewSection ? styles.newBadge : styles.adaptedBadge
                    }`}
                  >
                    {section.isNewSection ? "New" : "Adapted"}
                  </span>
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
                  <div className={styles.sectionContent}>
                    {section.content}
                  </div>
                  {section.notes && (
                    <div className={styles.notes}>
                      <strong>Note:</strong> {section.notes}
                    </div>
                  )}
                  {section.sourceSectionRef && (
                    <div className={styles.notes} style={{ marginTop: "8px" }}>
                      <strong>Source:</strong> Section {section.sourceSectionRef}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

