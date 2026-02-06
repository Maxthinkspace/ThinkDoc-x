import * as React from "react";
import {
  makeStyles,
  Tooltip,
  Field,
  Input,
  Textarea,
} from "@fluentui/react-components";
import { TrashIcon, SquarePen, Check, X } from "lucide-react";

const useStyles = makeStyles({
  card: {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    backgroundColor: "#F6F6F6",
    padding: "16px",
    paddingTop: "12px",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  cardSelected: {
    border: "2px solid #0F62FE",
    backgroundColor: "#EBF5FF",
  },
  sourceLabel: {
    fontSize: "11px",
    color: "#64748b",
    marginBottom: "4px",
    fontWeight: 500,
  },
  briefName: {
    fontSize: "14px",
    fontWeight: 600,
    margin: "0 0 8px 0",
    color: "#1e293b",
    minHeight: "20px", // Ensure consistent height even when empty
  },
  instructionLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#475569",
    margin: "0 0 4px 0",
  },
  instruction: {
    fontSize: "13px",
    color: "#5E687A",
    margin: "0 0 8px 0",
    lineHeight: 1.5,
  },
  exampleBox: {
    backgroundColor: "#E6E6E6",
    borderRadius: "6px",
    padding: "8px",
    marginBottom: "8px",
  },
  exampleLabel: {
    fontSize: "12px",
    fontWeight: 500,
    color: "#475569",
    margin: "0 0 4px 0",
  },
  exampleText: {
    fontSize: "13px",
    color: "#334155",
    margin: 0,
  },
  actions: {
    display: "flex",
    gap: "4px",
    justifyContent: "flex-end",
    marginTop: "auto", // Push to bottom
  },
  actionButton: {
    background: "white",
    border: "1px solid #cbd5e1",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    display: "grid",
    placeContent: "center",
    color: "#0F62FE",
    transition: "background-color 0.2s",
    "&:hover": {
      backgroundColor: "#f1f5f9",
    },
  },
  deleteButton: {
    color: "#dc2626",
    "&:hover": {
      backgroundColor: "#fef2f2",
    },
  },
  icon: {
    width: "14px",
    height: "14px",
  },
  radioContainer: {
    position: "absolute",
    top: "10px",
    left: "10px",
    zIndex: 1,
  },
  radio: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
    accentColor: "#0F62FE",
  },
  editForm: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  editActions: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
  },
});

export interface RuleForComparison {
  id: string;
  rule_number: string;
  brief_name: string;
  instruction: string;
  example_language?: string;
  sourcePlaybookId: string;
  sourcePlaybookName: string;
  categoryType?: string;
}

interface RuleComparisonCardProps {
  rule: RuleForComparison;
  isSelected?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  onEdit?: (updatedRule: RuleForComparison) => void;
  showRadio?: boolean;
  showActions?: boolean;
  compact?: boolean;
  hideSource?: boolean;
}

export const RuleComparisonCard: React.FC<RuleComparisonCardProps> = ({
  rule,
  isSelected = false,
  onSelect,
  onDelete,
  onEdit,
  showRadio = false,
  showActions = true,
  compact = false,
  hideSource = false,
}) => {
  const styles = useStyles();
  const [isEditing, setIsEditing] = React.useState(false);
  const [editBriefName, setEditBriefName] = React.useState(rule.brief_name);
  const [editInstruction, setEditInstruction] = React.useState(rule.instruction);
  const [editExample, setEditExample] = React.useState(rule.example_language || "");

  const handleSaveEdit = () => {
    if (onEdit) {
      onEdit({
        ...rule,
        brief_name: editBriefName,
        instruction: editInstruction,
        example_language: editExample || undefined,
      });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditBriefName(rule.brief_name);
    setEditInstruction(rule.instruction);
    setEditExample(rule.example_language || "");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={`${styles.card}`}>
        {!hideSource && (
          <div className={styles.sourceLabel}>From: {rule.sourcePlaybookName}</div>
        )}
        <div className={styles.editForm}>
          <Field label="Brief Name">
            <Input
              value={editBriefName}
              onChange={(e) => setEditBriefName(e.target.value)}
              placeholder="3-8 word summary"
            />
          </Field>
          <Field label={<span>Instruction <span style={{ color: "red" }}>*</span></span>}>
            <Textarea
              rows={3}
              value={editInstruction}
              onChange={(e) => setEditInstruction(e.target.value)}
            />
          </Field>
          <Field label="Example Language">
            <Textarea
              rows={2}
              value={editExample}
              onChange={(e) => setEditExample(e.target.value)}
            />
          </Field>
          <div className={styles.editActions}>
            <button
              className={styles.actionButton}
              onClick={handleCancelEdit}
              style={{ color: "#64748b" }}
            >
              <X className={styles.icon} />
            </button>
            <button
              className={styles.actionButton}
              onClick={handleSaveEdit}
              style={{ color: "#22c55e" }}
            >
              <Check className={styles.icon} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.cardSelected : ""}`}
      onClick={showRadio ? onSelect : undefined}
      style={{
        cursor: showRadio ? "pointer" : "default",
        // paddingLeft is increased to 36px when showRadio is true 
        // to give the 18px radio button enough clearance.
        paddingTop: "12px",
        paddingLeft: showRadio ? "36px" : "12px",
      }}
    >
      {showRadio && (
        <div className={styles.radioContainer}>
          <input
            type="radio"
            checked={isSelected}
            onChange={onSelect}
            className={styles.radio}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {!hideSource && (
        <div className={styles.sourceLabel}>From: {rule.sourcePlaybookName}</div>
      )}
      
      {/* Always render brief_name container for alignment */}
      <p className={styles.briefName}>
        {rule.brief_name || "\u00A0"}
      </p>

      <p className={styles.instructionLabel}>Instruction:</p>
      <p className={styles.instruction}>{rule.instruction}</p>

      {rule.example_language && !compact && (
        <div className={styles.exampleBox}>
          <p className={styles.exampleLabel}>Example Language:</p>
          <p className={styles.exampleText}>{rule.example_language}</p>
        </div>
      )}

      {showActions && (
        <div className={styles.actions}>
          {onDelete && (
            <Tooltip content="Delete" relationship="label" positioning="above">
              <button
                className={`${styles.actionButton} ${styles.deleteButton}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <TrashIcon className={styles.icon} />
              </button>
            </Tooltip>
          )}
          {onEdit && (
            <Tooltip content="Edit" relationship="label" positioning="above">
              <button
                className={styles.actionButton}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                <SquarePen className={styles.icon} />
              </button>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
};