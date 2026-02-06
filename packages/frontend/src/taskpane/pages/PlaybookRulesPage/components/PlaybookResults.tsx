import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import {
  makeStyles,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  PositioningImperativeRef,
  Button as FButton,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Button,
  Checkbox,
  Divider,
  Tooltip,
} from "@fluentui/react-components";
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Loader2, Trash2 } from "lucide-react";
import { AiOutlineExclamationCircle, AiOutlineDelete, AiOutlineQuestionCircle, AiOutlineBulb, AiOutlineEdit } from "react-icons/ai";
import { CiLocationArrow1 } from "react-icons/ci";
import { IoMdCheckboxOutline } from "react-icons/io";
import { SquarePen } from "lucide-react";

// ===========================================================================
// NOTE 11-27-2025:
// Added DiffViewer import 
// ===========================================================================
import { generateDiffHtml, getDiffStyles } from "../../../taskpane";

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

// =======================================================================================
// NOTE 11-27-2025:
// Need this "formatExplanationText" to format the text after users click the "Why" button 
// =======================================================================================

// Helper to format rule IDs in text (CA3 → Rule 3)
const formatExplanationText = (text: string): string => {
  // First, handle "the/The rule CA3" or "the/The CA3" → "Rule 3"
  let result = text.replace(/\b(the|The)\s+(rule\s+)?(CA|IR)(\d+)\b/gi, (_match, _article, _ruleWord, _prefix, number) => {
    return `Rule ${number}`;
  });
  
  // Then handle any remaining standalone "CA3" or "IR3" → "Rule 3"
  result = result.replace(/\b(CA|IR)(\d+)\b/g, (_match, _prefix, number) => {
    return `Rule ${number}`;
  });
  
  return result;
};

const useStyles = makeStyles({
  pageRoot: {},

  content: {
    display: "flex",
    flexDirection: "column",
    height: "calc(100% - 4rem)",
    overflowY: "auto",
  },
  animateSpin: {
    animationName: {
      "0%": { transform: "rotate(0deg)" },
      "100%": { transform: "rotate(360deg)" },
    },
    animationDuration: "1s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
  categoryAccordionItem: {
    marginBottom: "8px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  categoryAccordionItemExpanded: {
    border: "none",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  categoryAccordionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 4px",
    backgroundColor: "#f8f9fa",
    borderBottom: "none",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#f1f3f4",
    },
  },
  cardTitle: {
    display: "flex",
    alignItems: "center",
    fontSize: "14px",
    fontWeight: "600",
    margin: "0",
    gap: "5px",
  },
  accordionCount: {
    backgroundColor: "#4f8bd4",
    color: "white",
    borderRadius: "12px",
    padding: "4px 8px",
    fontSize: "12px",
    fontWeight: "600",
    minWidth: "20px",
    textAlign: "center",
  },
  categoryAccordionPanel: {
    padding: "0",
  },
  categoryCustomChevron: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: "16px",
    height: "16px",
    color: "#666",
  },
  // ============================
  // NOTE 11-27-2025:
  // Added box-shadow transition for cross-tab navigation highlighting
  // ============================
  accordionItem: {
    border: "1px solid #4f8bd4",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    marginBottom: "1px",
    cursor: "move",
    transition: "opacity 0.2s ease, background-color 0.2s ease, border 0.2s ease, box-shadow 0.3s ease",
  },
  accordionHeader: {
    backgroundColor: "#ffffff",
    border: "none",
    borderRadius: "8px",
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
    backgroundColor: "#ffffff !important",
    border: "none",
    borderRadius: "0 0 8px 8px",
    padding: "12px",
  },
  root: {
    marginBottom: "1px",
    marginTop: "2px",
    alignSelf: "stretch",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: "15px",
    fontWeight: 600,
  },
  exampleAccordionItem: {
    border: "1px solid #e1e1e1",
    borderRadius: "8px",
    backgroundColor: "#E6E6E6",
    marginBottom: "1px",
    cursor: "move",
    transition: "opacity 0.2s ease, background-color 0.2s ease, border 0.2s ease",
  },
  exampleAccordionHeader: {
    backgroundColor: "#E6E6E6",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    "&:hover": {
      backgroundColor: "#E6E6E6",
    },
  },
  exampleAccordionPanel: {
    backgroundColor: "#E6E6E6 !important",
    border: "none",
    borderRadius: "0 0 8px 8px",
    padding: "12px",
  },
  // ===============================================================================================
  // NOTE 11-27-2025:
  // Style for section link buttons (navigate to Changes tab)
  // ===============================================================================================
  sectionLinkButton: {
    background: "none",
    border: "1px solid #4080FF",
    borderRadius: "4px",
    padding: "2px 8px",
    cursor: "pointer",
    color: "#0F62FE",
    fontSize: "12px",
    fontWeight: 500,
  },
});

// ===========================================================================
// NOTE 11-29-2025:
// New component to handle "not-amended" results with proper accordion state.
// The previous implementation had hardcoded `openItems={false ? [""] : []}` 
// and `onToggle={() => {}}` which prevented accordions from expanding.
// Extracting to a separate component allows proper useState for accordion control.
// ===========================================================================
interface NotAmendedResultProps {
  rule: Rule;
  result: RuleResult;
  resultIndex: number;
  styles: ReturnType<typeof useStyles>;
  whyLoadingStates: { [k: string]: boolean };
  showWhyResults: { [k: string]: boolean };
  onWhyClick: (rule: Rule, contract_language: string) => Promise<void>;
  onLocateText: (text?: string) => void;
  onDeleteResult: (ruleId: string | number, result: RuleResult) => void;
}

const NotAmendedResult: React.FC<NotAmendedResultProps> = ({
  rule,
  result,
  resultIndex,
  styles,
  whyLoadingStates,
  showWhyResults,
  onWhyClick,
  onLocateText,
  onDeleteResult,
}) => {
  const [isLanguageExpanded, setIsLanguageExpanded] = useState(true);
  const [isWhyExpanded, setIsWhyExpanded] = useState(false);

  return (
    <div key={resultIndex}>
      <Accordion
        collapsible
        openItems={isLanguageExpanded ? ["not-amended"] : []}
        onToggle={(_, data) => {
          setIsLanguageExpanded(data.openItems.includes("not-amended"));
        }}
      >
        <AccordionItem
          value="not-amended"
          className={styles.categoryAccordionItemExpanded}
        >
          {/* ===========================================================================
              NOTE 11-27-2025:
              Added consistent padding to header and panel to ensure left alignment
              between "No change was made to the following language:" and the content box.
              =========================================================================== */}
          <AccordionHeader
            style={{
              backgroundColor: "#ffffff",
              border: "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              padding: "8px 12px",
            }}
            className={styles.categoryAccordionHeader}
            expandIcon={null}
          >
            <div
              style={{ 
                cursor: "pointer", 
                flex: 1,
                display: "flex",
                alignItems: "flex-start",
                gap: "5px",
                fontSize: "14px",
                fontWeight: "600",
                margin: "0",
                minWidth: 0,
              }}
            >
              <IoMdCheckboxOutline size={24} style={{ flexShrink: 0, marginTop: "2px" }} />
              <span style={{ 
                wordWrap: "break-word",
                overflowWrap: "break-word",
                wordBreak: "break-word",
                whiteSpace: "normal",
                lineHeight: "1.4",
              }}>No change was made to the following language:</span>
            </div>
            <div className={styles.categoryCustomChevron}>
              {isLanguageExpanded ? (
                <ChevronUp className={styles.icon} />
              ) : (
                <ChevronDown className={styles.icon} />
              )}
            </div>
          </AccordionHeader>

          <AccordionPanel className={styles.categoryAccordionPanel} style={{ padding: "0 12px 12px 12px" }}>
            <div
              style={{
                padding: "12px",
                backgroundColor: "#f8f9fa",
                border: "1px solid #e1e1e1",
                borderRadius: "4px",
                fontSize: "14px",
                wordWrap: "break-word",
                overflowWrap: "break-word",
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
              }}
            >
              {result.original_language}
            </div>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

      <Divider style={{ margin: "8px 0" }} />

      <Accordion
        collapsible
        openItems={isWhyExpanded || showWhyResults[rule.rule_number] ? ["why"] : []}
        onToggle={(_, data) => {
          setIsWhyExpanded(data.openItems.includes("why"));
        }}
      >
        <AccordionItem value="why" className={styles.categoryAccordionItemExpanded}>
          <AccordionHeader
            style={{
              backgroundColor: "#ffffff",
              border: "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
            className={styles.categoryAccordionHeader}
            expandIcon={null}
          >
            <div
              className={styles.cardTitle}
              style={{ cursor: "pointer", flex: 1 }}
            >
              <AiOutlineQuestionCircle size={20} />
              <span>Explain Why</span>
              {whyLoadingStates[rule.rule_number] && (
                <Loader2
                  style={{ width: 16, height: 16, marginLeft: 8 }}
                  className={styles.animateSpin}
                />
              )}
            </div>
            <div className={styles.categoryCustomChevron}>
              {isWhyExpanded || showWhyResults[rule.rule_number] ? (
                <ChevronUp className={styles.icon} />
              ) : (
                <ChevronDown className={styles.icon} />
              )}
            </div>
          </AccordionHeader>

          <AccordionPanel className={styles.categoryAccordionPanel}>
            {result.whyText ? (
              <div
                style={{
                  padding: "12px",
                  backgroundColor: "#fff3cd",
                  border: "1px solid #ffeaa7",
                  borderRadius: "4px",
                  fontSize: "14px",
                  marginBottom: "12px",
                }}
              >
                {formatExplanationText(result.whyText)}
              </div>
            ) : (
              <p style={{ margin: "0 0 12px 0", color: "#666", fontStyle: "italic" }}>
                Click "Why" below to see the explanation.
              </p>
            )}

            <footer className="pb-actions">
              <div className="pb-action-left">
                <Tooltip content="Delete" relationship="label" positioning="above">
                  <button
                    style={{
                      background: "white",
                      border: "1px solid #4080FF",
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
                      width: "28px",
                      height: "28px",
                    }}
                    onClick={() => onDeleteResult(rule.rule_number, result)}
                  >
                    <Trash2 style={{ width: "16px", height: "16px" }} />
                  </button>
                </Tooltip>
              </div>

              <div className="pb-action-right">
                {/* Locate button - arrow icon on the left */}
                <Tooltip
                  content="Locate in document"
                  relationship="label"
                  positioning="above"
                >
                  <button
                    style={{
                      background: "white",
                      border: "1px solid #4080FF",
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
                    }}
                    onClick={() => onLocateText(result.original_language || "")}
                  >
                    <CiLocationArrow1 style={{ width: "16px", height: "16px" }} />
                  </button>
                </Tooltip>

                {/* Why button */}
                <FButton
                  size="small"
                  appearance="primary"
                  disabled={whyLoadingStates[rule.rule_number]}
                  style={{
                    background: "var(--brand-gradient)",
                    color: "var(--text-on-brand)",
                    height: "28px",
                    fontFamily: "inherit",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                  onClick={async () => {
                    await onWhyClick(rule, result.original_language || "");
                  }}
                >
                  {whyLoadingStates[rule.rule_number] ? (
                    <>
                      <Loader2
                        style={{ width: 14, height: 14, marginRight: 4 }}
                        className={styles.animateSpin}
                      />
                      Loading...
                    </>
                  ) : (
                    "Why"
                  )}
                </FButton>
              </div>
            </footer>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

type Rule = {
  rule_number: string;
  instruction: string;
  example_language?: string;
  brief_name?: string;
};

// ===========================================================================
// NOTE 11-27-2025:
// Backend change - Added "new-section" status and isFullDeletion flag 
// ===========================================================================

type RuleResult = {
  status: "amended" | "not-amended" | "not-found" | "new-section" | "instruction-request";
  original_language?: string;
  amended_language?: string;
  section_number: string;
  whyText?: string;
  isFullDeletion?: boolean;
  issue?: string;
};

// Separate component to avoid hooks in map
interface RuleResultItemProps {
  rule: Rule;
  results: RuleResult[];
  index: number;
  // ============================
  // NOTE 11-28-2025:
  // Add ref for cross-tab navigation highlighting
  // ============================
  ruleRef?: ((el: HTMLDivElement | null) => void) | undefined;
  styles: ReturnType<typeof useStyles>;
  ruleLoadingStates: { [k: string]: boolean };
  getStatusIcon: (status?: string) => React.ReactNode;
  isApplyingTrackChanges: { [k: string]: boolean };
  isApplyingBoth: { [k: string]: boolean };
  whyLoadingStates: { [k: string]: boolean };
  showWhyResults: { [k: string]: boolean };
  onApplyTrackChanges: (result: RuleResult, ruleId: string | number) => Promise<void>;
  onApplyBothChangesAndComments: (
    result: RuleResult,
    rule: Rule,
    ruleId: string | number
  ) => Promise<void>;

  // ===============================================================================================
  // NOTE 11-27-2025:
  // Updated signature to include result parameter for locating contract text
  // ===============================================================================================

  onApplyCommentsOnly?: (result: RuleResult, rule: Rule, ruleId: string | number) => Promise<void>;
  onLocateText: (text?: string) => void;
  onAddComment: (text: string) => Promise<boolean | void>;
  onWhyClick: (rule: Rule, contract_language: string) => Promise<void>;
  onDeleteResult: (ruleId: string | number, result: RuleResult) => void;
  onUpdateIssue?: (ruleId: string, resultIndex: number, newIssue: string) => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
  positioningRef: React.RefObject<PositioningImperativeRef>;
  // ===============================================================================================
  // NOTE 11-27-2025:
  // Add props for cross-tab navigation from Rules tab to Changes tab
  // ===============================================================================================
  onNavigateToSection: (sectionNumber: string) => void;
  getSectionsForRule: (ruleId: string) => string[];
  // ============================
  // NOTE 11-27-2025:
  // Add props for tracking applied state (for the Apply button)
  // ============================
  appliedComments: Set<string>;
  appliedRedlines: Set<string>;
}

const RuleResultItem: React.FC<RuleResultItemProps> = ({
  rule,
  results,
  index,
  styles,
  ruleLoadingStates,
  getStatusIcon,
  isApplyingTrackChanges,
  isApplyingBoth,
  whyLoadingStates,
  showWhyResults,
  onApplyTrackChanges,
  onApplyBothChangesAndComments,
  onApplyCommentsOnly,
  onLocateText,
  onAddComment,
  onWhyClick,
  onDeleteResult,
  buttonRef,
  positioningRef,
  // ===============================================================================================
  // NOTE 11-27-2025:
  // Destructure props for cross-tab navigation
  // ===============================================================================================
  onNavigateToSection,
  getSectionsForRule,
  // ============================
  // NOTE 11-27-2025:
  // Destructure ruleRef for cross-tab navigation highlighting
  // ============================
  ruleRef,
  // ============================
  // NOTE 11-27-2025:
  // Destructure applied state tracking props (for the Apply button)
  // ============================
  appliedComments,
  appliedRedlines,
  onUpdateIssue,
}) => {
  const [isRuleExpanded, setIsRuleExpanded] = useState(true);
  const [isExampleExpanded, setIsExampleExpanded] = useState(false);
  const [editingIssues, setEditingIssues] = useState<{ [key: string]: boolean }>({});
  const [editedIssueText, setEditedIssueText] = useState<{ [key: string]: string }>({});
  // ============================
  // NOTE 11-27-2025:
  // Helper to create unique key for tracking applied state per amendment
  // ============================
  const getAmendmentKey = (result: RuleResult): string => {
    return `${result.original_language || ''}::${result.amended_language || ''}`;
  };

  console.log(ruleLoadingStates, getStatusIcon, whyLoadingStates);

  return (
    // ============================
    // NOTE 11-28-2025:
    // Add ref for cross-tab navigation highlighting
    // ============================
    <div 
      key={rule.rule_number} 
      className={styles.root} 
      style={{ marginBottom: 12 }}
    >
      <Accordion
        collapsible
        openItems={isRuleExpanded ? ["rule"] : []}
        onToggle={(_, data) => {
          setIsRuleExpanded(data.openItems.includes("rule"));
        }}
      >
        <AccordionItem 
          value="rule" 
          className={styles.accordionItem}
          ref={ruleRef}
        >
          <AccordionHeader
            className={styles.accordionHeader}
            onClick={() => setIsRuleExpanded(!isRuleExpanded)}
            style={{ position: "relative" }}
            expandIcon={null}
          >

            {/* ============================
                NOTE 11-27-2025:
                Left aligned Rule numbers with rules content 
                ============================ */}

            <div className={styles.header} style={{ paddingLeft: "0px" }}>
              <p className={styles.title} style={{ cursor: "pointer", flex: 1, margin: 0 }}>
                Rule {index + 1}:
                {rule.brief_name && (
                  <span style={{ fontStyle: "italic", fontWeight: "normal" }}> {rule.brief_name}</span>
                )}
              </p>
              {/* {results && results.length > 0 && (
                <div style={{ marginLeft: 8 }}>
                  {ruleLoadingStates[rule.rule_number] ? (
                    <Loader2 style={{ width: 16, height: 16 }} className={styles.animateSpin} />
                  ) : (
                    getStatusIcon(results[0]?.status)
                  )}
                </div>
              )} */}
            </div>
            <div className={styles.customChevron}>
              {isRuleExpanded ? (
                <ChevronUp className={styles.icon} />
              ) : (
                <ChevronDown className={styles.icon} />
              )}
            </div>
          </AccordionHeader>

          <AccordionPanel className={styles.accordionPanel}>
            <div style={{ marginTop: 0, padding: "0 10px 10px 10px" }}>
              <p style={{ fontWeight: 600, margin: "0 0 4px 0" }}>Instruction:</p>
              <p style={{ color: "#5E687A", margin: 0 }}>{rule.instruction}</p>
            </div>

            {rule.example_language && (
              <div style={{ margin: "0 12px" }}>
                <Accordion
                  collapsible
                  openItems={isExampleExpanded ? ["example"] : []}
                  onToggle={(_, data) => {
                    setIsExampleExpanded(data.openItems.includes("example"));
                  }}
                >
                  <AccordionItem value="example" className={styles.exampleAccordionItem}>
                    <AccordionHeader
                      className={styles.exampleAccordionHeader}
                      onClick={() => setIsExampleExpanded(!isExampleExpanded)}
                      style={{ position: "relative", paddingLeft: "8px" }}
                      expandIcon={null}
                    >
                      <div className={styles.header} style={{ paddingLeft: "10px" }}>
                        <p
                          className={styles.title}
                          style={{
                            cursor: "pointer",
                            flex: 1,
                            margin: 0,
                            color: "#5E687A",
                          }}
                        >
                          Example Language
                        </p>
                      </div>
                      <div className={styles.customChevron}>
                        {isExampleExpanded ? (
                          <ChevronUp className={styles.icon} />
                        ) : (
                          <ChevronDown className={styles.icon} />
                        )}
                      </div>
                    </AccordionHeader>
                    <AccordionPanel className={styles.exampleAccordionPanel}>
                      <div style={{ padding: 10 }}>
                        <p style={{ color: "#5E687A", margin: 0 }}>{rule.example_language}</p>
                      </div>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
            <Divider
              style={{
                marginTop: 10,
              }}
            />
            {/* results */}
            {results && (
              <div
                style={{
                  margin: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {results.map((result, resultIndex) => {

                  // ===========================================================================
                  // NOTE 11-27-2025:
                  // Backend change - Added "new-section"
                  // ===========================================================================

                  if (result.status === "amended" || result.status === "new-section") {
                    return (
                      <div
                        key={resultIndex}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >

                        {/* ===========================================================================
                            NOTE 11-27-2025:
                            Backend change - Added handling for isFullDeletion and new-section statuses.
                            Add the word "Section" before each section number
                            ===========================================================================
                            
                            Fixed alignment: Moved label inside the section container div so
                            "Recommended Changes:" and "New Section to Add:" are left-aligned
                            with the section number. Added colon to "New Section to Add:" and
                            "Section to Delete:" for consistency.
                            =========================================================================== */}
                        <div style={{ fontSize: "15px", lineHeight: "22px" }}>
                          {/* ============================
                              NOTE 11-27-2025:
                              Left aligned with diff box border 
                              ============================ */}
                          <p
                            style={{
                              fontSize: 14,
                              fontWeight: 500,
                              margin: 0,
                              marginBottom: "8px",

                              // ===========================================================================
                              // NOTE 11-27-2025:
                              // Changed from blue (#005FF9) to black (#333) per Module 3's Figma
                              // ===========================================================================

                              color: "#333",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <svg width="0" height="0" style={{ position: "absolute" }}>
                              <defs>
                                <linearGradient id="g">
                                  <stop offset="0%" stopColor="#129EFF" />
                                  <stop offset="100%" stopColor="#3300FF" />
                                </linearGradient>
                              </defs>
                            </svg>
                            <SquarePen stroke="url(#g)" size={15} />

                            {/* ===========================================================================
                                NOTE 11-27-2025:
                                Label based on result status
                                =========================================================================== */}

                            {result.status === "new-section" 
                              ? "New Section to Add:" 
                              : result.isFullDeletion
                                ? "Section to Delete:"
                                : "Recommended Changes:"}
                          </p>
                          <strong>
                            {result.section_number 
                              ? (result.section_number.toLowerCase().startsWith('section') || result.section_number.toLowerCase().startsWith('after section')
                                  ? result.section_number 
                                  : `Section ${result.section_number}`)
                              : "N/A"}
                          </strong>
                          <div
                            style={{
                              padding: "12px",

                              // ===========================================================================
                              // NOTE 11-28-2025:
                              // Changed background from blue (#e3f2fd) to white per Module 3's Figma
                              // ===========================================================================

                              backgroundColor: result.isFullDeletion ? "#f8d7da" : "#ffffff",
                              border: `1px solid ${result.isFullDeletion ? "#f5c6cb" : "#4080FF"}`,
                              borderRadius: "4px",
                              marginTop: "8px",
                            }}
                          >
                            {result.isFullDeletion ? (
                              <div>
                                <span style={{ textDecoration: "line-through", color: "#721c24" }}>
                                  {result.original_language}
                                </span>
                                <br /><br />
                                <span style={{ color: "#155724", fontWeight: "bold" }}>
                                  [INTENTIONALLY DELETED]
                                </span>
                              </div>
                            ) : result.status === "new-section" ? (
                              <div style={{ 
                                backgroundColor: "#d4edda", 
                                color: "#155724", 
                                fontWeight: "bold",
                                padding: "8px",
                                borderRadius: "4px"
                              }}>
                                {result.amended_language}
                              </div>
                            ) : (
                              <DiffViewer
                                before={result.original_language || ""}
                                after={result.amended_language || ""}
                              />
                            )}
                          </div>
                        </div>

                        

                        {/* <div style={{ fontSize: "15px", lineHeight: "22px" }}>
                          <strong>{result.section_number || "N/A"}</strong>&nbsp;
                          {result.original_language && result.amended_language ? (
                            <>
                              {result.original_language.split(" ").map((word, idx) => {
                                const amendedWords = result.amended_language!.split(" ");
                                const originalWords = result.original_language!.split(" ");
                                const addedWords = amendedWords.filter(
                                  (w) => !originalWords.includes(w)
                                );
                                if (addedWords.includes(word)) {
                                  return (
                                    <span
                                      key={idx}
                                      style={{
                                        backgroundColor: "#d4f5c2",
                                        padding: "2px 4px",
                                        borderRadius: "3px",
                                      }}
                                    >
                                      {word}
                                    </span>
                                  );
                                }
                                return <span key={idx}>{word} </span>;
                              })}
                            </>
                          ) : (
                            result.amended_language ||
                            result.original_language ||
                            "No language available"
                          )}
                        </div> */}

                        

                        {/* ===========================================================================
                            NOTE 11-27-2025:
                            Removed misplaced "not found" message that was incorrectly showing
                            inside the "amended" results block
                            =========================================================================== */}

                        {/* <div
                          key={resultIndex}
                          style={{
                            padding: 8,
                            backgroundColor: "#FFF7E8",
                            borderRadius: 4,
                            fontSize: 13,
                          }}
                        >
                          The relevant language cannot be found. Please consider whether similar
                          language should be added to your agreement. */}

                          {/* ===============================================================================================
                            NOTE 11-27-2025:
                            Section links - moved ABOVE the action buttons per Module 3's Figma
                            =============================================================================================== */}
                        {(() => {
                          const sectionsForThisRule = getSectionsForRule(rule.rule_number);
                          if (sectionsForThisRule.length === 0) return null;
                          
                          const formatSectionDisplay = (sectionNum: string): string => {
                            if (sectionNum.toLowerCase().startsWith('after section')) {
                              return sectionNum;
                            }
                            return `Section ${sectionNum}`;
                          };
                          
                          return (
                            <div
                              style={{
                                marginTop: "12px",
                                marginBottom: "12px",
                                display: "flex",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "8px",
                              }}
                            >
                              <span style={{ fontSize: "12px", color: "#666" }}>Sections:</span>
                              {sectionsForThisRule.map((sectionNum) => (
                                <button
                                  key={sectionNum}
                                  onClick={() => onNavigateToSection(sectionNum)}
                                  className={styles.sectionLinkButton}
                                >
                                  {formatSectionDisplay(sectionNum)}
                                </button>
                              ))}
                            </div>
                          );
                        })()}

                        {/* ===========================================================================
                            NOTE 11-27-2025:
                            Divider line between section links and action buttons per Module 3's Figma
                            =========================================================================== */}
                        <div style={{ borderTop: "1px solid #e1e1e1", paddingTop: "12px" }}>
                          <footer className="pb-actions">
                            <div className="pb-action-left">
                              <Tooltip
                                content="Delete"
                                relationship="label"
                                positioning="above"
                              >
                                <button
                                  style={{
                                    background: "white",
                                    border: "1px solid #4080FF",
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
                                  }}
                                  onClick={() => onDeleteResult(rule.rule_number, result)}
                                >
                                  <Trash2 style={{ width: "16px", height: "16px" }} />
                                </button>
                              </Tooltip>
                            </div>

                            <div className="pb-action-right">
                              <Tooltip
                                content="Locate in document"
                                relationship="label"
                                positioning="above"
                              >
                                <button
                                  style={{
                                    background: "white",
                                    border: "1px solid #4080FF",
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
                                  }}
                                  onClick={() => onLocateText(result.original_language)}
                                >
                                  <CiLocationArrow1 style={{ width: "16px", height: "16px" }} />
                                </button>
                              </Tooltip>

                              {/* ============================
                                  NOTE 11-27-2025:
                                  Calculate applied state (for the Apply button)
                                  ============================ */}
                              {(() => {
                                const amendmentKey = getAmendmentKey(result);
                                const hasAppliedComments = appliedComments.has(amendmentKey);
                                const hasAppliedRedlines = appliedRedlines.has(amendmentKey);
                                const hasAppliedBoth = hasAppliedComments && hasAppliedRedlines;

                                return (
                                  <Menu positioning={{ positioningRef }}>
                                    <MenuTrigger disableButtonEnhancement>
                                      <FButton
                                        appearance="primary"
                                        ref={buttonRef as any}
                                        style={{ 
                                          display: "flex", 
                                          padding: 0,
                                          background: "var(--brand-gradient)",
                                          color: "var(--text-on-brand)",
                                          minWidth: "auto",
                                          height: "28px",
                                          fontFamily: "inherit",
                                          fontSize: "14px",
                                          fontWeight: 500,
                                        }}
                                      >
                                        <span style={{ padding: "0 8px", fontSize: "12px" }}>
                                          {hasAppliedBoth ? "Re-apply" : "Apply Change"}
                                        </span>
                                        <ChevronDown
                                          style={{
                                            width: 14,
                                            height: 14,
                                            padding: 4,
                                            borderLeft: "1px solid rgba(255,255,255,0.3)",
                                          }}
                                        />
                                      </FButton>
                                    </MenuTrigger>
                                    <MenuPopover
                                      style={{
                                        backgroundColor: "#5B9BF8",
                                        color: "white",
                                        borderRadius: "8px",
                                        padding: "6px",
                                      }}
                                    >
                                      <MenuList>
                                        <MenuItem
                                          disabled={
                                            isApplyingBoth[`${rule.rule_number}-both`] ||
                                            isApplyingTrackChanges[`${rule.rule_number}-tracked`]
                                          }
                                          onClick={async () => {
                                            await onApplyBothChangesAndComments(
                                              result,
                                              rule,
                                              rule.rule_number
                                            );
                                          }}
                                        >
                                          {isApplyingBoth[`${rule.rule_number}-both`] ? (
                                            <>
                                              <Loader2
                                                style={{ width: 16, height: 16, marginRight: 8 }}
                                                className={styles.animateSpin}
                                              />
                                              Applying...
                                            </>
                                          ) : (
                                            hasAppliedBoth ? "Re-apply both redline and comments" : "Apply both redline and comments"
                                          )}
                                        </MenuItem>
                                        <MenuItem
                                          disabled={
                                            isApplyingBoth[`${rule.rule_number}-both`] ||
                                            isApplyingTrackChanges[`${rule.rule_number}-tracked`]
                                          }
                                          onClick={async () => {
                                            await onApplyTrackChanges(result, rule.rule_number);
                                          }}
                                        >
                                          {isApplyingTrackChanges[`${rule.rule_number}-track`] ? (
                                            <>
                                              <Loader2
                                                style={{ width: 16, height: 16, marginRight: 8 }}
                                                className={styles.animateSpin}
                                              />
                                              Applying...
                                            </>
                                          ) : (
                                            hasAppliedRedlines ? "Re-apply redline only" : "Apply redline only"
                                          )}
                                        </MenuItem>
                                        <MenuItem
                                          disabled={
                                            isApplyingBoth[`${rule.rule_number}-both`] ||
                                            isApplyingTrackChanges[`${rule.rule_number}-track`]
                                          }
                                          onClick={async () => {
                                            if (onApplyCommentsOnly) {
                                              await onApplyCommentsOnly(result, rule, rule.rule_number);
                                            } else {
                                              await onLocateText(result.original_language);
                                              await onAddComment(
                                                `Instruction: ${rule.instruction}\n\nExample language: ${rule.example_language}`
                                              );
                                            }
                                          }}
                                        >
                                          {hasAppliedComments ? "Re-apply comments only" : "Apply comments only"}
                                        </MenuItem>
                                      </MenuList>
                                    </MenuPopover>
                                  </Menu>
                                );
                              })()}
                            </div>
                          </footer>
                        </div>
                      </div>
                    );
                  // ===========================================================================
                  // NOTE 11-27-2025:
                  // Fixed "No Changes Needed" category accordions not expanding.
                  // Root cause: Previous code had hardcoded `openItems={false ? [""] : []}`
                  // and empty `onToggle={() => {}}` handlers which prevented user interaction.
                  // Solution: Extracted to NotAmendedResult component with proper useState hooks
                  // to manage accordion expanded/collapsed state.
                  // ===========================================================================
                  } else if (result.status === "not-amended") {
                    return (
                      <NotAmendedResult
                        key={resultIndex}
                        rule={rule}
                        result={result}
                        resultIndex={resultIndex}
                        styles={styles}
                        whyLoadingStates={whyLoadingStates}
                        showWhyResults={showWhyResults}
                        onWhyClick={onWhyClick}
                        onLocateText={onLocateText}
                        onDeleteResult={onDeleteResult}
                      />
                    );
                 } else if (result.status === "instruction-request") {
                    return (
                      <div
                        key={resultIndex}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        <div style={{ fontSize: "15px", lineHeight: "22px" }}>
                          <p
                            style={{
                              fontSize: 14,
                              fontWeight: 500,
                              margin: 0,
                              marginBottom: "8px",
                              color: "#e65100",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <AiOutlineBulb size={15} color="#e65100" />
                            Section Text:
                          </p>
                          <strong>
                            {result.section_number 
                              ? (result.section_number.toLowerCase().startsWith('section')
                                  ? result.section_number 
                                  : `Section ${result.section_number}`)
                              : "N/A"}
                          </strong>
                          
                          {result.original_language && (
                            <div
                              style={{
                                padding: "12px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #4080FF",
                                borderRadius: "4px",
                                marginTop: "8px",
                                wordWrap: "break-word",
                                overflowWrap: "break-word",
                                wordBreak: "break-word",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              <p style={{ margin: 0, color: "#333" }}>{result.original_language}</p>
                            </div>
                          )}

                          {result.issue && (
                            <p
                              style={{
                                fontSize: 14,
                                fontWeight: 500,
                                margin: "12px 0 8px 0",
                                color: "#e65100",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <AiOutlineBulb size={15} color="#e65100" />
                              Instruction Request:
                            </p>
                          )}

                          {result.issue && (
                            <div
                              style={{
                                padding: "12px",
                                backgroundColor: "#fff7e6",
                                border: "1px solid #ffe0b2",
                                borderRadius: "4px",
                                marginTop: "8px",
                                wordWrap: "break-word",
                                overflowWrap: "break-word",
                                wordBreak: "break-word",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {editingIssues[`${rule.rule_number}-${resultIndex}`] ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  <textarea
                                    value={editedIssueText[`${rule.rule_number}-${resultIndex}`] ?? result.issue}
                                    onChange={(e) => setEditedIssueText(prev => ({
                                      ...prev,
                                      [`${rule.rule_number}-${resultIndex}`]: e.target.value
                                    }))}
                                    style={{
                                      width: "100%",
                                      minHeight: "80px",
                                      padding: "8px",
                                      border: "1px solid #ffe0b2",
                                      borderRadius: "4px",
                                      fontSize: "14px",
                                      fontFamily: "inherit",
                                      resize: "vertical",
                                      boxSizing: "border-box",
                                    }}
                                  />
                                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                    <button
                                      onClick={() => {
                                        setEditingIssues(prev => ({
                                          ...prev,
                                          [`${rule.rule_number}-${resultIndex}`]: false
                                        }));
                                        setEditedIssueText(prev => ({
                                          ...prev,
                                          [`${rule.rule_number}-${resultIndex}`]: result.issue
                                        }));
                                      }}
                                      style={{
                                        padding: "6px 12px",
                                        backgroundColor: "#fff",
                                        border: "1px solid #d0d0d0",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "13px",
                                      }}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => {
                                        const newIssue = editedIssueText[`${rule.rule_number}-${resultIndex}`];
                                        if (newIssue !== undefined) {
                                          onUpdateIssue?.(rule.rule_number, resultIndex, newIssue);
                                        }
                                        setEditingIssues(prev => ({
                                          ...prev,
                                          [`${rule.rule_number}-${resultIndex}`]: false
                                        }));
                                      }}
                                      style={{
                                        padding: "6px 12px",
                                        backgroundColor: "#e65100",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "13px",
                                      }}
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p style={{ margin: 0, color: "#5E687A" }}>
                                  {editedIssueText[`${rule.rule_number}-${resultIndex}`] ?? result.issue}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action buttons - matching RulesPage/RuleCard style */}
                        <div style={{ borderTop: "1px solid #e1e1e1", paddingTop: "12px" }}>
                          <footer className="pb-actions">
                            <div className="pb-action-left">
                              <Tooltip
                                content="Delete"
                                relationship="label"
                                positioning="above"
                              >
                                <button
                                  style={{
                                    background: "white",
                                    border: "1px solid #4080FF",
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
                                  }}
                                  onClick={() => onDeleteResult(rule.rule_number, result)}
                                >
                                  <Trash2 style={{ width: "16px", height: "16px" }} />
                                </button>
                              </Tooltip>
                            </div>

                            <div className="pb-action-right">
                              {/* Edit button - RulesPage style, orange color */}
                              {!editingIssues[`${rule.rule_number}-${resultIndex}`] && (
                                <Tooltip
                                  content="Edit"
                                  relationship="label"
                                  positioning="above"
                                >
                                  <button
                                    style={{
                                      background: "white",
                                      border: "1px solid #4080FF",
                                      cursor: "pointer",
                                      marginLeft: "3px",
                                      boxShadow: "none",
                                      outline: "none",
                                      transition: "background-color 0.3s, color 0.3s",
                                      padding: "4px",
                                      borderRadius: "5px",
                                      display: "grid",
                                      placeContent: "center",
                                      width: "28px",
                                      height: "28px",
                                    }}
                                    onClick={() => {
                                      setEditedIssueText(prev => ({
                                        ...prev,
                                        [`${rule.rule_number}-${resultIndex}`]: result.issue || ''
                                      }));
                                      setEditingIssues(prev => ({
                                        ...prev,
                                        [`${rule.rule_number}-${resultIndex}`]: true
                                      }));
                                    }}
                                  >
                                    <SquarePen size={16} color="#0F62FE" />
                                  </button>
                                </Tooltip>
                              )}

                              {/* Locate button - arrow icon, RulesPage style, orange color */}
                              <Tooltip
                                content="Locate in document"
                                relationship="label"
                                positioning="above"
                              >
                                <button
                                  style={{
                                    background: "white",
                                    border: "1px solid #4080FF",
                                    cursor: "pointer",
                                    marginLeft: "3px",
                                    boxShadow: "none",
                                    outline: "none",
                                    transition: "background-color 0.3s, color 0.3s",
                                    padding: "4px",
                                    borderRadius: "5px",
                                    display: "grid",
                                    placeContent: "center",
                                    width: "28px",
                                    height: "28px",
                                  }}
                                  onClick={() => onLocateText(result.original_language)}
                                >
                                  <CiLocationArrow1 size={16} color="#0F62FE" />
                                </button>
                              </Tooltip>
                            </div>
                          </footer>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div
                        key={resultIndex}
                        style={{
                          padding: 12,
                          backgroundColor: "#f8f9fa",
                          border: "1px solid #e1e1e1",
                          borderRadius: 4,
                          fontSize: 13,
                        }}
                      >
                        The relevant language cannot be found. Please consider whether similar
                        language should be added to your agreement.
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

interface PlaybookResultsProps {
  groupedRules: {
    "changes-required": Array<{ rule: Rule; results: RuleResult[]; index: number }>;
    "no-changes-needed": Array<{ rule: Rule; results: RuleResult[]; index: number }>;
    "no-applicable-content": Array<{ rule: Rule; results: RuleResult[]; index: number }>;
  };
  groupedIRRules?: {
    "instruction-requests": Array<{ rule: Rule; results: RuleResult[]; index: number }>;
    "no-applicable-content": Array<{ rule: Rule; results: RuleResult[]; index: number }>;
  };
  isChangesRequiredExpanded: boolean;
  isNoChangesNeededExpanded: boolean;
  isNoApplicableContentExpanded: boolean;
  setIsChangesRequiredExpanded: (expanded: boolean) => void;
  setIsNoChangesNeededExpanded: (expanded: boolean) => void;
  setIsNoApplicableContentExpanded: (expanded: boolean) => void;
  ruleLoadingStates: { [k: string]: boolean };
  whyLoadingStates: { [k: string]: boolean };
  isApplyingTrackChanges: { [k: string]: boolean };
  isApplyingBoth: { [k: string]: boolean };
  showWhyResults: { [k: string]: boolean };
  onApplyTrackChanges: (result: RuleResult, ruleId: string | number) => Promise<void>;
  onApplyBothChangesAndComments: (
    result: RuleResult,
    rule: Rule,
    ruleId: string | number
  ) => Promise<void>;

  // ===============================================================================================
  // NOTE 11-27-2025:
  // Updated signature to include result parameter for locating contract text
  // ===============================================================================================

  onApplyCommentsOnly?: (result: RuleResult, rule: Rule, ruleId: string | number) => Promise<void>;
  onLocateText: (text?: string) => void;
  onAddComment: (text: string) => Promise<boolean | void>;
  onWhyClick: (rule: Rule, contract_language: string) => Promise<void>;
  onDeleteResult: (ruleId: string | number, result: RuleResult) => void;
  getStatusIcon: (status?: string) => React.ReactNode;
  buttonRef: React.RefObject<HTMLButtonElement>;
  positioningRef: React.RefObject<PositioningImperativeRef>;
  getAppliedCount: (rules: Array<{ rule: Rule; results: RuleResult[]; index: number }>) => number;
  // ===============================================================================================
  // NOTE 11-27-2025:
  // Add props for cross-tab navigation from Rules tab to Changes tab
  // ===============================================================================================
  onNavigateToSection: (sectionNumber: string) => void;
  getSectionsForRule: (ruleId: string) => string[];
  ruleRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  // ============================
  // NOTE 11-27-2025:
  // Add props for tracking applied state (for the "Apply" button)
  // ============================
  appliedComments: Set<string>;
  appliedRedlines: Set<string>;
  onUpdateIssue?: (ruleId: string, resultIndex: number, newIssue: string) => void;
}

const PlaybookResults: React.FC<PlaybookResultsProps> = ({
  groupedRules,
  groupedIRRules,
  isChangesRequiredExpanded,
  isNoChangesNeededExpanded,
  isNoApplicableContentExpanded,
  setIsChangesRequiredExpanded,
  setIsNoChangesNeededExpanded,
  setIsNoApplicableContentExpanded,
  ruleLoadingStates,
  whyLoadingStates,
  isApplyingTrackChanges,
  isApplyingBoth,
  showWhyResults,
  onApplyTrackChanges,
  onApplyBothChangesAndComments,
  onApplyCommentsOnly,
  onLocateText,
  onAddComment,
  onWhyClick,
  onDeleteResult,
  getStatusIcon,
  buttonRef,
  positioningRef,
  getAppliedCount,
  // ===============================================================================================
  // NOTE 11-27-2025:
  // Destructure props for cross-tab navigation
  // ===============================================================================================
  onNavigateToSection,
  getSectionsForRule,
  ruleRefs,
  // ============================
  // NOTE 11-27-2025:
  // Destructure applied state tracking props (for the Apply button)
  // ============================
  appliedComments,
  appliedRedlines,
  onUpdateIssue,
}) => {
  const styles = useStyles();

  const changesRequired = groupedRules["changes-required"] || [];
  const noChangesNeeded = groupedRules["no-changes-needed"] || [];

  const groupConfigs = [
    {
      key: "changes-required",
      title: `Changes Required`,
      rules: changesRequired,
      isExpanded: isChangesRequiredExpanded,
      setIsExpanded: setIsChangesRequiredExpanded,
    },
    {
      key: "no-changes-needed",
      title: "No Changes Needed",
      rules: noChangesNeeded,
      isExpanded: isNoChangesNeededExpanded,
      setIsExpanded: setIsNoChangesNeededExpanded,
    },
    {
      key: "no-applicable-content",
      title: "No Applicable Content",
      rules: groupedRules["no-applicable-content"],
      isExpanded: isNoApplicableContentExpanded,
      setIsExpanded: setIsNoApplicableContentExpanded,
    },
  ];

  return (
    <div className={styles.content}>
      {/* {groupConfigs.map((group) => (
        <div key={group.key}>
          <Accordion
            collapsible
            openItems={group.isExpanded ? [group.key] : []}
            onToggle={(_, data) => {
              group.setIsExpanded(data.openItems.includes(group.key));
            }}
          >
            <AccordionItem
              value={group.key}
              className={
                group.isExpanded
                  ? styles.categoryAccordionItemExpanded
                  : styles.categoryAccordionItem
              }
            >
              <AccordionHeader
                style={{
                  backgroundColor: "#ffffff",
                  border: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                className={styles.categoryAccordionHeader}
                onClick={() => group.setIsExpanded(!group.isExpanded)}
                expandIcon={null}
              >
                <div className={styles.cardTitle} style={{ cursor: "pointer", flex: 1 }}>
                  <AiOutlineExclamationCircle />
                  <span>
                    {group.title}{" "}
                    <span style={{ fontSize: "12px" }}>
                      (
                      {group.isExpanded
                        ? `${getAppliedCount(group.rules)}/${group.rules.length} Applied`
                        : group.rules.length}
                      )
                    </span>
                  </span>
                </div>
                <div className={styles.categoryCustomChevron}>
                  {group.isExpanded ? (
                    <ChevronUp className={styles.icon} />
                  ) : (
                    <ChevronDown className={styles.icon} />
                  )}
                </div>
              </AccordionHeader>

              <AccordionPanel className={styles.categoryAccordionPanel}>
                <div>
                  {group.rules.map(({ rule, results, index }) => (
                    <RuleResultItem
                      key={rule.rule_number}
                      rule={rule}
                      results={results}
                      index={index}
                      styles={styles}
                      ruleLoadingStates={ruleLoadingStates}
                      getStatusIcon={getStatusIcon}
                      isApplyingTrackChanges={isApplyingTrackChanges}
                      isApplyingBoth={isApplyingBoth}
                      whyLoadingStates={whyLoadingStates}
                      showWhyResults={showWhyResults}
                      onApplyTrackChanges={onApplyTrackChanges}
                      onApplyBothChangesAndComments={onApplyBothChangesAndComments}
                      onLocateText={onLocateText}
                      onAddComment={onAddComment}
                      onWhyClick={onWhyClick}
                      buttonRef={buttonRef}
                      positioningRef={positioningRef}
                    />
                  ))}
                </div>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
          <Divider />
        </div>
      ))} */}
      {groupConfigs.map((group) => {
        const rulesArray = Array.isArray(group.rules) ? group.rules : [];
        const hasRules = rulesArray.length > 0;
        const appliedCount = hasRules ? getAppliedCount(rulesArray) : 0;

        return (
          <div key={group.key}>
            <Accordion
              collapsible
              openItems={group.isExpanded ? [group.key] : []}
              onToggle={(_, data) => {
                group.setIsExpanded(data.openItems.includes(group.key));
              }}
            >
              <AccordionItem
                disabled={!hasRules}
                value={group.key}
                className={
                  group.isExpanded
                    ? styles.categoryAccordionItemExpanded
                    : styles.categoryAccordionItem
                }
              >
                <AccordionHeader
                  style={{
                    backgroundColor: "#ffffff",
                    border: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                  className={styles.categoryAccordionHeader}
                  onClick={() => group.setIsExpanded(!group.isExpanded)}
                  expandIcon={null}
                >
                  <div className={styles.cardTitle} style={{ cursor: "pointer", flex: 1 }}>
                    <AiOutlineExclamationCircle />
                    <span>
                      {group.title}{" "}
                      {hasRules ? (
                        <span style={{ fontSize: "12px" }}>
                          (
                          {/* ===========================================================================
                              NOTE 11-27-2025:
                              Only show "X/Y Applied" format for "Changes Required" category.
                              "No Changes Needed" and "No Applicable Content" just show the count.
                              =========================================================================== */}
                          {group.key === "changes-required"
                            ? (group.isExpanded
                                ? `${appliedCount}/${rulesArray.length} Applied`
                                : rulesArray.length)
                            : rulesArray.length}
                          )
                        </span>
                      ) : (
                        <span style={{ fontSize: "12px" }}>(0)</span>
                      )}
                    </span>
                  </div>

                  {/* only show chevron if there are rules to expand/collapse */}
                  {hasRules ? (
                    <div className={styles.categoryCustomChevron}>
                      {group.isExpanded ? (
                        <ChevronUp className={styles.icon} />
                      ) : (
                        <ChevronDown className={styles.icon} />
                      )}
                    </div>
                  ) : null}
                </AccordionHeader>

                <AccordionPanel className={styles.categoryAccordionPanel}>
                  <div>
                    {rulesArray.map(({ rule, results, index }) => (
                      <RuleResultItem
                        key={rule.rule_number}
                        rule={rule}
                        results={results}
                        index={index}
                        styles={styles}
                        // ============================
                        // NOTE 11-28-2025:
                        // Pass ref for cross-tab navigation highlighting
                        // ============================
                        ruleRef={(el: HTMLDivElement | null) => { ruleRefs.current[rule.rule_number] = el; }}
                        ruleLoadingStates={ruleLoadingStates}
                        getStatusIcon={getStatusIcon}
                        isApplyingTrackChanges={isApplyingTrackChanges}
                        isApplyingBoth={isApplyingBoth}
                        whyLoadingStates={whyLoadingStates}
                        showWhyResults={showWhyResults}
                        onApplyTrackChanges={onApplyTrackChanges}
                        onApplyBothChangesAndComments={onApplyBothChangesAndComments}
                        onApplyCommentsOnly={onApplyCommentsOnly}
                        onLocateText={onLocateText}
                        onAddComment={onAddComment}
                        onWhyClick={onWhyClick}
                        onDeleteResult={onDeleteResult}
                        buttonRef={buttonRef}
                        positioningRef={positioningRef}
                        // ===============================================================================================
                        // NOTE 11-27-2025:
                        // Pass props for cross-tab navigation
                        // ===============================================================================================
                        onNavigateToSection={onNavigateToSection}
                        getSectionsForRule={getSectionsForRule}
                        // ============================
                        // NOTE 11-27-2025:
                        // Pass applied state tracking props (for the Apply button)
                        // ============================
                        appliedComments={appliedComments}
                        appliedRedlines={appliedRedlines}
                        onUpdateIssue={onUpdateIssue}
                      />
                    ))}
                  </div>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
            <Divider />
          </div>
        );
      })}

      {/* Instruction Request Rules Section */}
      {groupedIRRules && (groupedIRRules["instruction-requests"]?.length > 0 || groupedIRRules["no-applicable-content"]?.length > 0) && (
        <>
          <p
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              marginTop: "16px",
              marginBottom: "8px",
            }}
          >
            Rules for Instruction Requests
          </p>
          {groupedIRRules["instruction-requests"]?.length > 0 && (
              <button
                onClick={() => {
                  const irResults = groupedIRRules["instruction-requests"] || [];
                  const rows: Array<{
                    "No.": number;
                    "Section Number": string;
                    "Section Text": string;
                    "Request": string;
                  }> = [];
                  
                  let counter = 1;
                  irResults.forEach(({ results }) => {
                    results.forEach((result) => {
                      if (result.status === "instruction-request") {
                        const sectionNum = result.section_number
                          ? (result.section_number.toLowerCase().startsWith('section')
                              ? result.section_number
                              : `Section ${result.section_number}`)
                          : "N/A";
                        rows.push({
                          "No.": counter++,
                          "Section Number": sectionNum,
                          "Section Text": result.original_language || "",
                          "Request": result.issue || "",
                        });
                      }
                    });
                  });

                  const ws = XLSX.utils.json_to_sheet(rows);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Instruction Requests");
                  
                  // Auto-size columns
                  const colWidths = [
                    { wch: 5 },   // No.
                    { wch: 20 },  // Section Number
                    { wch: 60 },  // Section Text
                    { wch: 60 },  // Request
                  ];
                  ws["!cols"] = colWidths;
                  
                  XLSX.writeFile(wb, "Instruction_Requests.xlsx");
                }}
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
                  width: "fit-content",
                  marginBottom: "12px",
                }}
              >
                <Download size={14} />
                Download Excel
              </button>
            )}

          {groupedIRRules["instruction-requests"]?.map(({ rule, results, index }) => (
            <RuleResultItem
              key={rule.rule_number}
              rule={rule}
              results={results}
              index={index}
              styles={styles}
              ruleRef={(el: HTMLDivElement | null) => { ruleRefs.current[rule.rule_number] = el; }}
              ruleLoadingStates={ruleLoadingStates}
              getStatusIcon={getStatusIcon}
              isApplyingTrackChanges={isApplyingTrackChanges}
              isApplyingBoth={isApplyingBoth}
              whyLoadingStates={whyLoadingStates}
              showWhyResults={showWhyResults}
              onApplyTrackChanges={onApplyTrackChanges}
              onApplyBothChangesAndComments={onApplyBothChangesAndComments}
              onApplyCommentsOnly={onApplyCommentsOnly}
              onLocateText={onLocateText}
              onAddComment={onAddComment}
              onWhyClick={onWhyClick}
              onDeleteResult={onDeleteResult}
              buttonRef={buttonRef}
              positioningRef={positioningRef}
              onNavigateToSection={onNavigateToSection}
              getSectionsForRule={getSectionsForRule}
              appliedComments={appliedComments}
              appliedRedlines={appliedRedlines}
              onUpdateIssue={onUpdateIssue}
            />
          ))}

          {/* IR Not Found */}
          {groupedIRRules["no-applicable-content"]?.length > 0 && (
            <div style={{ marginTop: "12px" }}>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "#666", marginBottom: "8px" }}>
                No Applicable Content ({groupedIRRules["no-applicable-content"].length})
              </p>
              {groupedIRRules["no-applicable-content"].map(({ rule, results, index }) => (
                <RuleResultItem
                  key={rule.rule_number}
                  rule={rule}
                  results={results}
                  index={index}
                  styles={styles}
                  ruleRef={(el: HTMLDivElement | null) => { ruleRefs.current[rule.rule_number] = el; }}
                  ruleLoadingStates={ruleLoadingStates}
                  getStatusIcon={getStatusIcon}
                  isApplyingTrackChanges={isApplyingTrackChanges}
                  isApplyingBoth={isApplyingBoth}
                  whyLoadingStates={whyLoadingStates}
                  showWhyResults={showWhyResults}
                  onApplyTrackChanges={onApplyTrackChanges}
                  onApplyBothChangesAndComments={onApplyBothChangesAndComments}
                  onApplyCommentsOnly={onApplyCommentsOnly}
                  onLocateText={onLocateText}
                  onAddComment={onAddComment}
                  onWhyClick={onWhyClick}
                  onDeleteResult={onDeleteResult}
                  buttonRef={buttonRef}
                  positioningRef={positioningRef}
                  onNavigateToSection={onNavigateToSection}
                  getSectionsForRule={getSectionsForRule}
                  appliedComments={appliedComments}
                  appliedRedlines={appliedRedlines}
                  onUpdateIssue={onUpdateIssue}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PlaybookResults;