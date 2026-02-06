import * as React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Spinner,
  makeStyles,
} from "@fluentui/react-components";
import { CopyRegular } from "@fluentui/react-icons";
import { RuleComparisonCard, RuleForComparison } from "./RuleComparisonCard";
import { backendApi, RulePair } from "../../../../../services/api";
import { useToast } from "../../../../hooks/use-toast";

const useStyles = makeStyles({
  pairContainer: {
    marginBottom: "16px",
  },
  sourceLabel: {
    fontSize: "11px",
    color: "#64748b",
    marginBottom: "4px",
    fontWeight: 500,
  },
  rulesRow: {
    display: "flex",
    gap: "12px",
    marginBottom: "12px",
  },
  ruleColumn: {
    flex: 1,
  },
  radioRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
  },
  radio: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
    accentColor: "#0F62FE",
    margin: 0,
  },
  actionButtons: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: "12px",
  },
  actionButton: {
    fontSize: "12px",
    padding: "6px 12px",
    borderRadius: "4px",
  },
  brandButton: {
    background: "linear-gradient(90deg, #5800FF 0%, #129EFF 100%) !important",
    color: "#ffffff !important",
    border: "none !important",
    backdropFilter: "none !important",
    WebkitBackdropFilter: "none !important",
    boxShadow: "none !important",
    "&:hover": {
      background: "linear-gradient(90deg, #5800FF 0%, #129EFF 100%) !important",
      color: "#ffffff !important",
      opacity: "0.9",
      backdropFilter: "none !important",
      WebkitBackdropFilter: "none !important",
      boxShadow: "none !important",
    },
    "&:active": {
      background: "linear-gradient(90deg, #5800FF 0%, #129EFF 100%) !important",
      color: "#ffffff !important",
      backdropFilter: "none !important",
      WebkitBackdropFilter: "none !important",
    },
  },
  progressBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "8px",
    backgroundColor: "#f1f5f9",
    borderRadius: "6px",
  },
});

export interface OverlappingPairResolution {
  pairIndex: number;
  resolution: "keep-both" | "keep-first" | "keep-second" | "merged";
  resultingRules: RuleForComparison[];
}

interface OverlappingRulesDialogProps {
  open: boolean;
  pairs: RulePair[];
  onComplete: (resolutions: OverlappingPairResolution[]) => void;
  onCancel: () => void;
}

export const OverlappingRulesDialog: React.FC<OverlappingRulesDialogProps> = ({
  open,
  pairs,
  onComplete,
  onCancel,
}) => {
  const styles = useStyles();
  const { toast } = useToast();

  const [currentPairIndex, setCurrentPairIndex] = React.useState(0);
  const [resolutions, setResolutions] = React.useState<OverlappingPairResolution[]>([]);
  const [editedRules, setEditedRules] = React.useState<{
    ruleA: RuleForComparison;
    ruleB: RuleForComparison;
  } | null>(null);
  const [isMerging, setIsMerging] = React.useState(false);
  const [selectedRule, setSelectedRule] = React.useState<"A" | "B" | null>(null);

  // Initialize edited rules when pair changes
  React.useEffect(() => {
    if (pairs[currentPairIndex]) {
      setEditedRules({
        ruleA: pairs[currentPairIndex].ruleA as RuleForComparison,
        ruleB: pairs[currentPairIndex].ruleB as RuleForComparison,
      });
      setSelectedRule(null);
    }
  }, [currentPairIndex, pairs]);

  const currentPair = pairs[currentPairIndex];
  const isLastPair = currentPairIndex === pairs.length - 1;

  const handleResolution = (resolution: "keep-both" | "keep-first" | "keep-second", resultingRules: RuleForComparison[]) => {
    const newResolutions = [
      ...resolutions,
      {
        pairIndex: currentPairIndex,
        resolution,
        resultingRules,
      },
    ];
    setResolutions(newResolutions);

    if (isLastPair) {
      onComplete(newResolutions);
    } else {
      setCurrentPairIndex(currentPairIndex + 1);
    }
  };

  const handleKeepBoth = () => {
    if (!editedRules) return;
    handleResolution("keep-both", [editedRules.ruleA, editedRules.ruleB]);
  };

  const handleKeepSelected = () => {
    if (!editedRules || !selectedRule) return;
    if (selectedRule === "A") {
      handleResolution("keep-first", [editedRules.ruleA]);
    } else {
      handleResolution("keep-second", [editedRules.ruleB]);
    }
  };

  const handleMergeForMe = async () => {
    if (!editedRules) return;
    setIsMerging(true);

    try {
      const response = await backendApi.mergeOverlappingRules({
        rules: [
          {
            id: editedRules.ruleA.id,
            instruction: editedRules.ruleA.instruction,
            example_language: editedRules.ruleA.example_language,
            brief_name: editedRules.ruleA.brief_name,
          },
          {
            id: editedRules.ruleB.id,
            instruction: editedRules.ruleB.instruction,
            example_language: editedRules.ruleB.example_language,
            brief_name: editedRules.ruleB.brief_name,
          },
        ],
      });

      if (response.success && response.data?.mergedRule) {
        const mergedRule: RuleForComparison = {
          ...response.data.mergedRule,
          sourcePlaybookId: "merged",
          sourcePlaybookName: "Merged",
          categoryType: editedRules.ruleA.categoryType,
        };

        const newResolutions = [
          ...resolutions,
          {
            pairIndex: currentPairIndex,
            resolution: "merged" as const,
            resultingRules: [mergedRule],
          },
        ];
        setResolutions(newResolutions);

        toast({
          title: "Rules Merged",
          description: "The overlapping rules have been merged into one.",
        });

        if (isLastPair) {
          onComplete(newResolutions);
        } else {
          setCurrentPairIndex(currentPairIndex + 1);
        }
      } else {
        throw new Error(response.error?.message || "Failed to merge rules");
      }
    } catch (error) {
      console.error("Failed to merge rules:", error);
      toast({
        title: "Merge Failed",
        description: "Could not merge rules automatically. Please resolve manually.",
      });
    } finally {
      setIsMerging(false);
    }
  };

  const handleEditRule = (which: "A" | "B", updatedRule: RuleForComparison) => {
    if (!editedRules) return;
    setEditedRules({
      ...editedRules,
      [which === "A" ? "ruleA" : "ruleB"]: updatedRule,
    });
  };

  const handleDeleteRule = (which: "A" | "B") => {
    if (!editedRules) return;
    // If one is deleted, keep the other
    if (which === "A") {
      handleResolution("keep-second", [editedRules.ruleB]);
    } else {
      handleResolution("keep-first", [editedRules.ruleA]);
    }
  };

  if (!currentPair || !editedRules) return null;

  return (
    <Dialog open={open} modalType="modal">
      <DialogSurface style={{ maxWidth: "700px", width: "95vw" }}>
        <DialogBody>
          <DialogTitle
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <CopyRegular
              style={{
                backgroundColor: "#dbeafe",
                borderRadius: "50%",
                padding: "10px",
                fontSize: "24px",
                color: "#2563eb",
              }}
            />
          </DialogTitle>
          <DialogContent>
            <p
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "6px",
                fontSize: "15px",
                fontWeight: 600,
                marginTop: "6px",
                marginBottom: "16px",
              }}
            >
              <span style={{ fontSize: "16px" }}>💡</span>
              These rules appear to be similar.
            </p>

            {/* Action buttons - moved above progress */}
            <div className={styles.actionButtons}>
              <Button
                className={styles.actionButton}
                appearance="outline"
                onClick={handleKeepBoth}
              >
                Keep Both
              </Button>
              <Button
                className="brand-btn"
                appearance="primary"
                onClick={handleKeepSelected}
                disabled={!selectedRule}
                style={{
                  background: "var(--brand-gradient)",
                  color: "var(--text-on-brand)",
                  border: "none",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  fontWeight: 500,
                  opacity: selectedRule ? 1 : 0.6,
                }}
              >
                {selectedRule === "A"
                  ? "Keep Left Only"
                  : selectedRule === "B"
                  ? "Keep Right Only"
                  : "Select a Rule"}
              </Button>
              <Button
                className="brand-btn"
                appearance="primary"
                onClick={handleMergeForMe}
                disabled={isMerging}
                icon={isMerging ? <Spinner size="tiny" /> : undefined}
                style={{
                  background: "var(--brand-gradient)",
                  color: "var(--text-on-brand)",
                  border: "none",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                {isMerging ? "Merging..." : "Merge for Me"}
              </Button>
            </div>

            {/* Progress indicator */}
            <div className={styles.progressBar}>
              <span style={{ fontSize: "13px", fontWeight: 500 }}>
                {currentPairIndex + 1} of {pairs.length}
              </span>
            </div>

            {/* Current pair */}
            <div className={styles.pairContainer}>
              <div className={styles.rulesRow}>
                <div className={styles.ruleColumn}>
                  <div className={styles.radioRow}>
                    <input
                      type="radio"
                      checked={selectedRule === "A"}
                      onChange={() => setSelectedRule("A")}
                      className={styles.radio}
                    />
                    <span className={styles.sourceLabel}>
                      From: {editedRules.ruleA.sourcePlaybookName}
                    </span>
                  </div>
                  <RuleComparisonCard
                    rule={editedRules.ruleA}
                    isSelected={selectedRule === "A"}
                    onSelect={() => setSelectedRule("A")}
                    onEdit={(updated) => handleEditRule("A", updated)}
                    onDelete={() => handleDeleteRule("A")}
                    showRadio={false}
                    hideSource={true}
                  />
                </div>
                <div className={styles.ruleColumn}>
                  <div className={styles.radioRow}>
                    <input
                      type="radio"
                      checked={selectedRule === "B"}
                      onChange={() => setSelectedRule("B")}
                      className={styles.radio}
                    />
                    <span className={styles.sourceLabel}>
                      From: {editedRules.ruleB.sourcePlaybookName}
                    </span>
                  </div>
                  <RuleComparisonCard
                    rule={editedRules.ruleB}
                    isSelected={selectedRule === "B"}
                    onSelect={() => setSelectedRule("B")}
                    onEdit={(updated) => handleEditRule("B", updated)}
                    onDelete={() => handleDeleteRule("B")}
                    showRadio={false}
                    hideSource={true}
                  />
                </div>
              </div>
            </div>
          </DialogContent>
          <DialogActions
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              flexDirection: "row",
            }}
          >
            <Button
              style={{ flex: 1, borderRadius: "6px" }}
              appearance="outline"
              onClick={onCancel}
            >
              Cancel Combination
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};