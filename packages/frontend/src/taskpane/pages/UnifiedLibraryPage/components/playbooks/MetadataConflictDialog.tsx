import * as React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Select,
  makeStyles,
} from "@fluentui/react-components";
import { WarningRegular } from "@fluentui/react-icons";
import { Playbook } from "../../../../../services/api";
import FormInput from "@/src/taskpane/components/ui/input";

const useStyles = makeStyles({
  differenceSection: {
    backgroundColor: "#fef3c7",
    border: "1px solid #f59e0b",
    borderRadius: "6px",
    padding: "12px",
    marginBottom: "12px",
  },
  differenceTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#92400e",
    margin: "0 0 8px 0",
  },
  differenceItem: {
    fontSize: "12px",
    color: "#78350f",
    margin: "4px 0",
    paddingLeft: "8px",
  },
  selectionSection: {
    marginTop: "16px",
  },
  selectionTitle: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#334155",
    marginBottom: "12px",
  },
  fieldRow: {
    marginBottom: "12px",
  },
});

interface MetadataConflictDialogProps {
  open: boolean;
  playbooks: Playbook[];
  onConfirm: (metadata: {
    playbookType: string;
    jurisdiction: string;
    userPosition: string;
  }) => void;
  onCancel: () => void;
}

interface MetadataDifference {
  field: "type" | "jurisdiction" | "position";
  label: string;
  values: { playbookName: string; value: string }[];
}

export const MetadataConflictDialog: React.FC<MetadataConflictDialogProps> = ({
  open,
  playbooks,
  onConfirm,
  onCancel,
}) => {
  const styles = useStyles();

  const [playbookType, setPlaybookType] = React.useState("Review");
  const [jurisdiction, setJurisdiction] = React.useState("Singapore");
  const [userPosition, setUserPosition] = React.useState("Neutral");
  const [customPosition, setCustomPosition] = React.useState("");

  const jurisdictions = [
    "Singapore",
    "Malaysia",
    "Hong Kong",
    "Thailand",
    "No specific jurisdiction",
  ];

  // Find differences between playbooks
  const differences = React.useMemo((): MetadataDifference[] => {
    const diffs: MetadataDifference[] = [];

    // Check type differences
    const types = playbooks.map((p) => ({
      playbookName: p.playbookName,
      value: p.playbookType || "Review",
    }));
    const uniqueTypes = new Set(types.map((t) => t.value.toLowerCase()));
    if (uniqueTypes.size > 1) {
      diffs.push({ field: "type", label: "Playbook Type", values: types });
    }

    // Check jurisdiction differences
    const jurisdictions = playbooks.map((p) => ({
      playbookName: p.playbookName,
      value: p.jurisdiction || "Not specified",
    }));
    const uniqueJurisdictions = new Set(jurisdictions.map((j) => j.value));
    if (uniqueJurisdictions.size > 1) {
      diffs.push({ field: "jurisdiction", label: "Jurisdiction", values: jurisdictions });
    }

    // Check position differences
    const positions = playbooks.map((p) => ({
      playbookName: p.playbookName,
      value: p.userPosition || "Neutral",
    }));
    const uniquePositions = new Set(positions.map((p) => p.value));
    if (uniquePositions.size > 1) {
      diffs.push({ field: "position", label: "User's Position", values: positions });
    }

    return diffs;
  }, [playbooks]);

  // Set defaults based on first playbook
  React.useEffect(() => {
    if (open && playbooks.length > 0) {
      const first = playbooks[0];
      setPlaybookType(first.playbookType?.includes("Draft") ? "Drafting" : "Review");
      setJurisdiction(first.jurisdiction || "Singapore");
      const pos = first.userPosition || "Neutral";
      if (pos === "Neutral") {
        setUserPosition("Neutral");
        setCustomPosition("");
      } else {
        setUserPosition("");
        setCustomPosition(pos);
      }
    }
  }, [open, playbooks]);

  const handleConfirm = () => {
    onConfirm({
      playbookType,
      jurisdiction,
      userPosition: customPosition || userPosition,
    });
  };

  // If no differences, auto-confirm
  React.useEffect(() => {
    if (open && differences.length === 0) {
      handleConfirm();
    }
  }, [open, differences]);

  if (differences.length === 0) {
    return null;
  }

  return (
    <Dialog open={open}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <WarningRegular
              style={{
                backgroundColor: "#fef3c7",
                borderRadius: "50%",
                padding: "10px",
                fontSize: "24px",
                color: "#f59e0b",
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
                marginTop: "6px",
                marginBottom: "16px",
              }}
            >
              Metadata Differences Found
            </p>

            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
              The selected playbooks have different settings. Please review and select
              the values for the combined playbook.
            </p>

            {/* Show differences */}
            {differences.map((diff) => (
              <div key={diff.field} className={styles.differenceSection}>
                <p className={styles.differenceTitle}>{diff.label}</p>
                {diff.values.map((v, idx) => (
                  <p key={idx} className={styles.differenceItem}>
                    • {v.playbookName}: <strong>{v.value}</strong>
                  </p>
                ))}
              </div>
            ))}

            {/* Selection form */}
            <div className={styles.selectionSection}>
              <p className={styles.selectionTitle}>
                Select settings for the combined playbook:
              </p>

              <div className={styles.fieldRow}>
                <Field>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#242424",
                      marginBottom: 6,
                      display: "block",
                    }}
                  >
                    Playbook Type
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                      <input
                        type="radio"
                        value="Review"
                        checked={playbookType === "Review"}
                        onChange={() => setPlaybookType("Review")}
                      />
                      Review Playbook
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                      <input
                        type="radio"
                        value="Drafting"
                        checked={playbookType === "Drafting"}
                        onChange={() => setPlaybookType("Drafting")}
                      />
                      Drafting Playbook
                    </label>
                  </div>
                </Field>
              </div>

              <div className={styles.fieldRow}>
                <Field>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#242424",
                      marginBottom: 6,
                      display: "block",
                    }}
                  >
                    Jurisdiction
                  </label>
                  <Select
                    onChange={(_, data) => setJurisdiction(data.value)}
                    value={jurisdiction}
                    style={{ width: "100%" }}
                  >
                    {jurisdictions.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className={styles.fieldRow}>
                <Field>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#242424",
                      marginBottom: 6,
                      display: "block",
                    }}
                  >
                    User's Position
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                      <input
                        type="radio"
                        checked={userPosition === "Neutral" && !customPosition}
                        onChange={() => {
                          setUserPosition("Neutral");
                          setCustomPosition("");
                        }}
                      />
                      Neutral
                    </label>
                    <div style={{ flex: 1, maxWidth: "160px" }}>
                        <FormInput
                            label=""
                            placeholder="Or enter custom..."
                            value={customPosition}
                            onChange={(e) => {
                            setCustomPosition(e.target.value);
                            if (e.target.value) setUserPosition("");
                            }}
                        />
                        </div>
                  </div>
                </Field>
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
              Cancel
            </Button>
            <Button
              className="brand-btn"
              style={{
                flex: 1,
                borderRadius: "6px",
                background: "var(--brand-gradient)",
                color: "var(--text-on-brand)",
                border: "none",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 500,
              }}
              appearance="primary"
              onClick={handleConfirm}
            >
              Continue to Combine
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};