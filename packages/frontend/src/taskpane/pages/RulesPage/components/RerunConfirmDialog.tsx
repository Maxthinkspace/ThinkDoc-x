import * as React from "react";
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  makeStyles,
} from "@fluentui/react-components";
import { AlertCircle } from "lucide-react";
import type { Rule } from "../index";

const useStyles = makeStyles({
  ruleCard: {
    backgroundColor: "#F6F6F6",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "8px",
  },
  ruleHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "8px",
  },
  ruleTitle: {
    fontSize: "15px",
    fontWeight: 600,
    margin: 0,
  },
  ruleBriefName: {
    fontStyle: "italic",
    fontWeight: "normal",
  },
  instructionLabel: {
    fontWeight: 600,
    margin: 0,
    fontSize: "14px",
  },
  instructionText: {
    color: "#5E687A",
    margin: 0,
    fontSize: "14px",
  },
  exampleBox: {
    backgroundColor: "#E6E6E6",
    borderRadius: "8px",
    padding: "8px",
    marginTop: "8px",
  },
  exampleLabel: {
    fontWeight: 500,
    margin: 0,
    fontSize: "14px",
  },
  exampleText: {
    margin: 0,
    fontSize: "14px",
  },
  rulesContainer: {
    margin: "16px 0",
    maxHeight: "400px",
    overflowY: "auto",
  },
});

export type LinkedRuleWithDisplay = Rule & {
  displayIndex: number;
  categoryLabel: string;
};

type RerunConfirmDialogProps = {
  open: boolean;
  linkedRules: LinkedRuleWithDisplay[];
  onConfirm: () => void;
  onCancel: () => void;
};

export const RerunConfirmDialog: React.FC<RerunConfirmDialogProps> = ({
  open,
  linkedRules,
  onConfirm,
  onCancel,
}) => {
  const styles = useStyles();

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onCancel()}>
      <DialogSurface style={{ maxWidth: "600px" }}>
        <DialogBody>
          <DialogTitle>
            <div style={{ display: "flex", alignItems: "center" }}>
              <AlertCircle style={{ color: "#FD8C08", marginRight: "8px", width: 20, height: 20 }} />
              Regenerate Rules
            </div>
          </DialogTitle>
          <DialogContent>
            <p>
              This rule was generated from the same annotation as{" "}
              {linkedRules.length - 1} other rule{linkedRules.length > 2 ? "s" : ""}.
              All linked rules will be regenerated together.
            </p>
            
            <div className={styles.rulesContainer}>
              {linkedRules.map((rule) => (
                <div key={rule.id} className={styles.ruleCard}>
                  <div className={styles.ruleHeader}>
                    <p className={styles.ruleTitle}>
                      Rule {rule.displayIndex}:
                      {rule.brief_name && (
                        <span className={styles.ruleBriefName}> {rule.brief_name}</span>
                      )}
                    </p>
                  </div>
                  <div style={{ padding: "0 4px" }}>
                    <p className={styles.instructionLabel}>Instruction:</p>
                    <p className={styles.instructionText}>{rule.instruction}</p>
                  </div>
                  {rule.example_language && (
                    <div className={styles.exampleBox}>
                      <p className={styles.exampleLabel}>Example Language:</p>
                      <p className={styles.exampleText}>{rule.example_language}</p>
                    </div>
                  )}
                  <div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>
                    {rule.categoryLabel}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              appearance="primary" 
              onClick={onConfirm}
              style={{ backgroundColor: "#0F62FE" }}
            >
              Regenerate All ({linkedRules.length})
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};