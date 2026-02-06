import * as React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  makeStyles,
  Field,
  Input,
  Textarea,
  Select,
} from "@fluentui/react-components";
import { Loader2 } from "lucide-react";
import { useNavigation } from "../../../../hooks/use-navigation";
import { backendApi, type Playbook, type CreatePlaybookRequest } from "../../../../../services/api";
import { useToast } from "../../../../hooks/use-toast";

const useStyles = makeStyles({
  createPlaybookButton: {
    width: "260px",
    padding: "12px 16px",
    background: "var(--brand-gradient)",
    cursor: "pointer",
    marginLeft: "3px",
    border: "none",
    boxShadow: "none",
    outline: "none",
    transition: "0.3s, color 0.3s",
    borderRadius: "8px",
    color: "var(--text-on-brand)",
    fontSize: "14px",

    "&:hover": {
      opacity: 0.9,
    },
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginTop: "16px",
  },
  fieldRow: {
    display: "flex",
    gap: "16px",
  },
  fieldHalf: {
    flex: 1,
  },
});

interface CreatePBDialogProps {
  onPlaybookCreated?: (playbook: Playbook) => void;
}

export const CreatePBDialog = ({ onPlaybookCreated }: CreatePBDialogProps) => {
  const styles = useStyles();
  const { navigateTo } = useNavigation();
  const { toast } = useToast();

  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState<CreatePlaybookRequest>({
    playbookName: "",
    description: "",
    playbookType: "",
    userPosition: "",
    jurisdiction: "",
    tags: "",
    rules: [],
    metadata: {},
  });

  const handleInputChange = (field: keyof CreatePlaybookRequest) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSelectChange = (field: keyof CreatePlaybookRequest) => (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.playbookName.trim()) {
      toast({
        title: "Error",
        description: "Playbook name is required",
        variant: "error",
      });
      return;
    }

    setLoading(true);
    try {
      // Create with empty rules initially - user can add rules later
      const playbookData: CreatePlaybookRequest = {
        ...formData,
        playbookName: formData.playbookName.trim(),
        description: formData.description?.trim() || undefined,
        tags: formData.tags?.trim() || undefined,
        rules: [],
        metadata: {
          createdVia: "dialog",
          version: "1.0",
        },
      };

      const response = await backendApi.createPlaybook(playbookData);

      toast({
        title: "Success",
        description: "Playbook created successfully!",
      });

      onPlaybookCreated?.(response.data);
      setOpen(false);
      setFormData({
        playbookName: "",
        description: "",
        playbookType: "",
        userPosition: "",
        jurisdiction: "",
        tags: "",
        rules: [],
        metadata: {},
      });

      // Navigate to rules page to let user add rules
      navigateTo("rules");
    } catch (error) {
      console.error("Failed to create playbook:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create playbook",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCreate = async () => {
    setLoading(true);
    try {
      // Quick create from document annotations
      const quickData: CreatePlaybookRequest = {
        playbookName: `Playbook - ${new Date().toLocaleDateString()}`,
        description: "Generated from document annotations",
        playbookType: "review",
        userPosition: "",
        jurisdiction: "",
        tags: "auto-generated",
        rules: [],
        metadata: {
          createdVia: "quick-create",
          version: "1.0",
          sourceDocument: "current",
        },
      };

      const response = await backendApi.createPlaybook(quickData);

      toast({
        title: "Success",
        description: "Playbook created from annotations!",
      });

      onPlaybookCreated?.(response.data);
      setOpen(false);
      navigateTo("rules");
    } catch (error) {
      console.error("Failed to create playbook:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create playbook",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
      <DialogTrigger disableButtonEnhancement>
        <Button className={`${styles.createPlaybookButton} brand-btn`}>+ Create New Playbook</Button>
      </DialogTrigger>
      <DialogSurface style={{ maxWidth: "600px", width: "90vw" }}>
        <DialogBody>
          <DialogTitle>Create New Playbook</DialogTitle>
          <DialogContent>
            <p style={{ marginBottom: "16px" }}>
              Choose how you'd like to create your playbook:
            </p>

            <div style={{ marginBottom: "24px" }}>
              <Button
                className="brand-btn"
                appearance="primary"
                onClick={handleQuickCreate}
                disabled={loading}
                style={{
                  width: "100%",
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "var(--brand-gradient)",
                  color: "var(--text-on-brand)",
                  border: "none",
                }}
              >
                {loading && <Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} />}
                Quick Create from Current Document
              </Button>
              <p style={{ fontSize: "12px", color: "#666", textAlign: "center" }}>
                Generate a playbook from annotations in the document you are currently reviewing
              </p>
            </div>

            <div style={{ textAlign: "center", margin: "16px 0", color: "#666" }}>
              - OR -
            </div>

            <div className={styles.form}>
              <Field label="Playbook Name *" required>
                <Input
                  value={formData.playbookName}
                  onChange={handleInputChange('playbookName')}
                  placeholder="Enter playbook name..."
                />
              </Field>

              <Field label="Description">
                <Textarea
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  placeholder="Describe what this playbook is for..."
                  rows={3}
                />
              </Field>

              <div className={styles.fieldRow}>
                <div className={styles.fieldHalf}>
                  <Field label="Playbook Type">
                    <Select
                      value={formData.playbookType}
                      onChange={handleSelectChange('playbookType')}
                    >
                      <option value="">Select type...</option>
                      <option value="review">Contract Review</option>
                      <option value="negotiation">Contract Negotiation</option>
                      <option value="due-diligence">Due Diligence</option>
                      <option value="compliance">Compliance Check</option>
                    </Select>
                  </Field>
                </div>

                <div className={styles.fieldHalf}>
                  <Field label="User Position">
                    <Select
                      value={formData.userPosition}
                      onChange={handleSelectChange('userPosition')}
                    >
                      <option value="">Select position...</option>
                      <option value="buyer">Buyer</option>
                      <option value="seller">Seller</option>
                      <option value="neutral">Neutral</option>
                      <option value="advisor">Legal Advisor</option>
                    </Select>
                  </Field>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldHalf}>
                  <Field label="Jurisdiction">
                    <Input
                      value={formData.jurisdiction}
                      onChange={handleInputChange('jurisdiction')}
                      placeholder="e.g., Singapore, New York..."
                    />
                  </Field>
                </div>

                <div className={styles.fieldHalf}>
                  <Field label="Tags">
                    <Input
                      value={formData.tags}
                      onChange={handleInputChange('tags')}
                      placeholder="e.g., M&A, tech, startup..."
                    />
                  </Field>
                </div>
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Cancel</Button>
            </DialogTrigger>
            <Button
              className="brand-btn"
              appearance="primary"
              onClick={handleSubmit}
              disabled={loading || !formData.playbookName.trim()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "var(--brand-gradient)",
                color: "var(--text-on-brand)",
                border: "none",
              }}
            >
              {loading && <Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} />}
              Create Playbook
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
