import * as React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  Radio,
  RadioGroup,
  Textarea,
  Tooltip,
  makeStyles,
} from "@fluentui/react-components";
import { FaPlus, FaCheck } from "react-icons/fa6";
import { ChevronDown, ChevronUp } from "lucide-react";
import { MdDelete } from "react-icons/md";
import { DismissRegular } from "@fluentui/react-icons";

const useStyles = makeStyles({
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
  ruleCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    marginBottom: "8px",
    overflow: "hidden",
  },
  ruleCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    backgroundColor: "#f9fafb",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#f3f4f6",
    },
  },
  ruleCardHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: 1,
    overflow: "hidden",
  },
  ruleCardTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#374151",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  ruleCardBadge: {
    fontSize: "10px",
    padding: "2px 6px",
    borderRadius: "4px",
    fontWeight: 500,
    flexShrink: 0,
  },
  ruleCardActions: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  ruleCardContent: {
    padding: "12px",
    borderTop: "1px solid #e5e7eb",
    backgroundColor: "#ffffff",
  },
  ruleCardField: {
    marginBottom: "8px",
  },
  ruleCardLabel: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#6b7280",
    marginBottom: "4px",
    textTransform: "uppercase",
  },
  ruleCardValue: {
    fontSize: "13px",
    color: "#374151",
    lineHeight: "1.4",
  },
  deleteButton: {
    minWidth: "24px",
    width: "24px",
    height: "24px",
    padding: 0,
    backgroundColor: "transparent",
    border: "none",
    color: "#9ca3af",
    "&:hover": {
      backgroundColor: "#fee2e2",
      color: "#dc2626",
    },
  },
  chevronIcon: {
    width: "16px",
    height: "16px",
    color: "#6b7280",
  },
  addedRulesContainer: {
    maxHeight: "200px",
    overflowY: "auto",
    marginBottom: "12px",
  },
});

export interface Rule {
  id: string;
  rule_number: string;
  brief_name: string;
  instruction: string;
  example_language?: string;
  location_text?: string;
}

export interface ManualAddRuleDialogProps {
  addRules: (type: string, newRules: Rule[]) => void;
  existingRules: Rule[];
  defaultRuleType?: string;
  triggerButton?: React.ReactNode;
}

interface AddedRule {
  type: string;
  rule: Rule;
}

const getRuleTypeBadgeColor = (type: string): string => {
  switch (type) {
    case "Rules for Instruction Requests":
      return "#dbeafe";
    case "Rules for Contract Amendments":
      return "#dcfce7";
    case "Conditional Rules for Contract Amendments":
      return "#fef3c7";
    default:
      return "#f3f4f6";
  }
};

const getRuleTypeShortLabel = (type: string): string => {
  switch (type) {
    case "Rules for Instruction Requests":
      return "IR";
    case "Rules for Contract Amendments":
      return "CA";
    case "Conditional Rules for Contract Amendments":
      return "Conditional";
    default:
      return type;
  }
};

// Collapsible Rule Card Component
interface RuleCardPreviewProps {
  rule: AddedRule;
  index: number;
  onDelete: () => void;
}

const RuleCardPreview: React.FC<RuleCardPreviewProps> = ({ rule, index, onDelete }) => {
  const styles = useStyles();
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className={styles.ruleCard}>
      <div
        className={styles.ruleCardHeader}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={styles.ruleCardHeaderLeft}>
          <span
            className={styles.ruleCardBadge}
            style={{ backgroundColor: getRuleTypeBadgeColor(rule.type) }}
          >
            {getRuleTypeShortLabel(rule.type)}
          </span>
          <span className={styles.ruleCardTitle}>
            {rule.rule.brief_name || `Rule ${index + 1}`}
          </span>
        </div>
        <div className={styles.ruleCardActions}>
          <Button
            className={styles.deleteButton}
            appearance="subtle"
            icon={<DismissRegular style={{ fontSize: "14px" }} />}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          />
          {isExpanded ? (
            <ChevronUp className={styles.chevronIcon} />
          ) : (
            <ChevronDown className={styles.chevronIcon} />
          )}
        </div>
      </div>
      {isExpanded && (
        <div className={styles.ruleCardContent}>
          <div className={styles.ruleCardField}>
            <div className={styles.ruleCardLabel}>Instruction</div>
            <div className={styles.ruleCardValue}>{rule.rule.instruction}</div>
          </div>
          {rule.rule.example_language && (
            <div className={styles.ruleCardField} style={{ marginBottom: 0 }}>
              <div className={styles.ruleCardLabel}>Example Language</div>
              <div className={styles.ruleCardValue}>{rule.rule.example_language}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Delete Confirmation Dialog
interface DeleteConfirmDialogProps {
  open: boolean;
  displayNumber: number;
  instruction: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  displayNumber,
  instruction,
  onConfirm,
  onCancel,
}) => {
  return (
    <Dialog open={open}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MdDelete
              style={{
                color: "blue",
                backgroundColor: "#F2F2F2",
                borderRadius: "50%",
                padding: "8px",
                fontSize: "32px",
              }}
            />
          </DialogTitle>
          <DialogContent>
            <p
              style={{
                fontSize: "17px",
                fontWeight: "600",
                textAlign: "center",
                marginTop: "6px",
              }}
            >
              Are you sure to delete this rule?
            </p>
            <p
              style={{
                margin: 0,
                marginBottom: "8px",
                backgroundColor: "#E6E6E6",
                borderRadius: "8px",
                padding: "10px",
                maxHeight: "6em",
                overflowY: "auto",
                lineHeight: "1.5em",
              }}
            >
              <span
                style={{
                  color: "#0F62FE",
                  fontWeight: "600",
                }}
              >
                Rule {displayNumber}:{" "}
              </span>
              {instruction}
            </p>
          </DialogContent>
          <DialogActions
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexDirection: "row",
            }}
          >
            <Button
              style={{
                flex: 1,
                padding: "6px",
                borderRadius: "6px",
              }}
              appearance="secondary"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              style={{
                flex: 1,
                backgroundColor: "#0F62FE",
                padding: "6px",
                borderRadius: "6px",
              }}
              appearance="primary"
              onClick={onConfirm}
            >
              Yes Please
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export const ManualAddRuleDialog: React.FC<ManualAddRuleDialogProps> = ({
  addRules,
  existingRules,
  defaultRuleType,
  triggerButton,
}) => {
  const styles = useStyles();
  const [open, setOpen] = React.useState(false);

  // Form state
  const [instruction, setInstruction] = React.useState("");
  const [type, setType] = React.useState(defaultRuleType || "");
  const [example, setExample] = React.useState("");
  const [briefName, setBriefName] = React.useState("");

  // Accumulated rules state
  const [addedRules, setAddedRules] = React.useState<AddedRule[]>([]);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [ruleToDelete, setRuleToDelete] = React.useState<{ index: number; rule: AddedRule } | null>(null);

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setType(defaultRuleType || "");
    } else {
      setType("");
      setInstruction("");
      setExample("");
      setBriefName("");
      setAddedRules([]);
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    }
  }, [open, defaultRuleType]);

  // Get all rules including newly added ones (for rule number generation)
  const allRulesForNumbering = React.useMemo(() => {
    const newlyAddedRules = addedRules.map((ar) => ar.rule);
    return [...existingRules, ...newlyAddedRules];
  }, [existingRules, addedRules]);

  const generateRuleNumber = (ruleType: string): string => {
    const prefix = ruleType === "Rules for Instruction Requests" ? "IR" : "CA";

    let number = Math.floor(Math.random() * 999) + 1;
    let ruleNumber = `${prefix}${number}`;

    while (allRulesForNumbering.some((rule) => rule.rule_number === ruleNumber)) {
      number++;
      ruleNumber = `${prefix}${number}`;
    }

    return ruleNumber;
  };

  const handleAddRule = () => {
    const ruleNumber = generateRuleNumber(type);
    const newRule: Rule = {
      id: crypto.randomUUID(),
      rule_number: ruleNumber,
      brief_name: briefName.trim() || instruction.split(/\s+/).slice(0, 6).join(" "),
      instruction: instruction.trim(),
      example_language: example.trim() || undefined,
      location_text: "",
    };

    setAddedRules((prev) => [...prev, { type, rule: newRule }]);

    // Clear form but keep the type for convenience
    setInstruction("");
    setExample("");
    setBriefName("");
  };

  const handleDeleteClick = (index: number, rule: AddedRule) => {
    setRuleToDelete({ index, rule });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (ruleToDelete !== null) {
      setAddedRules((prev) => prev.filter((_, i) => i !== ruleToDelete.index));
    }
    setDeleteDialogOpen(false);
    setRuleToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setRuleToDelete(null);
  };

  const handleFinish = () => {
    const rulesByType: Record<string, Rule[]> = {};
    addedRules.forEach(({ type: ruleType, rule }) => {
      if (!rulesByType[ruleType]) {
        rulesByType[ruleType] = [];
      }
      rulesByType[ruleType].push(rule);
    });

    Object.entries(rulesByType).forEach(([ruleType, rules]) => {
      addRules(ruleType, rules);
    });

    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const canAddRule = type && instruction.trim();
  const hasAddedRules = addedRules.length > 0;

  // Default trigger button if none provided
  const defaultTrigger = (
    <Tooltip
      appearance="inverted"
      content="Add new rule"
      positioning="below"
      withArrow
      relationship="label"
    >
      <Button
        icon={<FaPlus />}
        className={styles.headerIcon}
      />
    </Tooltip>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
        <DialogTrigger disableButtonEnhancement>
          <span>{triggerButton || defaultTrigger}</span>
        </DialogTrigger>
        <DialogSurface>
          <DialogBody>
            <DialogTitle
              style={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <FaPlus
                color="blue"
                style={{
                  backgroundColor: "#F0F0F0",
                  borderRadius: "50%",
                  padding: "10px",
                }}
              />
            </DialogTitle>

            <DialogContent>
              <p
                style={{
                  display: "flex",
                  justifyContent: "center",
                  fontSize: "15px",
                  fontWeight: 600,
                  marginBottom: "16px",
                }}
              >
                Add New Rules
              </p>

              {/* Added Rules Cards */}
              {hasAddedRules && (
                <div className={styles.addedRulesContainer}>
                  {addedRules.map((ar, index) => (
                    <RuleCardPreview
                      key={ar.rule.id}
                      rule={ar}
                      index={index}
                      onDelete={() => handleDeleteClick(index, ar)}
                    />
                  ))}
                </div>
              )}

              <Field label="Rule Type:">
                <RadioGroup value={type} onChange={(_, data) => setType(data.value)}>
                  <Radio
                    style={{ fontSize: "13px" }}
                    value="Rules for Instruction Requests"
                    label="Instruction Request"
                  />
                  <Radio
                    value="Rules for Contract Amendments"
                    label="Contract Amendments - Always Applied"
                  />
                  <Radio
                    value="Conditional Rules for Contract Amendments"
                    label="Contract Amendments - Conditionally Applied"
                  />
                </RadioGroup>
              </Field>

              <label style={{ paddingBottom: "6px", display: "block", marginTop: "12px" }}>
                Brief Name <span style={{ color: "#6b7280", fontSize: "12px" }}>(optional)</span>
              </label>
              <Field>
                <Textarea
                  value={briefName}
                  onChange={(e) => setBriefName(e.target.value)}
                  placeholder="Auto-generated from instruction if left blank"
                  style={{ minHeight: "40px" }}
                />
              </Field>

              <label style={{ paddingBottom: "6px", display: "block", marginTop: "12px" }}>
                Instruction <span style={{ color: "red" }}>*</span>
              </label>
              <Field>
                <Textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="Enter the rule instruction"
                  style={{ minHeight: "80px" }}
                />
              </Field>

              <label style={{ paddingBottom: "6px", display: "block", marginTop: "12px" }}>
                Example Language <span style={{ color: "#6b7280", fontSize: "12px" }}>(optional)</span>
              </label>
              <Field>
                <Textarea
                  value={example}
                  onChange={(e) => setExample(e.target.value)}
                  placeholder="Optional example language for this rule"
                />
              </Field>
            </DialogContent>

            <DialogActions style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 15px" }}>
              <Button
                style={{
                  width: "100%",
                  borderRadius: "6px",
                  backgroundColor: canAddRule ? "#0F62FE" : undefined,
                }}
                appearance="primary"
                onClick={handleAddRule}
                disabled={!canAddRule}
                icon={<FaPlus style={{ fontSize: "12px" }} />}
              >
                Add Rule
              </Button>

              <div style={{ display: "flex", flexDirection: "row", gap: "8px", width: "100%" }}>
                <Button
                  style={{ flex: 1, borderRadius: "6px" }}
                  appearance="secondary"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button
                  style={{
                    flex: 1,
                    borderRadius: "6px",
                    backgroundColor: hasAddedRules ? "#16a34a" : undefined,
                  }}
                  appearance="primary"
                  onClick={handleFinish}
                  disabled={!hasAddedRules}
                  icon={<FaCheck style={{ fontSize: "12px" }} />}
                >
                  Finish
                </Button>
              </div>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        displayNumber={ruleToDelete ? ruleToDelete.index + 1 : 0}
        instruction={ruleToDelete?.rule.rule.instruction || ""}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
};
