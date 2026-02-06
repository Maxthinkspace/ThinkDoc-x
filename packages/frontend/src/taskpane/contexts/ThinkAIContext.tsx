import * as React from "react";
import type { Mode, ClauseContext, SavePrefill } from "../../types/panelTypes";

interface ThinkAIContextValue {
  openChat: (options?: { contextText?: string; initialMessage?: string; mode?: Mode }) => void;
  closeChat: () => void;
  isOpen: boolean;
  contextText: string | undefined;
  initialMessage: string | undefined;
  mode: Mode;
  setMode: (mode: Mode) => void;
  clauseContext: ClauseContext | null;
  setClauseContext: (context: ClauseContext | null) => void;
  savePrefill: SavePrefill | null;
  setSavePrefill: (prefill: SavePrefill | null) => void;
}

const ThinkAIContext = React.createContext<ThinkAIContextValue | undefined>(undefined);

export const ThinkAIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [contextText, setContextText] = React.useState<string | undefined>(undefined);
  const [initialMessage, setInitialMessage] = React.useState<string | undefined>(undefined);
  const [mode, setMode] = React.useState<Mode>('think');
  const [clauseContext, setClauseContext] = React.useState<ClauseContext | null>(null);
  const [savePrefill, setSavePrefill] = React.useState<SavePrefill | null>(null);

  const openChat = React.useCallback((options?: { contextText?: string; initialMessage?: string; mode?: Mode }) => {
    setContextText(options?.contextText);
    setInitialMessage(options?.initialMessage);
    if (options?.mode) {
      setMode(options.mode);
    }
    if (options?.contextText) {
      setClauseContext({
        text: options.contextText,
      });
    }
    setIsOpen(true);
  }, []);

  const closeChat = React.useCallback(() => {
    setIsOpen(false);
    setContextText(undefined);
    setInitialMessage(undefined);
    setClauseContext(null);
    setSavePrefill(null);
    setMode('think');
  }, []);

  return (
    <ThinkAIContext.Provider
      value={{
        openChat,
        closeChat,
        isOpen,
        contextText,
        initialMessage,
        mode,
        setMode,
        clauseContext,
        setClauseContext,
        savePrefill,
        setSavePrefill,
      }}
    >
      {children}
    </ThinkAIContext.Provider>
  );
};

export const useThinkAI = () => {
  const context = React.useContext(ThinkAIContext);
  if (!context) {
    throw new Error("useThinkAI must be used within ThinkAIProvider");
  }
  return context;
};

