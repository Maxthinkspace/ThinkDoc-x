import {
  Checkbox,
  Divider,
  buttonClassNames,
  makeStyles,
  tokens,
  Button,
  Spinner,

  // ===========================================
  // NOTE 11-27-2025:
  // Moved tabs to PlaybookRulesTab.tsx 
  // ===========================================

  Tab,
  TabList,

  // ===========================================
  // NOTE 11-27-2025:
  // Removed "useTimeout" as it is not used 
  // ===========================================

  // useTimeout,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  PositioningImperativeRef,
  Button as FButton,
} from "@fluentui/react-components";
import React, { useState, useMemo, useRef } from "react";
import { Play, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { CheckmarkFilled } from "@fluentui/react-icons";
import { AlertCircle, CheckCircle } from "lucide-react";
import { RuleCard } from "./RuleCard";
import { IoIosInformationCircle } from "react-icons/io";
import { useToast } from "../../../hooks/use-toast";
import { Playbook, Rule as RuleType } from "../../UnifiedLibraryPage/types";
import PlaybookResults from "./PlaybookResults";
import { useNavigation } from "../../../hooks/use-navigation";
import { MessageSquare } from "lucide-react";

// ===========================================
// NOTE 11-27-2025:
// Moved the "Changes" tab to PlaybookRulesTab.tsx 
// ===========================================

import { ChangesTabContent, NoRulesApplied, compareSectionNumbers, SectionChange } from "./ChangesTab";
import { backendApi } from "@/src/services/api";
import { parseDocumentWithRanges } from "@/src/services/documentParser";
import {
  
  // ===================================================
  // NOTE 11-27-2025:
  // Removed "getContent" which is related to an old API 
  // ===================================================
  
  // getContent,
  addComment,
  generateDiffHtml,
  getDiffStyles,
  createParagraphDiffProposal,
  applyWordLevelTrackChanges,
  getTextRange,
  getTextRangeAcrossParagraphs,
} from "../../../taskpane";

const useStyles = makeStyles({
  root: {
    minHeight: "100vh",
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
  infoIcon: {
    paddingTop: "4px",
    width: "16px",
    height: "16px",
    flexShrink: 0,
  },
  container: {
    maxWidth: "72rem",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
  },
  headerText: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  title: {
    fontSize: "24px",
    lineHeight: 1.2,
    padding: "0px",
    margin: "0px",
    fontWeight: 700,
    color: "var(--foreground, #222)",
  },
  subtitle: {
    fontSize: "14px",
    margin: "0px",
    padding: "0px",
    color: "var(--muted-foreground, #6b7280)",
  },

  alert: {
    display: "flex",
    alignItems: "start",
    borderRadius: "8px",
    gap: "8px",
    border: "1px solid",
  },
  alertDescription: {
    fontSize: "14px",
  },
  card: {
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    padding: "24px",
    marginBottom: "1px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  cardHeader: {
    marginBottom: "8px",
  },
  cardTitle: {
    fontSize: "1.25rem",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    paddingBottom: "10px",
    margin: 0,
  },
  cardContent: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "5px",
  },
  addRuleRow: {
    display: "flex",
    justifyContent: "center",
  },
  dropIndicator: {
    height: "2px",
    backgroundColor: "#0078d4",
    margin: "4px 0",
    borderRadius: "1px",
    opacity: 0.8,
    transition: "opacity 0.2s ease",
  },
  dragOverItem: {
    opacity: 0.5,
    transform: "scale(0.98)",
    transition: "opacity 0.2s ease, transform 0.2s ease",
  },
  // Add CSS for drop target visual feedback
  ruleCard: {
    position: "relative",
  },
  icon: {
    width: "16px",
    height: "16px",
  },
  categoryAccordionItem: {
    border: "1px solid #e9ecef",
    borderRadius: "12px",
    backgroundColor: "transparent",
    transition: "border-color 0.2s ease",
  },
  categoryAccordionItemExpanded: {
    border: "1px solid #e9ecef",
    borderRadius: "12px",
    backgroundColor: "transparent",
    transition: "border-color 0.2s ease",
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
    "&:hover": {
      backgroundColor: "transparent",
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
  categoryCustomChevron: {
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
  categoryAccordionPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    backgroundColor: "transparent",
    border: "1px solid #e9ecef",
    borderTop: "none",
    borderRadius: "0 0 12px 12px",
    padding: "0 12px 12px",
  },
  accordionItem: {
    border: "1px solid #e9ecef",
    borderRadius: "8px",
    marginBottom: "8px",
  },
  accordionHeader: {
    border: "none",
    padding: "12px",
  },
  accordionPanel: {
    padding: "12px",
  },
  customChevron: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
  },
  exampleAccordionItem: {
    border: "1px solid #e9ecef",
    borderRadius: "8px",
    marginTop: "8px",
  },
  exampleAccordionHeader: {
    border: "none",
    padding: "8px",
  },
  exampleAccordionPanel: {
    padding: "8px",
  },
  buttonNonInteractive: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    color: tokens.colorNeutralForeground1,
    cursor: "default",
    pointerEvents: "none",

    [`& .${buttonClassNames.icon}`]: {
      color: tokens.colorStatusSuccessForeground1,
    },
  },
  // ============================
  // NOTE 11-27-2025:
  // Update checkbox color to match Module 3's Figma (#0F62FE)
  // ============================
  checkbox: {
    "& input:checked + .fui-Checkbox__indicator": {
      backgroundColor: "#0F62FE !important",
      border: "1px solid #0F62FE !important",
    },
    "& .fui-Checkbox__indicator": {
      border: "1px solid #0F62FE !important",
    },
  },
});

type InfoProps = {
  bgColor: string;
  borderColor: string;
  content: string;
  iconColor: string;
};

export type RuleCategory = {
  type:
    | "Rules for Instruction Requests"
    | "Rules for Contract Amendments"
    | "Conditional Rules for Contract Amendments";
  rules: RuleType[];
};
type LoadingState = "initial" | "loading" | "loaded";

export type RuleCategories = RuleCategory[];

interface RuleResult {

  // ===========================================
  // NOTE 11-27-2025:
  // Need to add "new-section" due to backend change
  // ===========================================  

  status: "amended" | "not-amended" | "not-found" | "new-section" | "instruction-request";
  original_language?: string;
  amended_language?: string;
  section_number: string;
  whyText?: string;
  isFullDeletion?: boolean;
  issue?: string;  // For instruction-request status
}

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

// RuleContent component - must be outside main component to avoid hook issues
interface RuleContentProps {
  rule: RuleType;
  results: RuleResult[];
  index: number;
  styles: ReturnType<typeof useStyles>;
  getStatusIcon: (status: string) => React.ReactNode;
  whyLoadingStates: { [key: string]: boolean };
  showWhyResults: { [key: string]: boolean };
  isApplyingTrackChanges: { [key: string]: boolean };
  isApplyingBoth: { [key: string]: boolean };
  handleWhyClick: (rule: RuleType, contract_language: string) => void;
  handleLocateText: (text: string) => void;
  handleApplyTrackChanges: (result: RuleResult, ruleId: string) => void;
  handleApplyBothChangesAndComments: (result: RuleResult, rule: RuleType, ruleId: string) => void;
  addComment: (text: string) => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
  positioningRef: React.RefObject<PositioningImperativeRef>;
}

const RuleContent: React.FC<RuleContentProps> = ({
  rule,
  results,
  index,
  styles,
  getStatusIcon,
  whyLoadingStates,
  showWhyResults,
  isApplyingTrackChanges,
  isApplyingBoth,
  handleWhyClick,
  handleLocateText,
  handleApplyTrackChanges,
  handleApplyBothChangesAndComments,
  addComment,
  buttonRef,
  positioningRef,
}) => {
  const [isRuleExpanded, setIsRuleExpanded] = useState(false);
  const [isExampleExpanded, setIsExampleExpanded] = useState(false);
  const { navigateTo } = useNavigation();

  return (
    <div key={rule.rule_number} className={styles.root}>
      <Accordion
        collapsible
        openItems={isRuleExpanded ? ["rule"] : []}
        onToggle={(_, data) => {
          setIsRuleExpanded(data.openItems.includes("rule"));
        }}
      >
        <AccordionItem value="rule" className={styles.accordionItem}>
          <AccordionHeader
            className={styles.accordionHeader}
            onClick={() => setIsRuleExpanded(!isRuleExpanded)}
            style={{ position: "relative" }}
            expandIcon={null}
          >
            <div className={styles.header}>
              <p className={styles.title} style={{ cursor: "pointer", flex: 1, margin: 0 }}>
                Rule {index + 1}
              </p>
              {results && results.length > 0 && (
                <div style={{ marginLeft: "8px" }}>
                  {getStatusIcon(results[0].status)}
                </div>
              )}
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
            <div style={{ marginTop: "0px", padding: "10px" }}>
              <p style={{ fontWeight: 600, margin: 0 }}>Instruction:</p>
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
                      style={{ position: "relative" }}
                      expandIcon={null}
                    >
                      <div className={styles.header}>
                        <p
                          className={styles.title}
                          style={{ cursor: "pointer", flex: 1, margin: 0, color: "#5E687A" }}
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
                      <div
                        style={{
                          padding: "10px",
                        }}
                      >
                        <p style={{ color: "#5E687A", margin: 0 }}>{rule.example_language}</p>
                      </div>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </div>
            )}

            {/* Show results */}
            {results && results.length > 0 && (
              <div
                style={{
                  margin: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {results.map((result, resultIndex) => {
                  if (result.status === "amended") {
                    return (
                      <div
                        key={resultIndex}
                        style={{ display: "flex", flexDirection: "column", gap: "8px" }}
                      >
                        <p style={{ fontSize: "14px", fontWeight: "500" }}>
                          See the recommended changes below:
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div
                            style={{
                              padding: "12px",
                              backgroundColor: "#e3f2fd",
                              border: "1px solid #90caf9",
                              borderRadius: "4px",
                              fontSize: "14px",
                            }}
                          >
                            <DiffViewer
                              before={result.original_language || ""}
                              after={result.amended_language || ""}
                            />
                          </div>

                          <div style={{ display: "flex", gap: "8px" }}>
                            <Menu positioning={{ positioningRef }}>
                              <MenuTrigger disableButtonEnhancement>
                                <FButton
                                  ref={buttonRef}
                                  style={{
                                    display: "flex",
                                  }}
                                >
                                  Apply
                                  <ChevronDown
                                    style={{
                                      width: "16px",
                                      height: "16px",
                                    }}
                                  />
                                </FButton>
                              </MenuTrigger>

                              <MenuPopover>
                                <MenuList>
                                  <MenuItem
                                    disabled={
                                      isApplyingBoth[`${rule.rule_number}-both`] ||
                                      isApplyingTrackChanges[`${rule.rule_number}-track`]
                                    }
                                    onClick={async () => {
                                      await handleApplyBothChangesAndComments(
                                        result,
                                        rule,
                                        rule.rule_number
                                      );
                                    }}
                                  >
                                    {isApplyingBoth[`${rule.rule_number}-both`] ? (
                                      <>
                                        <Loader2
                                          style={{
                                            width: "16px",
                                            height: "16px",
                                            marginRight: "8px",
                                          }}
                                          className={styles.animateSpin}
                                        />
                                        Applying...
                                      </>
                                    ) : (
                                      "Apply both track changes and comments"
                                    )}
                                  </MenuItem>
                                  <MenuItem
                                    disabled={
                                      isApplyingBoth[`${rule.rule_number}-both`] ||
                                      isApplyingTrackChanges[`${rule.rule_number}-track`]
                                    }
                                    onClick={async () => {
                                      await handleApplyTrackChanges(result, rule.rule_number);
                                    }}
                                  >
                                    {isApplyingTrackChanges[`${rule.rule_number}-track`] ? (
                                      <>
                                        <Loader2
                                          style={{
                                            width: "16px",
                                            height: "16px",
                                            marginRight: "8px",
                                          }}
                                          className={styles.animateSpin}
                                        />
                                        Applying...
                                      </>
                                    ) : (
                                      "Apply track changes only"
                                    )}
                                  </MenuItem>
                                  <MenuItem
                                    disabled={
                                      isApplyingBoth[`${rule.rule_number}-both`] ||
                                      isApplyingTrackChanges[`${rule.rule_number}-track`]
                                    }
                                    onClick={async () => {
                                      await handleLocateText(result.original_language || "");
                                      await addComment(
                                        `Instruction: ${rule.instruction}\n\nExample language: ${rule.example_language}`
                                      );
                                    }}
                                  >
                                    Apply comments only
                                  </MenuItem>
                                </MenuList>
                              </MenuPopover>
                            </Menu>
                            <FButton
                              onClick={() => {
                                const amendmentText = `Original: ${result.original_language || ""}\n\nAmended: ${result.amended_language || ""}`;
                                sessionStorage.setItem("askContextText", amendmentText);
                                navigateTo("ask");
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                              title="Ask about this amendment"
                            >
                              <MessageSquare size={14} />
                              Ask about this
                            </FButton>

                            <Button
                              size="small"
                              appearance="outline"
                              onClick={() => handleLocateText(result.original_language || "")}
                            >
                              Locate
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (result.status === "not-amended") {
                    return (
                      <div key={resultIndex} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <p style={{ fontSize: "14px", fontWeight: "500" }}>
                          No change was made to the following language:
                        </p>
                        <div
                          style={{
                            padding: "12px",
                            backgroundColor: "#f8f9fa",
                            border: "1px solid #e1e1e1",
                            borderRadius: "4px",
                            fontSize: "14px",
                          }}
                        >
                          {result.original_language}
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <Button
                            size="small"
                            appearance="outline"
                            onClick={() => handleWhyClick(rule, result.original_language || "")}
                            disabled={whyLoadingStates[rule.rule_number]}
                          >
                            {whyLoadingStates[rule.rule_number] ? (
                              <Loader2
                                style={{ width: "16px", height: "16px", marginRight: "4px" }}
                                className={styles.animateSpin}
                              />
                            ) : null}
                            Why
                          </Button>
                          <Button
                            size="small"
                            appearance="outline"
                            onClick={() => handleLocateText(result.original_language || "")}
                          >
                            Locate
                          </Button>
                        </div>
                        {showWhyResults[rule.rule_number] && result.whyText && (
                          <div
                            style={{
                              padding: "12px",
                              backgroundColor: "#fff3cd",
                              border: "1px solid #ffeaa7",
                              borderRadius: "4px",
                              fontSize: "14px",
                              marginTop: "8px",
                            }}
                          >
                            {result.whyText}
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div
                        key={resultIndex}
                        style={{
                          padding: "12px",
                          backgroundColor: "#f8f9fa",
                          border: "1px solid #e1e1e1",
                          borderRadius: "4px",
                          fontSize: "14px",
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


const PlaybookRules = () => {
  const styles = useStyles();
  const {toast} = useToast();
  const { navigateTo } = useNavigation();

  // Load playbook from localStorage
  const [playbook, setPlaybook] = useState<Playbook | null>(() => {
    try {
      const raw = localStorage.getItem("playbook");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  React.useEffect(() => {
    if (!playbook?.rules) return;
    
    // Skip redirect if we've already completed rules configuration
    const configComplete = sessionStorage.getItem("rulesConfigurationComplete");
    if (configComplete === "true") return;
    
    const conditionalCategory = playbook.rules.find(
      (r: any) => r.type === "Conditional Rules for Contract Amendments"
    );
    
    if (conditionalCategory?.rules?.length > 0) {
      navigateTo('RulesConfiguration');
    }
  }, [playbook, navigateTo]);

  // Extract amendment rules from playbook
  const amendmentRules = useMemo(() => {
    if (!playbook?.rules) return [];
    const category = playbook.rules.find((r) => r.type === "Rules for Contract Amendments");
    return category?.rules ?? [];
  }, [playbook]);

  // Extract instruction request rules from playbook
  const instructionRules = useMemo(() => {
    if (!playbook?.rules) return [];
    const category = playbook.rules.find((r) => r.type === "Rules for Instruction Requests");
    return category?.rules ?? [];
  }, [playbook]);

  // Combine all rules for selection
  const allRules = useMemo(() => {
    return [...amendmentRules, ...instructionRules];
  }, [amendmentRules, instructionRules]);

  // Selection state
  const [selectedRules, setSelectedRules] = useState<{ [key: string]: boolean }>({});
  const [selectAll, setSelectAll] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [ruleLoadingStates, setRuleLoadingStates] = useState<{ [key: string]: boolean }>({});
  const [ruleResults, setRuleResults] = useState<{ [key: string]: RuleResult[] }>({});
  const [hasRunSelectedRules, setHasRunSelectedRules] = useState(false);
  const [individualRuleResults, setIndividualRuleResults] = useState<{ [key: string]: RuleResult }>({});
  const [showWhyResults, setShowWhyResults] = useState<{ [key: string]: boolean }>({});
  const [whyLoadingStates, setWhyLoadingStates] = useState<{ [key: string]: boolean }>({});
  const [isApplyingTrackChanges, setIsApplyingTrackChanges] = useState<{ [key: string]: boolean }>({});
  const [isApplyingBoth, setIsApplyingBoth] = useState<{ [key: string]: boolean }>({});
  const [appliedRules, setAppliedRules] = useState<Set<string>>(new Set());
  // ============================
  // NOTE 11-27-2025:
  // State for tracking applied comments and redlines (for the Apply button)
  // ============================
  const [appliedComments, setAppliedComments] = useState<Set<string>>(new Set());
  const [appliedRedlines, setAppliedRedlines] = useState<Set<string>>(new Set());
  const [isChangesRequiredExpanded, setIsChangesRequiredExpanded] = useState(true);
  const [isNoChangesNeededExpanded, setIsNoChangesNeededExpanded] = useState(true);
  const [isNoApplicableContentExpanded, setIsNoApplicableContentExpanded] = useState(true);  

  // ===========================================================================
  // NOTE 11-27-2025:
  // Added tab state and refs for cross-tab navigation
  // ===========================================================================

  const [activeTab, setActiveTab] = useState<'rules' | 'changes'>('rules');
  const ruleRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // ===========================================================================
  // NOTE 11-27-2025:
  // MOved tab styling variables from Tabs.tsx
  // ===========================================================================
  const activeTabStyle: React.CSSProperties = {
    backgroundColor: "white",
    padding: "4px",
    fontWeight: 700,
    boxShadow: "rgba(0, 0, 0, 0.12) 3px 2px 5px",
    flex: 1,
  };

  const inactiveTabStyle: React.CSSProperties = {
    flex: 1,
    padding: "4px",
  };

  const buttonRef = useRef<HTMLButtonElement>(null);
  const positioningRef = useRef<PositioningImperativeRef>(null);
  
  React.useEffect(() => {
    if (buttonRef.current) {
      positioningRef.current?.setTarget(buttonRef.current);
    }
  }, [buttonRef, positioningRef]);

  
  // =========================================================================================
  // NOTE 11-27-2025:
  // Removed the obsolete function extractSectionsForAmendment which is relating to an old API
  // =========================================================================================
  
  // // Helper function to extract sections for amendment
  // function extractSectionsForAmendment(annotatedOutline: any[]): any[] {
  //   const sections: any[] = [];

  //   function traverse(nodes: any[], parentPath: string[] = []) {
  //     for (const node of nodes) {
  //       if (node.rules && node.rules.length > 0) {
  //         let sectionText: string = node.text || "";
  //         if (node.additionalParagraphs && node.additionalParagraphs.length > 0) {
  //           sectionText = sectionText + "\r" + node.additionalParagraphs.join("\r");
  //         }
  //         sections.push({
  //           sectionNumber: node.sectionNumber || "Unknown",
  //           text: sectionText,
  //           lockedParents: parentPath,
  //           rules: node.rules,
  //         });
  //       }
  //       if (node.children && node.children.length > 0) {
  //         traverse(node.children, [...parentPath, node.sectionNumber || ""]);
  //       }
  //     }
  //   }

  //   traverse(annotatedOutline);
  //   return sections;
  // }

  // =========================================================================================
  // NOTE 11-27-2025:
  // Removed the obsolete function formatResultsForUI which is relating to an old API
  // =========================================================================================

  // // Format results for UI
  // function formatResultsForUI(
  //   amendmentResults: any[],
  //   ruleStatus: any[],
  //   selectedRules: any[],
  //   annotatedOutline: any[]
  // ): { [key: string]: RuleResult[] } {
  //   const formatted: { [key: string]: RuleResult[] } = {};

  //   function findSectionInOutline(nodes: any[], sectionNum: string): any {
  //     for (const node of nodes) {
  //       if (node.sectionNumber === sectionNum) {
  //         return node;
  //       }
  //       if (node.children && node.children.length > 0) {
  //         const found = findSectionInOutline(node.children, sectionNum);
  //         if (found) return found;
  //       }
  //     }
  //     return null;
  //   }

  //   // Process successful amendments
  //   for (const result of amendmentResults) {
  //     if (result.success && result.result?.amendment) {
  //       const amendment = result.result.amendment;
  //       for (const ruleId of amendment.appliedRules) {
  //         if (!formatted[ruleId]) {
  //           formatted[ruleId] = [];
  //         }
  //         formatted[ruleId].push({
  //           status: "amended",
  //           original_language: amendment.original,
  //           amended_language: amendment.amended,
  //           section_number: result.sectionNumber,
  //         });
  //       }
  //     }
  //   }

  //   // Process rules that weren't found / not applicable
  //   for (const status of ruleStatus) {
  //     if (status.status === "not_applicable") {
  //       formatted[status.ruleId] = [
  //         {
  //           status: "not-found",
  //           section_number: "NOT FOUND",
  //           original_language:
  //             "The relevant language cannot be found. Please consider whether similar language should be added to your agreement.",
  //         },
  //       ];
  //     } else if (status.status === "applied") {
  //       const hasAmendment = const hasAmendment = amendmentResults.some(
  //         (r) => r.success && r.result?.amendment?.appliedRules.includes(status.ruleId)
  //       );
  //       
  //       if (!hasAmendment) {
  //         if (!formatted[status.ruleId]) {
  //           formatted[status.ruleId] = [];
  //         }
  //         const sectionNumber = status.locations?.[0] || "Unknown";
  //         const section = findSectionInOutline(annotatedOutline, sectionNumber);
  //         const sectionText = section ? section.text : "Section text not available.";

  //         formatted[status.ruleId].push({
  //           status: "not-amended",
  //           section_number: sectionNumber,
  //           original_language: sectionText,
  //         });
  //       }
  //     }
  //   }

  //   // Ensure all selected rules have a result
  //   for (const rule of selectedRules) {
  //     if (!formatted[rule.rule_number]) {
  //       formatted[rule.rule_number] = [
  //         {
  //           status: "not-found",
  //           section_number: "NOT FOUND",
  //           original_language: "The relevant language cannot be found.",
  //         },
  //       ];
  //     }
  //   }

  //   return formatted;
  // }

  // Handle running all selected rules
  const handleRunAllRules = async () => {
    setIsRunningAll(true);
    setRuleResults({});
    setRuleLoadingStates({});

    try {
      const selectedRuleNumbers = Object.keys(selectedRules).filter(
        (key) => selectedRules[key]
      );
      if (selectedRuleNumbers.length === 0) {
        toast({
          title: "No Rules Selected",
          description: "Please select at least one rule to run.",
        });
        setIsRunningAll(false);
        return;
      }

      // Start loading for selected rules
      const initialLoadingStates: { [key: string]: boolean } = {};
      selectedRuleNumbers.forEach((rule) => {
        initialLoadingStates[rule] = true;
      });
      setRuleLoadingStates(initialLoadingStates);

      // Get selected CA rules
      const selectedCARules = amendmentRules.filter((r) =>
        selectedRuleNumbers.includes(r.rule_number)
      );

      // Get selected IR rules  
      const selectedIRRules = instructionRules.filter((r) =>
        selectedRuleNumbers.includes(r.rule_number)
      );

      // Combine for API call
      const selectedRulesObj = [...selectedCARules, ...selectedIRRules];

      // ========================================================================================================
      // NOTE 11-27-2025:
      // The APIs have been consolidated at the backend. Only one unified endpoint reviewWithPlaybooks is needed.
      // ========================================================================================================

      const parsed = await Word.run(async (context) => {
        return await parseDocumentWithRanges(context);
      });
      const structure = parsed.structure;
      const removeParentRefs = (nodes: any[]): any[] => {
        return nodes.map(node => {
          const { parent, ...rest } = node;
          return {
            ...rest,
            children: node.children ? removeParentRefs(node.children) : []
          };
        });
      };
      const cleanStructure = removeParentRefs(structure);
      const { formattedResults } = await backendApi.reviewWithPlaybooks({
        structure: cleanStructure,
        rules: selectedRulesObj.map(rule => ({
          id: rule.rule_number,
          content: rule.instruction,
          example: rule.example_language || ''
        }))
      });

      // // STEP 1: Get document content
      // const content = await getContent();

      // // STEP 2: Parse document structure
      // const outline = await parseDocument();

      // // STEP 3: Map rules to document (PARALLEL!)
      // const mappingResult = await backendApi.mapRulesParallel(
      //   outline,
      //   selectedRulesObj.map((rule) => ({
      //     id: rule.rule_number,
      //     content: rule.instruction,
      //     example: rule.example_language || "",
      //   })),
      //   10, // batch size
      //   3 // max concurrent batches
      // );

      // // STEP 4: Identify which sections need amendments
      // const sectionsToAmend = extractSectionsForAmendment(mappingResult.annotatedOutline);

      // // STEP 5: Generate amendments (PARALLEL!)
      // let amendmentResults = [];
      // if (sectionsToAmend.length > 0) {
      //   amendmentResults = await backendApi.generateAmendmentsParallel(
      //     sectionsToAmend,
      //     selectedRulesObj,
      //     3, // max concurrent
      //     (completed, total) => {
      //       console.log(`Progress: ${completed}/${total} sections`);
      //     }
      //   );

      //   // Clean up prefixes from amendment results
      //   const removePrefix = (str: string, prefix: string) => {
      //     return str.startsWith(prefix) ? str.slice(prefix.length) : str;
      //   };

      //   for (const amndmnt of amendmentResults) {
      //     if (amndmnt.success && amndmnt.result.amendment) {
      //       let prefix = "Section " + amndmnt.sectionNumber + ":\n";
      //       amndmnt.result.amendment.original = removePrefix(
      //         amndmnt.result.amendment.original,
      //         prefix
      //       );
      //       amndmnt.result.amendment.amended = removePrefix(
      //         amndmnt.result.amendment.amended,
      //         prefix
      //       );

      //       prefix = "Section " + amndmnt.sectionNumber + ": ";
      //       amndmnt.result.amendment.original = removePrefix(
      //         amndmnt.result.amendment.original,
      //         prefix
      //       );
      //       amndmnt.result.amendment.amended = removePrefix(
      //         amndmnt.result.amendment.amended,
      //         prefix
      //       );

      //       prefix = "Section " + amndmnt.sectionNumber + ":";
      //       amndmnt.result.amendment.original = removePrefix(
      //         amndmnt.result.amendment.original,
      //         prefix
      //       );
      //       amndmnt.result.amendment.amended = removePrefix(
      //         amndmnt.result.amendment.amended,
      //         prefix
      //       );

      //       prefix = amndmnt.sectionNumber + ":";
      //       amndmnt.result.amendment.original = removePrefix(
      //         amndmnt.result.amendment.original,
      //         prefix
      //       );
      //       amndmnt.result.amendment.amended = removePrefix(
      //         amndmnt.result.amendment.amended,
      //         prefix
      //       );
      //     }
      //   }
      // }

      // // STEP 6: Format results for UI
      // const formattedResults = formatResultsForUI(
      //   amendmentResults,
      //   mappingResult.ruleStatus,
      //   selectedRulesObj,
      //   mappingResult.annotatedOutline
      // );

      // Update UI with results
      setRuleResults(formattedResults || {});
      setRuleLoadingStates({});
      setIsRunningAll(false);
      setHasRunSelectedRules(true);

    } catch (error) {
      console.error("Error running rules:", error);
      toast({
        title: "Error Running Rules",
        description: "An error occurred while processing the rules. Please try again.",
      });
      setIsRunningAll(false);
      setRuleLoadingStates({});
    }
  };

  // Group CA rules by their result status
  const groupedRules = React.useMemo(() => {
    const groups = {
      "changes-required": [] as Array<{ rule: RuleType; results: RuleResult[]; index: number }>,
      "no-changes-needed": [] as Array<{ rule: RuleType; results: RuleResult[]; index: number }>,
      "no-applicable-content": [] as Array<{ rule: RuleType; results: RuleResult[]; index: number }>,
    };

    amendmentRules.forEach((rule, originalIndex) => {
      const results = ruleResults[rule.rule_number] || [];
      if (results.length === 0) return; // Skip rules without results
      
      // ===========================================
      // NOTE 11-27-2025:
      // Need to add "new-section" due to backend change
      // =========================================== 

      // Check if any result has "amended" status
      const hasChanges = results.some(
        (result) => result.status === "amended" || result.status === "new-section"
      );
      // Check if any result has "not-found" status
      const hasNotFound = results.some((result) => result.status === "not-found");
      // Check if all results have "not-amended" status
      const allNotAmended =
        results.length > 0 && results.every((result) => result.status === "not-amended");

      if (hasChanges) {
        groups["changes-required"].push({
          rule,
          results,
          index: originalIndex,
        });
      } else if (hasNotFound) {
        groups["no-applicable-content"].push({
          rule,
          results,
          index: originalIndex,
        });
      } else if (allNotAmended) {
        groups["no-changes-needed"].push({
          rule,
          results,
          index: originalIndex,
        });
      }
    });

    return groups;
  }, [amendmentRules, ruleResults]);

  // Group IR rules by their result status
  const groupedIRRules = React.useMemo(() => {
    const groups = {
      "instruction-requests": [] as Array<{ rule: RuleType; results: RuleResult[]; index: number }>,
      "no-applicable-content": [] as Array<{ rule: RuleType; results: RuleResult[]; index: number }>,
    };

    instructionRules.forEach((rule, originalIndex) => {
      const results = ruleResults[rule.rule_number] || [];
      if (results.length === 0) return;

      const hasInstructionRequest = results.some(
        (result) => result.status === "instruction-request"
      );
      const hasNotFound = results.some((result) => result.status === "not-found");

      if (hasInstructionRequest) {
        groups["instruction-requests"].push({
          rule,
          results,
          index: originalIndex,
        });
      } else if (hasNotFound) {
        groups["no-applicable-content"].push({
          rule,
          results,
          index: originalIndex,
        });
      }
    });

    return groups;
  }, [instructionRules, ruleResults]);

  // ===========================================================================
  // NOTE 11-27-2025:
  // Transform rule-centric data to section-centric data for the "Changes" tab
  // ===========================================================================
  const sectionChanges = useMemo(() => {
    const sections: { [sectionNumber: string]: SectionChange } = {};

    Object.entries(ruleResults).forEach(([ruleId, results]) => {
      results.forEach((result) => {
        if (result.status === 'amended' || result.status === 'new-section') {
          const sectionNum = result.section_number;
          
          if (!sections[sectionNum]) {
            sections[sectionNum] = {
              sectionNumber: sectionNum,
              original_language: result.original_language || '',
              amended_language: result.amended_language || '',
              status: result.status,
              appliedRules: [ruleId],
              isFullDeletion: result.isFullDeletion,
            };
          } else {
            if (!sections[sectionNum].appliedRules.includes(ruleId)) {
              sections[sectionNum].appliedRules.push(ruleId);
            }
          }
        }
      });
    });

    return Object.values(sections).sort((a, b) => 
      compareSectionNumbers(a.sectionNumber, b.sectionNumber)
    );
  }, [ruleResults]);

  // ===========================================================================
  // NOTE 11-27-2025:
  // Cross-tab navigation functions
  // ===========================================================================

  const navigateToSection = (sectionNumber: string) => {
    setActiveTab('changes');
    setTimeout(() => {
      const sectionElement = sectionRefs.current[sectionNumber];
      if (sectionElement) {
        sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        sectionElement.style.boxShadow = '0 0 10px 2px #4f8bd4';
        setTimeout(() => {
          sectionElement.style.boxShadow = '';
        }, 2000);
      }
    }, 100);
  };

  const navigateToRule = (ruleId: string) => {
    setActiveTab('rules');
    
    // Find which category contains this rule and expand it
    const isInChangesRequired = groupedRules["changes-required"]?.some(
      ({ rule }) => rule.rule_number === ruleId
    );
    const isInNoChangesNeeded = groupedRules["no-changes-needed"]?.some(
      ({ rule }) => rule.rule_number === ruleId
    );
    const isInNoApplicableContent = groupedRules["no-applicable-content"]?.some(
      ({ rule }) => rule.rule_number === ruleId
    );

    if (isInChangesRequired) {
      setIsChangesRequiredExpanded(true);
    } else if (isInNoChangesNeeded) {
      setIsNoChangesNeededExpanded(true);
    } else if (isInNoApplicableContent) {
      setIsNoApplicableContentExpanded(true);
    }

    const scrollToRule = (retryCount = 0) => {
      const ruleElement = ruleRefs.current[ruleId];
      if (ruleElement) {
        ruleElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        ruleElement.style.boxShadow = '0 0 10px 2px #4f8bd4';
        setTimeout(() => {
          ruleElement.style.boxShadow = '';
        }, 2000);
      } else if (retryCount < 5) {
        setTimeout(() => scrollToRule(retryCount + 1), 100 * (retryCount + 1));
      } else {
        console.warn(`Could not find rule element for ruleId: ${ruleId}`);
      }
    };
    setTimeout(() => scrollToRule(0), 200);
  };

  const getSectionsForRule = (ruleId: string): string[] => {
    const results = ruleResults[ruleId] || [];
    return results
      .filter(r => r.status === 'amended' || r.status === 'new-section')
      .map(r => r.section_number);
  };

  // ============================
  // NOTE 11-27-2025:
  // Helper to create unique key for tracking applied state (for the Apply button)
  // ============================
  const getAmendmentKey = (original?: string, amended?: string): string => {
    return `${original || ''}::${amended || ''}`;
  };

  // Function to count applied rules for a category
  const getAppliedCount = (rules: Array<{ rule: RuleType; results: RuleResult[]; index: number }>) => {
    return rules.filter(({ rule }) => {
      const ruleId = rule.rule_number.toString();
      return (
        appliedRules.has(`trackChanges-${ruleId}`) ||
        appliedRules.has(`both-${ruleId}`) ||
        appliedRules.has(`comment-${ruleId}`)
      );
    }).length;
  };

  // Helper functions for results display
  const handleWhyClick = async (rule: RuleType, contract_language: string) => {
    setWhyLoadingStates((prev) => ({ ...prev, [rule.rule_number]: true }));

    const response = await backendApi.explainUnappliedRule({
      sectionText: contract_language,
      rule: {
        id: rule.rule_number,
        content: rule.instruction,
        example: rule.example_language,
      },
    });
    const result = response.explanation;

    setRuleResults((prev) => {
      const merged: { [key: string]: RuleResult[] } = { ...prev };
      const targetResults = merged[rule.rule_number].map((ruleResult) => {
        let r = ruleResult;
        if (
          ruleResult.status === "not-amended" &&
          ruleResult.original_language === contract_language
        ) {
          r.whyText = result;
        }
        return r;
      });

      merged[rule.rule_number] = targetResults;
      return merged;
    });

    setShowWhyResults((prev) => ({ ...prev, [rule.rule_number]: true }));
    setWhyLoadingStates((prev) => ({ ...prev, [rule.rule_number]: false }));
  };

  const handleLocateText = async (text: string) => {
    try {
      // Use the existing getTextRange utility to locate text in the document
      return await (window as any).Word.run(async (context: any) => {
        let targetRange = await getTextRange(context, text);
        if (!targetRange) {
          targetRange = await getTextRangeAcrossParagraphs(context, text);
        }
        if (targetRange) {
          targetRange.select();
        } else {
          throw new Error(`Unable to locate text: ${JSON.stringify(text)}`);
        }
      });
    } catch (error) {
      console.error("Error locating text:", error);
      toast({
        title: "Text Not Found",
        description: "The specified text could not be found in the document.",
      });
    }
  };

  const handleDeleteResult = (ruleId: string | number, result: RuleResult) => {
    setRuleResults((prev) => {
      const ruleIdStr = ruleId.toString();
      const currentResults = prev[ruleIdStr] || [];
      
      if (currentResults.length === 0) {
        // No results to delete
        return prev;
      }
      
      // Find and remove the matching result by comparing properties
      // Keep results that DON'T match (i.e., filter out the matching one)
      const updatedResults = currentResults.filter((r) => {
        // Match by section_number (required field)
        if (r.section_number !== result.section_number) return true;
        
        // Match by status (required field)
        if (r.status !== result.status) return true;
        
        // Match by original_language if both exist
        if (result.original_language && r.original_language) {
          if (r.original_language !== result.original_language) return true;
        }
        
        // Match by amended_language if both exist
        if (result.amended_language && r.amended_language) {
          if (r.amended_language !== result.amended_language) return true;
        }
        
        // If all properties match, this is the one to delete - filter it out
        return false;
      });
      
      if (updatedResults.length === 0) {
        // Remove the entire rule entry if no results remain
        const { [ruleIdStr]: removed, ...rest } = prev;
        return rest;
      }
      
      // Return new state with updated results array
      return {
        ...prev,
        [ruleIdStr]: updatedResults,
      };
    });
  };

  const isSameRuleResult = (a: RuleResult, b: RuleResult): boolean => {
    if (a.section_number !== b.section_number) return false;
    if (a.status !== b.status) return false;
    if ((a.original_language || "") !== (b.original_language || "")) return false;
    if ((a.amended_language || "") !== (b.amended_language || "")) return false;
    return true;
  };

  const handleEditResult = (
    ruleId: string | number,
    target: RuleResult,
    updated: Partial<RuleResult>
  ) => {
    const ruleIdStr = ruleId.toString();
    setRuleResults((prev) => {
      const currentResults = prev[ruleIdStr] || [];
      if (currentResults.length === 0) return prev;

      const nextResults = currentResults.map((r) => {
        if (!isSameRuleResult(r, target)) return r;
        return { ...r, ...updated };
      });

      return {
        ...prev,
        [ruleIdStr]: nextResults,
      };
    });
  };

  const handleDeleteSection = (sectionNumber: string) => {
    setRuleResults((prev) => {
      const next: { [key: string]: RuleResult[] } = {};
      for (const [ruleId, results] of Object.entries(prev)) {
        const filtered = (results || []).filter((r) => r.section_number !== sectionNumber);
        if (filtered.length > 0) next[ruleId] = filtered;
      }
      return next;
    });
  };

  const handleEditSection = (sectionNumber: string, amendedLanguage: string) => {
    setRuleResults((prev) => {
      const next: { [key: string]: RuleResult[] } = {};
      for (const [ruleId, results] of Object.entries(prev)) {
        next[ruleId] = (results || []).map((r) => {
          if (r.section_number !== sectionNumber) return r;
          // Only update if this result actually has an amended_language field
          if (typeof r.amended_language === "undefined") return r;
          return { ...r, amended_language: amendedLanguage };
        });
      }
      return next;
    });
  };

  const handleApplyTrackChanges = async (result: RuleResult, ruleId: string | number) => {
    const changeKey = `${ruleId}-track`;
    const ruleIdStr = ruleId.toString();
    
    // // Check if rule is already applied to prevent duplicate counting
    // if (appliedRules.has(`track-${ruleIdStr}`) || 
    //     appliedRules.has(`both-${ruleIdStr}`) || 
    //     appliedRules.has(`comment-${ruleIdStr}`)) {
    //   return;
    // }
    
    if (!result.original_language || !result.amended_language) {
      toast({
        title: "Error",
        description: "Missing original or amended language for track changes.",
      });
      return;
    }

    setIsApplyingTrackChanges((prev) => ({ ...prev, [changeKey]: true }));

    try {

      // ===========================================================================
      // NOTE 11-27-2025:
      // Backend change - Added handling for full section deletions 
      // ===========================================================================
      
      if (result.isFullDeletion) {
        await (window as any).Word.run(async (context: any) => {
          let targetRange = await getTextRange(context, result.original_language!);
          if (!targetRange) {
            targetRange = await getTextRangeAcrossParagraphs(context, result.original_language!);
          }
          if (!targetRange) {
            throw new Error("Unable to locate text for deletion");
          }
          
          targetRange.insertText("[INTENTIONALLY DELETED]", "Replace");
          await context.sync();
        });

        setAppliedRules((prev) => new Set([...Array.from(prev), `track-${ruleIdStr}`]));
        // ============================
        // NOTE 11-27-2025:
        // Track redlines applied state (for the Apply button)
        // ============================
        const amendmentKey = getAmendmentKey(result.original_language, result.amended_language);
        setAppliedRedlines(prev => new Set(prev).add(amendmentKey));
        setIsApplyingTrackChanges((prev) => ({ ...prev, [changeKey]: false }));
        return;
      }

      // ===========================================================================
      // NOTE 11-27-2025:
      // Backend change - Added handling for new section insertion 
      // ===========================================================================

      if (result.status === "new-section") {
        await Word.run(async (context) => {
          let targetRange = await getTextRange(context, result.original_language!);
          if (!targetRange) {
            targetRange = await getTextRangeAcrossParagraphs(context, result.original_language);
          }
          if (!targetRange) {
            throw new Error("Unable to locate previous section");
          }
          
          const targetRangeParagraphs = targetRange.paragraphs;
          targetRangeParagraphs.load("items");
          await context.sync();
          const endRange = targetRangeParagraphs.getLast().getRange("After");
          const insertedRange = endRange.insertText(result.amended_language + "\n", "After");
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
        
        setAppliedRules((prev) => new Set([...Array.from(prev), `track-${ruleIdStr}`]));
        // ============================
        // NOTE 11-27-2025:
        // Track redlines applied state (for the Apply button)
        // ============================
        const amendmentKey = getAmendmentKey(result.original_language, result.amended_language);
        setAppliedRedlines(prev => new Set(prev).add(amendmentKey));
        setIsApplyingTrackChanges((prev) => ({ ...prev, [changeKey]: false }));
        return;
      }

      // Regular amendment - create diff proposal
      const proposal = createParagraphDiffProposal(
        result.original_language,
        result.amended_language
      );

      if (!proposal.isValid || !proposal.hasChanges) {
        toast({
          title: "No Changes",
          description: "No differences found between original and amended text.",
        });
        return;
      }

      await handleLocateText(result.original_language);

      // ===============================================================================================
      // NOTE 11-27-2025:
      // Pass isNewSection flag to handle automatic list numbering
      // ===============================================================================================

      const isNewSection = result.section_number.toLowerCase().startsWith("after section");
      const success = await applyWordLevelTrackChanges(proposal, result.original_language);

      if (!success) {
        toast({
          title: "Error",
          description: "Failed to apply track changes to the document.",
        });
      } else {
        setAppliedRules((prev) => new Set([...Array.from(prev), `track-${ruleIdStr}`]));
        // ============================
        // NOTE 11-27-2025:
        // Track redlines applied state (for the Apply button)
        // ============================
        const amendmentKey = getAmendmentKey(result.original_language, result.amended_language);
        setAppliedRedlines(prev => new Set(prev).add(amendmentKey));
      }
    } catch (error) {
      console.error("Error applying track changes:", error);
      toast({
        title: "Error Applying Track Changes",
        description: `An error occurred: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsApplyingTrackChanges((prev) => ({ ...prev, [changeKey]: false }));
    }
  };

  const handleApplyCommentsOnly = async (
    result: RuleResult,
    rule: RuleType, 
    ruleId: string | number
) => {
    const ruleIdStr = ruleId.toString();
    
    // // Check if rule is already applied to prevent duplicate counting
    // if (appliedRules.has(`track-${ruleIdStr}`) || 
    //     appliedRules.has(`both-${ruleIdStr}`) || 
    //     appliedRules.has(`comment-${ruleIdStr}`)) {
    //   return;
    // }
    
    try {

      // ===============================================================================================
      // NOTE 11-27-2025:
      // Locate the contract text (original_language) not the example language
      // ===============================================================================================  

      await handleLocateText(result.original_language || "");
      await addComment(
        `Instruction: ${rule.instruction}\n\nExample language: ${rule.example_language}`
      );
      setAppliedRules((prev) => new Set([...Array.from(prev), `comment-${ruleIdStr}`]));
      // ============================
      // NOTE 11-27-2025:
      // Track comments applied state (for the Apply button)
      // ============================
      const amendmentKey = getAmendmentKey(result.original_language, result.amended_language);
      setAppliedComments(prev => new Set(prev).add(amendmentKey));
    } catch (error) {
      console.error("Error applying comment:", error);
      toast({
        title: "Error Applying Comment",
        description: `An error occurred: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  };

  const handleApplyBothChangesAndComments = async (
    result: RuleResult,
    rule: RuleType,
    ruleId: string | number
  ) => {
    const changeKey = `${ruleId}-both`;
    const ruleIdStr = ruleId.toString();
    
    // // Check if rule is already applied to prevent duplicate counting
    // if (appliedRules.has(`track-${ruleIdStr}`) || 
    //     appliedRules.has(`both-${ruleIdStr}`) || 
    //     appliedRules.has(`comment-${ruleIdStr}`)) {
    //   return;
    // }
    
    if (!result.original_language || !result.amended_language) {
      toast({
        title: "Error",
        description: "Missing original or amended language for applying changes.",
      });
      return;
    }

    setIsApplyingBoth((prev) => ({ ...prev, [changeKey]: true }));

    try {
      const proposal = createParagraphDiffProposal(
        result.original_language,
        result.amended_language
      );

      if (!proposal.isValid || !proposal.hasChanges) {
        toast({
          title: "No Changes",
          description: "No differences found between original and amended text.",
        });
        return;
      }

      await handleLocateText(result.original_language);
      await addComment(
        `Instruction: ${rule.instruction}\n\nExample language: ${rule.example_language}`
      );

      // ===============================================================================================
      // NOTE 11-27-2025:
      // Pass isNewSection flag to handle automatic list numbering
      // ===============================================================================================

      const isNewSection = result.section_number.toLowerCase().startsWith("after section");
      const trackChangesSuccess = await applyWordLevelTrackChanges(
        proposal,
        result.original_language
      );

      if (!trackChangesSuccess) {
        throw new Error("Failed to apply track changes");
      }

      setAppliedRules((prev) => new Set([...Array.from(prev), `both-${ruleIdStr}`]));
      // ============================
      // NOTE 11-27-2025:
      // Track both comments and redlines applied state (for the Apply button)
      // ============================
      const amendmentKey = getAmendmentKey(result.original_language, result.amended_language);
      setAppliedComments(prev => new Set(prev).add(amendmentKey));
      setAppliedRedlines(prev => new Set(prev).add(amendmentKey));
    } catch (error) {
      console.error("Error applying both changes and comments:", error);
      toast({
        title: "Error Applying Changes",
        description: `An error occurred: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsApplyingBoth((prev) => ({ ...prev, [changeKey]: false }));
    }
  };

  const handleUpdateIssue = (ruleId: string, resultIndex: number, newIssue: string) => {
    setRuleResults((prev) => {
      const updated = { ...prev };
      if (updated[ruleId] && updated[ruleId][resultIndex]) {
        updated[ruleId] = [...updated[ruleId]];
        updated[ruleId][resultIndex] = {
          ...updated[ruleId][resultIndex],
          issue: newIssue,
        };
      }
      return updated;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "amended":
        return (
          <div title="Amended">
            <CheckCircle style={{ height: "16px", width: "16px", color: "#3b82f6" }} />
          </div>
        );
      case "not-amended":
        return (
          <div title="Did not amend">
            <CheckCircle style={{ height: "16px", width: "16px", color: "#22c55e" }} />
          </div>
        );
      case "not-found":
        return (
          <div title="Language not found">
            <AlertCircle style={{ height: "16px", width: "16px", color: "#eab308" }} />
          </div>
        );
      default:
        return null;
    }
  };

  const buttonContent = isRunningAll
    ? "Running"
    : hasRunSelectedRules
    ? "Run successfully"
    : "Run Rules";

  const buttonIcon = isRunningAll ? (
    <Spinner size="tiny" />
  ) : hasRunSelectedRules ? (
    <CheckmarkFilled />
  ) : null;

  const Info: React.FC<InfoProps> = ({ bgColor, content, borderColor, iconColor }) => {
    return (
      <div
        className={styles.alert}
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
          padding: "10px",
          marginBottom: "10px",
        }}
      >
        <IoIosInformationCircle
          className={styles.infoIcon}
          style={{
            color: iconColor,
          }}
        />
        <span className={styles.alertDescription}>{content}</span>
      </div>
    );
  };

  // Show message if no playbook is loaded
  if (!playbook) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p style={{ color: "#666", fontSize: "14px" }}>
          No playbook loaded. Please select a playbook from the Library page.
        </p>
      </div>
    );
  }

  return (
    <div>
      {!hasRunSelectedRules ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBlock: "12px",
            }}
          >
            <label style={{ display: "flex", alignItems: "center" }}>
              <Checkbox
                className={styles.checkbox}
                checked={selectAll}
                onChange={(_, data) => {
                  const checked = Boolean(data?.checked);
                  setSelectAll(checked);
                  const newSelectedRules: { [key: string]: boolean } = {};
                  allRules.forEach((rule) => {
                    newSelectedRules[rule.rule_number] = checked;
                  });
                  setSelectedRules(newSelectedRules);
                }}
              />
              <span style={{ fontSize: "14px", fontWeight: "500" }}>Select all rules</span>
            </label>

            <Button
              appearance="primary"
              style={{
                background: "var(--brand-gradient)",
                border: "none",
                color: "var(--text-on-brand)",
                padding: "7px 12px",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 500,
              }}
              disabled={isRunningAll}
              icon={buttonIcon}
              onClick={handleRunAllRules}
            >
              {buttonContent}
          </Button>
          </div>
          <Divider style={{ marginBottom: "12px" }} />

          {/* Box 1: Rules for Contract Amendments */}
          {amendmentRules.length > 0 && (
            <div
              style={{
                border: "1px solid #80808033",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "16px",
              }}
            >
              <Info
                bgColor="#64dde63c"
                borderColor="#25D2DF"
                content="These rules are to be used for contract amendments."
                iconColor="#25D2DF"
              />
              <div style={{ marginTop: "12px" }}>
                {amendmentRules.map((rule, index) => (
                  <div
                    key={`Amendments-${rule.rule_number}`}
                    style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "12px" }}
                  >
                    {ruleLoadingStates[rule.rule_number] ? (
                      <div style={{ 
                        marginTop: "4px", 
                        flexShrink: 0, 
                        width: "20px", 
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <Loader2
                          style={{ width: "16px", height: "16px", color: "#0F62FE" }}
                          className={styles.animateSpin}
                        />
                      </div>
                    ) : (
                      <Checkbox
                        className={styles.checkbox}
                        checked={selectedRules[rule.rule_number] || false}
                        onChange={(_, data) => {
                          setSelectedRules((prev) => ({
                            ...prev,
                            [rule.rule_number]: Boolean(data?.checked),
                          }));
                          const newState = {
                            ...selectedRules,
                            [rule.rule_number]: Boolean(data?.checked),
                          };
                          const allSelected = allRules.every((r) => newState[r.rule_number]);
                          setSelectAll(allSelected);
                        }}
                        style={{ marginTop: "4px", flexShrink: 0 }}
                        disabled={isRunningAll}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <RuleCard
                        index={index}
                        briefName={rule.brief_name}
                        instruction={rule.instruction}
                        example={rule.example_language}
                        hideExpandIcon={true}
                        hidePlayIcon={true}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Box 2: Rules for Instruction Requests (separate box) */}
          {instructionRules.length > 0 && (
            <div
              style={{
                border: "1px solid #80808033",
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              <p
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  marginTop: 0,
                  marginBottom: "12px",
                }}
              >
                Rules for Instruction Requests
              </p>
              <Info
                bgColor="#64dde63c"
                borderColor="#25D2DF"
                content="Pursuant to these rules, you need to confirm the contract clauses with relevant parties."
                iconColor="#25D2DF"
              />
              <div style={{ marginTop: "12px" }}>
                {instructionRules.map((rule, index) => (
                  <div
                    key={`Instructions-${rule.rule_number}`}
                    style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "12px" }}
                  >
                    {ruleLoadingStates[rule.rule_number] ? (
                      <div style={{ 
                        marginTop: "4px", 
                        flexShrink: 0, 
                        width: "20px", 
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <Loader2
                          style={{ width: "16px", height: "16px", color: "#0F62FE" }}
                          className={styles.animateSpin}
                        />
                      </div>
                    ) : (
                      <Checkbox
                        className={styles.checkbox}
                        checked={selectedRules[rule.rule_number] || false}
                        onChange={(_, data) => {
                          setSelectedRules((prev) => ({
                            ...prev,
                            [rule.rule_number]: Boolean(data?.checked),
                          }));
                          const newState = {
                            ...selectedRules,
                            [rule.rule_number]: Boolean(data?.checked),
                          };
                          const allSelected = allRules.every((r) => newState[r.rule_number]);
                          setSelectAll(allSelected);
                        }}
                        style={{ marginTop: "4px", flexShrink: 0 }}
                        disabled={isRunningAll}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <RuleCard
                        index={index}
                        briefName={rule.brief_name}
                        instruction={rule.instruction}
                        example={rule.example_language}
                        hideExpandIcon={true}
                        hidePlayIcon={true}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (

        // ===========================================================================
        // NOTE 11-27-2025:
        // After rules are run: show TabList with Rules/Changes tabs
        // ===========================================================================
        <>
          <p
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              marginTop: 0,
              marginBottom: "12px",
            }}
          >
            Rules for Contract Amendments
          </p>
          <TabList
            selectedValue={activeTab}
            onTabSelect={(_, data) => setActiveTab(data.value as 'rules' | 'changes')}
            style={{
              backgroundColor: "#FAFAFA",
              border: "1px solid #BBBBBB",
              width: "100%",
              display: "flex",
              borderRadius: "5px",
              marginBottom: "12px",
            }}
          >
            <Tab
              value="rules"
              style={activeTab === "rules" ? activeTabStyle : inactiveTabStyle}
            >
              <span style={{ fontWeight: 700 }}>Rules</span>
            </Tab>
            <Tab
              value="changes"
              style={activeTab === "changes" ? activeTabStyle : inactiveTabStyle}
            >
              <span style={{ fontWeight: 700 }}>Changes</span>
            </Tab>
          </TabList>

          {/* Rules Tab Content */}
          {activeTab === 'rules' && (
        <PlaybookResults
          groupedRules={groupedRules}
          groupedIRRules={groupedIRRules}
          isChangesRequiredExpanded={isChangesRequiredExpanded}
          isNoChangesNeededExpanded={isNoChangesNeededExpanded}
          isNoApplicableContentExpanded={isNoApplicableContentExpanded}
          setIsChangesRequiredExpanded={setIsChangesRequiredExpanded}
          setIsNoChangesNeededExpanded={setIsNoChangesNeededExpanded}
          setIsNoApplicableContentExpanded={setIsNoApplicableContentExpanded}
          ruleLoadingStates={ruleLoadingStates}
          whyLoadingStates={whyLoadingStates}
          isApplyingTrackChanges={isApplyingTrackChanges}
          isApplyingBoth={isApplyingBoth}
          showWhyResults={showWhyResults}
          onApplyTrackChanges={handleApplyTrackChanges}
          onApplyBothChangesAndComments={handleApplyBothChangesAndComments}
          onApplyCommentsOnly={handleApplyCommentsOnly}
          onLocateText={handleLocateText}
          onAddComment={addComment}
          onWhyClick={handleWhyClick}
          onDeleteResult={handleDeleteResult}
          onUpdateIssue={handleUpdateIssue}
          getStatusIcon={getStatusIcon}
          buttonRef={buttonRef}
          positioningRef={positioningRef}
          getAppliedCount={getAppliedCount}
          // ===============================================================================================
          // NOTE 11-27-2025:
          // Pass props for cross-tab navigation from Rules tab to Changes tab
          // ===============================================================================================
          onNavigateToSection={navigateToSection}
          getSectionsForRule={getSectionsForRule}
          ruleRefs={ruleRefs}
          // ============================
          // NOTE 11-27-2025:
          // Pass applied state tracking props (for the Apply button)
          // ============================
          appliedComments={appliedComments}
          appliedRedlines={appliedRedlines}
        />
      )}

      {/* Changes Tab Content */}
          {activeTab === 'changes' && (
            <ChangesTabContent
              sectionChanges={sectionChanges}
              isApplyingTrackChanges={isApplyingTrackChanges}
              isApplyingBoth={isApplyingBoth}
              onLocateText={handleLocateText}
              onApplyTrackChanges={handleApplyTrackChanges}
              onApplyBothChangesAndComments={handleApplyBothChangesAndComments}
              onAddComment={addComment}
              onDeleteSection={handleDeleteSection}
              onEditSection={handleEditSection}
              buttonRef={buttonRef}
              positioningRef={positioningRef}
              sectionRefs={sectionRefs}
              onNavigateToRule={navigateToRule}
              amendmentRules={amendmentRules}
              // ============================
              // NOTE 11-27-2025:
              // Pass applied state tracking props (for the Apply button)
              // ============================
              appliedComments={appliedComments}
              appliedRedlines={appliedRedlines}
            />
          )}
        </>
      )}        
    </div>
  );
};

export default PlaybookRules;
