import * as React from "react";
import {
  makeStyles,
  Button as FButton,
  Textarea,
  Spinner,
  Tooltip,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
} from "@fluentui/react-components";
import { ArrowLeft, Send, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { CiLocationArrow1 } from "react-icons/ci";
import { Button } from "../../components/ui/button";
import { GeneralSourceSelector } from "../../components/GeneralSourceSelector";
import { PromptSuggestions, PROMPT_SUGGESTIONS } from "./PromptSuggestions";
import type { DraftConfig, GeneralSourceConfig, DraftingRun, DraftingSectionChange } from "./types";
import {
  generateDiffHtml,
  getDiffStyles,
  createParagraphDiffProposal,
  applyWordLevelTrackChanges,
  locateAndScrollToText,
} from "../../taskpane";
import "./styles/DraftFromScratchPage.css";

// ============================================
// DIFF VIEWER
// ============================================

const DiffViewer: React.FC<{ before: string; after: string }> = ({ before, after }) => {
  const diffHtml = generateDiffHtml(before, after);
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: getDiffStyles() }} />
      <div
        className="diff-container"
        dangerouslySetInnerHTML={{ __html: diffHtml }}
        style={{ fontFamily: "inherit", lineHeight: "1.5" }}
      />
    </>
  );
};

// ============================================
// HELPERS
// ============================================

function getInstructionDisplayText(instructionId: string, instructions: string): string {
  if (instructionId.startsWith('prompt-')) {
    const promptId = instructionId.replace('prompt-', '');
    const allPrompts = Object.values(PROMPT_SUGGESTIONS).flat();
    const prompt = allPrompts.find(p => p.id === promptId);
    return prompt ? prompt.prompt : instructionId;
  }

  if (instructionId.startsWith('inst-')) {
    const index = parseInt(instructionId.replace('inst-', ''), 10) - 1;
    const lines = instructions
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    if (index >= 0 && index < lines.length) {
      return lines[index];
    }
  }

  return instructionId;
}

function countChanges(changes: DraftingSectionChange[]): number {
  return changes.filter(c => c.status === 'amended' || c.status === 'new-section').length;
}

// ============================================
// STYLES
// ============================================

const useStyles = makeStyles({
  pageRoot: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#f8f9fa",
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #e1e1e1",
    backgroundColor: "#fff",
    gap: "16px",
  },
  title: {
    fontSize: "18px",
    fontWeight: 600,
    margin: 0,
  },
  content: {
    flex: 1,
    padding: "24px",
    overflowY: "auto",
  },
  section: {
    marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "8px",
    color: "#333",
  },
  sectionDescription: {
    fontSize: "13px",
    color: "#666",
    marginBottom: "12px",
  },
  draftTypeToggle: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
  },
  draftTypeButton: {
    flex: 1,
    padding: "10px 16px",
    borderRadius: "6px",
    border: "1px solid #e1e1e1",
    backgroundColor: "#fff",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
    transition: "all 0.2s ease",
    color: "#333",
    whiteSpace: "nowrap",
    overflow: "visible",
    ":hover": {
      backgroundColor: "#f5f5f5",
    },
  },
  draftTypeButtonActive: {
    background: "rgba(255, 255, 255, 0.15) !important",
    backdropFilter: "blur(30px) saturate(200%) brightness(110%) !important",
    WebkitBackdropFilter: "blur(30px) saturate(200%) brightness(110%) !important",
    border: "1px solid rgba(255, 255, 255, 0.3) !important",
    color: "#1a1a1a !important",
    fontWeight: "600 !important",
    boxShadow: `
      0 8px 32px rgba(0, 0, 0, 0.1),
      0 2px 8px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      inset 0 -1px 0 rgba(255, 255, 255, 0.2),
      inset 1px 0 0 rgba(255, 255, 255, 0.4),
      inset -1px 0 0 rgba(255, 255, 255, 0.2)
    !important`,
    ":hover": {
      background: "rgba(255, 255, 255, 0.2) !important",
      boxShadow: `
        0 12px 40px rgba(0, 0, 0, 0.12),
        0 4px 12px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.7),
        inset 0 -1px 0 rgba(255, 255, 255, 0.3),
        inset 1px 0 0 rgba(255, 255, 255, 0.5),
        inset -1px 0 0 rgba(255, 255, 255, 0.3)
      !important`,
      color: "#1a1a1a !important",
    },
  },
  contextTextarea: {
    width: "100%",
    minHeight: "120px",
    fontSize: "13px",
    lineHeight: "1.5",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    overflowWrap: "break-word",
    overflow: "visible",
    resize: "vertical",
  },
  textareaWrapper: {
    position: "relative",
  },
  goButtonWrapper: {
    position: "absolute",
    right: "8px",
    bottom: "8px",
    zIndex: 1,
  },
  goButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    border: "none",
    background: "var(--brand-gradient, linear-gradient(135deg, #5800FF 0%, #129EFF 100%))",
    color: "#fff",
    cursor: "pointer",
    transition: "opacity 0.2s ease, transform 0.2s ease",
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
    ":hover": {
      opacity: "0.9",
      transform: "scale(1.05)",
    },
    ":disabled": {
      opacity: "0.4",
      cursor: "not-allowed",
      transform: "none",
    },
  },
  footer: {
    padding: "16px 24px",
    borderTop: "1px solid #e1e1e1",
    backgroundColor: "#fff",
  },
  errorText: {
    color: "#d32f2f",
    fontSize: "13px",
    marginBottom: "12px",
  },
  // Results section styles
  accordionItem: {
    border: "1px solid #4f8bd4",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    marginBottom: "12px",
    overflow: "hidden",
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
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingRight: "8px",
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
  animateSpin: {
    animationName: {
      "0%": { transform: "rotate(0deg)" },
      "100%": { transform: "rotate(360deg)" },
    },
    animationDuration: "1s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
  sectionChangeCard: {
    padding: "12px 16px",
    backgroundColor: "#ffffff",
    border: "1px solid #4080FF",
    borderRadius: "4px",
    fontSize: "14px",
    marginBottom: "12px",
  },
});

// ============================================
// COMPONENT
// ============================================

interface DraftConfigViewProps {
  config: DraftConfig;
  onConfigChange: (config: DraftConfig) => void;
  onGenerateSkeleton: () => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
  draftingRuns: DraftingRun[];
  onStartOver: () => void;
  thinkingSteps?: string[];
}

export const DraftConfigView: React.FC<DraftConfigViewProps> = ({
  config,
  onConfigChange,
  onGenerateSkeleton,
  onBack,
  isLoading,
  error,
  draftingRuns,
  onStartOver,
  thinkingSteps = [],
}) => {
  const styles = useStyles();
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Results state
  const [appliedRedlines, setAppliedRedlines] = React.useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = React.useState<{ [key: string]: boolean }>({});
  const [isApplyingAll, setIsApplyingAll] = React.useState(false);
  const [expandedInstructions, setExpandedInstructions] = React.useState<Set<string>>(new Set());

  // When new runs arrive, expand only the latest run's cards and collapse old ones
  React.useEffect(() => {
    if (draftingRuns.length === 0) return;
    const latestRunIdx = draftingRuns.length - 1;
    const latestRun = draftingRuns[latestRunIdx];
    const newExpanded = new Set<string>();
    Object.keys(latestRun.results).forEach(id => {
      newExpanded.add(`${latestRunIdx}-${id}`);
    });
    setExpandedInstructions(newExpanded);
  }, [draftingRuns]);

  // Reset results state when starting over
  React.useEffect(() => {
    if (draftingRuns.length === 0) {
      setAppliedRedlines(new Set());
      setIsApplying({});
      setIsApplyingAll(false);
      setExpandedInstructions(new Set());
    }
  }, [draftingRuns.length]);

  // Auto-scroll to bottom when new results arrive (chat-like)
  React.useEffect(() => {
    if (draftingRuns.length > 0 && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [draftingRuns]);

  const handleDraftTypeChange = (type: 'clause' | 'document') => {
    onConfigChange({ ...config, draftType: type });
  };

  const handleContextChange = (value: string) => {
    onConfigChange({ ...config, context: value });
  };

  const handleSourceConfigChange = (sourceConfig: GeneralSourceConfig) => {
    onConfigChange({ ...config, sourceConfig });
  };

  const handlePromptToggle = (promptId: string) => {
    const selectedPrompts = config.selectedPrompts.includes(promptId)
      ? config.selectedPrompts.filter(id => id !== promptId)
      : [...config.selectedPrompts, promptId];
    onConfigChange({ ...config, selectedPrompts: selectedPrompts });
  };

  const canGenerate = config.context.trim().length > 0 && !isLoading;

  // Results helpers
  const getAmendmentKey = (original: string, amended: string): string => {
    return `${original || ''}::${amended || ''}`;
  };

  const toggleInstruction = (uniqueKey: string) => {
    setExpandedInstructions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(uniqueKey)) {
        newSet.delete(uniqueKey);
      } else {
        newSet.add(uniqueKey);
      }
      return newSet;
    });
  };

  const handleLocateText = async (text: string) => {
    try {
      await locateAndScrollToText(text);
    } catch (err) {
      console.error('Failed to locate text:', err);
    }
  };

  const handleApplyTrackChanges = async (change: DraftingSectionChange, key: string) => {
    if (!change.amended_language || change.status !== 'amended') return;

    setIsApplying(prev => ({ ...prev, [key]: true }));
    try {
      const proposal = createParagraphDiffProposal(
        change.original_language,
        change.amended_language
      );
      await applyWordLevelTrackChanges(proposal, change.original_language);
      setAppliedRedlines(prev => {
        const newSet = new Set(prev);
        newSet.add(getAmendmentKey(change.original_language, change.amended_language!));
        return newSet;
      });
    } catch (err) {
      console.error('Failed to apply track changes:', err);
    } finally {
      setIsApplying(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleApplyAll = async () => {
    setIsApplyingAll(true);
    try {
      for (let runIdx = 0; runIdx < draftingRuns.length; runIdx++) {
        const run = draftingRuns[runIdx];
        for (const [instructionId, changes] of Object.entries(run.results)) {
          for (let i = 0; i < changes.length; i++) {
            const change = changes[i];
            if (change.status === 'amended' && change.amended_language) {
              const key = `${runIdx}-${instructionId}-${i}`;
              await handleApplyTrackChanges(change, key);
            }
          }
        }
      }
    } finally {
      setIsApplyingAll(false);
    }
  };

  const totalAmendments = draftingRuns.reduce((total, run) => {
    return total + Object.values(run.results).reduce(
      (sum, changes) => sum + countChanges(changes),
      0
    );
  }, 0);

  const hasResults = draftingRuns.length > 0;

  return (
    <div className={styles.pageRoot}>
      {/* Header */}
      <div className={styles.header}>
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          disabled={isLoading}
          style={{ padding: "4px 8px", fontSize: "12px" }}
        >
          <ArrowLeft style={{ width: "14px", height: "14px", marginRight: "4px" }} />
          Back
        </Button>
        <h1 className={styles.title}>Draft from Scratch</h1>
      </div>

      {/* Content */}
      <div className={styles.content} ref={contentRef}>
        {/* Draft Type Toggle */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Draft Type</h3>
          <div className={styles.draftTypeToggle}>
            <button
              className={`${styles.draftTypeButton} ${config.draftType === 'clause' ? styles.draftTypeButtonActive : ''}`}
              onClick={() => handleDraftTypeChange('clause')}
              disabled={isLoading}
              type="button"
            >
              Single Clause
            </button>
            <button
              className={`${styles.draftTypeButton} ${config.draftType === 'document' ? styles.draftTypeButtonActive : ''}`}
              onClick={() => handleDraftTypeChange('document')}
              disabled={isLoading}
              type="button"
            >
              Full Document
            </button>
          </div>
        </div>

        {/* Source Selector */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Reference Sources</h3>
          <p className={styles.sectionDescription}>
            Select sources from your vault, upload files, or import from external databases to reference when drafting.
          </p>
          <GeneralSourceSelector
            sourceConfig={config.sourceConfig}
            onSourceConfigChange={handleSourceConfigChange}
            disabled={isLoading}
          />
        </div>

        {/* Prompt Suggestions */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Quick Suggestions</h3>
          <p className={styles.sectionDescription}>
            Click on suggestions below to add them to your instructions for better drafts.
          </p>
          <PromptSuggestions
            selectedPromptIds={config.selectedPrompts}
            onPromptToggle={handlePromptToggle}
          />
        </div>

        {/* Results cards (chat-like: oldest at top, newest at bottom) */}
        {hasResults && (
          <div style={{ marginBottom: "24px" }}>
            {draftingRuns.map((run, runIdx) => {
              const instructionIds = Object.keys(run.results);

              return instructionIds.map((instructionId) => {
                const uniqueKey = `${runIdx}-${instructionId}`;
                const changes = run.results[instructionId];
                const isExpanded = expandedInstructions.has(uniqueKey);
                const displayText = getInstructionDisplayText(instructionId, run.instructions);

                return (
                  <div key={uniqueKey} style={{ marginBottom: "12px" }}>
                    <Accordion
                      collapsible
                      openItems={isExpanded ? [uniqueKey] : []}
                      onToggle={() => toggleInstruction(uniqueKey)}
                    >
                      <AccordionItem value={uniqueKey} className={styles.accordionItem}>
                        <AccordionHeader
                          className={styles.accordionHeader}
                          expandIcon={null}
                          style={{ padding: "12px 16px" }}
                        >
                          <div className={styles.cardHeader}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "#333",
                                lineHeight: "1.4",
                                textAlign: "left",
                                wordWrap: "break-word",
                                overflowWrap: "break-word",
                                whiteSpace: "normal",
                              }}>
                                {displayText}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", flexShrink: 0, marginLeft: "8px" }}>
                              {isExpanded ? (
                                <ChevronUp style={{ width: "16px", height: "16px", color: "#666" }} />
                              ) : (
                                <ChevronDown style={{ width: "16px", height: "16px", color: "#666" }} />
                              )}
                            </div>
                          </div>
                        </AccordionHeader>

                        <AccordionPanel className={styles.accordionPanel}>
                          {changes.map((change, idx) => {
                            const changeKey = `${runIdx}-${instructionId}-${idx}`;
                            const amendmentKey = getAmendmentKey(change.original_language, change.amended_language || '');
                            const hasApplied = appliedRedlines.has(amendmentKey);
                            const applying = isApplying[changeKey];

                            return (
                              <div key={changeKey} style={{ marginBottom: idx < changes.length - 1 ? "16px" : 0 }}>
                                {/* Section number */}
                                <div style={{ fontSize: "12px", color: "#666", marginBottom: "6px", fontWeight: 500 }}>
                                  {change.section_number === 'NOT FOUND' || change.section_number === 'ERROR'
                                    ? change.section_number
                                    : `Section ${change.section_number}`}
                                </div>

                                {/* Diff display */}
                                <div className={styles.sectionChangeCard}>
                                  {change.status === 'not-found' ? (
                                    <div style={{ color: "#666", fontStyle: "italic" }}>
                                      {change.original_language}
                                    </div>
                                  ) : change.status === 'not-amended' ? (
                                    <div style={{ color: "#666" }}>
                                      <span style={{ fontStyle: "italic", fontSize: "12px", display: "block", marginBottom: "4px" }}>
                                        No changes needed
                                      </span>
                                      {change.original_language}
                                    </div>
                                  ) : change.isFullDeletion ? (
                                    <div>
                                      <span style={{ textDecoration: "line-through", color: "#721c24" }}>
                                        {change.original_language}
                                      </span>
                                      <br /><br />
                                      <span style={{ color: "#155724", fontWeight: "bold" }}>
                                        [INTENTIONALLY DELETED]
                                      </span>
                                    </div>
                                  ) : change.status === 'new-section' ? (
                                    <div style={{
                                      backgroundColor: "#d4edda",
                                      color: "#155724",
                                      fontWeight: "bold",
                                      padding: "8px",
                                      borderRadius: "4px",
                                    }}>
                                      {change.amended_language}
                                    </div>
                                  ) : (
                                    <DiffViewer
                                      before={change.original_language}
                                      after={change.amended_language || ''}
                                    />
                                  )}
                                </div>

                                {/* Action buttons */}
                                {(change.status === 'amended' || change.status === 'new-section') && (
                                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
                                    <Tooltip content="Locate in document" relationship="label" positioning="above">
                                      <button
                                        className={`${styles.iconBtn} brand-btn`}
                                        onClick={() => handleLocateText(change.original_language)}
                                        type="button"
                                      >
                                        <CiLocationArrow1 style={{ width: "16px", height: "16px" }} />
                                      </button>
                                    </Tooltip>

                                    <FButton
                                      className="brand-btn"
                                      appearance="primary"
                                      disabled={applying}
                                      onClick={() => handleApplyTrackChanges(change, changeKey)}
                                      style={{
                                        background: "var(--brand-gradient)",
                                        color: "var(--text-on-brand)",
                                        minWidth: "auto",
                                        height: "28px",
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        padding: "0 12px",
                                      }}
                                    >
                                      {applying ? (
                                        <>
                                          <Loader2
                                            style={{ width: "14px", height: "14px", marginRight: "6px" }}
                                            className={styles.animateSpin}
                                          />
                                          Applying...
                                        </>
                                      ) : hasApplied ? (
                                        "Re-apply Track Changes"
                                      ) : (
                                        "Apply Track Changes"
                                      )}
                                    </FButton>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </AccordionPanel>
                      </AccordionItem>
                    </Accordion>
                  </div>
                );
              });
            })}
          </div>
        )}

        {/* Thinking steps — shown while processing complex instructions */}
        {isLoading && thinkingSteps.length > 0 && (
          <div style={{
            marginBottom: "16px",
            padding: "12px 16px",
            backgroundColor: "var(--colorNeutralBackground3)",
            borderRadius: "8px",
            border: "1px solid var(--colorNeutralStroke2)",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}>
              <Spinner size="tiny" />
              <span style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--colorNeutralForeground2)",
              }}>
                Analyzing instruction...
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {thinkingSteps.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: "12px",
                    color: "var(--colorNeutralForeground3)",
                    paddingLeft: "8px",
                    borderLeft: "2px solid var(--colorNeutralStroke2)",
                    lineHeight: "1.4",
                  }}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions (Context Input) — at the bottom, like a chat input */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Instructions</h3>
          <p className={styles.sectionDescription}>
            Describe what you want to draft. Be specific about the document type, key terms, and any special requirements.
          </p>
          <div className={styles.textareaWrapper}>
            <Textarea
              value={config.context}
              onChange={(_, data) => handleContextChange(data.value)}
              placeholder="e.g., Draft a Non-Disclosure Agreement for a technology partnership. Include standard confidentiality provisions, exceptions for publicly available information, and a 3-year term..."
              disabled={isLoading}
              className={styles.contextTextarea}
              textarea={{ style: { minHeight: '110px' } }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canGenerate) {
                  e.preventDefault();
                  onGenerateSkeleton();
                }
              }}
            />
            <div className={styles.goButtonWrapper}>
              <Tooltip content="Go" relationship="label" positioning="above">
                <button
                  className={`${styles.goButton} brand-btn`}
                  onClick={onGenerateSkeleton}
                  disabled={!canGenerate}
                  type="button"
                >
                  {isLoading ? (
                    <Spinner size="tiny" style={{ color: "#fff" }} />
                  ) : (
                    <Send style={{ width: "14px", height: "14px" }} />
                  )}
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        {error && <div className={styles.errorText}>{error}</div>}
        {hasResults ? (
          <div style={{ display: "flex", gap: "8px" }}>
            <FButton
              appearance="secondary"
              onClick={onStartOver}
              style={{ flex: 1 }}
            >
              Start Over
            </FButton>
            {totalAmendments > 0 && (
              <FButton
                className="brand-btn"
                appearance="primary"
                onClick={handleApplyAll}
                disabled={isApplyingAll}
                style={{
                  flex: 1,
                  background: "var(--brand-gradient)",
                  color: "var(--text-on-brand)",
                }}
              >
                {isApplyingAll ? (
                  <>
                    <Spinner size="tiny" style={{ marginRight: "8px" }} />
                    Applying All...
                  </>
                ) : (
                  "Apply All Changes"
                )}
              </FButton>
            )}
          </div>
        ) : (
          <FButton
            appearance="primary"
            onClick={onGenerateSkeleton}
            disabled={!canGenerate}
            style={{ width: "100%" }}
          >
            Start Drafting
          </FButton>
        )}
      </div>
    </div>
  );
};
