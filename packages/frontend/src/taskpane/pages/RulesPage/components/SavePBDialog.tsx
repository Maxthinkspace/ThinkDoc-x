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
  makeStyles,
  Select,
} from "@fluentui/react-components";

import { useNavigation } from "../../../../taskpane/hooks/use-navigation";
import { RuleCategories } from "../index";
import { libraryApi } from "../../../../services/libraryApi";
import { documentCache } from "../../../../services/documentCache";
import { PositionSelector } from "../../../../taskpane/components/PositionSelector";
import { useToast } from "../../../hooks/use-toast";
import { LuSave } from "react-icons/lu";
import FormInput from "@/src/taskpane/components/ui/input";
import FormTextarea from "@/src/taskpane/components/ui/FormTextarea";

const useStyles = makeStyles({
  root: {
    marginBottom: "20px",
    border: "0.5px solid #cbcbcbff",
    borderRadius: "4px",
    padding: "16px 10px 36px 36px",
    alignSelf: "stretch",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: "13px",
    fontWeight: "bold",
    color: "#898a89ff",
  },
  example: {
    backgroundColor: "#fbfafaff",
    fontStyle: "italic",
    padding: "6px",
    borderRadius: "4px",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
  },
  icon: {
    width: "16px",
    height: "16px",
    marginRight: "8px",
  },
  saveButton: {
    minWidth: "150px",
    padding: "10px 12px",
    borderRadius: "6px",
  },
  trashIcon: {
    color: "red",
  },
  actionsButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    marginLeft: "3px",
    boxShadow: "none",
    outline: "none",
    transition: "background-color 0.3s, color 0.3s",
    padding: "6px",
    borderRadius: "4px",
    color: "#707070ff",

    "&:hover": {
      backgroundColor: "#dae9f6ff",
    },
  },
});

export interface EditDialogProps {
  rules: RuleCategories;
  onSaveSuccess?: () => void;
  pendingVersionCount?: number;
  onShowPendingAlert?: () => void;
}

export const SavePBDialog: React.FC<EditDialogProps> = ({ 
  rules, 
  onSaveSuccess, 
  pendingVersionCount = 0, 
  onShowPendingAlert 
}) => {
  const styles = useStyles();
  const { navigateTo } = useNavigation();
  const [open, setOpen] = React.useState(false);
  const [showPendingAlert, setShowPendingAlert] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [playbookName, setPlaybookName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [playbookType, setPlaybookType] = React.useState("Review");
  const [userPosition, setUserPosition] = React.useState("");
  const [customPosition, setCustomPosition] = React.useState("");
  const [availablePositions, setAvailablePositions] = React.useState<string[]>([]);
  const [jurisdiction, setJurisdiction] = React.useState("Singapore");
  const [tags, setTags] = React.useState("");
  const jurisdictions = [
    "Singapore",
    "Malaysia",
    "Hong Kong",
    "Thailand",
    "No specific jurisdiction",
  ];
  const { toast } = useToast();

  // Load cached positions on mount
  React.useEffect(() => {
    const positions = documentCache.getCachedPositions();
    if (positions?.normalized && positions.normalized.length > 0) {
      setAvailablePositions(positions.normalized);
    }
  }, []);

  const handleSaveClick = () => {
    if (pendingVersionCount > 0) {
      setShowPendingAlert(true);
      onShowPendingAlert?.();
    } else {
      setOpen(true);
    }
  };

  const handleSave = async () => {
    // Clear previous error
    setErrorMessage("");

    // Validate required fields
    const missingFields = [];
    if (!playbookName.trim()) {
      missingFields.push("Playbook Name");
    }
    if (!playbookType) {
      missingFields.push("Playbook Type");
    }
    if (!jurisdiction) {
      missingFields.push("Jurisdiction");
    }

    if (missingFields.length > 0) {
      setErrorMessage(`Please complete all required fields. Missing: ${missingFields.join(", ")}`);
      return;
    }

    // Transform rules to flat array format for libraryApi
    // Each rule gets ruleType from the category type
    const flattenedRules = rules.flatMap(({ type, rules: categoryRules }) => 
      categoryRules.map((rule, index) => ({
        ruleNumber: rule.rule_number || `${index + 1}`,
        ruleType: type,
        briefName: rule.brief_name || '',
        instruction: rule.instruction || '',
        exampleLanguage: rule.example_language,
        sourceAnnotationType: rule.sourceAnnotationType,
        sourceAnnotationKey: rule.sourceAnnotationKey,
        sortOrder: index,
      }))
    );

    const pb = {
      name: playbookName, // libraryApi uses 'name' instead of 'playbookName'
      description,
      playbookType,
      userPosition: customPosition || userPosition || "Neutral",
      jurisdiction,
      tags, // comma-separated string
      rules: flattenedRules,
      metadata: {
        createdVia: 'add-in',
        version: '1.0',
      },
    };

    try {
      await libraryApi.createPlaybook(pb);

      setOpen(false);
      onSaveSuccess?.();
      navigateTo("library");
    } catch (error) {
      console.error("Error saving playbook:", error);
      toast({
        title: "Failed to save playbook",
        description: "Oops, something went wrong. Please try again.",
      });
    }
  };

  const handleNameChange = (value: string) => {
    setPlaybookName(value);
  };

  return (
    <>
      <Button
        className="brand-btn"
        appearance="primary"
        icon={<LuSave />}
        onClick={handleSaveClick}
        style={{
          background: "var(--brand-gradient)",
          color: "var(--text-on-brand)",
          border: "none",
          fontFamily: "inherit",
          fontSize: "14px",
          fontWeight: 500,
        }}
      >
        Save Playbook
      </Button>

      {/* Pending versions alert */}
      <Dialog
        open={showPendingAlert}
        onOpenChange={(_, data) => setShowPendingAlert(data.open)}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogContent>
              <p style={{ margin: 0 }}>
                {pendingVersionCount} rule{pendingVersionCount > 1 ? 's' : ''} pending review. Resolve before saving.
              </p>
            </DialogContent>
            <DialogActions>
              <Button 
                appearance="primary" 
                onClick={() => setShowPendingAlert(false)}
                style={{
                  background: "var(--brand-gradient)",
                  color: "var(--text-on-brand)",
                  border: "none",
                }}
              >
                Got it
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Main save dialog */}
      <Dialog
        open={open}
        onOpenChange={(_, data) => {
          setOpen(data.open);
          if (!data.open) {
            setErrorMessage("");
          }
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Save Playbook</DialogTitle>
            <DialogContent>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <FormInput
                  label="Playbook Name"
                  required
                  value={playbookName}
                  placeholder="Enter playbook name"
                  onValueChange={handleNameChange}
                />
                <FormTextarea
                  label="Description"
                  value={description}
                  onValueChange={setDescription}
                />

                <Field>
                  <label
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#242424",
                      marginBottom: 6,
                    }}
                  >
                    Playbook Type
                    <span style={{ color: "red" }}>*</span>
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                      <input
                        style={{ marginTop: 6 }}
                        type="radio"
                        value="Review"
                        checked={playbookType === "Review"}
                        onChange={() => setPlaybookType("Review")}
                      />
                      <span>Review Playbook – Used to review existing agreements</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                      <input
                        style={{ marginTop: 6 }}
                        type="radio"
                        value="Drafting"
                        checked={playbookType === "Drafting"}
                        onChange={() => setPlaybookType("Drafting")}
                      />
                      <span>Drafting Playbook – Used to draft new agreements</span>
                    </label>
                  </div>
                </Field>

                <Field>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <PositionSelector
                      key={customPosition ? 'custom-typing' : 'dropdown-active'}
                      positions={availablePositions}
                      selectedPosition={customPosition ? null : (userPosition || null)}
                      onChange={(position) => {
                        setUserPosition(position || "");
                        setCustomPosition("");
                      }}
                      label={<>Indicate your position <span style={{ color: "red" }}>*</span></>}
                    />

                    {/* Custom position input */}
                    <input
                      type="text"
                      placeholder="Or type your position..."
                      value={customPosition}
                      onChange={(e) => {
                        setCustomPosition(e.target.value);
                        setUserPosition("");
                      }}
                      style={{
                        padding: "5px 10px 7px 10px",
                        fontSize: "14px",
                        fontFamily: "'Segoe UI', 'Segoe UI Web (West European)', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif",
                        border: "1px solid #d1d1d1",
                        borderRadius: "4px",
                        width: "200px",
                        minWidth: "200px",
                        maxWidth: "200px",
                        boxSizing: "border-box",
                        color: customPosition ? "#242424" : "#616161",
                        lineHeight: "20px",
                        height: "32px",
                      }}
                    />
                  </div>
                </Field>

                <Field>
                  <label
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#242424",
                      marginBottom: 6,
                    }}
                  >
                    Jurisdiction
                    <span style={{ color: "red" }}>*</span>
                  </label>

                  <Select onChange={(_, data) => setJurisdiction(data.value)} value={jurisdiction}>
                    {jurisdictions.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </Select>
                </Field>
                <FormTextarea
                  label="Tags (comma-separated)"
                  value={tags}
                  onValueChange={setDescription}
                  onChange={(e) => setTags(e.target.value)}
                />
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
                style={{ flex: 1 }}
                appearance="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="brand-btn"
                style={{
                  flex: 1,
                  background: "var(--brand-gradient)",
                  color: "var(--text-on-brand)",
                  border: "none",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
                appearance="primary"
                onClick={handleSave}
              >
                Save Playbook
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};