import * as React from "react";
import { Dialog, DialogSurface, DialogTitle, DialogBody, DialogActions, Button, Input, Textarea, Field } from "@fluentui/react-components";
import { useLanguage } from "../../../contexts/LanguageContext";
import { Clause } from "./ClauseCard";
import { Loader } from "lucide-react";
import { importParagraphFromSelection } from "../../../../taskpane/taskpane";
import { buildApiUrl } from "../../../../services/apiBaseUrl";

interface CreateClauseDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (clause: Clause) => void;
}

export const CreateClauseDialog: React.FC<CreateClauseDialogProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const { translations } = useLanguage();
  const [name, setName] = React.useState("");
  const [text, setText] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoadingSelection, setIsLoadingSelection] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setName("");
      setText("");
      setCategory("");
      setTags("");
      setDescription("");
      setError(null);
    }
  }, [open]);

  const handleLoadSelection = async () => {
    setIsLoadingSelection(true);
    try {
      const selectedText = await importParagraphFromSelection();
      if (selectedText) {
        setText(selectedText);
      }
    } catch (err) {
      console.error("Failed to load selection:", err);
    } finally {
      setIsLoadingSelection(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !text.trim()) {
      setError(translations.clauseLibrary?.validationError || "Name and text are required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(buildApiUrl("/api/vault/clauses"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: name.trim(),
          text: text.trim(),
          category: category.trim() || null,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          description: description.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create clause");
      }

      const data = await response.json();
      onCreated(data.clause);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create clause");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface style={{ minWidth: "500px", maxWidth: "600px" }}>
        <DialogTitle>
          {translations.clauseLibrary?.createClause || "Create Clause"}
        </DialogTitle>
        <DialogBody>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Field label={translations.clauseLibrary?.clauseName || "Clause Name"} required>
              <Input
                value={name}
                onChange={(_, data) => setName(data.value)}
                placeholder={translations.clauseLibrary?.clauseNamePlaceholder || "Enter clause name"}
              />
            </Field>

            <Field 
              label={translations.clauseLibrary?.clauseText || "Clause Text"} 
              required
              hint={translations.clauseLibrary?.loadSelectionHint || "Select text in document and click 'Load Selection'"}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <Textarea
                  value={text}
                  onChange={(_, data) => setText(data.value)}
                  placeholder={translations.clauseLibrary?.clauseTextPlaceholder || "Enter clause text or load from selection"}
                  rows={6}
                />
                <Button
                  appearance="secondary"
                  onClick={handleLoadSelection}
                  disabled={isLoadingSelection}
                  size="small"
                >
                  {isLoadingSelection ? (
                    <>
                      <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
                      <span>{translations.clauseLibrary?.loadingSelection || "Loading..."}</span>
                    </>
                  ) : (
                    translations.clauseLibrary?.loadSelection || "Load Selection"
                  )}
                </Button>
              </div>
            </Field>

            <Field label={translations.clauseLibrary?.category || "Category"}>
              <Input
                value={category}
                onChange={(_, data) => setCategory(data.value)}
                placeholder={translations.clauseLibrary?.categoryPlaceholder || "e.g., Confidentiality, Termination"}
              />
            </Field>

            <Field label={translations.clauseLibrary?.tags || "Tags"}>
              <Input
                value={tags}
                onChange={(_, data) => setTags(data.value)}
                placeholder={translations.clauseLibrary?.tagsPlaceholder || "Comma-separated tags"}
              />
            </Field>

            <Field label={translations.clauseLibrary?.description || "Description"}>
              <Textarea
                value={description}
                onChange={(_, data) => setDescription(data.value)}
                placeholder={translations.clauseLibrary?.descriptionPlaceholder || "Optional description"}
                rows={3}
              />
            </Field>

            {error && (
              <div style={{ color: "#dc2626", fontSize: "14px" }}>
                {error}
              </div>
            )}
          </div>
        </DialogBody>
        <DialogActions>
          <Button appearance="secondary" onClick={onClose} disabled={isSaving}>
            {translations.common.cancel}
          </Button>
          <Button appearance="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader size={16} style={{ animation: "spin 1s linear infinite" }} />
                <span>{translations.common.saving}</span>
              </>
            ) : (
              translations.common.save
            )}
          </Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
};

