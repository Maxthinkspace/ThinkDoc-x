import * as React from "react";
import { makeStyles } from "@fluentui/react-components";
import type { PromptSuggestion } from "./types";
import "./styles/PromptSuggestions.css";

const useStyles = makeStyles({
  container: {
    marginBottom: "24px",
  },
  categoryTitle: {
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "8px",
    color: "#333",
  },
  chipsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "16px",
  },
  chip: {
    padding: "6px 12px",
    borderRadius: "16px",
    border: "1px solid #e1e1e1",
    backgroundColor: "#fff",
    cursor: "pointer",
    fontSize: "12px",
    transition: "all 0.2s ease",
    color: "#333",
    whiteSpace: "nowrap",
    overflow: "visible",
    minWidth: "fit-content",
    ":hover": {
      backgroundColor: "#f5f5f5",
      border: "1px solid #4f8bd4",
    },
  },
  chipSelected: {
    background: "rgba(255, 255, 255, 0.15) !important",
    backdropFilter: "blur(30px) saturate(200%) brightness(110%) !important",
    WebkitBackdropFilter: "blur(30px) saturate(200%) brightness(110%) !important",
    border: "1px solid rgba(255, 255, 255, 0.3) !important",
    color: "#1a1a1a !important",
    fontWeight: "600 !important",
    boxShadow: `
      0 6px 24px rgba(0, 0, 0, 0.1),
      0 2px 6px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      inset 0 -1px 0 rgba(255, 255, 255, 0.2),
      inset 1px 0 0 rgba(255, 255, 255, 0.4),
      inset -1px 0 0 rgba(255, 255, 255, 0.2)
    !important`,
    ":hover": {
      background: "rgba(255, 255, 255, 0.2) !important",
      boxShadow: `
        0 8px 32px rgba(0, 0, 0, 0.12),
        0 4px 10px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.7),
        inset 0 -1px 0 rgba(255, 255, 255, 0.3),
        inset 1px 0 0 rgba(255, 255, 255, 0.5),
        inset -1px 0 0 rgba(255, 255, 255, 0.3)
      !important`,
      color: "#1a1a1a !important",
    },
  },
});

type PromptCategory = 'documentType' | 'style' | 'perspective' | 'jurisdiction';

export const PROMPT_SUGGESTIONS: Record<PromptCategory, PromptSuggestion[]> = {
  documentType: [
    { id: 'nda', label: 'NDA', prompt: 'Draft a Non-Disclosure Agreement', category: 'documentType' },
    { id: 'employment', label: 'Employment', prompt: 'Draft an Employment Agreement', category: 'documentType' },
    { id: 'spa', label: 'SPA', prompt: 'Draft a Share Purchase Agreement', category: 'documentType' },
    { id: 'loan', label: 'Loan', prompt: 'Draft a Loan Agreement', category: 'documentType' },
    { id: 'services', label: 'Services', prompt: 'Draft a Services Agreement', category: 'documentType' },
  ],
  style: [
    { id: 'formal', label: 'Formal', prompt: 'Use formal legal language', category: 'style' },
    { id: 'plain', label: 'Plain English', prompt: 'Use plain, accessible language', category: 'style' },
    { id: 'technical', label: 'Technical', prompt: 'Include technical definitions', category: 'style' },
  ],
  perspective: [
    { id: 'buyer', label: 'Buyer-friendly', prompt: 'Draft from buyer perspective with strong protections', category: 'perspective' },
    { id: 'seller', label: 'Seller-friendly', prompt: 'Draft from seller perspective limiting liability', category: 'perspective' },
    { id: 'balanced', label: 'Balanced', prompt: 'Draft with balanced terms for both parties', category: 'perspective' },
  ],
  jurisdiction: [
    { id: 'sg', label: 'Singapore', prompt: 'Governed by Singapore law', category: 'jurisdiction' },
    { id: 'de', label: 'Delaware', prompt: 'Governed by Delaware law', category: 'jurisdiction' },
    { id: 'uk', label: 'England & Wales', prompt: 'Governed by English law', category: 'jurisdiction' },
    { id: 'hk', label: 'Hong Kong', prompt: 'Governed by Hong Kong law', category: 'jurisdiction' },
  ],
};

interface PromptSuggestionsProps {
  selectedPromptIds: string[];
  onPromptToggle: (promptId: string) => void;
}

export const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({
  selectedPromptIds,
  onPromptToggle,
}) => {
  const styles = useStyles();

  const categoryLabels: Record<PromptCategory, string> = {
    documentType: 'Document Type',
    style: 'Style',
    perspective: 'Perspective',
    jurisdiction: 'Jurisdiction',
  };

  return (
    <div className={styles.container}>
      {(Object.entries(PROMPT_SUGGESTIONS) as [PromptCategory, PromptSuggestion[]][]).map(([category, suggestions]) => (
        <div key={category}>
          <div className={styles.categoryTitle}>{categoryLabels[category]}</div>
          <div className={styles.chipsContainer}>
            {suggestions.map((suggestion) => {
              const isSelected = selectedPromptIds.includes(suggestion.id);
              return (
                <button
                  key={suggestion.id}
                  className={`${styles.chip} ${isSelected ? styles.chipSelected : ''}`}
                  onClick={() => onPromptToggle(suggestion.id)}
                  type="button"
                >
                  {suggestion.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

