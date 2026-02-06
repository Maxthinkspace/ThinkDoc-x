import * as React from "react";
import type { ClauseContext } from "../../../types/panelTypes";
import "./PromptSuggestions.css";

interface PromptSuggestionsProps {
  onPromptSelect: (prompt: string) => void;
  clauseContext?: ClauseContext | null;
}

const GENERAL_PROMPTS = [
  "Summarize the selected text",
  "Explain this clause in simple terms",
  "What are the key terms in this section?",
  "Compare this with standard practice",
  "Generate a plan to review this document",
  "Analyze the risks in this clause",
];

const CONTEXT_PROMPTS = [
  "Summarize the selected text",
  "Explain this clause in simple terms",
  "What are the key terms in this section?",
  "Compare this with standard practice",
  "Analyze the risks in this clause",
  "What should I watch out for in this section?",
];

export const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({
  onPromptSelect,
  clauseContext,
}) => {
  const prompts = clauseContext ? CONTEXT_PROMPTS : GENERAL_PROMPTS;

  return (
    <div className="prompt-suggestions">
      <div className="prompt-suggestions-label">Suggested Prompts</div>
      <div className="prompt-suggestions-grid">
        {prompts.map((prompt, index) => (
          <button
            key={index}
            className="prompt-suggestion-chip"
            onClick={() => onPromptSelect(prompt)}
            type="button"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
};

