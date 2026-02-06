import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { useNavigation } from "../../hooks/use-navigation";
import { FaArrowLeft, FaPlus } from "react-icons/fa6";
import { Button, Divider, Tooltip, makeStyles } from "@fluentui/react-components";
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
} from "@fluentui/react-components";
import { Check, Loader2 } from "lucide-react";

// ============================
// NOTE 11-27-2025:
// Removed RuleTooltip import - replaced with inline info box matching Module 3's Figma
// ============================

// import RuleTooltip from "./components/RuleTooltip";
import { backendApi } from "@/src/services/api";
import { useToast } from "../../hooks/use-toast";
import { Playbook, Rule } from "../UnifiedLibraryPage/types";

// ============================
// NOTE 11-27-2025:
// Add BlueCheckIcon to match Module 3's Figma design
// ============================
const BlueCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="8" cy="8" r="8" fill="#0F62FE" />
    <path
      d="M5 8L7 10L11 6"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const useStyles = makeStyles({
  root: {},
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px 19px 5px 19px",
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
  accordionItem: {
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    background: "#fff",
    marginBottom: "10px",
    transition: "border-color 120ms ease",
  },
  accordionItemOpen: {
    border: "1px solid transparent",
    borderRadius: "8px",
    background: "#fff",
    marginBottom: "10px",
    transition: "border-color 120ms ease",
    boxShadow: "0 0 4px rgba(18,158,255,0.35)",

    /* gradient border */
    borderImage: "var(--brand-gradient) 1",
    borderImageSlice: 1,
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingRight: "6px",
  },
  title: {
    fontWeight: 600,
    fontSize: "15px",
    display: "flex",
    alignItems: "center",
    color: "#0F62FE",
  },
  badgeApply: {
    background: "#F3FFF0",
    color: "#2F9C74",
    fontSize: "12px",
    padding: "3px 8px",
    borderRadius: "20px",
    marginLeft: "8px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  badgeNo: {
    background: "#FFF2F0",
    color: "#E83030",
    fontSize: "12px",
    padding: "3px 8px",
    borderRadius: "20px",
    marginLeft: "8px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  actions: {
    display: "flex",
    gap: "8px",
    marginTop: "14px",
    justifyContent: "end",
    alignItems: "center",
  },
  accordionContsiner: {
    padding: "5px",
    margin: "3px",
    borderRadius: "5px",
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

  // ============================
  // NOTE 11-27-2025:
  // Add info box style to match Module 3's "Ready to Compare" Figma design
  // ============================
  infoBox: {
    padding: "14px",
    backgroundColor: "#F6F9FF",
    borderRadius: "8px",
    border: "1px solid #0F62FE",
    margin: "12px 16px",
  },
  infoBoxHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "6px",
  },
  infoBoxIcon: {
    width: "16px",
    height: "16px",
    color: "#0F62FE",
  },
  infoBoxTitle: {
    fontSize: "14px",
    color: "#333333",
    fontWeight: 600,
    margin: 0,
  },
  infoBoxDescription: {
    fontSize: "13px",
    color: "#666666",
    margin: 0,
    lineHeight: "18px",
  },

  // ============================
  // NOTE 11-27-2025:
  // Add button styles to match Module 3's Figma design
  // ============================
  secondaryButton: {
    backgroundColor: "#ffffff",
    color: "#333333",
    border: "1px solid #d0d0d0",
    borderRadius: "4px",
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    minWidth: "auto",
    ":hover": {
      backgroundColor: "#f5f5f5",
      border: "1px solid #bdbdbd",
    },
  },
  primaryButton: {
    background: "linear-gradient(90deg, #5800FF 0%, #129EFF 100%)",  // ← NEW (purple to blue)
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: 500,
    fontFamily: "inherit",
    cursor: "pointer",
    minWidth: "auto",
    ":hover": {
      opacity: 0.9,
    },
  },
});

const RulesConfiguration: React.FC = () => {
  const { navigateTo } = useNavigation();
  const { toast } = useToast();
  const styles = useStyles();

  // Load playbook from localStorage
  const [playbook, setPlaybook] = useState<Playbook | null>(() => {
    try {
      const raw = localStorage.getItem("playbook");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Extract conditional rules from playbook
  const conditionalRules = useMemo(() => {
    if (!playbook?.rules || !Array.isArray(playbook.rules)) {
      return [];
    }
    const found = playbook.rules.find(
      (r) => r.type === "Conditional Rules for Contract Amendments"
    );
    return found ? found.rules || [] : [];
  }, [playbook]);

  // Track remaining rules (not yet decided) and included rules (user said "Yes"/"Please apply")
  const [remainingRules, setRemainingRules] = useState<Rule[]>(conditionalRules);
  const [includedRules, setIncludedRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // ============================
  // NOTE 11-27-2025:
  // Expanded by default
  // ============================

  const [expanded, setExpanded] = useState<string[]>([]);

  // Track if we've initialized to prevent reset on re-renders
  const initializedRef = React.useRef(false);

  // Reset rules only when playbook actually changes (not on every render)
  useEffect(() => {
    console.log("Init useEffect: conditionalRules.length =", conditionalRules.length, "initialized =", initializedRef.current);
    if (!initializedRef.current && conditionalRules.length > 0) {
      console.log("Init useEffect: initializing!");
      initializedRef.current = true;
      setRemainingRules(conditionalRules);
      setIncludedRules([]);
    }
  }, [conditionalRules]);

  // ============================
  // NOTE 11-27-2025:
  // Expand all rules by default when remainingRules change
  // ============================

  useEffect(() => {
    setExpanded(remainingRules.map((r) => r.rule_number));
  }, [remainingRules]);

  // Handle navigation when all rules have been decided
  useEffect(() => {
    if (!initializedRef.current) return;
    if (remainingRules.length > 0) return;
    
    if (includedRules.length > 0) {
      handleContinueWithRules(includedRules);
    } else {
      // No rules to process - save and navigate
      if (playbook) {
        localStorage.setItem("playbook", JSON.stringify(playbook));
      }
      // Mark configuration as complete so PlaybookRulesTabs won't redirect back
      sessionStorage.setItem("rulesConfigurationComplete", "true");
      navigateTo("PlaybookRulesTabs");
    }
  }, [remainingRules, includedRules, playbook, navigateTo]);

  // Handle "Do not apply" (No) - removes rule from remaining
  const handleRemove = (rule_number: string) => {
    console.log("handleRemove: starting for", rule_number);
    console.log("handleRemove: remainingRules before =", remainingRules.length);
    setRemainingRules((prev) => {
      console.log("handleRemove setter: prev =", prev.length);
      const newRules = prev.filter((r) => r.rule_number !== rule_number);
      console.log("handleRemove setter: newRules =", newRules.length);
      return newRules;
    });
  };

  // Handle "Please apply" (Yes) - moves rule from remaining to included
  const handleInclude = (rule_number: string) => {
    const ruleToInclude = remainingRules.find((r) => r.rule_number === rule_number);
    if (ruleToInclude) {
      setIncludedRules((prev) => [...prev, ruleToInclude]);
      setRemainingRules((prev) => prev.filter((r) => r.rule_number !== rule_number));
    }
  };

  // Process rules and call API
  const handleContinueWithRules = async (rulesToProcess: Rule[]) => {
    // If no rules were included, just save and navigate
    if (rulesToProcess.length === 0) {
      if (playbook) {
        localStorage.setItem("playbook", JSON.stringify(playbook));
      }
      navigateTo("PlaybookRulesTabs");
      return;
    }

    setLoading(true);
    try {
      // Remove conditions from the rules user said "Yes" to
      const rulesWithConditionsRemoved = await backendApi.removeConditionInRules(
        JSON.stringify(rulesToProcess)
      );
      const cleanedRules = rulesWithConditionsRemoved.data;

      // Parse cleaned rules if it's a string
      const parsedCleanedRules =
        typeof cleanedRules === "string" ? JSON.parse(cleanedRules) : cleanedRules;

      // Safely access playbook.rules
      if (!playbook?.rules || !Array.isArray(playbook.rules)) {
        throw new Error("Invalid playbook rules structure");
      }

      const instructionsCategory = playbook.rules.find(
        (r) => r.type === "Rules for Instruction Requests"
      );
      const instructions = instructionsCategory ? instructionsCategory.rules || [] : [];

      const amendmentsCategory = playbook.rules.find(
        (r) => r.type === "Rules for Contract Amendments"
      );
      let amendments = amendmentsCategory ? amendmentsCategory.rules || [] : [];

      // Add the cleaned rules (with conditions removed) to amendments
      const rulesArray = Array.isArray(parsedCleanedRules)
        ? parsedCleanedRules
        : [parsedCleanedRules];
      amendments = amendments.concat(rulesArray);

      // KEEP the original conditional rules category
      const conditionalCategory = playbook.rules.find(
        (r) => r.type === "Conditional Rules for Contract Amendments"
      );
      const conditionalRulesOriginal = conditionalCategory ? conditionalCategory.rules || [] : [];

      // Create updated playbook - PRESERVE conditional rules category
      const updatedPlaybook = {
        ...playbook,
        rules: [
          {
            type: "Rules for Instruction Requests",
            rules: instructions,
          },
          {
            type: "Rules for Contract Amendments",
            rules: amendments,
          },
          {
            type: "Conditional Rules for Contract Amendments",
            rules: conditionalRulesOriginal,
          },
        ],
      };

      localStorage.setItem("playbook", JSON.stringify(updatedPlaybook));
      console.log("✅ Saved playbook with", rulesArray.length, "rules added");
      console.log("✅ Cleaned rules:", rulesArray);

      sessionStorage.setItem("rulesConfigurationComplete", "true");
      sessionStorage.setItem("rulesConfigurationComplete", "true");
      // Navigate to next screen 
      navigateTo("PlaybookRulesTabs");
    } catch (error) {
      console.error("Error removing conditions from included rules:", error);
      toast({
        title: "Error processing rules",
        description: "An error occurred while processing your selected rules. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Continue button handler
  const handleContinue = async () => {
    await handleContinueWithRules(includedRules);
  };

  // Convert Rule to display format
  const rulesForDisplay = remainingRules.map((rule, index) => ({
    id: rule.rule_number,
    title: `Rule ${index + 1}`,
    description: rule.instruction,
    rule_number: rule.rule_number,
  }));

  return (
    <div>
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
        <p className={styles.headerTitle}>Playbook Library</p>
        <Tooltip
          appearance="inverted"
          content="Create new playbook"
          positioning="below"
          withArrow
          relationship="label"
        >
          <Button
            icon={<FaPlus />}
            onClick={() => navigateTo("PlaybookGenerator")}
            className={styles.headerIcon}
          />
        </Tooltip>
      </div>
      <Divider />

      {/* ============================
          NOTE 11-27-2025:
          Replace RuleTooltip with info box matching Module 3's Figma design
          ============================ */}
      {/* ============================
          NOTE 11-29-2025:
          Hide info box when loading spinner is showing
          ============================ */}
      {!loading && (
        <div className={styles.infoBox}>
          <div className={styles.infoBoxHeader}>
            <BlueCheckIcon className={styles.infoBoxIcon} />
            <p className={styles.infoBoxTitle}>Rules Configuration</p>
          </div>
          <p className={styles.infoBoxDescription}>
            Please advise if the following rules should apply.
          </p>
        </div>
      )}

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <Loader2 style={{ width: "24px", height: "24px" }} className={styles.animateSpin} />
          <p style={{ margin: 0, color: "#666" }}>Configuring rules...</p>
        </div>
      ) : (
        <>
          {remainingRules.length === 0 && includedRules.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "#666",
              }}
            >
              <p>No conditional rules to configure.</p>
            </div>
          ) : (
            <>
              <div className={styles.accordionContsiner}>
                {/* ============================
                    NOTE 11-27-2025:
                    Update Accordion to support multiple open items (all expanded by default)
                    ============================ */}
                <Accordion
                  multiple
                  collapsible
                  openItems={expanded}
                  onToggle={(_e, data) => {
                    setExpanded(data.openItems as string[]);
                  }}
                >
                  {rulesForDisplay.map((rule) => {
                    // ============================
                    // NOTE 11-27-2025:
                    // Update isOpen check to work with array of expanded items
                    // ============================
                    const isOpen = expanded.includes(rule.id);
                    const isIncluded = includedRules.some(
                      (r) => r.rule_number === rule.rule_number
                    );
                    return (
                      <AccordionItem
                        key={rule.id}
                        value={rule.id}
                        className={isOpen ? styles.accordionItemOpen : styles.accordionItem}
                      >
                        <AccordionHeader expandIconPosition="end">
                          <div className={styles.headerRow}>
                            <span className={styles.title}>
                              {rule.title}
                              {isIncluded && (
                                <span className={styles.badgeApply}>
                                  <Check size={14} /> Please apply
                                </span>
                              )}
                            </span>
                          </div>
                        </AccordionHeader>

                        <AccordionPanel style={{ padding: "0 10px 10px 10px" }}>
                          {rule.description && (
                            <p style={{ fontSize: 14, color: "#374151", marginTop: 0 }}>
                              {rule.description}
                            </p>
                          )}

                          <div className={styles.actions}>
                            {/* ============================
                                NOTE 11-27-2025:
                                Update button style to match Module 3's "Remove File" Figma design
                                ============================ */}
                            <button
                              type="button"
                              className={styles.secondaryButton}
                              onClick={() => {
                                console.log("Do not apply clicked for:", rule.rule_number);
                                handleRemove(rule.rule_number);
                              }}
                              disabled={isIncluded}
                            >
                              Do not apply
                            </button>
                            {/* ============================
                                NOTE 11-27-2025:
                                Update button style to match Module 3's Figma design
                                ============================ */}
                            <button
                              type="button"
                              className={styles.primaryButton}
                              onClick={() => handleInclude(rule.rule_number)}
                              disabled={isIncluded}
                            >
                              Please apply
                            </button>
                          </div>
                        </AccordionPanel>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>

              {includedRules.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    placeContent: "center",
                    marginTop: "24px",
                  }}
                >
                  <Button
                    onClick={handleContinue}
                    appearance="primary"
                    disabled={loading}
                    style={{
                      background: "var(--brand-gradient)",
                      border: "none",
                      color: "var(--text-on-brand)",
                      minWidth: "200px",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2
                          style={{ width: "16px", height: "16px", marginRight: "8px" }}
                          className={styles.animateSpin}
                        />
                        Processing...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default RulesConfiguration;
