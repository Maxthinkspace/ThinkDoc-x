import * as React from "react";
import { Dialog, DialogSurface, DialogTitle, DialogBody, DialogActions, Button, Input, Textarea, Field } from "@fluentui/react-components";
import { useLanguage } from "../../../contexts/LanguageContext";
import { Clause } from "./ClauseCard";
import { Loader } from "lucide-react";
import { buildApiUrl } from "../../../../services/apiBaseUrl";

interface EditClauseDialogProps {
  open: boolean;
  clause: Clause | null;
  onClose: () => void;
  onSaved: (clause: Clause) => void;
}

export const EditClauseDialog: React.FC<EditClauseDialogProps> = ({
  open,
  clause,
  onClose,
  onSaved,
}) => {
  const { translations } = useLanguage();
  const [name, setName] = React.useState("");
  const [text, setText] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (clause) {
      setName(clause.name || "");
      setText(clause.text || "");
      setCategory(clause.category || "");
      setTags(clause.tags ? clause.tags.join(", ") : "");
      setDescription(clause.description || "");
      setError(null);
    }
  }, [clause]);

  const handleSave = async () => {
    if (!clause || !name.trim() || !text.trim()) {
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
      const response = await fetch(buildApiUrl(`/api/vault/clauses/${clause.id}`), {
        method: "PATCH",
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
        throw new Error("Failed to update clause");
      }

      const data = await response.json();
      onSaved(data.clause);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update clause");
    } finally {
      setIsSaving(false);
    }
  };

  if (!clause) return null;

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface style={{ minWidth: "500px", maxWidth: "600px" }}>
        <DialogTitle>
          {translations.clauseLibrary?.editClause || "Edit Clause"}
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

            <Field label={translations.clauseLibrary?.clauseText || "Clause Text"} required>
              <Textarea
                value={text}
                onChange={(_, data) => setText(data.value)}
                placeholder={translations.clauseLibrary?.clauseTextPlaceholder || "Enter clause text"}
                rows={6}
              />
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
                <Loader size={16} className="spinner" />
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

