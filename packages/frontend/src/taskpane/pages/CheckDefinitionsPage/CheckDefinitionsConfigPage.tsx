import React, { useState } from "react";
import {
  makeStyles,
  Spinner,
} from "@fluentui/react-components";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "../../components/ui/button";
import { documentCache } from "@/src/services/documentCache";
import type { ParsedDocument } from "@/src/types/documents";

interface CheckDefinitionsConfigPageProps {
  onComplete: (parsedDocument: ParsedDocument, language: string) => void;
  onBack: () => void;
}

const useStyles = makeStyles({
  pageRoot: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#f8f9fa",
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #e1e1e1",
    backgroundColor: "#fff",
    gap: "16px",
  },
  title: {
    fontSize: "18px",
    fontWeight: 600,
    margin: 0,
  },
  content: {
    flex: 1,
    padding: "24px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    width: "100%",
    maxWidth: "500px",
    marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 600,
    marginBottom: "8px",
    color: "#333",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  sectionDescription: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "24px",
    lineHeight: "1.5",
  },
  analyzeBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    padding: "10px 16px",
    borderRadius: "6px",
    border: "none",
    background: "var(--brand-gradient)",
    color: "var(--text-on-brand)",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  footer: {
    padding: "16px 24px",
    borderTop: "1px solid #e1e1e1",
    backgroundColor: "#fff",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  errorText: {
    color: "#d32f2f",
    fontSize: "13px",
    marginTop: "8px",
  },
});

export const CheckDefinitionsConfigPage: React.FC<CheckDefinitionsConfigPageProps> = ({
  onComplete,
  onBack,
}) => {
  const styles = useStyles();
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsParsing(true);
    setError(null);

    try {
      // Use documentCache to get parsed document (avoids re-parsing if already cached)
      // Using getParsedDocumentSimple() to get version without Word.js Ranges (for backend API)
      const parsedDocument = await documentCache.getParsedDocumentSimple();
      onComplete(parsedDocument, "english");
    } catch (err) {
      console.error("Error parsing document:", err);
      setError(err instanceof Error ? err.message : "Failed to parse document");
      setIsParsing(false);
    }
  };

  return (
    <div className={styles.pageRoot}>
      {/* Header */}
      <div className={styles.header}>
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          style={{ padding: "4px 8px", fontSize: "12px" }}
        >
          <ArrowLeft style={{ width: "14px", height: "14px", marginRight: "4px" }} />
          Back
        </Button>
        <h1 className={styles.title}>Check Definitions</h1>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <FileText size={20} />
            Analyze Definitions
          </div>
          <p className={styles.sectionDescription}>
            This tool will analyze your document for definition-related issues including:
            unused definitions, undefined terms, inconsistent capitalization, missing quotes,
            and capitalization issues.
          </p>

          {error && <div className={styles.errorText}>{error}</div>}

          <button
            className={`${styles.analyzeBtn} brand-btn`}
            onClick={handleAnalyze}
            disabled={isParsing}
          >
            {isParsing ? (
              <>
                <Spinner size="tiny" />
                Loading...
              </>
            ) : (
              "Analyze Definitions"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

