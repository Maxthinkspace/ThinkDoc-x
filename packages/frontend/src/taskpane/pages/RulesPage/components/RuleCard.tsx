import {
  makeStyles,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Button,
} from "@fluentui/react-components";
import {
  ArrowLeft,
  ArrowRight,
  FileSearchIcon,
  Trash2,
  Navigation,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Link2,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { Tooltip } from "@fluentui/react-components";
import * as React from "react";
import { DeleteDialog } from "./DeleteDialog";
import { backendApi } from "@/src/services/api";
import { EditDialog } from "./EditDialog";
import { Rule, RuleCategories } from "../index";
import { CiLocationArrow1 } from "react-icons/ci";
import { UnsavedDialog } from "./UnsavedDialog";
import { getTextRange, getTextRangeAcrossParagraphs, normalizeSearchText } from "../../../taskpane";

type RuleCardProps = {
  index: number;
  ruleId: string;
  ruleNumber: string;
  briefName: string;
  type:
    | "Rules for Instruction Requests"
    | "Rules for Contract Amendments"
    | "Conditional Rules for Contract Amendments";
  instruction: string;
  example?: string;
  locationText?: string;    // Full sentence for locating (unique context)
  selectedText?: string;    // Specific text to highlight within locationText
  sourceAnnotationKey?: string;
  linkedRuleCount: number;          // Number of OTHER rules linked to same annotation
  linkedRules?: Array<{ id: string; displayIndex: number; brief_name: string; type: string }>; // Details of linked rules
  onRerun?: () => void;             // Callback for re-run, undefined if not available
  isRerunning?: boolean;            // Loading state for re-run
  moveRule: () => void;
  addRules: (type: string, newRules: Rule[]) => void;
  removeRule: (type: string, removedRuleNumber: string) => void;
  setRules: (rules: RuleCategories) => void;
  updateRule: (
    type: string,
    ruleNumber: string,
    updated: {
      instruction: string;
      example_language?: string;
      brief_name?: string;
    }
  ) => void;
  // Drag and drop props
  onDragStart: (e: React.DragEvent, ruleNumber: string, type: string, index: number) => void;
  onDragOver: (e: React.DragEvent, targetIndex: number, categoryType: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetIndex: number, categoryType: string) => void;
  onDragEnd: () => void;
  isDragged: boolean;
  showLocate?: boolean;
  isInCarousel?: boolean;
  onPrevVersion?: () => void;
  onNextVersion?: () => void;
  onAcceptVersion?: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  currentVersionIndex?: number;
  totalVersions?: number;
  onCancelCarousel?: () => void;
  isHighlighted?: boolean;
};

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
    cursor: "move",
    transition: "opacity 0.2s ease, background-color 0.2s ease, border 0.2s ease",
  },
  draggedItem: {
    opacity: 0.3,
    transform: "rotate(2deg)",
  },

  dropIndicator: {
    height: "3px",
    backgroundColor: "#0078d4",
    margin: "2px 0",
    borderRadius: "2px",
    opacity: 1,
    boxShadow: "0 0 4px rgba(0, 120, 212, 0.3)",
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
    "& [data-accordion-trigger]": {
      "&::after": {
        display: "none !important",
      },
      "&::before": {
        display: "none !important",
      },
    },
    "& [data-accordion-trigger]::after": {
      display: "none !important",
    },
    "& [data-accordion-trigger]::before": {
      display: "none !important",
    },
    "& [data-accordion-trigger] > *": {
      "&::after": {
        display: "none !important",
      },
      "&::before": {
        display: "none !important",
      },
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
  accordionPanel: {
    backgroundColor: "#F6F6F6 !important",
    border: "none",
    borderRadius: "0 0 8px 8px",
    padding: "12px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: "15px",
    fontWeight: 600,
    wordWrap: "break-word",           
    overflowWrap: "break-word",       
    wordBreak: "break-word",          
    whiteSpace: "normal",
  },
  example: {
    backgroundColor: "#5E687A",
    color: "#5E687A",
    padding: "8px",
    borderRadius: "4px",
    margin: "0 12px",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "4px",
  },
  icon: {
    width: "16px",
    height: "16px",
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

    // ============================
    // NOTE 11-27-2025:
    // Update icon color to #0F62FE to match Module 3's Figma
    // ============================
    color: "#0F62FE",

    "&:hover": {
      backgroundColor: "#eef3f8ff",
    },
  },
  buttonSpacer: {
    width: "8px",
  },
  locateButton: {
    background: "none",
    border: "1px solid grey",
    cursor: "pointer",
    marginLeft: "3px",
    boxShadow: "none",
    outline: "none",
    transition: "background-color 0.3s, color 0.3s",
    padding: "4px 12px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "14px",
    fontWeight: "500",

    "&:hover": {
      backgroundColor: "#eef3f8ff",
    },
  },
});

const getHighlightStyle = (isHighlighted: boolean): React.CSSProperties => {
  if (!isHighlighted) return {};
  return {
    border: "2px solid #0F62FE",
    boxShadow: "0 0 12px rgba(15, 98, 254, 0.4)",
    animation: "pulse-highlight 1.5s ease-in-out infinite",
  };
};

export const RuleCard: React.FC<RuleCardProps> = ({
  index,
  ruleId,
  instruction,
  type,
  example,
  locationText,
  selectedText,
  ruleNumber,
  briefName,
  linkedRuleCount,
  linkedRules,
  onRerun,
  isRerunning,
  moveRule,
  removeRule,
  updateRule,
  // Drag and drop props
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isDragged,
  showLocate = true,
  isInCarousel = false,
  onPrevVersion,
  onNextVersion,
  onAcceptVersion,
  canGoPrev = false,
  canGoNext = false,
  currentVersionIndex = 0,
  totalVersions = 0,
  onCancelCarousel,
  isHighlighted = false,
}) => {
  const styles = useStyles();
  // const [clauses, setClauses] = React.useState(JSON.parse(sessionStorage.getItem("clauses")));
  const [clauses] = React.useState(tempClauses);
  const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(true);

  const handleOpenDeleteDialog = () => setOpenDeleteDialog(true);
  const handleCloseDeleteDialog = () => setOpenDeleteDialog(false);
  const handleConfirmDelete = () => {
    removeRule(type, ruleNumber);
    setOpenDeleteDialog(false);
  };

  // =======================
  // NOTE 11-27-2025:
  // Handle rerun later
  // =======================

  // const reRun = async (clause: string) => {
  //   console.log("Re-running for rule: ", ruleNumber, clause);
  //   // 1. 获取input
  //   const clauseObj = clauses.find((item) => item.clause === clause);
  //   const annotations = clauseObj.changes || [];
  //   const comments = annotations.filter((c) => c.type === "comment").map((c) => c.input);
  //   const highlights = annotations.filter((c) => c.type === "highlight").map((c) => c.input);
  //   const trackedChanges = annotations
  //     .filter((c) => c.type === "trackedchange")
  //     .map((c) => c.input);

  //   // const input = await backendApi.formatGenerateInput(comments, highlights, trackedChanges);
  //   const prevResults = {
  //     rule_number: ruleNumber,
  //     instruction,
  //     contract_clause: clause,
  //     ...(example && { example_language: example }),
  //   };
  //   // console.log(input, prevResults);

  //   // 2. 调用llm接口
  //   // const newRules = await generateTextWithJsonParsing("", rerunPrompt(input, prevResults));
  //   // console.log(newRules);
  //   const newRules = await backendApi.rerunRules({
  //     comments,
  //     highlights,
  //     trackedChanges,
  //     prevResults,
  //   });
  //   console.log(newRules);

  //   // 3. expand rules
  //   const newExpandedRules = await t2(newRules);
  //   const instructions = newExpandedRules.find(
  //     (r) => r.type === "Rules for Instruction Requests"
  //   ).rules;
  //   const amendments = newExpandedRules.find(
  //     (r) => r.type === "Rules for Contract Amendments"
  //   ).rules;

  //   console.log("New instructions: ", instructions);
  //   console.log("New amendments: ", amendments);

  //   // 4. 更新rules
  //   removeRule(type, ruleNumber);
  //   addRules("Rules for Instruction Requests", instructions);
  //   addRules("Rules for Contract Amendments", amendments);
  // };
  // console.log(moveRule);

  /**
   * Locate text in the document and highlight the appropriate selection.
   *
   * Two-step approach:
   * 1. Find the sentence/context (locationText) - unique identifier
   * 2. If selectedText is provided, search within that sentence to highlight just the selection
   *
   * Handles different quotation mark styles (curly vs straight) and semicolon variants
   * by trying the exact text first, then a normalized version, then ignorePunct as a last resort.
   *
   * @param sentenceText - The full sentence to locate (unique context)
   * @param textToHighlight - Optional specific text to highlight within the sentence
   */
  const handleLocateText = async (sentenceText: string | undefined, textToHighlight: string | undefined) => {
    if (!sentenceText) {
      console.log("[Locate] No sentence text provided for locate");
      return;
    }

    console.log("[Locate] Searching for sentence:", sentenceText.substring(0, 80) + "...");
    if (textToHighlight) {
      console.log("[Locate] Will highlight within sentence:", textToHighlight);
    }

    try {
      await Word.run(async (context) => {
        // Step 1: Find the sentence in the document.
        // Build search variants: exact text first, then with normalized quotes/semicolons.
        const normalizedSentence = normalizeSearchText(sentenceText);
        const sentenceVariants = [sentenceText];
        if (normalizedSentence !== sentenceText) {
          sentenceVariants.push(normalizedSentence);
        }

        let sentenceRange: Word.Range | null = null;

        // Try single-paragraph search with each variant
        for (const variant of sentenceVariants) {
          sentenceRange = await getTextRange(context, variant);
          if (sentenceRange) break;
        }

        // Try cross-paragraph search with each variant
        if (!sentenceRange) {
          for (const variant of sentenceVariants) {
            sentenceRange = await getTextRangeAcrossParagraphs(context, variant);
            if (sentenceRange) break;
          }
        }

        // Last resort: search ignoring all punctuation differences
        if (!sentenceRange) {
          const truncated = sentenceText.length > 255 ? sentenceText.slice(0, 255) : sentenceText;
          const ignorePunctResults = context.document.body.search(truncated, {
            matchCase: true,
            matchWildcards: false,
            ignorePunct: true,
          });
          ignorePunctResults.load('items');
          await context.sync();
          if (ignorePunctResults.items.length > 0) {
            sentenceRange = ignorePunctResults.items[0].getRange("Whole");
            console.log("[Locate] Found sentence using ignorePunct fallback");
          }
        }

        if (!sentenceRange) {
          console.log("[Locate] Could not find sentence in document:", sentenceText.substring(0, 50) + "...");
          return;
        }

        console.log("[Locate] Found sentence range");

        // Step 2: If we have specific text to highlight, search within the sentence.
        // Word's search() API has a 255-character limit — truncate to avoid SearchStringInvalidOrTooLong.
        if (textToHighlight) {
          const maxSearchLen = 255;
          const truncatedHighlight = textToHighlight.length > maxSearchLen
            ? textToHighlight.slice(0, maxSearchLen)
            : textToHighlight;

          // Build highlight variants: exact (truncated), then normalized
          const normalizedHighlight = normalizeSearchText(truncatedHighlight);
          const highlightVariants = [truncatedHighlight];
          if (normalizedHighlight !== truncatedHighlight) {
            highlightVariants.push(normalizedHighlight);
          }

          // Try exact match with each variant
          for (const variant of highlightVariants) {
            const searchResults = sentenceRange.search(variant, {
              matchCase: true,
              matchWildcards: false,
            });
            searchResults.load('items');
            await context.sync();

            if (searchResults.items.length > 0) {
              searchResults.items[0].select();
              await context.sync();
              console.log("[Locate] SUCCESS - Selected specific text within sentence");
              return;
            }
          }

          // Last resort: ignore punctuation differences entirely
          const ignorePunctResults = sentenceRange.search(truncatedHighlight, {
            matchCase: true,
            matchWildcards: false,
            ignorePunct: true,
          });
          ignorePunctResults.load('items');
          await context.sync();

          if (ignorePunctResults.items.length > 0) {
            ignorePunctResults.items[0].select();
            await context.sync();
            console.log("[Locate] SUCCESS - Selected text (ignorePunct) within sentence");
            return;
          }

          console.log("[Locate] selectedText not found within sentence, selecting whole sentence");
        }

        // Step 3: Select the whole sentence
        sentenceRange.select();
        await context.sync();
        console.log("[Locate] SUCCESS - Selected sentence range");
      });
    } catch (error) {
      console.error("[Locate] Error locating text:", error);
    }
  };

  return (
    <div className={styles.root} id={`rule-card-${ruleId}`}>
      <Accordion
        collapsible
        openItems={isExpanded ? ["rule"] : []}
        onToggle={(_, data) => {
          setIsExpanded(data.openItems.includes("rule"));
        }}
      >
        <AccordionItem
          value="rule"
          className={`${styles.accordionItem} ${isDragged ? styles.draggedItem : ""} rule-card`}
          style={getHighlightStyle(isHighlighted)}
          draggable
          onDragStart={(e) => onDragStart(e, ruleNumber, type, index)}
          onDragOver={(e) => onDragOver(e, index, type)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, index, type)}
          onDragEnd={onDragEnd}
        >
          <AccordionHeader
            className={styles.accordionHeader}
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ position: "relative" }}
            expandIcon={null}
          >
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              flex: 1, 
              gap: "2px",
              minWidth: 0,            
              overflow: "hidden",     
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "8px",
                minWidth: 0,          
                overflow: "hidden",     
              }}>
                <p className={styles.title} style={{ 
                  cursor: "pointer", 
                  margin: 0,
                  minWidth: 0,        
                  overflow: "hidden", 
                }}>
                  Rule {index + 1}:
                  {briefName && (
                    <span style={{ fontStyle: "italic", fontWeight: "normal" }}> {briefName}</span>
                  )}
                </p>
                {linkedRuleCount > 0 && linkedRules && linkedRules.length > 0 && (
                  <Tooltip
                    content={`Linked to Rule ${linkedRules.map(r => r.displayIndex).join(', Rule ')}. Click to view.`}
                    relationship="label"
                    positioning="above"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent accordion toggle
                        // Scroll to the first linked rule
                        const linkedRule = linkedRules[0];
                        if (linkedRule) {
                          const element = document.getElementById(`rule-card-${linkedRule.id}`);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            // Add a brief highlight effect
                            element.style.boxShadow = '0 0 0 3px #0F62FE';
                            setTimeout(() => {
                              element.style.boxShadow = '';
                            }, 2000);
                          }
                        }
                      }}
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "2px",
                        color: "#0F62FE",
                        fontSize: "12px",
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        padding: "2px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      <Link2 style={{ width: "12px", height: "12px" }} />
                      <span>+{linkedRuleCount}</span>
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
            <div className={styles.customChevron}>
              {isExpanded ? (
                <ChevronUp className={styles.icon} />
              ) : (
                <ChevronDown className={styles.icon} />
              )}
            </div>
          </AccordionHeader>
          <AccordionPanel className={styles.accordionPanel}>
            <div style={{ marginTop: "0px", padding: "10px", paddingTop: 0 }}>
              <p style={{ fontWeight: 600, margin: 0 }}>Instruction:</p>
              <p style={{ color: "#5E687A", margin: 0 }}>{instruction}</p>
            </div>
            {example && (
              <div
                style={{
                  margin: "10px",
                  backgroundColor: "#E6E6E6",
                  borderRadius: "8px",
                  padding: "5px",
                }}
              >
                <p style={{ fontWeight: "500", margin: 0 }}>Example Language:</p>
                <p style={{ margin: 0 }}>{example}</p>
              </div>
            )}

            {/* Action buttons - 2 left, gap, 2 right */}

            {/* Carousel navigation - only shown when in carousel mode */}
            {isInCarousel && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  marginBottom: "4px",
                  backgroundColor: "#E8F0FE",
                  borderRadius: "6px",
                  marginLeft: "10px",
                  marginRight: "10px",
                }}
              >
                <Tooltip content="Previous version" relationship="label" positioning="above">
                  <button
                    onClick={onPrevVersion}
                    disabled={!canGoPrev}
                    style={{
                      minWidth: "28px",
                      height: "28px",
                      padding: "4px",
                      backgroundColor: "white",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      cursor: canGoPrev ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: canGoPrev ? 1 : 0.5,
                    }}
                  >
                    <ChevronLeft style={{ width: "16px", height: "16px" }} />
                  </button>
                </Tooltip>

                <span style={{ fontSize: "12px", color: "#333", minWidth: "40px", textAlign: "center" }}>
                  ({currentVersionIndex + 1}/{totalVersions})
                </span>

                <Tooltip content="Next version" relationship="label" positioning="above">
                  <button
                    onClick={onNextVersion}
                    disabled={!canGoNext}
                    style={{
                      minWidth: "28px",
                      height: "28px",
                      padding: "4px",
                      backgroundColor: "white",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      cursor: canGoNext ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: canGoNext ? 1 : 0.5,
                    }}
                  >
                    <ChevronRight style={{ width: "16px", height: "16px" }} />
                  </button>
                </Tooltip>

                <Tooltip content="Accept this version" relationship="label" positioning="above">
                  <button
                    onClick={onAcceptVersion}
                    style={{
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
                    }}
                  >
                    <Check style={{ width: "16px", height: "16px" }} />
                  </button>
                </Tooltip>

                <Tooltip content="Remove this version" relationship="label" positioning="above">
                  <button
                    onClick={onCancelCarousel}
                    style={{
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
                    }}
                  >
                    <X style={{ width: "16px", height: "16px" }} />
                  </button>
                </Tooltip>
              </div>
            )}

            <div
              style={{
                padding: "0 10px 10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {/* Left side buttons */}
              <div className={styles.actions}>
                <Tooltip content="Delete" relationship="label" positioning="above">
                  <button className={styles.actionsButton} onClick={handleOpenDeleteDialog}>
                    <Trash2 className={`${styles.icon}`} />
                  </button>
                </Tooltip>
                
                {onRerun && (
                  <Tooltip
                    content={
                      linkedRuleCount > 0 ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                          Re-run will regenerate this rule and {linkedRuleCount} linked rule{linkedRuleCount > 1 ? 's' : ''}. Click
                          <span style={{ 
                            display: "inline-flex", 
                            alignItems: "center", 
                            color: "#0F62FE",
                            backgroundColor: "rgba(15, 98, 254, 0.15)",
                            padding: "2px 4px",
                            borderRadius: "3px",
                          }}>
                            <Link2 style={{ width: 10, height: 10 }} />
                          </span>
                          to view the linked rule.
                        </span>
                      ) : "Try again"
                    }
                    relationship="label"
                    positioning="above"
                  >
                    <button 
                      className={styles.actionsButton} 
                      onClick={onRerun}
                      disabled={isRerunning}
                      style={{ opacity: isRerunning ? 0.5 : 1 }}
                    >
                      <RefreshCw 
                        className={`${styles.icon}`} 
                        style={{ 
                          animation: isRerunning ? "spin 1s linear infinite" : "none" 
                        }}
                      />
                    </button>
                  </Tooltip>
                )}
              </div>

              {/* Right side buttons */}
              <div className={styles.actions}>

                {/* ============================
                    NOTE 11-28-2025:
                    Restored arrow buttons to move rules between Always Applied
                    and Conditionally Applied categories.
                    Updated icon color to #0F62FE to match Module 3's Figma.
                    ============================ */}

                {type === "Rules for Contract Amendments" && (
                  <Tooltip content="Move to Conditionally Applied Rules" relationship="label" positioning="above">
                    <button className={styles.actionsButton} onClick={moveRule}>
                      <ArrowRight className={`${styles.icon}`} />
                    </button>
                  </Tooltip>
                )}
                {type === "Conditional Rules for Contract Amendments" && (
                  <Tooltip content="Move to Always Applied Rules" relationship="label" positioning="above">
                    <button className={styles.actionsButton} onClick={moveRule}>
                      <ArrowLeft className={`${styles.icon}`} />
                    </button>
                  </Tooltip>
                )}
                <EditDialog
                  instruction={instruction}
                  briefName={briefName}
                  example={example}
                  shouldShowExample={type !== "Rules for Instruction Requests"}
                  onUpdate={(instruction, example_language, brief_name) =>
                    updateRule(type, ruleNumber, { instruction, example_language, brief_name })
                  }
                />

                {/* ============================
                    NOTE 11-27-2025:
                    Update button color to #0F62FE to match Module 3's Figma
                    ============================ */}  

                {showLocate && (
                  <Tooltip content="Locate in document" relationship="label" positioning="above">
                    <button
                      className={styles.actionsButton}
                      onClick={() => handleLocateText(locationText, selectedText)}
                    >
                      <CiLocationArrow1 className={styles.icon} />
                    </button>
                  </Tooltip>
                )}

                {/* <button className={styles.locateButton} >

                  <Navigation className={`${styles.icon}`} />
                  Locate
                </button> */}
              </div>
            </div>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

      <DeleteDialog
        open={openDeleteDialog}
        ruleNumber={ruleNumber}
        displayNumber={index + 1} // Visual number (1, 2, 3, etc.)
        instruction={instruction}
        onConfirm={handleConfirmDelete}
        onCancel={handleCloseDeleteDialog}
      />
    </div>
  );
};

const tempClauses = [
  {
    clause:
      "The Company is in all material respects in compliance with all applicable laws, rules, regulations and ordinances applicable to its business, operations, or assets;",
    changes: [
      {
        type: "comment",
        input: {
          clause:
            "The Company is in all material respects in compliance with all applicable laws, rules, regulations and ordinances applicable to its business, operations, or assets;",
          range: "in all material respects",
          comment: "Include a materiality qualifier.",
        },
      },
    ],
    rules: [],
  },
  {
    clause:
      "The Seller shall procure that, within 7 days after Completion, the Company shall issue new share certificates to the Buyer in respect of the Sale Shares.",
    changes: [
      {
        type: "comment",
        input: {
          clause:
            "The Seller shall procure that, within 7 days after Completion, the Company shall issue new share certificates to the Buyer in respect of the Sale Shares.",
          range: "7",
          comment: "Confirm with the Company.",
        },
      },
    ],
    rules: [],
  },
  {
    clause:
      "“Confidential Information” means any proprietary information, trade secrets, know-how, or any other information related to the business, financial condition, or operations of the Company, including but not limited to business plans, financial information, marketing strategies, pricing, customer lists, customer details, sales data, supplier information, contracts, assets, liabilities, and employee information.",
    changes: [
      {
        type: "comment",
        input: {
          clause:
            "“Confidential Information” means any proprietary information, trade secrets, know-how, or any other information related to the business, financial condition, or operations of the Company, including but not limited to business plans, financial information, marketing strategies, pricing, customer lists, customer details, sales data, supplier information, contracts, assets, liabilities, and employee information.",
          range: "“",
          comment:
            "If the Company is a tech company, also include the following:Confidential Information also includes research, development, software, source code, algorithms, designs, processes, methodologies, systems, inventions, technical specifications, and drawings of the Company.",
        },
      },
    ],
    rules: [],
  },
  {
    clause:
      "The representations and warranties made by the Seller in this Agreement shall be true and correct in all material respects as of the Completion Date, as though made at that time.",
    changes: [
      {
        type: "highlight",
        input: {
          clause:
            "The representations and warranties made by the Seller in this Agreement shall be true and correct in all material respects as of the Completion Date, as though made at that time.",
          text: "in all material respects",
        },
      },
    ],
    rules: [],
  },
  {
    clause:
      "to its directors, officers, employees, agents, and professional advisers, and its affiliates’ directors, officers, employees, agents, and professional advisers (collectively, the “Permitted Recipients”), on a need-to-know basis, provided that they are bound by similar confidentiality obligations. The Receiving Party shall ensure that all Permitted Recipients are informed of the confidential nature of the Confidential Information and take all commercially reasonable measures to prevent unauthorized use or disclosure. The Receiving Party remains responsible for any breach of confidentiality by its Permitted Recipients; and",
    changes: [
      {
        type: "highlight",
        input: {
          clause:
            "to its directors, officers, employees, agents, and professional advisers, and its affiliates’ directors, officers, employees, agents, and professional advisers (collectively, the “Permitted Recipients”), on a need-to-know basis, provided that they are bound by similar confidentiality obligations. The Receiving Party shall ensure that all Permitted Recipients are informed of the confidential nature of the Confidential Information and take all commercially reasonable measures to prevent unauthorized use or disclosure. The Receiving Party remains responsible for any breach of confidentiality by its Permitted Recipients; and",
          text: "on a need-to-know basis,",
        },
      },
    ],
    rules: [],
  },
  {
    clause:
      "Indemnity by the Seller. Subject to Section 9.4, the Seller shall indemnify, defend, and hold harmless the Buyer, its directors, officers, employees, affiliates and agents (collectively, the “Buyer Indemnified Parties”) from and against any and all losses, damages, liabilities, costs, and expenses (including reasonable legal fees and disbursements) (collectively, “Losses”) incurred by the Buyer Indemnified Parties arising out of or in connection with:",
    changes: [
      {
        type: "highlight",
        input: {
          clause:
            "Indemnity by the Seller. Subject to Section 9.4, the Seller shall indemnify, defend, and hold harmless the Buyer, its directors, officers, employees, affiliates and agents (collectively, the “Buyer Indemnified Parties”) from and against any and all losses, damages, liabilities, costs, and expenses (including reasonable legal fees and disbursements) (collectively, “Losses”) incurred by the Buyer Indemnified Parties arising out of or in connection with:",
          text: "reasonable",
        },
      },
    ],
    rules: [],
  },
  {
    clause:
      "The Seller shall use reasonable endeavors to procure that the board of directors of the Company meets to consider the approval of the transfer of the Sale Shares as soon as reasonably practicable after submission of the duly stamped Instrument of Transfer and the original share certificates.",
    changes: [
      {
        type: "trackedchange",
        input: {
          originalText: "",
          amendedText: "reasonably practicable",
          deleted: "",
          added: "reasonably practicable",
        },
      },
      {
        type: "trackedchange",
        input: {
          originalText: "possible",
          amendedText: "",
          deleted: "possible",
          added: "",
        },
      },
    ],
    rules: [],
  },
  {
    clause:
      "disclose the Confidential Information to any third party without the written consent of the Disclosing Party, except:",
    changes: [
      {
        type: "trackedchange",
        input: {
          originalText: "",
          amendedText: "written",
          deleted: "",
          added: "written",
        },
      },
    ],
    rules: [],
  },
  {
    clause:
      "Arbitration. The dispute shall be referred to and finally resolved by arbitration in accordance with the Singapore International Arbitration Centre (the “SIAC”) Rules, as in force at the time of the commencement of the arbitration.",
    changes: [
      {
        type: "trackedchange",
        input: {
          originalText:
            "If the dispute cannot be resolved through negotiation within 30 days from the date on which one Party provides written notice of the dispute to the other Party,",
          amendedText: "",
          deleted:
            "If the dispute cannot be resolved through negotiation within 30 days from the date on which one Party provides written notice of the dispute to the other Party,",
          added: "",
        },
      },
    ],
    rules: [],
  },
];
