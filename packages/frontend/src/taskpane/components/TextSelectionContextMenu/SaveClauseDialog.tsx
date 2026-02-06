import * as React from "react";
import { X, Save, Loader, Plus, Tag } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { buildApiUrl } from "../../../services/apiBaseUrl";
import "./SaveClauseDialog.css";

interface SaveClauseDialogProps {
  clauseText: string;
  onClose: () => void;
  onSave: () => void;
}

export const SaveClauseDialog: React.FC<SaveClauseDialogProps> = ({
  clauseText,
  onClose,
  onSave,
}) => {
  const { translations } = useLanguage();
  const [clauseName, setClauseName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState("");
  const [labelInput, setLabelInput] = React.useState("");
  const [showTagSuggestions, setShowTagSuggestions] = React.useState(false);
  const [showLabelSuggestions, setShowLabelSuggestions] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const tagInputRef = React.useRef<HTMLDivElement>(null);
  const labelInputRef = React.useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagInputRef.current && !tagInputRef.current.contains(event.target as Node)) {
        setShowTagSuggestions(false);
      }
      if (labelInputRef.current && !labelInputRef.current.contains(event.target as Node)) {
        setShowLabelSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Common tags and labels (could be fetched from API)
  const [availableTags] = React.useState<string[]>([
    "Confidentiality",
    "Termination",
    "Payment",
    "Liability",
    "Indemnification",
    "Warranty",
    "Intellectual Property",
    "Governing Law",
    "Dispute Resolution",
    "Force Majeure",
  ]);
  
  const [availableLabels] = React.useState<string[]>([
    "Standard",
    "Critical",
    "Optional",
    "Review Required",
    "High Risk",
    "Low Risk",
    "Custom",
  ]);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      setSelectedTags([...selectedTags, trimmedTag]);
      setTagInput("");
      setShowTagSuggestions(false);
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  };

  const addLabel = (label: string) => {
    const trimmedLabel = label.trim();
    if (trimmedLabel && !selectedLabels.includes(trimmedLabel)) {
      setSelectedLabels([...selectedLabels, trimmedLabel]);
      setLabelInput("");
      setShowLabelSuggestions(false);
    }
  };

  const removeLabel = (label: string) => {
    setSelectedLabels(selectedLabels.filter((l) => l !== label));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Escape") {
      setShowTagSuggestions(false);
    }
  };

  const handleLabelInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && labelInput.trim()) {
      e.preventDefault();
      addLabel(labelInput);
    } else if (e.key === "Escape") {
      setShowLabelSuggestions(false);
    }
  };

  const filteredTagSuggestions = availableTags.filter(
    (tag) => tag.toLowerCase().includes(tagInput.toLowerCase()) && !selectedTags.includes(tag)
  );

  const filteredLabelSuggestions = availableLabels.filter(
    (label) => label.toLowerCase().includes(labelInput.toLowerCase()) && !selectedLabels.includes(label)
  );

  const handleSave = async () => {
    if (!clauseName.trim()) {
      setError("Clause name is required");
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
          name: clauseName.trim(),
          text: clauseText,
          category: category.trim() || null,
          tags: selectedTags,
          labels: selectedLabels,
          description: description.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save clause");
      }

      onSave();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to save clause";
      setError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="save-clause-dialog-overlay" onClick={onClose}>
      <div className="save-clause-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="save-clause-dialog-header">
          <h2 className="save-clause-dialog-title">
            {translations.contextMenu?.saveClause || "Save as Clause"}
          </h2>
          <button className="save-clause-dialog-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="save-clause-dialog-content">
          {/* Clause Text Preview */}
          <div className="save-clause-field">
            <label className="save-clause-label">
              {translations.contextMenu?.clauseText || "Clause Text"}
            </label>
            <div className="save-clause-text-preview">{clauseText}</div>
          </div>

          {/* Clause Name */}
          <div className="save-clause-field">
            <label className="save-clause-label">
              {translations.contextMenu?.clauseName || "Clause Name"} *
            </label>
            <input
              type="text"
              className="save-clause-input"
              value={clauseName}
              onChange={(e) => setClauseName(e.target.value)}
              placeholder={translations.contextMenu?.clauseNamePlaceholder || "Enter clause name"}
              disabled={isSaving}
            />
          </div>

          {/* Category */}
          <div className="save-clause-field">
            <label className="save-clause-label">
              {translations.contextMenu?.category || "Category"}
            </label>
            <input
              type="text"
              className="save-clause-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={translations.contextMenu?.categoryPlaceholder || "e.g., Confidentiality, Termination"}
              disabled={isSaving}
            />
          </div>

          {/* Tags */}
          <div className="save-clause-field">
            <label className="save-clause-label">
              {translations.contextMenu?.tags || "Tags"}
            </label>
            <div className="save-clause-tags-container">
              <div className="save-clause-tags-chips">
                {selectedTags.map((tag) => (
                  <span key={tag} className="save-clause-tag-chip">
                    <Tag size={12} />
                    <span>{tag}</span>
                    <button
                      type="button"
                      className="save-clause-chip-remove"
                      onClick={() => removeTag(tag)}
                      disabled={isSaving}
                      aria-label={`Remove ${tag}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="save-clause-tags-input-wrapper" ref={tagInputRef}>
                <input
                  type="text"
                  className="save-clause-tags-input"
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    setShowTagSuggestions(true);
                  }}
                  onFocus={() => setShowTagSuggestions(true)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder={selectedTags.length === 0 ? "Add tags..." : ""}
                  disabled={isSaving}
                />
                {showTagSuggestions && filteredTagSuggestions.length > 0 && (
                  <div className="save-clause-suggestions-dropdown">
                    {filteredTagSuggestions.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="save-clause-suggestion-item"
                        onClick={() => addTag(tag)}
                      >
                        <Tag size={14} />
                        <span>{tag}</span>
                      </button>
                    ))}
                  </div>
                )}
                {tagInput.trim() && !selectedTags.includes(tagInput.trim()) && (
                  <button
                    type="button"
                    className="save-clause-add-new"
                    onClick={() => addTag(tagInput)}
                    disabled={isSaving}
                    title={`Add "${tagInput.trim()}"`}
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="save-clause-field">
            <label className="save-clause-label">
              Labels
            </label>
            <div className="save-clause-tags-container">
              <div className="save-clause-tags-chips">
                {selectedLabels.map((label) => (
                  <span key={label} className="save-clause-label-chip">
                    <span>{label}</span>
                    <button
                      type="button"
                      className="save-clause-chip-remove"
                      onClick={() => removeLabel(label)}
                      disabled={isSaving}
                      aria-label={`Remove ${label}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="save-clause-tags-input-wrapper" ref={labelInputRef}>
                <input
                  type="text"
                  className="save-clause-tags-input"
                  value={labelInput}
                  onChange={(e) => {
                    setLabelInput(e.target.value);
                    setShowLabelSuggestions(true);
                  }}
                  onFocus={() => setShowLabelSuggestions(true)}
                  onKeyDown={handleLabelInputKeyDown}
                  placeholder={selectedLabels.length === 0 ? "Add labels..." : ""}
                  disabled={isSaving}
                />
                {showLabelSuggestions && filteredLabelSuggestions.length > 0 && (
                  <div className="save-clause-suggestions-dropdown">
                    {filteredLabelSuggestions.map((label) => (
                      <button
                        key={label}
                        type="button"
                        className="save-clause-suggestion-item"
                        onClick={() => addLabel(label)}
                      >
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                )}
                {labelInput.trim() && !selectedLabels.includes(labelInput.trim()) && (
                  <button
                    type="button"
                    className="save-clause-add-new"
                    onClick={() => addLabel(labelInput)}
                    disabled={isSaving}
                    title={`Add "${labelInput.trim()}"`}
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="save-clause-field">
            <label className="save-clause-label">
              {translations.contextMenu?.description || "Description"}
            </label>
            <textarea
              className="save-clause-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={translations.contextMenu?.descriptionPlaceholder || "Optional description"}
              rows={3}
              disabled={isSaving}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="save-clause-error">
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="save-clause-dialog-footer">
          <button
            className="save-clause-button cancel"
            onClick={onClose}
            disabled={isSaving}
          >
            {translations.common.cancel}
          </button>
          <button
            className="save-clause-button save"
            onClick={handleSave}
            disabled={isSaving || !clauseName.trim()}
          >
            {isSaving ? (
              <>
                <Loader size={16} className="spinner" />
                <span>{translations.common.saving || "Saving..."}</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{translations.common.save}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

