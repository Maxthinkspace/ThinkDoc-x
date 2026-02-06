import * as React from "react";
import { makeStyles, Button as FButton, Textarea, Spinner } from "@fluentui/react-components";
import { ArrowLeft, Languages, ArrowDown, ArrowUp, Replace, Loader, CheckCircle, AlertCircle, FileText, Download } from "lucide-react";
import { useNavigation } from "../../hooks/use-navigation";
import { useLanguage } from "../../contexts/LanguageContext";
import { LanguageCode } from "../../utils/translations";
import { getContent, importParagraphFromSelection } from "../../../taskpane/taskpane";
import { Button } from "../../components/ui/button";
import { backendApi } from "../../../services/api";
import { downloadTranslatedDocx } from "../../../services/translationExport";

declare const Word: any;

type TranslationMode = "below" | "above" | "replace";
type TextScope = "selected" | "whole-document";

const LANGUAGE_CODES: LanguageCode[] = ["en", "zh", "es", "fr", "ja", "de"];

const useStyles = makeStyles({
  pageRoot: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#ffffff",
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #ececec",
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
    padding: "20px",
    overflowY: "auto",
  },
  section: {
    marginBottom: "16px",
  },
  sectionTitle: {
    fontSize: "12px",
    fontWeight: 700,
    marginBottom: "8px",
    color: "#444",
    letterSpacing: "0.02em",
    textTransform: "uppercase",
  },
  sectionDescription: {
    fontSize: "13px",
    color: "#666",
    marginBottom: "12px",
  },
  languageSelector: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  languageButton: {
    padding: "8px 12px",
    borderRadius: "999px",
    border: "1px solid #e6e6e6",
    backgroundColor: "#fafafa",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
    transition: "all 0.2s ease",
    color: "#333",
    whiteSpace: "nowrap",
    overflow: "visible",
    ":hover": {
      backgroundColor: "#f2f2f2",
    },
  },
  languageButtonActive: {
    backgroundColor: "#111827 !important",
    border: "1px solid #111827 !important",
    color: "#ffffff !important",
    fontWeight: "650 !important",
    ":hover": {
      backgroundColor: "#0b1220 !important",
    },
  },
  textScopeSelector: {
    display: "flex",
    gap: "8px",
  },
  scopeButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #e6e6e6",
    backgroundColor: "#fafafa",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    color: "#333",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "#f2f2f2",
    },
  },
  scopeButtonActive: {
    backgroundColor: "#2563eb !important",
    border: "1px solid #2563eb !important",
    color: "#ffffff !important",
  },
  modeSelector: {
    display: "flex",
    gap: "8px",
  },
  modeButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 12px",
    background: "#fafafa",
    border: "1px solid #e6e6e6",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontSize: "13px",
    fontWeight: 500,
    color: "#333",
    ":hover": {
      backgroundColor: "#f2f2f2",
    },
  },
  modeButtonActive: {
    backgroundColor: "#111827 !important",
    border: "1px solid #111827 !important",
    color: "#ffffff !important",
    fontWeight: "650 !important",
    ":hover": {
      backgroundColor: "#0b1220 !important",
    },
  },
  modeButtonIcon: {
    color: "inherit",
  },
  modeButtonText: {
    fontSize: "12px",
    fontWeight: 650,
  },
  textPreview: {
    padding: "12px",
    background: "#fff",
    border: "1px solid #e6e6e6",
    borderRadius: "12px",
    minHeight: "60px",
    maxHeight: "200px",
    overflowY: "auto",
  },
  textPreviewContent: {
    margin: 0,
    fontSize: "14px",
    color: "#333",
    lineHeight: "1.5",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
  },
  textPreviewEmpty: {
    color: "#999",
    fontStyle: "italic",
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#666",
    fontSize: "14px",
  },
  refreshButton: {
    padding: "8px 16px",
    background: "#fafafa",
    border: "1px solid #e6e6e6",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 500,
    color: "#666",
    transition: "all 0.2s ease",
    alignSelf: "flex-start",
    marginTop: "8px",
    ":hover": {
      backgroundColor: "#f2f2f2",
    },
  },
  downloadRow: {
    display: "flex",
    gap: "8px",
    marginTop: "10px",
    flexWrap: "wrap",
  },
  downloadButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    background: "#fafafa",
    border: "1px solid #e6e6e6",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 650,
    color: "#111827",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "#f2f2f2",
    },
    ":disabled": {
      opacity: 0.6,
      cursor: "not-allowed",
    },
  },
  errorMessage: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px",
    background: "#fff5f5",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    color: "#dc2626",
    fontSize: "14px",
    marginBottom: "12px",
  },
  successMessage: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px",
    background: "#f0fdf4",
    border: "1px solid #86efac",
    borderRadius: "8px",
    color: "#16a34a",
    fontSize: "14px",
    marginBottom: "12px",
  },
  footer: {
    padding: "16px 24px",
    borderTop: "1px solid #e1e1e1",
    backgroundColor: "#fff",
  },
  translateButton: {
    width: "100%",
  },
});

export const TranslationPage: React.FC = () => {
  const { goBack } = useNavigation();
  const { translations } = useLanguage();
  const styles = useStyles();

  const LANGUAGE_OPTIONS = LANGUAGE_CODES.map((code) => ({
    code,
    name: translations.language[code === "en" ? "english" : code === "zh" ? "chinese" : code === "es" ? "spanish" : code === "fr" ? "french" : code === "ja" ? "japanese" : "german"],
  }));
  const [sourceLanguage, setSourceLanguage] = React.useState<LanguageCode>("en");
  const [targetLanguage, setTargetLanguage] = React.useState<LanguageCode>("zh");
  const [translationMode, setTranslationMode] = React.useState<TranslationMode>("below");
  const [textScope, setTextScope] = React.useState<TextScope>("selected");
  const [sourceText, setSourceText] = React.useState<string>("");
  const [translatedText, setTranslatedText] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    loadSourceText();
  }, []);

  const loadSourceText = async () => {
    try {
      setIsLoading(true);
      if (textScope === "selected") {
        // Check for pre-filled text from text selection context menu
        const contextText = sessionStorage.getItem("translationText");
        if (contextText) {
          sessionStorage.removeItem("translationText");
          setSourceText(contextText);
          setError(null);
          setIsLoading(false);
          return;
        }

        // Fall back to getting selection from Word
        const text = await importParagraphFromSelection();
        setSourceText(text || "");
        if (!text) {
          setError("Please select some text in the document to translate");
        } else {
          setError(null);
        }
      } else {
        const text = await getContent();
        setSourceText(text || "");
        if (!text) {
          setError("Unable to read document text");
        } else {
          setError(null);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load selected text";
      setError(errorMsg);
      setSourceText("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      setError(textScope === "selected" ? "Please select some text in the document to translate" : "Document is empty");
      return;
    }

    if (sourceLanguage === targetLanguage) {
      setError("Source and target languages must be different");
      return;
    }

    try {
      setIsTranslating(true);
      setError(null);
      setSuccess(false);

      const data = await backendApi.translate({
        text: sourceText,
        sourceLanguage,
        targetLanguage,
      });
      
      if (!data.success || !data.translatedText) {
        throw new Error("Translation failed");
      }
      
      setTranslatedText(data.translatedText);

      // Apply translation to document
      await applyTranslation(data.translatedText);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Translation failed";
      setError(errorMsg);
    } finally {
      setIsTranslating(false);
    }
  };

  const applyTranslation = async (text: string) => {
    try {
      await Word.run(async (context) => {
        if (textScope === "selected") {
          const selection = context.document.getSelection();
          selection.load("text");
          await context.sync();

          if (translationMode === "replace") {
            selection.insertText(text, "Replace");
          } else if (translationMode === "below") {
            selection.insertText("\n" + text, "After");
          } else if (translationMode === "above") {
            selection.insertText(text + "\n", "Before");
          }
          await context.sync();
        } else {
          const body = context.document.body;

          if (translationMode === "replace") {
            const ok = window.confirm("This will replace the entire document with the translated text. Continue?");
            if (!ok) return;
            body.clear();
            body.insertParagraph(text, Word.InsertLocation.start);
          } else if (translationMode === "below") {
            const spacer = body.insertParagraph("", Word.InsertLocation.end);
            spacer.insertParagraph(text, Word.InsertLocation.after);
          } else if (translationMode === "above") {
            const first = body.insertParagraph(text, Word.InsertLocation.start);
            first.insertParagraph("", Word.InsertLocation.after);
          }
          await context.sync();
        }

        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      });
    } catch (err) {
      console.error("Error applying translation:", err);
      throw err;
    }
  };

  const canTranslate = sourceText.trim().length > 0 && !isTranslating && sourceLanguage !== targetLanguage;

  const handleDownloadDocx = async () => {
    if (!translatedText.trim()) return;
    await downloadTranslatedDocx({
      translatedText,
      sourceLanguage,
      targetLanguage,
    });
  };

  const handleDownloadPdf = async () => {
    if (!translatedText.trim()) return;
    try {
      setIsDownloadingPdf(true);
      const blob = await backendApi.exportTranslationPdf({
        text: translatedText,
        fileName: `translated_${targetLanguage}.pdf`,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `translated_${targetLanguage}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className={styles.pageRoot}>
      {/* Header */}
      <div className={styles.header}>
        <Button
          variant="outline"
          size="sm"
          onClick={goBack}
          disabled={isTranslating}
          style={{ padding: "4px 8px", fontSize: "12px" }}
        >
          <ArrowLeft style={{ width: "14px", height: "14px", marginRight: "4px" }} />
          Back
        </Button>
        <h1 className={styles.title}>{translations.dashboard.translation}</h1>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Text Scope */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{translations.negotiationPage?.textScope || "Text scope"}</h3>
          <div className={styles.textScopeSelector}>
            <button
              className={`${styles.scopeButton} ${textScope === "selected" ? styles.scopeButtonActive : ""}`}
              onClick={() => {
                setTextScope("selected");
                setSourceText("");
                setTranslatedText("");
                setError(null);
                // Load after state update tick
                setTimeout(() => loadSourceText(), 0);
              }}
              type="button"
            >
              <FileText size={16} />
              <span>{translations.negotiationPage?.selectedText || "Selected Text"}</span>
            </button>
            <button
              className={`${styles.scopeButton} ${textScope === "whole-document" ? styles.scopeButtonActive : ""}`}
              onClick={() => {
                setTextScope("whole-document");
                setSourceText("");
                setTranslatedText("");
                setError(null);
                setTimeout(() => loadSourceText(), 0);
              }}
              type="button"
            >
              <FileText size={16} />
              <span>{translations.negotiationPage?.wholeDocument || "Whole Document"}</span>
            </button>
          </div>
        </div>

        {/* Language Selection */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{translations.translationPage.sourceLanguage}</h3>
          <div className={styles.languageSelector}>
            {LANGUAGE_OPTIONS.map((lang) => (
              <button
                key={lang.code}
                className={`${styles.languageButton} ${sourceLanguage === lang.code ? styles.languageButtonActive : ""}`}
                onClick={() => setSourceLanguage(lang.code)}
                type="button"
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{translations.translationPage.targetLanguage}</h3>
          <div className={styles.languageSelector}>
            {LANGUAGE_OPTIONS.map((lang) => (
              <button
                key={lang.code}
                className={`${styles.languageButton} ${targetLanguage === lang.code ? styles.languageButtonActive : ""}`}
                onClick={() => setTargetLanguage(lang.code)}
                type="button"
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        {/* Translation Mode */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{translations.translationPage.translationMode}</h3>
          <div className={styles.modeSelector}>
            <button
              className={`${styles.modeButton} ${translationMode === "below" ? styles.modeButtonActive : ""}`}
              onClick={() => setTranslationMode("below")}
              type="button"
            >
              <ArrowDown size={16} className={styles.modeButtonIcon} />
              <span className={styles.modeButtonText}>{translations.translationPage.insertBelow}</span>
            </button>
            <button
              className={`${styles.modeButton} ${translationMode === "above" ? styles.modeButtonActive : ""}`}
              onClick={() => setTranslationMode("above")}
              type="button"
            >
              <ArrowUp size={16} className={styles.modeButtonIcon} />
              <span className={styles.modeButtonText}>{translations.translationPage.insertAbove}</span>
            </button>
            <button
              className={`${styles.modeButton} ${translationMode === "replace" ? styles.modeButtonActive : ""}`}
              onClick={() => setTranslationMode("replace")}
              type="button"
            >
              <Replace size={16} className={styles.modeButtonIcon} />
              <span className={styles.modeButtonText}>{translations.translationPage.replaceText}</span>
            </button>
          </div>
        </div>

        {/* Source Text Preview */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            {textScope === "selected"
              ? translations.translationPage.selectedText
              : translations.negotiationPage?.wholeDocument || "Whole Document"}
          </h3>
          <div className={styles.textPreview}>
            {isLoading ? (
              <div className={styles.loadingContainer}>
                <Loader size={16} style={{ animation: "spin 1s linear infinite" }} />
                <span>{translations.translationPage.loadingSelectedText}</span>
              </div>
            ) : sourceText ? (
              <p className={styles.textPreviewContent}>{sourceText}</p>
            ) : (
              <p className={`${styles.textPreviewContent} ${styles.textPreviewEmpty}`}>{translations.translationPage.noTextSelected}</p>
            )}
          </div>
          <button className={styles.refreshButton} onClick={loadSourceText} type="button">
            {translations.translationPage.refreshSelection}
          </button>
        </div>

        {/* Translated Text Preview */}
        {translatedText && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{translations.translationPage.translatedText}</h3>
            <div className={styles.textPreview}>
              <p className={styles.textPreviewContent}>{translatedText}</p>
            </div>
            <div className={styles.downloadRow}>
              <button
                className={styles.downloadButton}
                onClick={handleDownloadDocx}
                type="button"
                disabled={!translatedText.trim()}
              >
                <Download size={14} />
                Download Word
              </button>
              <button
                className={styles.downloadButton}
                onClick={handleDownloadPdf}
                type="button"
                disabled={!translatedText.trim() || isDownloadingPdf}
              >
                <Download size={14} />
                {isDownloadingPdf ? "Preparing PDF..." : "Download PDF"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        {error && (
          <div className={styles.errorMessage}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className={styles.successMessage}>
            <CheckCircle size={16} />
            <span>{translations.translationPage.translationApplied}</span>
          </div>
        )}
        <FButton
          appearance="primary"
          onClick={handleTranslate}
          disabled={!canTranslate}
          className={styles.translateButton}
        >
          {isTranslating ? (
            <>
              <Spinner size="tiny" style={{ marginRight: "8px" }} />
              {translations.translationPage.translating}
            </>
          ) : (
            <>
              <Languages size={18} style={{ marginRight: "8px" }} />
              {translations.translationPage.translate}
            </>
          )}
        </FButton>
      </div>
    </div>
  );
};
