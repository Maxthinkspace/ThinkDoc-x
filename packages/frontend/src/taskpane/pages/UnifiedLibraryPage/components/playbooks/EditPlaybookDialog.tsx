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
import { RiEditFill } from "react-icons/ri";
import { backendApi, Playbook } from "../../../../../services/api";
import { useToast } from "../../../../hooks/use-toast";
import FormInput from "@/src/taskpane/components/ui/input";
import FormTextarea from "@/src/taskpane/components/ui/FormTextarea";

const useStyles = makeStyles({
  icon: {
    width: "16px",
    height: "16px",
    marginRight: "8px",
  },
});

interface EditPlaybookDialogProps {
  open: boolean;
  playbook: Playbook | null;
  onClose: () => void;
  onSaved: (updatedPlaybook: Playbook) => void;
}

export const EditPlaybookDialog: React.FC<EditPlaybookDialogProps> = ({
  open,
  playbook,
  onClose,
  onSaved,
}) => {
  const styles = useStyles();
  const { toast } = useToast();
  
  const [errorMessage, setErrorMessage] = React.useState("");
  const [playbookName, setPlaybookName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [playbookType, setPlaybookType] = React.useState("Review");
  const [userPosition, setUserPosition] = React.useState("Neutral");
  const [customPosition, setCustomPosition] = React.useState("");
  const [jurisdiction, setJurisdiction] = React.useState("Singapore");
  const [tags, setTags] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const jurisdictions = [
    "Singapore",
    "Malaysia",
    "Hong Kong",
    "Thailand",
    "No specific jurisdiction",
  ];

  // Pre-fill form when playbook changes
  React.useEffect(() => {
    if (playbook) {
      setPlaybookName(playbook.playbookName || "");
      setDescription(playbook.description || "");
      setPlaybookType(playbook.playbookType || "Review");
      setJurisdiction(playbook.jurisdiction || "Singapore");
      setTags(playbook.tags || "");
      
      // Handle user position
      const position = playbook.userPosition || "Neutral";
      if (position === "Neutral") {
        setUserPosition("Neutral");
        setCustomPosition("");
      } else {
        setUserPosition("");
        setCustomPosition(position);
      }
    }
  }, [playbook, open]);

  const handleSave = async () => {
    if (!playbook) return;
    
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

    setIsSaving(true);

    try {
      const response = await backendApi.updatePlaybook(playbook.id, {
        playbookName,
        description,
        playbookType,
        userPosition: customPosition || userPosition,
        jurisdiction,
        tags,
      });

      toast({
        title: "Playbook Updated",
        description: "Your playbook has been updated successfully.",
      });

      onSaved(response.data);
      onClose();
    } catch (error) {
      console.error("Error updating playbook:", error);
      toast({
        title: "Failed to update playbook",
        description: "Oops, something went wrong. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setErrorMessage("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(_, data) => {
        if (!data.open) {
          handleClose();
        }
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <RiEditFill
              color="blue"
              style={{
                backgroundColor: "#F0F0F0",
                borderRadius: "50%",
                padding: "10px",
                fontSize: "24px",
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
              }}
            >
              Edit Playbook
            </p>

            {errorMessage && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "4px",
                  padding: "8px 12px",
                  marginBottom: "12px",
                  color: "#dc2626",
                  fontSize: "13px",
                }}
              >
                {errorMessage}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <FormInput
                label="Playbook Name"
                required
                value={playbookName}
                placeholder="Enter playbook name"
                onValueChange={setPlaybookName}
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
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#242424",
                      marginBottom: 4,
                    }}
                  >
                    User's Position <span style={{ color: "red" }}>*</span>
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <label className="toggle-switch">
                      <input type="checkbox" />
                      <div className="toggle-switch-background">
                        <div className="toggle-switch-handle"></div>
                      </div>
                    </label>
                    <span style={{ fontSize: 14, color: "#242424" }}>Neutral</span>
                    <div style={{ flex: 1, maxWidth: 142 }}>
                      <FormInput
                        label=""
                        placeholder="Optional custom entry"
                        value={customPosition}
                        onChange={(e) => {
                          setCustomPosition(e.target.value);
                          setUserPosition("");
                        }}
                      />
                    </div>
                  </div>
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
                <Select 
                  onChange={(_, data) => setJurisdiction(data.value)} 
                  value={jurisdiction}
                >
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
                onValueChange={setTags}
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
              style={{ flex: 1, borderRadius: "6px" }}
              appearance="outline"
              onClick={handleClose}
              disabled={isSaving}
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
              }}
              appearance="primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};