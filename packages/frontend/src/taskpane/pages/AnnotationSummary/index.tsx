import {
  Button,
  makeStyles,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Tooltip,
  Divider,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from "@fluentui/react-components";
import React from "react";
import { useNavigation } from "../../hooks/use-navigation";
import { FaArrowLeft } from "react-icons/fa6";
import { LuDownload } from "react-icons/lu";
import { IoIosInformationCircle } from "react-icons/io";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SummaryCard } from "./components/SummaryCard";
import { useToast } from "../../hooks/use-toast";
import { exportSummaryToExcel } from "@/src/utils/summaryExport";
import type { 
  SectionSummary, 
  SentenceSummary,
  SourceAnnotation,
  SummaryGenerationContext,
} from "@/src/services/api";
import { backendApi } from "@/src/services/api";
import { SummaryVersionCarousel } from "./components/SummaryVersionCarousel";
import type { SummaryVersion } from "./components/SummaryVersionCarousel";

const useStyles = makeStyles({
  root: {
    minHeight: "100vh",
    maxWidth: "100%",
    overflowX: "hidden",
  },
  header: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "5px 19px",
  },
  headerTitle: {
    margin: "9px",
    fontWeight: 600,
    color: "#333333",
    fontSize: "15px",
  },
  headerIcon: {
    color: "#999999",
    border: "none",
    backgroundColor: "transparent",
    "&:hover": {
      color: "#999999",
      border: "none",
      backgroundColor: "transparent",
    },
  },
  alert: {
    display: "flex",
    alignItems: "start",
    borderRadius: "8px",
    gap: "8px",
    border: "1px solid",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
  },
  alertDescription: {
    fontSize: "14px",
    wordWrap: "break-word",
    overflowWrap: "break-word",
    wordBreak: "break-word",
    whiteSpace: "normal",
    flex: 1,
    minWidth: 0,
  },
  infoIcon: {
    paddingTop: "4px",
    width: "16px",
    height: "16px",
    flexShrink: 0,
  },
  cardContent: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "5px",
  },
  icon: {
    width: "16px",
    height: "16px",
  },
  categoryAccordionItemNoBorder: {
    border: "1px solid #e9ecef",
    borderRadius: "12px",
    backgroundColor: "transparent",
    marginBottom: "16px",
  },
  categoryAccordionHeader: {
    border: "none",
    borderRadius: "12px",
    padding: "12px",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    maxWidth: "100%",
    overflow: "hidden",
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  categoryAccordionHeaderContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
  },
  emptyState: {
    padding: "24px",
    textAlign: "center" as const,
    color: "#666",
    fontSize: "14px",
  },
});

// Flattened summary item for display
export interface FlattenedSummaryItem {
  id: string;
  sectionNumber: string;
  sentence: string;
  sourceAnnotation: SourceAnnotation;
  type: 'substantive' | 'query';
  // For substantive
  changeDescription?: string;
  implication?: string;
  recommendation?: string;
  // For query
  queryItems?: string[];
}

type InfoProps = {
  bgColor: string;
  borderColor: string;
  content: string;
  iconColor: string;
};

const Info: React.FC<InfoProps> = ({ bgColor, content, borderColor, iconColor }) => {
  const styles = useStyles();
  return (
    <div
      className={styles.alert}
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        padding: "10px",
        marginBottom: "10px",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <IoIosInformationCircle
        className={styles.infoIcon}
        style={{ color: iconColor, flexShrink: 0 }}
      />
      <span className={styles.alertDescription} style={{ whiteSpace: "normal" }}>
        {content}
      </span>
    </div>
  );
};

export const SummaryPage = () => {
  const { navigateTo } = useNavigation();
  const styles = useStyles();
  const { toast } = useToast();

  // Load summary from localStorage
  const [summaryData, setSummaryData] = React.useState<SectionSummary[]>(() => {
    const stored = localStorage.getItem("summaryResult");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.summary?.sections || [];
      } catch (e) {
        console.error("Failed to parse stored summary:", e);
      }
    }
    return [];
  });

  // Accordion states
  const [isAmendmentsExpanded, setIsAmendmentsExpanded] = React.useState(true);
  const [isQueriesExpanded, setIsQueriesExpanded] = React.useState(true);

  // Rerun state
  const [rerunningIds, setRerunningIds] = React.useState<Set<string>>(new Set());

  // Generation contexts for re-run capability
  const [rerunContexts, setRerunContexts] = React.useState<Record<string, SummaryGenerationContext>>(() => {
    const stored = localStorage.getItem("summaryRerunContexts");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse rerun contexts:", e);
      }
    }
    return {};
  });

  // Carousel state - tracks versions per annotationId
  const [summaryVersions, setSummaryVersions] = React.useState<Map<string, SummaryVersion[]>>(() => {
    try {
      const stored = localStorage.getItem("summaryCarouselVersions");
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Map(Object.entries(parsed));
      }
    } catch (e) {
      console.error("Failed to parse carousel versions:", e);
    }
    return new Map();
  });

  const [carouselActiveFor, setCarouselActiveFor] = React.useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("summaryCarouselActiveFor");
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse carousel active:", e);
    }
    return new Set();
  });

  const [carouselCurrentIndex, setCarouselCurrentIndex] = React.useState<Map<string, number>>(() => {
    try {
      const stored = localStorage.getItem("summaryCarouselCurrentIndex");
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Map(Object.entries(parsed).map(([k, v]) => [k, Number(v)]));
      }
    } catch (e) {
      console.error("Failed to parse carousel index:", e);
    }
    return new Map();
  });

  // Load config from localStorage
  const showRecommendation = React.useMemo(() => {
    const config = localStorage.getItem('summaryConfig');
    if (config) {
      try {
        const parsed = JSON.parse(config);
        return parsed.includeRecommendations !== false;
      } catch (e) {
        return true;
      }
    }
    return true;
  }, []);

  // Flatten and categorize summaries
  const { substantiveItems, queryItems } = React.useMemo(() => {
    const substantive: FlattenedSummaryItem[] = [];
    const query: FlattenedSummaryItem[] = [];

    summaryData.forEach((section) => {
      section.sentences.forEach((sentence) => {
        // Skip editorial items (E type)
        if (sentence.substantive) {
          substantive.push({
            id: sentence.id,
            sectionNumber: section.sectionNumber,
            sentence: sentence.sentence,
            sourceAnnotation: sentence.sourceAnnotation,
            type: 'substantive',
            changeDescription: sentence.substantive.change_description,
            implication: sentence.substantive.implication,
            recommendation: sentence.substantive.recommendation,
          });
        }

        if (sentence.query && sentence.query.items.length > 0) {
          query.push({
            id: `${sentence.id}-query`,
            sectionNumber: section.sectionNumber,
            sentence: sentence.sentence,
            sourceAnnotation: sentence.sourceAnnotation,
            type: 'query',
            queryItems: sentence.query.items,
          });
        }
      });
    });

    return { substantiveItems: substantive, queryItems: query };
  }, [summaryData]);

  // Save to localStorage when data changes
  React.useEffect(() => {
    const currentStored = localStorage.getItem("summaryResult");
    if (currentStored) {
      try {
        const parsed = JSON.parse(currentStored);
        parsed.summary = { sections: summaryData };
        localStorage.setItem("summaryResult", JSON.stringify(parsed));
      } catch (e) {
        console.error("Failed to update stored summary:", e);
      }
    }
  }, [summaryData]);

  // Persist rerun contexts
  React.useEffect(() => {
    localStorage.setItem("summaryRerunContexts", JSON.stringify(rerunContexts));
  }, [rerunContexts]);

  // Persist carousel state
  React.useEffect(() => {
    const versionsObj: Record<string, SummaryVersion[]> = {};
    summaryVersions.forEach((v, k) => { versionsObj[k] = v; });
    localStorage.setItem("summaryCarouselVersions", JSON.stringify(versionsObj));
  }, [summaryVersions]);

  React.useEffect(() => {
    localStorage.setItem("summaryCarouselActiveFor", JSON.stringify(Array.from(carouselActiveFor)));
  }, [carouselActiveFor]);

  React.useEffect(() => {
    const indexObj: Record<string, number> = {};
    carouselCurrentIndex.forEach((v, k) => { indexObj[k] = v; });
    localStorage.setItem("summaryCarouselCurrentIndex", JSON.stringify(indexObj));
  }, [carouselCurrentIndex]);

  // Load rerun contexts when summaryResult changes
  React.useEffect(() => {
    const stored = localStorage.getItem("summaryResult");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.rerunContexts) {
          setRerunContexts(parsed.rerunContexts);
        }
      } catch (e) {
        console.error("Failed to load rerun contexts:", e);
      }
    }
  }, []);

  // Delete handler
  const handleDelete = (id: string, type: 'substantive' | 'query') => {
    setSummaryData((prev) => {
      return prev.map((section) => ({
        ...section,
        sentences: section.sentences
          .map((sentence) => {
            if (type === 'substantive' && sentence.id === id) {
              const { substantive, ...rest } = sentence;
              return rest as SentenceSummary;
            }
            if (type === 'query' && `${sentence.id}-query` === id) {
              const { query, ...rest } = sentence;
              return rest as SentenceSummary;
            }
            return sentence;
          })
          .filter((sentence) => sentence.substantive || sentence.query),
      })).filter((section) => section.sentences.length > 0);
    });

    toast({ title: "", description: "Item removed." });
  };

  // Update handler
  const handleUpdate = (
    id: string,
    type: 'substantive' | 'query',
    updates: Partial<FlattenedSummaryItem>
  ) => {
    setSummaryData((prev) => {
      return prev.map((section) => ({
        ...section,
        sentences: section.sentences.map((sentence) => {
          if (type === 'substantive' && sentence.id === id) {
            return {
              ...sentence,
              substantive: {
                change_description: updates.changeDescription || sentence.substantive?.change_description || '',
                implication: updates.implication || sentence.substantive?.implication || '',
                recommendation: updates.recommendation || sentence.substantive?.recommendation || '',
              },
            };
          }
          if (type === 'query' && `${sentence.id}-query` === id) {
            return {
              ...sentence,
              query: {
                items: updates.queryItems || sentence.query?.items || [],
              },
            };
          }
          return sentence;
        }),
      }));
    });

    toast({ title: "", description: "Changes saved." });
  };

  // Rerun handler (placeholder - implement actual API call)
  // Get annotation ID for rerun context lookup
  const getAnnotationIdFromItem = (item: FlattenedSummaryItem): string => {
    const { sourceAnnotation } = item;
    return sourceAnnotation.annotationId || '';
  };

  // Check if rerun is available
  const isRerunAvailable = (): boolean => {
    return Object.keys(rerunContexts).length > 0;
  };

  // Get carousel data for an item
  const getCarouselData = (item: FlattenedSummaryItem) => {
    const annotationId = getAnnotationIdFromItem(item);
    if (!annotationId || !carouselActiveFor.has(annotationId)) return null;
    
    const versions = summaryVersions.get(annotationId);
    const currentIndex = carouselCurrentIndex.get(annotationId) ?? 0;
    if (!versions) return null;
    
    return { versions, currentIndex, annotationId };
  };

  // Initialize carousel with original + new version
  const initializeCarousel = (annotationId: string, originalItem: FlattenedSummaryItem, newSummary: FlattenedSummaryItem) => {
    const versions: SummaryVersion[] = [
      { versionIndex: 0, summary: originalItem, isOriginal: true },
      { versionIndex: 1, summary: newSummary, isOriginal: false },
    ];
    
    setSummaryVersions(prev => new Map(prev).set(annotationId, versions));
    setCarouselCurrentIndex(prev => new Map(prev).set(annotationId, 1)); // Show new version
    setCarouselActiveFor(prev => new Set(prev).add(annotationId));
  };

  // Add new version to existing carousel
  const addVersionToCarousel = (annotationId: string, newSummary: FlattenedSummaryItem) => {
    setSummaryVersions(prev => {
      const newMap = new Map(prev);
      const versions = newMap.get(annotationId) || [];
      const newVersion: SummaryVersion = {
        versionIndex: versions.length,
        summary: newSummary,
        isOriginal: false,
      };
      newMap.set(annotationId, [...versions, newVersion]);
      return newMap;
    });
    
    // Navigate to new version
    setCarouselCurrentIndex(prev => {
      const versions = summaryVersions.get(annotationId) || [];
      return new Map(prev).set(annotationId, versions.length);
    });
  };

  // Handle version change in carousel
  const handleCarouselVersionChange = (annotationId: string, newIndex: number) => {
    setCarouselCurrentIndex(prev => new Map(prev).set(annotationId, newIndex));
  };

  // Accept version and exit carousel mode
  const handleCarouselAccept = (annotationId: string, versionIndex: number) => {
    const versions = summaryVersions.get(annotationId);
    if (!versions) return;
    
    const acceptedVersion = versions[versionIndex];
    if (!acceptedVersion) return;

    // Update summaryData with accepted version
    setSummaryData((prev) => {
      return prev.map((section) => ({
        ...section,
        sentences: section.sentences.map((sentence) => {
          // Match by annotation ID
          const sentenceAnnotationId = getAnnotationIdFromSentence(sentence);
          if (sentenceAnnotationId === annotationId) {
            // Rebuild sentence from accepted version
            const accepted = acceptedVersion.summary;
            const updatedSentence: SentenceSummary = {
              ...sentence,
              id: accepted.id,
              sentence: accepted.sentence,
            };
            
            if (accepted.type === 'substantive' && accepted.changeDescription) {
              updatedSentence.substantive = {
                change_description: accepted.changeDescription,
                implication: accepted.implication || '',
                recommendation: accepted.recommendation || '',
              };
              delete updatedSentence.query;
            } else if (accepted.type === 'query' && accepted.queryItems) {
              updatedSentence.query = { items: accepted.queryItems };
              delete updatedSentence.substantive;
            }
            
            return updatedSentence;
          }
          return sentence;
        }),
      }));
    });

    // Clear carousel state for this annotation
    setCarouselActiveFor(prev => {
      const newSet = new Set(prev);
      newSet.delete(annotationId);
      return newSet;
    });
    setSummaryVersions(prev => {
      const newMap = new Map(prev);
      newMap.delete(annotationId);
      return newMap;
    });
    setCarouselCurrentIndex(prev => {
      const newMap = new Map(prev);
      newMap.delete(annotationId);
      return newMap;
    });

    toast({ title: "", description: `Selected version ${versionIndex + 1}.` });
  };

  // Helper to get annotation ID from SentenceSummary
  const getAnnotationIdFromSentence = (sentence: SentenceSummary): string => {
    const sa = sentence.sourceAnnotation;
    if (!sa) return '';
    if (sa.type === 'trackChange') return (sa as any).sentenceId || '';
    if (sa.type === 'comment') return (sa as any).commentId || '';
    return (sa as any).id || '';
  };

  // Cancel carousel mode
  const handleCarouselCancel = (annotationId: string) => {
    setCarouselActiveFor(prev => {
      const newSet = new Set(prev);
      newSet.delete(annotationId);
      return newSet;
    });
    setSummaryVersions(prev => {
      const newMap = new Map(prev);
      newMap.delete(annotationId);
      return newMap;
    });
    setCarouselCurrentIndex(prev => {
      const newMap = new Map(prev);
      newMap.delete(annotationId);
      return newMap;
    });
  };

  // Main rerun handler
  const handleRerun = async (item: FlattenedSummaryItem) => {
    const annotationId = getAnnotationIdFromItem(item);
    
    if (!annotationId) {
      toast({ title: "Cannot Rerun", description: "No annotation ID found." });
      return;
    }

    const context = rerunContexts[annotationId];
    if (!context) {
      toast({ 
        title: "Cannot Rerun", 
        description: "Generation context not found. Rerun is only available for newly generated summaries.",
      });
      return;
    }

    setRerunningIds((prev) => new Set(prev).add(item.id));
    
    try {
      // Build previous summaries from carousel versions or current item
      const existingVersions = summaryVersions.get(annotationId);
      const previousSummaries = existingVersions 
        ? existingVersions.map((v, idx) => ({
            attempt: idx,
            changeDescription: v.summary.changeDescription || '',
            implication: v.summary.implication || '',
            recommendation: v.summary.recommendation,
          }))
        : [{
            attempt: 0,
            changeDescription: item.changeDescription || '',
            implication: item.implication || '',
            recommendation: item.recommendation,
          }];

      const response = await backendApi.rerunSummary({
        generationContext: context,
        previousSummaries,
      });

      if (response.success && response.data?.newSummary) {
        const newSummary = response.data.newSummary;
        
        // Convert SentenceSummary to FlattenedSummaryItem
        const newFlattenedItem: FlattenedSummaryItem = {
          id: newSummary.id,
          sectionNumber: item.sectionNumber,
          sentence: newSummary.sentence,
          sourceAnnotation: item.sourceAnnotation, // Keep original source annotation
          type: newSummary.substantive ? 'substantive' : 'query',
          changeDescription: newSummary.substantive?.change_description,
          implication: newSummary.substantive?.implication,
          recommendation: newSummary.substantive?.recommendation,
          queryItems: newSummary.query?.items,
        };

        if (carouselActiveFor.has(annotationId)) {
          // Add to existing carousel
          addVersionToCarousel(annotationId, newFlattenedItem);
        } else {
          // Initialize new carousel
          initializeCarousel(annotationId, item, newFlattenedItem);
        }

        toast({ title: "", description: "New version generated." });
      } else {
        throw new Error(response.error?.message || "Failed to regenerate summary");
      }
    } catch (error) {
      toast({ 
        title: "Rerun Failed",
        description: error instanceof Error ? error.message : "Failed to regenerate summary.",
      });
    } finally {
      setRerunningIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  // Export handlers
  const handleExportAmendments = async () => {
    await exportSummaryToExcel(substantiveItems, 'amendments');
    toast({ title: "", description: "Exported summary for contract amendments." });
  };

  const handleExportQueries = async () => {
    await exportSummaryToExcel(queryItems, 'queries');
    toast({ title: "", description: "Exported summary for instruction requests." });
  };

  const handleExportAll = async () => {
    await exportSummaryToExcel([...substantiveItems, ...queryItems], 'full');
    toast({ title: "", description: "Exported full summary." });
  };

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <Tooltip
          appearance="inverted"
          content="Back"
          positioning="below"
          withArrow
          relationship="label"
        >
          <Button
            icon={<FaArrowLeft />}
            onClick={() => navigateTo("menu")}
            className={styles.headerIcon}
          />
        </Tooltip>

        <p className={styles.headerTitle}>Redline Summary</p>

        {/* Export Button/Menu */}
        {substantiveItems.length > 0 && queryItems.length > 0 ? (
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  background: "var(--brand-gradient)",
                  color: "var(--text-on-brand)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                <LuDownload size={14} />
                Download Excel
              </button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem onClick={handleExportAmendments}>
                  Contract Amendments Summary
                </MenuItem>
                <MenuItem onClick={handleExportQueries}>
                  Instruction Requests Summary
                </MenuItem>
                <MenuItem onClick={handleExportAll}>
                  Full Summary
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        ) : (
          <button
            onClick={substantiveItems.length > 0 ? handleExportAmendments : handleExportQueries}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              background: "var(--brand-gradient)",
              color: "var(--text-on-brand)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            <LuDownload size={14} />
            Download Excel
          </button>
        )}
      </div>

      <Divider />

      <div style={{ padding: "12px", backgroundColor: "white" }}>
        {/* Summary for Contract Amendments (Substantive) */}
        {substantiveItems.length > 0 && (
          <div
            style={{
              border: queryItems.length > 0 ? "1px solid #80808033" : "none",
              borderRadius: "8px",
              padding: queryItems.length > 0 ? "12px" : "0",
              marginBottom: queryItems.length > 0 ? "16px" : "0",
            }}
          >
            {queryItems.length > 0 ? (
              <Accordion
                collapsible
                openItems={isAmendmentsExpanded ? ["amendments"] : []}
                onToggle={(_, data) => {
                  setIsAmendmentsExpanded(data.openItems.includes("amendments"));
                }}
                style={{ width: "100%", margin: 0, padding: 0 }}
              >
                <AccordionItem
                  value="amendments"
                  className={styles.categoryAccordionItemNoBorder}
                  style={{ width: "100%", border: "none" }}
                >
                  <AccordionHeader
                    className={styles.categoryAccordionHeader}
                    onClick={() => setIsAmendmentsExpanded(!isAmendmentsExpanded)}
                    expandIcon={null}
                  >
                    <div className={styles.categoryAccordionHeaderContent}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          width: "100%",
                          paddingBottom: "9px",
                        }}
                      >
                        <div style={{ 
                          fontSize: "1rem", 
                          cursor: "pointer", 
                          flex: 1, 
                          fontWeight: 600,
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                          whiteSpace: "normal",
                        }}>
                          Summary for Contract Amendments ({substantiveItems.length})
                        </div>
                        <div>
                          {isAmendmentsExpanded ? (
                            <ChevronUp className={styles.icon} />
                          ) : (
                            <ChevronDown className={styles.icon} />
                          )}
                        </div>
                      </div>
                      <Info
                        bgColor="#64dde63c"
                        borderColor="#25D2DF"
                        content="Summary of contract amendments from track changes and comments."
                        iconColor="#25D2DF"
                      />
                    </div>
                  </AccordionHeader>
                  <AccordionPanel>
                    <div className={styles.cardContent}>
                      {substantiveItems.map((item, index) => {
                        const annotationId = getAnnotationIdFromItem(item);
                        const carouselData = getCarouselData(item);
                        
                        if (carouselData && index > 0) {
                          const prevItemsWithSameId = substantiveItems.slice(0, index).filter(
                            i => getAnnotationIdFromItem(i) === annotationId
                          );
                          if (prevItemsWithSameId.length > 0) return null;
                        }

                        if (carouselData) {
                          return (
                            <SummaryVersionCarousel
                              key={`carousel-${annotationId}`}
                              versions={carouselData.versions}
                              currentVersionIndex={carouselData.currentIndex}
                              onVersionChange={(newIdx) => handleCarouselVersionChange(annotationId, newIdx)}
                              onAcceptVersion={(vIdx) => handleCarouselAccept(annotationId, vIdx)}
                              onCancelCarousel={() => handleCarouselCancel(annotationId)}
                              onRerun={() => handleRerun(item)}
                              isRerunning={rerunningIds.has(item.id)}
                              showRecommendation={showRecommendation}
                            />
                          );
                        }

                        return (
                          <SummaryCard
                            key={item.id}
                            item={item}
                            onDelete={() => handleDelete(item.id, 'substantive')}
                            onUpdate={(updates) => handleUpdate(item.id, 'substantive', updates)}
                            onRerun={isRerunAvailable() ? () => handleRerun(item) : undefined}
                            isRerunning={rerunningIds.has(item.id)}
                            showRecommendation={showRecommendation}
                          />
                        );
                      })}
                    </div>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            ) : (
              // No queries - show cards directly without accordion/header/banner
              <div className={styles.cardContent}>
                {substantiveItems.map((item, index) => {
                  const annotationId = getAnnotationIdFromItem(item);
                  const carouselData = getCarouselData(item);
                  
                  if (carouselData && index > 0) {
                    const prevItemsWithSameId = substantiveItems.slice(0, index).filter(
                      i => getAnnotationIdFromItem(i) === annotationId
                    );
                    if (prevItemsWithSameId.length > 0) return null;
                  }

                  if (carouselData) {
                    return (
                      <SummaryVersionCarousel
                        key={`carousel-${annotationId}`}
                        versions={carouselData.versions}
                        currentVersionIndex={carouselData.currentIndex}
                        onVersionChange={(newIdx) => handleCarouselVersionChange(annotationId, newIdx)}
                        onAcceptVersion={(vIdx) => handleCarouselAccept(annotationId, vIdx)}
                        onCancelCarousel={() => handleCarouselCancel(annotationId)}
                        onRerun={() => handleRerun(item)}
                        isRerunning={rerunningIds.has(item.id)}
                        showRecommendation={showRecommendation}
                      />
                    );
                  }

                  return (
                    <SummaryCard
                      key={item.id}
                      item={item}
                      onDelete={() => handleDelete(item.id, 'substantive')}
                      onUpdate={(updates) => handleUpdate(item.id, 'substantive', updates)}
                      onRerun={isRerunAvailable() ? () => handleRerun(item) : undefined}
                      isRerunning={rerunningIds.has(item.id)}
                      showRecommendation={showRecommendation}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Summary for Instruction Requests (Query) */}
        {queryItems.length > 0 && (
          <div
            style={{
              border: substantiveItems.length > 0 ? "1px solid #80808033" : "none",
              borderRadius: "8px",
              padding: substantiveItems.length > 0 ? "12px" : "0",
            }}
          >
            {substantiveItems.length > 0 ? (
              <Accordion
                collapsible
                openItems={isQueriesExpanded ? ["queries"] : []}
                onToggle={(_, data) => {
                  setIsQueriesExpanded(data.openItems.includes("queries"));
                }}
                style={{ width: "100%", margin: 0, padding: 0 }}
              >
                <AccordionItem
                  value="queries"
                  className={styles.categoryAccordionItemNoBorder}
                  style={{ width: "100%", border: "none" }}
                >
                  <AccordionHeader
                    className={styles.categoryAccordionHeader}
                    onClick={() => setIsQueriesExpanded(!isQueriesExpanded)}
                    expandIcon={null}
                  >
                    <div className={styles.categoryAccordionHeaderContent}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          width: "100%",
                          paddingBottom: "9px",
                        }}
                      >
                        <div style={{ 
                          fontSize: "1rem", 
                          cursor: "pointer", 
                          flex: 1, 
                          fontWeight: 600,
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                          whiteSpace: "normal",
                        }}>
                          Summary for Instruction Requests ({queryItems.length})
                        </div>
                        <div>
                          {isQueriesExpanded ? (
                            <ChevronUp className={styles.icon} />
                          ) : (
                            <ChevronDown className={styles.icon} />
                          )}
                        </div>
                      </div>
                      <Info
                        bgColor="rgba(255, 193, 7, 0.05)"
                        borderColor="#FD8C08"
                        content="Items requiring confirmation or instruction from relevant parties."
                        iconColor="#FD8C08"
                      />
                    </div>
                  </AccordionHeader>
                  <AccordionPanel>
                    <div className={styles.cardContent}>
                      {queryItems.map((item, index) => {
                        const annotationId = getAnnotationIdFromItem(item);
                        const carouselData = getCarouselData(item);
                        
                        if (carouselData && index > 0) {
                          const prevItemsWithSameId = queryItems.slice(0, index).filter(
                            i => getAnnotationIdFromItem(i) === annotationId
                          );
                          if (prevItemsWithSameId.length > 0) return null;
                        }

                        if (carouselData) {
                          return (
                            <SummaryVersionCarousel
                              key={`carousel-${annotationId}`}
                              versions={carouselData.versions}
                              currentVersionIndex={carouselData.currentIndex}
                              onVersionChange={(newIdx) => handleCarouselVersionChange(annotationId, newIdx)}
                              onAcceptVersion={(vIdx) => handleCarouselAccept(annotationId, vIdx)}
                              onCancelCarousel={() => handleCarouselCancel(annotationId)}
                              onRerun={() => handleRerun(item)}
                              isRerunning={rerunningIds.has(item.id)}
                              showRecommendation={false}
                            />
                          );
                        }

                        return (
                          <SummaryCard
                            key={item.id}
                            item={item}
                            onDelete={() => handleDelete(item.id, 'query')}
                            onUpdate={(updates) => handleUpdate(item.id, 'query', updates)}
                            onRerun={isRerunAvailable() ? () => handleRerun(item) : undefined}
                            isRerunning={rerunningIds.has(item.id)}
                            showRecommendation={false}
                          />
                        );
                      })}
                    </div>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            ) : (
              // No amendments - show cards directly without accordion/header/banner
              <div className={styles.cardContent}>
                {queryItems.map((item, index) => {
                  const annotationId = getAnnotationIdFromItem(item);
                  const carouselData = getCarouselData(item);
                  
                  if (carouselData && index > 0) {
                    const prevItemsWithSameId = queryItems.slice(0, index).filter(
                      i => getAnnotationIdFromItem(i) === annotationId
                    );
                    if (prevItemsWithSameId.length > 0) return null;
                  }

                  if (carouselData) {
                    return (
                      <SummaryVersionCarousel
                        key={`carousel-${annotationId}`}
                        versions={carouselData.versions}
                        currentVersionIndex={carouselData.currentIndex}
                        onVersionChange={(newIdx) => handleCarouselVersionChange(annotationId, newIdx)}
                        onAcceptVersion={(vIdx) => handleCarouselAccept(annotationId, vIdx)}
                        onCancelCarousel={() => handleCarouselCancel(annotationId)}
                        onRerun={() => handleRerun(item)}
                        isRerunning={rerunningIds.has(item.id)}
                        showRecommendation={false}
                      />
                    );
                  }

                  return (
                    <SummaryCard
                      key={item.id}
                      item={item}
                      onDelete={() => handleDelete(item.id, 'query')}
                      onUpdate={(updates) => handleUpdate(item.id, 'query', updates)}
                      onRerun={isRerunAvailable() ? () => handleRerun(item) : undefined}
                      isRerunning={rerunningIds.has(item.id)}
                      showRecommendation={false}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryPage;