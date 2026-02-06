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
import { MergeRegular } from "@fluentui/react-icons";
import {
  backendApi,
  Playbook,
  RuleCategory,
  Rule,
  RulePair,
  JobProgress,
} from "../../../../../services/api";
import { useToast } from "../../../../hooks/use-toast";
import { useNavigation } from "../../../../hooks/use-navigation";
import { MetadataConflictDialog } from "./MetadataConflictDialog";
import { OverlappingRulesDialog, OverlappingPairResolution } from "./OverlappingRulesDialog";
import { ConflictingRulesDialog, ConflictPairResolution } from "./ConflictingRulesDialog";
import { RuleForComparison } from "./RuleComparisonCard";

const useStyles = makeStyles({
  progressContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 20px",
    gap: "16px",
  },
  progressText: {
    fontSize: "14px",
    color: "#64748b",
    textAlign: "center",
  },
  stepIndicator: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  stepDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#e2e8f0",
  },
  stepDotActive: {
    backgroundColor: "#0F62FE",
  },
  stepDotComplete: {
    backgroundColor: "#22c55e",
  },
});

interface CombinePlaybooksDialogProps {
  open: boolean;
  playbooks: Playbook[];
  onClose: () => void;
  onCombined: (newPlaybook: Playbook) => void;
}

type CombineStep =
  | "idle"
  | "metadata-check"
  | "comparing-rules"
  | "resolving-overlaps"
  | "resolving-conflicts"
  | "creating-playbook"
  | "complete";

interface RuleWithSource extends Rule {
  id: string;
  brief_name: string;
  sourcePlaybookId: string;
  sourcePlaybookName: string;
  categoryType: string;
}

export const CombinePlaybooksDialog: React.FC<CombinePlaybooksDialogProps> = ({
  open,
  playbooks,
  onClose,
  onCombined,
}) => {
  const styles = useStyles();
  const { toast } = useToast();
  const { navigateTo } = useNavigation();

  // State
  const [currentStep, setCurrentStep] = React.useState<CombineStep>("idle");
  const [progress, setProgress] = React.useState<string>("");
  const [resolvedMetadata, setResolvedMetadata] = React.useState<{
    playbookType: string;
    jurisdiction: string;
    userPosition: string;
  } | null>(null);
  const [overlappingPairs, setOverlappingPairs] = React.useState<RulePair[]>([]);
  const [conflictingPairs, setConflictingPairs] = React.useState<RulePair[]>([]);
  const [allRulesWithSource, setAllRulesWithSource] = React.useState<RuleWithSource[]>([]);
  const [finalRules, setFinalRules] = React.useState<RuleWithSource[]>([]);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setCurrentStep("metadata-check");
      setProgress("");
      setResolvedMetadata(null);
      setOverlappingPairs([]);
      setConflictingPairs([]);
      setAllRulesWithSource([]);
      setFinalRules([]);
    }
  }, [open]);

  // Extract all rules from playbooks with source info
  const extractAllRules = (pbs: Playbook[]): RuleWithSource[] => {
    const allRules: RuleWithSource[] = [];
    let ruleCounter = 0;

    pbs.forEach((playbook) => {
      const rules = playbook.rules as RuleCategory[] | undefined;
      if (!rules || !Array.isArray(rules)) return;

      rules.forEach((category) => {
        if (!category.type || !Array.isArray(category.rules)) return;

        category.rules.forEach((rule) => {
          ruleCounter++;
          allRules.push({
            ...rule,
            id: rule.id || `combined-${ruleCounter}`,
            brief_name: rule.brief_name || "",
            sourcePlaybookId: playbook.id,
            sourcePlaybookName: playbook.playbookName,
            categoryType: category.type,
          });
        });
      });
    });

    return allRules;
  };

  // Chunk rules into batches
  const chunkRules = (rules: RuleWithSource[], batchSize: number): RuleWithSource[][] => {
    const chunks: RuleWithSource[][] = [];
    for (let i = 0; i < rules.length; i += batchSize) {
      chunks.push(rules.slice(i, i + batchSize));
    }
    return chunks;
  };

  // Compare rules between playbooks (batched)
  const compareRulesBatched = async (
    baseRules: RuleWithSource[],
    comparisonRules: RuleWithSource[]
  ): Promise<{ overlapping: RulePair[]; conflicting: RulePair[] }> => {
    const baseBatches = chunkRules(baseRules, 10);
    const comparisonBatches = chunkRules(comparisonRules, 5);

    const allOverlapping: RulePair[] = [];
    const allConflicting: RulePair[] = [];

    let totalComparisons = baseBatches.length * comparisonBatches.length;
    let completedComparisons = 0;

    for (const baseBatch of baseBatches) {
      for (const compBatch of comparisonBatches) {
        setProgress(
          `Comparing rules... (${completedComparisons + 1}/${totalComparisons} batches)`
        );

        try {
          const response = await backendApi.compareRulesForCombination({
            baseRules: baseBatch.map((r) => ({
              id: r.id,
              rule_number: r.rule_number,
              brief_name: r.brief_name,
              instruction: r.instruction,
              example_language: r.example_language,
              sourcePlaybookId: r.sourcePlaybookId,
              sourcePlaybookName: r.sourcePlaybookName,
              categoryType: r.categoryType,
            })),
            comparisonRules: compBatch.map((r) => ({
              id: r.id,
              rule_number: r.rule_number,
              brief_name: r.brief_name,
              instruction: r.instruction,
              example_language: r.example_language,
              sourcePlaybookId: r.sourcePlaybookId,
              sourcePlaybookName: r.sourcePlaybookName,
              categoryType: r.categoryType,
            })),
          });

          if (response.success && response.data) {
            allOverlapping.push(...response.data.overlappingPairs);
            allConflicting.push(...response.data.conflictingPairs);
          }
        } catch (error) {
          console.error("Batch comparison failed:", error);
        }

        completedComparisons++;
      }
    }

    return { overlapping: allOverlapping, conflicting: allConflicting };
  };

  // Handle metadata confirmation
const handleMetadataConfirm = async (metadata: {
  playbookType: string;
  jurisdiction: string;
  userPosition: string;
}) => {
  setResolvedMetadata(metadata);
  setCurrentStep("comparing-rules");
  setProgress("Extracting rules from playbooks...");

  // Extract all rules
  const allRules = extractAllRules(playbooks);
  setAllRulesWithSource(allRules);
  setFinalRules([...allRules]); // Start with all rules

  let overlapping: RulePair[] = [];
  let conflicting: RulePair[] = [];

  // For sequential comparison with multiple playbooks
  if (playbooks.length === 2) {
    // Simple case: compare playbook A vs B
    const rulesA = allRules.filter((r) => r.sourcePlaybookId === playbooks[0].id);
    const rulesB = allRules.filter((r) => r.sourcePlaybookId === playbooks[1].id);

    const result = await compareRulesBatched(rulesA, rulesB);
    overlapping = result.overlapping;
    conflicting = result.conflicting;
  } else {
    // Multiple playbooks: sequential merge
    // Merge first two, then compare with third, etc.
    let mergedRules = allRules.filter((r) => r.sourcePlaybookId === playbooks[0].id);

    for (let i = 1; i < playbooks.length; i++) {
      setProgress(`Comparing with playbook ${i + 1} of ${playbooks.length}...`);
      const nextPlaybookRules = allRules.filter(
        (r) => r.sourcePlaybookId === playbooks[i].id
      );

      const result = await compareRulesBatched(mergedRules, nextPlaybookRules);

      overlapping.push(...result.overlapping);
      conflicting.push(...result.conflicting);

      // Add non-conflicting/non-overlapping rules to merged set
      const overlappingIds = new Set([
        ...result.overlapping.flatMap((p) => [p.ruleA.id, p.ruleB.id]),
      ]);
      const conflictingIds = new Set([
        ...result.conflicting.flatMap((p) => [p.ruleA.id, p.ruleB.id]),
      ]);

      const cleanNextRules = nextPlaybookRules.filter(
        (r) => !overlappingIds.has(r.id) && !conflictingIds.has(r.id)
      );
      mergedRules = [...mergedRules, ...cleanNextRules];
    }
  }

  // Update state
  setOverlappingPairs(overlapping);
  setConflictingPairs(conflicting);

  // Proceed to next step - use local variables, not state (state hasn't updated yet)
  if (overlapping.length > 0) {
    setCurrentStep("resolving-overlaps");
  } else if (conflicting.length > 0) {
    setCurrentStep("resolving-conflicts");
  } else {
    await createCombinedPlaybook(allRules, metadata);
  }
};

  // Handle overlap resolutions
  const handleOverlapResolutions = (resolutions: OverlappingPairResolution[]) => {
    // Update final rules based on resolutions
    let updatedRules = [...allRulesWithSource];

    // Remove all rules that were part of overlapping pairs
    const resolvedIds = new Set<string>();
    overlappingPairs.forEach((pair) => {
      resolvedIds.add(pair.ruleA.id);
      resolvedIds.add(pair.ruleB.id);
    });
    updatedRules = updatedRules.filter((r) => !resolvedIds.has(r.id));

    // Add resolved rules
    resolutions.forEach((res) => {
      res.resultingRules.forEach((rule) => {
        updatedRules.push({
          ...rule,
          rule_number: rule.rule_number || "",
          categoryType: rule.categoryType || "Rules for Contract Amendments",
        } as RuleWithSource);
      });
    });

    setFinalRules(updatedRules);

    // Proceed to conflicts or create
    if (conflictingPairs.length > 0) {
      setCurrentStep("resolving-conflicts");
    } else if (resolvedMetadata) {
      createCombinedPlaybook(updatedRules, resolvedMetadata);
    }
  };

  // Handle conflict resolutions
  const handleConflictResolutions = (resolutions: ConflictPairResolution[]) => {
    let updatedRules = [...finalRules];

    // Remove all rules that were part of conflicting pairs
    const resolvedIds = new Set<string>();
    conflictingPairs.forEach((pair) => {
      resolvedIds.add(pair.ruleA.id);
      resolvedIds.add(pair.ruleB.id);
    });
    updatedRules = updatedRules.filter((r) => !resolvedIds.has(r.id));

    // Add resolved rules
    resolutions.forEach((res) => {
      res.resultingRules.forEach((rule) => {
        updatedRules.push({
          ...rule,
          rule_number: rule.rule_number || "",
          categoryType: rule.categoryType || "Rules for Contract Amendments",
        } as RuleWithSource);
      });
    });

    setFinalRules(updatedRules);

    // Create playbook
    if (resolvedMetadata) {
      createCombinedPlaybook(updatedRules, resolvedMetadata);
    }
  };

  // Prepare combined playbook for preview (does NOT save to backend)
  const createCombinedPlaybook = async (
    rules: RuleWithSource[],
    metadata: { playbookType: string; jurisdiction: string; userPosition: string }
  ) => {
    setCurrentStep("creating-playbook");
    setProgress("Preparing combined playbook for preview...");

    try {
      // Group rules by category
      const categoryMap = new Map<string, RuleWithSource[]>();
      rules.forEach((rule) => {
        const existing = categoryMap.get(rule.categoryType) || [];
        existing.push(rule);
        categoryMap.set(rule.categoryType, existing);
      });

      // Build rule categories with renumbered rules
      const ruleCategories: RuleCategory[] = [];
      categoryMap.forEach((categoryRules, type) => {
        ruleCategories.push({
          type,
          rules: categoryRules.map((r, idx) => ({
            rule_number: `${idx + 1}`,
            brief_name: r.brief_name,
            instruction: r.instruction,
            example_language: r.example_language,
          })),
        });
      });

      // Merge tags from all playbooks
      const allTags = new Set<string>();
      playbooks.forEach((p) => {
        if (p.tags) {
          const tagList =
            typeof p.tags === "string"
              ? p.tags.split(",").map((t) => t.trim()).filter(Boolean)
              : [];
          tagList.forEach((tag) => allTags.add(tag));
        }
      });

      // Generate name
      const names = playbooks.map((p) => p.playbookName).slice(0, 2);
      const playbookName =
        playbooks.length <= 2
          ? `Combined: ${names.join(" + ")}`
          : `Combined: ${names.join(" + ")} + ${playbooks.length - 2} more`;

      // Build draft playbook object for preview (no backend call)
      const draftPlaybook: Playbook = {
        id: "", // Empty ID indicates unsaved draft
        playbookName,
        description: `Combined playbook created from: ${playbooks.map((p) => p.playbookName).join(", ")}`,
        playbookType: metadata.playbookType,
        userPosition: metadata.userPosition,
        jurisdiction: metadata.jurisdiction,
        tags: Array.from(allTags).join(", "),
        rules: ruleCategories,
        metadata: {
          combinedFrom: playbooks.map((p) => ({ id: p.id, name: p.playbookName })),
          combinedAt: new Date().toISOString(),
        },
      } as Playbook;

      // Store for RulesPage preview (NOT saved to backend yet)
      localStorage.setItem("playbook", JSON.stringify(draftPlaybook));
      localStorage.setItem("rules", JSON.stringify(ruleCategories));
      localStorage.removeItem("generationContexts");

      toast({
        title: "Ready for Review",
        description: `"${playbookName}" with ${rules.length} rules is ready. Click "Save Playbook" to save.`,
      });

      setCurrentStep("complete");
      onCombined(draftPlaybook);
      handleClose();
      navigateTo("rules");
    } catch (error) {
      console.error("Failed to prepare combined playbook:", error);
      toast({
        title: "Combination Failed",
        description: error instanceof Error ? error.message : "Failed to prepare playbook",
      });
      setCurrentStep("idle");
    }
  };

  const handleClose = () => {
    setCurrentStep("idle");
    onClose();
  };

  // Render based on current step
  if (currentStep === "metadata-check") {
    return (
      <MetadataConflictDialog
        open={open}
        playbooks={playbooks}
        onConfirm={handleMetadataConfirm}
        onCancel={handleClose}
      />
    );
  }

  if (currentStep === "resolving-overlaps" && overlappingPairs.length > 0) {
    return (
      <OverlappingRulesDialog
        open={open}
        pairs={overlappingPairs}
        onComplete={handleOverlapResolutions}
        onCancel={handleClose}
      />
    );
  }

  if (currentStep === "resolving-conflicts" && conflictingPairs.length > 0) {
    return (
      <ConflictingRulesDialog
        open={open}
        pairs={conflictingPairs}
        onComplete={handleConflictResolutions}
        onCancel={handleClose}
      />
    );
  }

  // Loading/progress dialog for comparing and creating
  if (currentStep === "comparing-rules" || currentStep === "creating-playbook") {
    return (
      <Dialog open={open}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle style={{ display: "flex", justifyContent: "center" }}>
              <MergeRegular
                style={{
                  backgroundColor: "#E8F4FD",
                  borderRadius: "50%",
                  padding: "10px",
                  fontSize: "24px",
                  color: "#0F62FE",
                }}
              />
            </DialogTitle>
            <DialogContent>
              <div className={styles.progressContainer}>
                <Spinner size="medium" />
                <p className={styles.progressText}>{progress}</p>

                {/* Step indicators */}
                <div className={styles.stepIndicator}>
                  <div
                    className={`${styles.stepDot} ${styles.stepDotComplete}`}
                    title="Metadata"
                  />
                  <div
                    className={`${styles.stepDot} ${
                      currentStep === "comparing-rules"
                        ? styles.stepDotActive
                        : currentStep === "creating-playbook"
                        ? styles.stepDotComplete
                        : ""
                    }`}
                    title="Compare Rules"
                  />
                  <div
                    className={`${styles.stepDot} ${
                      currentStep === "creating-playbook" ? styles.stepDotActive : ""
                    }`}
                    title="Create Playbook"
                  />
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="outline" onClick={handleClose}>
                Cancel
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    );
  }

  return null;
};