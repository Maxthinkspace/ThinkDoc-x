import * as React from "react";
import { makeStyles, Button as FButton, Spinner } from "@fluentui/react-components";
import { ArrowLeft, Download, Copy, RefreshCw, FileText } from "lucide-react";
import { Button } from "../../components/ui/button";
import type { DraftedContent } from "./types";
import "./styles/DraftFromScratchPage.css";

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
  },
  section: {
    marginBottom: "24px",
    backgroundColor: "#fff",
    border: "1px solid #e1e1e1",
    borderRadius: "6px",
    padding: "16px",
  },
  sectionHeader: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#333",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  sectionNumber: {
    color: "#4f8bd4",
  },
  sectionContent: {
    fontSize: "14px",
    lineHeight: "1.8",
    color: "#333",
    whiteSpace: "pre-wrap",
  },
  footer: {
    padding: "16px 24px",
    borderTop: "1px solid #e1e1e1",
    backgroundColor: "#fff",
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  footerButton: {
    flex: 1,
    minWidth: "140px",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px",
    gap: "16px",
  },
  loadingText: {
    fontSize: "14px",
    color: "#666",
  },
  progressText: {
    fontSize: "13px",
    color: "#666",
    marginBottom: "16px",
  },
});

interface DraftResultsViewProps {
  draftResults: DraftedContent[];
  onInsertToDocument: () => void;
  onDownload: () => void;
  onCopyToClipboard: () => void;
  onRegenerate: () => void;
  onStartOver: () => void;
  isLoading: boolean;
  progress?: { current: number; total: number; message: string };
}

const DraftedSectionItem: React.FC<{ content: DraftedContent; level: number }> = ({
  content,
  level,
}) => {
  const styles = useStyles();
  const [expanded, setExpanded] = React.useState(true);

  const hasChildren = content.children && content.children.length > 0;

  return (
    <div className={styles.section} style={{ marginLeft: `${level * 16}px` }}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionNumber}>{content.sectionNumber}</span>
        <span>{content.title}</span>
      </div>
      <div className={styles.sectionContent}>{content.content}</div>
      {hasChildren && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              marginTop: "12px",
              padding: "4px 8px",
              fontSize: "12px",
              background: "none",
              border: "1px solid #e1e1e1",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            type="button"
          >
            {expanded ? "Hide Subsections" : "Show Subsections"}
          </button>
          {expanded && (
            <div style={{ marginTop: "12px" }}>
              {content.children!.map((child) => (
                <DraftedSectionItem key={child.sectionId} content={child} level={level + 1} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const DraftResultsView: React.FC<DraftResultsViewProps> = ({
  draftResults,
  onInsertToDocument,
  onDownload,
  onCopyToClipboard,
  onRegenerate,
  onStartOver,
  isLoading,
  progress,
}) => {
  const styles = useStyles();

  const fullText = React.useMemo(() => {
    const extractText = (contents: DraftedContent[]): string => {
      return contents
        .map((content) => {
          let text = `${content.sectionNumber} ${content.title}\n\n${content.content}\n\n`;
          if (content.children) {
            text += extractText(content.children);
          }
          return text;
        })
        .join("\n");
    };
    return extractText(draftResults);
  }, [draftResults]);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      onCopyToClipboard();
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const handleInsertToDocument = async () => {
    try {
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.insertText(fullText, Word.InsertLocation.replace);
        await context.sync();
      });
      onInsertToDocument();
    } catch (err) {
      console.error("Failed to insert to document:", err);
      alert("Failed to insert text into document. Please ensure Word is available.");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([fullText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "draft.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onDownload();
  };

  return (
    <div className={styles.pageRoot}>
      {/* Header */}
      <div className={styles.header}>
        <Button
          variant="outline"
          size="sm"
          onClick={onStartOver}
          disabled={isLoading}
          style={{ padding: "4px 8px", fontSize: "12px" }}
        >
          <ArrowLeft style={{ width: "14px", height: "14px", marginRight: "4px" }} />
          Start Over
        </Button>
        <h1 className={styles.title}>Draft Complete</h1>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {isLoading && progress && (
          <div className={styles.loadingContainer}>
            <Spinner size="large" />
            <div className={styles.loadingText}>
              Drafting section {progress.current} of {progress.total}...
            </div>
            <div className={styles.progressText}>{progress.message}</div>
          </div>
        )}

        {!isLoading && draftResults.length === 0 && (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingText}>No content generated yet.</div>
          </div>
        )}

        {!isLoading &&
          draftResults.map((content) => (
            <DraftedSectionItem key={content.sectionId} content={content} level={0} />
          ))}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <FButton
          appearance="primary"
          onClick={handleInsertToDocument}
          disabled={isLoading || draftResults.length === 0}
          className={styles.footerButton}
          icon={<FileText size={16} />}
        >
          Insert to Document
        </FButton>
        <FButton
          appearance="secondary"
          onClick={handleDownload}
          disabled={isLoading || draftResults.length === 0}
          className={styles.footerButton}
          icon={<Download size={16} />}
        >
          Download
        </FButton>
        <FButton
          appearance="secondary"
          onClick={handleCopyToClipboard}
          disabled={isLoading || draftResults.length === 0}
          className={styles.footerButton}
          icon={<Copy size={16} />}
        >
          Copy to Clipboard
        </FButton>
        <FButton
          appearance="secondary"
          onClick={onRegenerate}
          disabled={isLoading}
          className={styles.footerButton}
          icon={<RefreshCw size={16} />}
        >
          Regenerate
        </FButton>
        <FButton
          appearance="secondary"
          onClick={onStartOver}
          disabled={isLoading}
          className={styles.footerButton}
        >
          Start Over
        </FButton>
      </div>
    </div>
  );
};

