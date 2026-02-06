import * as React from "react";

// Define all possible page types in the application
export type PageType =
  | "menu"
  | "dashboard"
  | "vault"
  | "history"
  | "setup"
  | "language"
  | "help-support"
  | "profile"
  | "sharing"
  | "library"
  | "unified-library"
  | "createPB"
  | "PlaybookGenerator"
  | "ManualPlaybook"
  | "PlaybookRulesTabs"
  | "RulesConfiguration"
  | "playbookRules"
  | "loading"
  | "rules"
  | "hero"
  | "precedent-comparison"
  | "redraft"
  | "summary"
  | "summary-scope"
  | "redomicile"
  | "ask"
  | "translation"
  | "negotiation"
  | "clause-library"
  | "create-clause"
  | "extract-clause"
  | "draft-clause"
  | "draft-from-scratch"
  | "check-definitions"
  | "document-versions"
  | "test-summary"
  | "redaction";

export interface NavigationOptions {
  tab?: "clauses" | "projects" | "playbooks";
  itemId?: string;
  activeJobId?: string;  // Job ID to resume polling when navigating to a feature page
}

interface NavigationContextType {
  currentPage: PageType;
  navigateTo: (page: PageType, options?: NavigationOptions) => void;
  goBack: () => void;
  navigationHistory: PageType[];
  navigationState: NavigationOptions;
}

const NavigationContext = React.createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{
  children: React.ReactNode;
  initialPage?: PageType;
}> = ({ children, initialPage = "menu" }) => {
  const [currentPage, setCurrentPage] = React.useState<PageType>(initialPage);
  const [navigationHistory, setNavigationHistory] = React.useState<PageType[]>([initialPage]);
  const [navigationState, setNavigationState] = React.useState<NavigationOptions>({});

  const navigateTo = React.useCallback((page: PageType, options?: NavigationOptions) => {
    // Handle redirects for deprecated routes
    if (page === "library" || page === "clause-library") {
      // Redirect to unified-library with appropriate tab
      const tab = page === "clause-library" ? "clauses" : "playbooks";
      setCurrentPage("unified-library");
      setNavigationHistory((prev) => [...prev, "unified-library"]);
      setNavigationState({ tab });
      return;
    }
    
    setCurrentPage(page);
    setNavigationHistory((prev) => [...prev, page]);
    setNavigationState(options || {});
    // Note: In Word Add-in context, we don't update URL/history
  }, []);

  const goBack = React.useCallback(() => {
    setNavigationHistory((prev) => {
      if (prev.length <= 1) return prev;
      const newHistory = prev.slice(0, -1);
      const previousPage = newHistory[newHistory.length - 1];
      setCurrentPage(previousPage);
      setNavigationState({}); // Clear state when going back
      return newHistory;
    });
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        currentPage,
        navigateTo,
        goBack,
        navigationHistory,
        navigationState,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = React.useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
};
