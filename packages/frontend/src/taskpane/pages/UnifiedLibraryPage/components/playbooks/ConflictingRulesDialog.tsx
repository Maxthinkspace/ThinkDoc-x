import * as React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  makeStyles,
} from "@fluentui/react-components";
import { RuleComparisonCard, RuleForComparison } from "./RuleComparisonCard";
import { RulePair } from "../../../../../services/api";

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
  progressBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "8px",
    backgroundColor: "#fef2f2",
    borderRadius: "6px",
    border: "1px solid #fecaca",
  },
});

export interface ConflictPairResolution {
  pairIndex: number;
  resolution: "keep-all" | "keep-first" | "keep-second";
  resultingRules: RuleForComparison[];
}

interface ConflictingRulesDialogProps {
  open: boolean;
  pairs: RulePair[];
  onComplete: (resolutions: ConflictPairResolution[]) => void;
  onCancel: () => void;
}

export const ConflictingRulesDialog: React.FC<ConflictingRulesDialogProps> = ({
  open,
  pairs,
  onComplete,
  onCancel,
}) => {
  const styles = useStyles();

  const [currentPairIndex, setCurrentPairIndex] = React.useState(0);
  const [resolutions, setResolutions] = React.useState<ConflictPairResolution[]>([]);
  const [selectedRule, setSelectedRule] = React.useState<"A" | "B" | "both" | null>(null);
  const [editedRules, setEditedRules] = React.useState<{
    ruleA: RuleForComparison;
    ruleB: RuleForComparison;
  } | null>(null);

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

  const handleResolution = (
    resolution: "keep-all" | "keep-first" | "keep-second",
    resultingRules: RuleForComparison[]
  ) => {
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

  const handleKeepAll = () => {
    if (!editedRules) return;
    handleResolution("keep-all", [editedRules.ruleA, editedRules.ruleB]);
  };

  const handleKeepSelected = () => {
    if (!editedRules || !selectedRule) return;
    if (selectedRule === "both") {
      handleResolution("keep-all", [editedRules.ruleA, editedRules.ruleB]);
    } else if (selectedRule === "A") {
      handleResolution("keep-first", [editedRules.ruleA]);
    } else {
      handleResolution("keep-second", [editedRules.ruleB]);
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
              <span style={{ fontSize: "16px" }}>⚠️</span>
              These rules appear to conflict.
            </p>

            {/* Action buttons - moved above progress */}
            <div className={styles.actionButtons}>
              <Button
                className={styles.actionButton}
                appearance="outline"
                onClick={handleKeepAll}
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
            </div>

            {/* Progress indicator */}
            <div className={styles.progressBar}>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#991b1b" }}>
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