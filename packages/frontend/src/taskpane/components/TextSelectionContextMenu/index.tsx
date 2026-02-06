import * as React from "react";
import { MessageSquare, Save, Languages, Shield, FileText, Loader } from "lucide-react";
import { useTextSelection } from "../../hooks/use-text-selection";
import { useLanguage } from "../../contexts/LanguageContext";
import { useNavigation } from "../../hooks/use-navigation";
import { SaveClauseDialog } from "./SaveClauseDialog";
import { useToast } from "../../hooks/use-toast";
import { buildApiUrl } from "../../../services/apiBaseUrl";
import "./TextSelectionContextMenu.css";

interface MenuAction {
  id: string;
  label: string;
  icon: JSX.Element;
  onClick: () => void;
  disabled?: boolean;
}

export const TextSelectionContextMenu: React.FC = () => {
  const { selectedText, hasSelection, isLoading } = useTextSelection(true);
  const { translations } = useLanguage();
  const { navigateTo } = useNavigation();
  const { toast: showToast } = useToast();
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [activeAction, setActiveAction] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<{ current: number; total: number; step: string } | null>(null);

  const handleAskAI = () => {
    // Navigate to Ask page with selected text pre-filled
    // Store selected text in sessionStorage for AskPage to pick up
    if (selectedText) {
      sessionStorage.setItem("askContext", selectedText);
      navigateTo("ask");
    }
  };

  const handleSaveClause = () => {
    setShowSaveDialog(true);
  };

  const handleTranslate = () => {
    if (selectedText) {
      sessionStorage.setItem("translationText", selectedText);
      navigateTo("translation");
    }
  };

  const handleCheckCompliance = async () => {
    if (!selectedText) return;

    setActiveAction("compliance");
    setProgress({ current: 0, total: 2, step: "Checking compliance..." });
    try {
      const response = await fetch(buildApiUrl("/api/compliance/check"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: selectedText,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to check compliance");
      }

      const result = await response.json();
      setProgress({ current: 2, total: 2, step: "Complete" });

      if (result.compliant) {
        showToast({
          title: "Compliance Check",
          description: "Selected text is compliant with standards.",
        });
      } else {
        showToast({
          title: "Compliance Issues Found",
          description: `Found ${result.issues?.length || 0} compliance issue${(result.issues?.length || 0) > 1 ? "s" : ""}.`,
        });
        // TODO: Show detailed compliance results in a modal/sidebar
      }
    } catch (error) {
      console.error("Error checking compliance:", error);
      // If API doesn't exist yet, show placeholder message
      showToast({
        title: "Compliance Check",
        description: "Compliance check feature coming soon.",
      });
    } finally {
      setActiveAction(null);
      setProgress(null);
    }
  };

  const handleComparePrecedent = () => {
    if (selectedText) {
      sessionStorage.setItem("precedentText", selectedText);
      navigateTo("precedent-comparison");
    }
  };

  const menuActions: MenuAction[] = [
    {
      id: "ask",
      label: translations.contextMenu?.askAI || "Ask AI",
      icon: <MessageSquare size={18} />,
      onClick: handleAskAI,
      disabled: !hasSelection,
    },
    {
      id: "save-clause",
      label: translations.contextMenu?.saveClause || "Save as Clause",
      icon: <Save size={18} />,
      onClick: handleSaveClause,
      disabled: !hasSelection,
    },
    {
      id: "translate",
      label: translations.dashboard.translation,
      icon: <Languages size={18} />,
      onClick: handleTranslate,
      disabled: !hasSelection,
    },
    {
      id: "compliance",
      label: translations.contextMenu?.checkCompliance || "Check Compliance",
      icon: <Shield size={18} />,
      onClick: handleCheckCompliance,
      disabled: !hasSelection || activeAction === "compliance",
    },
    {
      id: "precedent",
      label: translations.dashboard.precedentReview,
      icon: <FileText size={18} />,
      onClick: handleComparePrecedent,
      disabled: !hasSelection,
    },
  ];

  // Don't show menu if no selection
  if (!hasSelection && !isLoading) {
    return null;
  }

  // Show loading state
  if (isLoading && !selectedText) {
    return (
      <div className="text-selection-menu loading">
        <div className="text-selection-menu-loading">
          <div className="spinner" />
          <span>{translations.contextMenu?.loading || "Detecting selection..."}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="text-selection-menu">
        {/* Selected Text Preview */}
        {selectedText && (
          <div className="text-selection-preview">
            <div className="text-selection-preview-header">
              <span className="text-selection-preview-label">
                {translations.contextMenu?.selectedText || "Selected Text"}
              </span>
            </div>
            <div className="text-selection-preview-text">
              {selectedText.length > 100 ? `${selectedText.substring(0, 100)}...` : selectedText}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="text-selection-actions">
          {menuActions.map((action) => (
            <button
              key={action.id}
              className={`text-selection-action ${activeAction === action.id ? "active" : ""}`}
              onClick={action.onClick}
              disabled={action.disabled}
              aria-label={action.label}
            >
              <div className="text-selection-action-icon">
                {activeAction === action.id && progress ? (
                  <Loader size={18} className="spinner" />
                ) : (
                  action.icon
                )}
              </div>
              <span className="text-selection-action-label">
                {activeAction === action.id && progress
                  ? `${progress.step} (${progress.current}/${progress.total})`
                  : action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Save Clause Dialog */}
      {showSaveDialog && selectedText && (
        <SaveClauseDialog
          clauseText={selectedText}
          onClose={() => setShowSaveDialog(false)}
          onSave={() => {
            setShowSaveDialog(false);
            // TODO: Show success toast
          }}
        />
      )}
    </>
  );
};

