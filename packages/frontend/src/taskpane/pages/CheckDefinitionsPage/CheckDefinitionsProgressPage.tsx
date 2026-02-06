import React, { useEffect } from "react";
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  Spinner,
} from "@fluentui/react-components";
import { backendApi } from "@/src/services/api";
import type { ParsedDocument } from "@/src/types/documents";
import type { DefinitionCheckResult } from "@/src/services/api";

interface CheckDefinitionsProgressPageProps {
  parsedDocument: ParsedDocument;
  language: string;
  onComplete: (results: DefinitionCheckResult) => void;
  onBack: () => void;
}

export const CheckDefinitionsProgressPage: React.FC<CheckDefinitionsProgressPageProps> = ({
  parsedDocument,
  language,
  onComplete,
  onBack,
}) => {
  useEffect(() => {
    const analyzeDocument = async () => {
      try {
        const results = await backendApi.analyzeDefinitions(parsedDocument, language);
        onComplete(results);
      } catch (error) {
        console.error("Error analyzing definitions:", error);
        alert("Failed to analyze definitions. Please try again.");
        onBack();
      }
    };

    analyzeDocument();
  }, [parsedDocument, language, onComplete, onBack]);

  return (
    <Dialog open modalType="alert">
      <DialogSurface style={{ maxWidth: "400px" }}>
        <DialogBody>
          <DialogTitle style={{ textAlign: "center", marginBottom: "16px" }}>
            Analyzing Definitions
          </DialogTitle>
          <DialogContent>
            <p style={{
              fontSize: "14px",
              color: "#666",
              textAlign: "center",
              margin: "0 0 24px 0",
            }}>
              Analyzing your document for definition issues...
            </p>
            <div style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "8px",
            }}>
              <Spinner size="large" />
            </div>
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
