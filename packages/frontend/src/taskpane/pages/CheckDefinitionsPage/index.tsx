import React, { useState } from "react";
import { useNavigation } from "../../hooks/use-navigation";
import { CheckDefinitionsConfigPage } from "./CheckDefinitionsConfigPage";
import { CheckDefinitionsResultsPage } from "./CheckDefinitionsResultsPage";
import { CheckDefinitionsProgressPage } from "./CheckDefinitionsProgressPage";
import type { DefinitionCheckResult } from "@/src/services/api";
import type { ParsedDocument } from "@/src/types/documents";

type ViewState = "config" | "processing" | "results";

export const CheckDefinitionsIndex: React.FC = () => {
  const { navigateTo } = useNavigation();
  
  const [currentView, setCurrentView] = useState<ViewState>("config");
  const [results, setResults] = useState<DefinitionCheckResult | null>(null);
  const [originalParsed, setOriginalParsed] = useState<ParsedDocument | null>(null);
  const [language, setLanguage] = useState<string>("english");

  const handleConfigComplete = (
    parsedDocument: ParsedDocument,
    lang: string
  ) => {
    setOriginalParsed(parsedDocument);
    setLanguage(lang);
    setCurrentView("processing");
  };

  const handleAnalysisComplete = (analysisResults: DefinitionCheckResult) => {
    setResults(analysisResults);
    setCurrentView("results");
  };

  const handleBackToConfig = () => {
    setCurrentView("config");
    setResults(null);
  };

  return (
    <div style={{
      position: "relative",
      height: "100vh",
      width: "100%",
      overflow: "hidden"
    }}>
      {/* Config page stays visible behind the progress modal */}
      {(currentView === "config" || currentView === "processing") && (
        <CheckDefinitionsConfigPage
          onComplete={handleConfigComplete}
          onBack={() => navigateTo("menu")}
        />
      )}
      {currentView === "processing" && originalParsed && (
        <CheckDefinitionsProgressPage
          parsedDocument={originalParsed}
          language={language}
          onComplete={handleAnalysisComplete}
          onBack={handleBackToConfig}
        />
      )}
      {currentView === "results" && results && (
        <CheckDefinitionsResultsPage
          onBack={handleBackToConfig}
          results={results}
          originalParsed={originalParsed}
        />
      )}
    </div>
  );
};

