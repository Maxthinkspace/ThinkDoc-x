import React, { useState } from "react";
import {
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  PositioningImperativeRef,
  Button as FButton,
  makeStyles,
  Tooltip,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
} from "@fluentui/react-components";
import { ChevronDown, ChevronUp, Loader2, SquarePen, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { AiOutlineDelete } from "react-icons/ai";
import { CiLocationArrow1 } from "react-icons/ci";
import { Rule } from "../../UnifiedLibraryPage/types";
import { useNavigation } from "../../../hooks/use-navigation";

// ===============================================================================================
// NOTE 11-27-2025:
// Below is the original code received on Nov 26, which appears to be the initial empty state only 
// ===============================================================================================

import warnning from "../../../../assets/warnning.png"
const NoRulesApplied: React.FC = () => {
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
        You have not applied any rule yet
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
        Run the selected rules from the Rules tab to see the changes made to your
        contract.
      </p>
    </div>
  );
};

// =================================
// NOTE 11-27-2025:
// End of the original code
// =================================

// =====================================
// NOTE 11-27-2025:
// NEW CODE FOR A COMPLETE "CHANGES" TAB
// =====================================

interface RuleResult {
  status: "amended" | "not-amended" | "not-found" | "new-section" | "instruction-request";
  original_language?: string;
  amended_language?: string;
  section_number: string;
  whyText?: string;
  isFullDeletion?: boolean;
  issue?: string;
}

interface SectionChange {
  sectionNumber: string;
  original_language: string;
  amended_language: string;
  status: string;
  appliedRules: string[];
  isFullDeletion?: boolean;
}

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

const getRuleDisplayNumber = (ruleId: string, amendmentRules: Rule[]): string => {
  const index = amendmentRules.findIndex(r => r.rule_number === ruleId);
  if (index !== -1) {
    return String(index + 1);  
  }
  // Fallback to extracting number from ID if not found
  const match = ruleId.match(/\d+$/);
  return match ? match[0] : ruleId;
};

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

const useStyles = makeStyles({
  animateSpin: {
    animationName: {
      "0%": { transform: "rotate(0deg)" },
      "100%": { transform: "rotate(360deg)" },
    },
    animationDuration: "1s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
  ruleLinkButton: {
    background: "none",
    border: "1px solid #4080FF",
    borderRadius: "4px",
    padding: "2px 8px",
    cursor: "pointer",
    color: "#0F62FE",
    fontSize: "12px",
    fontWeight: 500,
  },
  iconBtn: {
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
  },
  accordionItem: {
    border: "1px solid #4f8bd4",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    marginBottom: "12px",
    overflow: "hidden",
    transition: "box-shadow 0.3s ease",
  },
  accordionHeader: {
    backgroundColor: "#ffffff",
    border: "none",
    borderRadius: "8px",
  },
  accordionPanel: {
    backgroundColor: "#ffffff !important",
    border: "none",
    borderRadius: "0 0 8px 8px",
    padding: "8px 16px 16px 16px",
  },
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
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingRight: "8px",
  },
  cardTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 600,
  },
});

interface ChangesTabContentProps {
  sectionChanges: SectionChange[];
  isApplyingTrackChanges: { [key: string]: boolean };
  isApplyingBoth: { [key: string]: boolean };
  onLocateText: (text: string) => void;
  onApplyTrackChanges: (result: RuleResult, ruleId: number | string) => void;
  onApplyBothChangesAndComments: (result: RuleResult, rule: Rule, ruleId: number | string) => void;
  onApplyCommentsOnly?: (result: RuleResult, rule: Rule, ruleId: number | string) => void;
  onAddComment: (text: string) => void;
  onDeleteSection?: (sectionNumber: string) => void;
  onEditSection?: (sectionNumber: string, amendedLanguage: string) => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
  positioningRef: React.RefObject<PositioningImperativeRef>;
  sectionRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  onNavigateToRule: (ruleId: string) => void;
  amendmentRules: Rule[];
  appliedComments: Set<string>;
  appliedRedlines: Set<string>;
}

const ChangesTabContent: React.FC<ChangesTabContentProps> = ({
  sectionChanges,
  isApplyingTrackChanges,
  isApplyingBoth,
  onLocateText,
  onApplyTrackChanges,
  onApplyBothChangesAndComments,
  onApplyCommentsOnly,
  onAddComment,
  onDeleteSection,
  onEditSection,
  buttonRef,
  positioningRef,
  sectionRefs,
  onNavigateToRule,
  amendmentRules,
  appliedComments,
  appliedRedlines,
}) => {
  const styles = useStyles();
  const { navigateTo } = useNavigation();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedAmendedLanguage, setEditedAmendedLanguage] = useState<string>("");
  
  // Track which sections are expanded (all expanded by default)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    return new Set(sectionChanges.map(s => s.sectionNumber));
  });

  const getAmendmentKey = (original: string, amended: string): string => {
    return `${original || ''}::${amended || ''}`;
  };

  const toggleSection = (sectionNumber: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionNumber)) {
        newSet.delete(sectionNumber);
      } else {
        newSet.add(sectionNumber);
      }
      return newSet;
    });
  };

  if (sectionChanges.length === 0) {
    return <NoRulesApplied />;
  }

  const formatSectionNumber = (sectionNum: string): string => {
    if (sectionNum.toLowerCase().startsWith('after section')) {
      return sectionNum;
    }
    return `Section ${sectionNum}`;
  };

  const getLabelText = (section: SectionChange): string => {
    if (section.status === "new-section") {
      return "New Section to Add:";
    } else if (section.isFullDeletion) {
      return "Section to Delete:";
    } else {
      return "Recommended Changes:";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="g">
            <stop offset="0%" stopColor="#5800FF" />
            <stop offset="100%" stopColor="#129EFF" />
          </linearGradient>
        </defs>
      </svg>
      {sectionChanges.map((section) => {
        const sectionKey = `section-${section.sectionNumber}`;
        const isApplying = isApplyingTrackChanges[`${sectionKey}-track`] ||
          isApplyingBoth[`${sectionKey}-both`];
        const isExpanded = expandedSections.has(section.sectionNumber);
        const canEdit = !section.isFullDeletion && Boolean(onEditSection);
        const isEditing = editingSection === section.sectionNumber;

        const resultForHandlers: RuleResult = {
          status: section.status as "amended" | "new-section",
          original_language: section.original_language,
          amended_language: section.amended_language,
          section_number: section.sectionNumber,
          isFullDeletion: section.isFullDeletion,
        };

        const firstRule = amendmentRules.find(r =>
          section.appliedRules.includes(r.rule_number)
        );

        return (
          <div
            key={section.sectionNumber}
            ref={(el) => { sectionRefs.current[section.sectionNumber] = el; }}
            style={{ marginBottom: "12px" }}
          >
            <Accordion
              collapsible
              openItems={isExpanded ? [section.sectionNumber] : []}
              onToggle={() => toggleSection(section.sectionNumber)}
            >
              <AccordionItem 
                value={section.sectionNumber} 
                className={styles.accordionItem}
              >
                <AccordionHeader
                  className={styles.accordionHeader}
                  expandIcon={null}
                  style={{ padding: "12px 16px" }}
                >
                  <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        margin: 0,
                        marginBottom: "8px",
                        color: "#333",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <SquarePen stroke="url(#g)" size={15} />
                      {getLabelText(section)}
                    </p>
                    <div className={styles.cardHeader}>
                      <strong style={{ fontSize: "15px", lineHeight: "22px" }}>
                        {formatSectionNumber(section.sectionNumber)}
                      </strong>
                      <div className={styles.customChevron}>
                        {isExpanded ? (
                          <ChevronUp className={styles.icon} />
                        ) : (
                          <ChevronDown className={styles.icon} />
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionHeader>

                <AccordionPanel className={styles.accordionPanel}>
                  {/* Diff Display */}
                  <div style={{ marginBottom: "12px" }}>
                    <div
                      style={{
                        padding: "12px",
                        backgroundColor: section.isFullDeletion ? "#f8d7da" : "#ffffff",
                        border: `1px solid ${section.isFullDeletion ? "#f5c6cb" : "#4080FF"}`,
                        borderRadius: "4px",
                        fontSize: "14px",
                      }}
                    >
                      {section.isFullDeletion ? (
                        <div>
                          <span style={{ textDecoration: "line-through", color: "#721c24" }}>
                            {section.original_language}
                          </span>
                          <br /><br />
                          <span style={{ color: "#155724", fontWeight: "bold" }}>
                            [INTENTIONALLY DELETED]
                          </span>
                        </div>
                      ) : section.status === "new-section" ? (
                        <div style={{
                          backgroundColor: "#d4edda",
                          color: "#155724",
                          fontWeight: "bold",
                          padding: "8px",
                          borderRadius: "4px"
                        }}>
                          {section.amended_language}
                        </div>
                      ) : (
                        <DiffViewer
                          before={section.original_language}
                          after={section.amended_language}
                        />
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: "12px",
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#666" }}>Applied rules:</span>
                    {section.appliedRules.map((ruleId) => (
                      <button
                        key={ruleId}
                        onClick={() => onNavigateToRule(ruleId)}
                        className={styles.ruleLinkButton}
                      >
                        Rule {getRuleDisplayNumber(ruleId, amendmentRules)}
                      </button>
                    ))}
                  </div>

                  <div style={{ borderTop: "1px solid #e1e1e1", paddingTop: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
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
                            }}
                            onClick={() => onDeleteSection?.(section.sectionNumber)}
                          >
                            <Trash2 style={{ width: "16px", height: "16px" }} />
                          </button>
                        </Tooltip>
                        {canEdit ? (
                          <Tooltip
                            content="Edit this result"
                            relationship="label"
                            positioning="above"
                            withArrow
                          >
                            <button
                              className={styles.iconBtn}
                              style={{ marginLeft: "8px" }}
                              onClick={() => {
                                setEditingSection(section.sectionNumber);
                                setEditedAmendedLanguage(section.amended_language || "");
                              }}
                            >
                              <SquarePen size={16} color="#4080FF" />
                            </button>
                          </Tooltip>
                        ) : null}
                      </div>

                      {/* Right side - Locate and Apply buttons */}
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          className={styles.iconBtn}
                          onClick={() => onLocateText(section.original_language)}
                        >
                          <CiLocationArrow1 style={{ width: "16px", height: "16px" }} />
                        </button>

                        {(() => {
                          const amendmentKey = getAmendmentKey(section.original_language, section.amended_language);
                          const hasAppliedComments = appliedComments.has(amendmentKey);
                          const hasAppliedRedlines = appliedRedlines.has(amendmentKey);
                          const hasAppliedBoth = hasAppliedComments && hasAppliedRedlines;

                          return (
                            <Menu positioning={{ positioningRef }}>
                              <MenuTrigger disableButtonEnhancement>
                                <FButton
                                  appearance="primary"
                                  ref={buttonRef}
                                  disabled={isApplying}
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
                                    disabled={isApplying}
                                    onClick={async () => {
                                      if (firstRule) {
                                        await onApplyBothChangesAndComments(
                                          resultForHandlers,
                                          firstRule,
                                          sectionKey
                                        );
                                      }
                                    }}
                                  >
                                    {isApplyingBoth[`${sectionKey}-both`] ? (
                                      <>
                                        <Loader2
                                          style={{ width: "16px", height: "16px", marginRight: "8px" }}
                                          className={styles.animateSpin}
                                        />
                                        Applying...
                                      </>
                                    ) : (
                                      hasAppliedBoth
                                        ? "Re-apply both track changes and comments"
                                        : "Apply both track changes and comments"
                                    )}
                                  </MenuItem>

                                  <MenuItem
                                    disabled={isApplying}
                                    onClick={async () => {
                                      await onApplyTrackChanges(resultForHandlers, sectionKey);
                                    }}
                                  >
                                    {isApplyingTrackChanges[`${sectionKey}-track`] ? (
                                      <>
                                        <Loader2
                                          style={{ width: "16px", height: "16px", marginRight: "8px" }}
                                          className={styles.animateSpin}
                                        />
                                        Applying...
                                      </>
                                    ) : (
                                      hasAppliedRedlines
                                        ? "Re-apply track changes only"
                                        : "Apply track changes only"
                                    )}
                                  </MenuItem>

                                  <MenuItem
                                    disabled={isApplying}
                                    onClick={async () => {
                                      if (onApplyCommentsOnly && firstRule) {
                                        await onApplyCommentsOnly(resultForHandlers, firstRule, sectionKey);
                                      } else {
                                        await onLocateText(section.original_language);
                                        if (firstRule) {
                                          await onAddComment(
                                            `Instruction: ${firstRule.instruction}\n\nExample language: ${firstRule.example_language || 'N/A'}`
                                          );
                                        }
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
                    </div>
                  </div>

                  {canEdit && isEditing ? (
                    <div style={{ marginTop: "12px" }}>
                      <div style={{ fontSize: "12px", color: "#666", marginBottom: "6px" }}>
                        Edit proposed text
                      </div>
                      <textarea
                        value={editedAmendedLanguage}
                        onChange={(e) => setEditedAmendedLanguage(e.target.value)}
                        style={{
                          width: "100%",
                          minHeight: "90px",
                          padding: "10px",
                          borderRadius: "6px",
                          border: "1px solid #e1e1e1",
                          fontSize: "13px",
                          lineHeight: "1.4",
                          resize: "vertical",
                        }}
                      />
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        <FButton
                          size="small"
                          appearance="primary"
                          style={{
                            background: "var(--brand-gradient)",
                            border: "none",
                            color: "#fff",
                          }}
                          onClick={() => {
                            onEditSection?.(section.sectionNumber, editedAmendedLanguage);
                            setEditingSection(null);
                          }}
                        >
                          Save
                        </FButton>
                        <FButton
                          size="small"
                          appearance="outline"
                          onClick={() => setEditingSection(null)}
                        >
                          Cancel
                        </FButton>
                      </div>
                    </div>
                  ) : null}
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </div>
        );
      })}
    </div>
  );
};

export { NoRulesApplied, ChangesTabContent, compareSectionNumbers };
export type { SectionChange, RuleResult, ChangesTabContentProps };
export default ChangesTabContent;
