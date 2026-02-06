import * as React from "react";
import { makeStyles, Button as FButton, Textarea, Spinner } from "@fluentui/react-components";
import { ArrowLeft, Scale, User, MessageSquare, FileText, Loader, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useNavigation } from "../../hooks/use-navigation";
import { useLanguage } from "../../contexts/LanguageContext";
import { importParagraphFromSelection } from "../../../taskpane/taskpane";
import { parseDocument } from "../../../services/documentParser";
import { backendApi, getAuthHeaders } from "../../../services/api";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import { GeneralSourceSelector } from "../../components/GeneralSourceSelector";
import type { GeneralSourceConfig } from "../../../types/panelTypes";
import { useDocumentAnnotations } from "../../contexts/AnnotationContext";

type Position = "buyer" | "seller" | "lessor" | "lessee" | "licensor" | "licensee" | "employer" | "employee" | "custom";
type TextScope = "selected" | "whole-document";

interface NegotiationInstruction {
  id: string;
  text: string;
  timestamp: number;
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
    borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
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
    marginBottom: "20px",
    padding: "16px",
    background: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "12px",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
  },
  sectionTitle: {
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "12px",
    color: "#1d1d1f",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  sectionDescription: {
    fontSize: "13px",
    color: "#666",
    marginBottom: "12px",
  },
  positionDetected: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  positionPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#1d1d1f",
  },
  positionChangeButton: {
    padding: "6px 12px",
    background: "rgba(255, 255, 255, 0.6)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 500,
    color: "#1d1d1f",
    cursor: "pointer",
    transition: "all 0.2s ease",
    ":hover": {
      background: "rgba(255, 255, 255, 0.8)",
      transform: "translateY(-1px)",
    },
  },
  positionOverrideMenu: {
    marginTop: "12px",
    padding: "12px",
    background: "rgba(255, 255, 255, 0.9)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.5)",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
  },
  positionOverrideOption: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    background: "transparent",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#1d1d1f",
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
    transition: "background 0.15s ease",
    ":hover": {
      background: "rgba(0, 0, 0, 0.04)",
    },
  },
  customPositionInput: {
    marginTop: "12px",
    width: "100%",
    padding: "10px 12px",
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    borderRadius: "8px",
    fontSize: "14px",
    color: "#1d1d1f",
    ":focus": {
      outline: "none",
      border: "1px solid rgba(102, 111, 246, 0.6)",
      background: "rgba(255, 255, 255, 0.95)",
    },
  },
  instructionsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  instructionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "200px",
    overflowY: "auto",
  },
  instructionItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    padding: "10px 12px",
    background: "rgba(255, 255, 255, 0.6)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    borderRadius: "8px",
    borderLeft: "3px solid rgba(102, 111, 246, 0.6)",
  },
  instructionText: {
    flex: 1,
    fontSize: "14px",
    color: "#333",
    lineHeight: "1.5",
  },
  instructionRemove: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#999",
    fontSize: "20px",
    lineHeight: 1,
    padding: 0,
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "#e5e5e5",
      color: "#333",
    },
  },
  instructionInputContainer: {
    display: "flex",
    gap: "8px",
  },
  instructionInput: {
    flex: 1,
    fontSize: "14px",
    fontFamily: "inherit",
    resize: "vertical",
    minHeight: "60px",
  },
  instructionAddButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 16px",
    background: "#666ff6",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    transition: "background-color 0.2s ease",
    alignSelf: "flex-end",
    ":hover:not(:disabled)": {
      backgroundColor: "#5555e5",
    },
    ":disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  },
  textScopeSelector: {
    display: "flex",
    gap: "8px",
  },
  scopeButton: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px",
    background: "rgba(255, 255, 255, 0.6)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontSize: "14px",
    fontWeight: 500,
    color: "#1d1d1f",
    whiteSpace: "nowrap",
    overflow: "visible",
    ":hover": {
      background: "rgba(255, 255, 255, 0.8)",
      transform: "translateY(-1px)",
    },
  },
  scopeButtonActive: {
    background: "rgba(255, 255, 255, 0.9) !important",
    backdropFilter: "blur(20px) saturate(180%) !important",
    WebkitBackdropFilter: "blur(20px) saturate(180%) !important",
    border: "1px solid rgba(255, 255, 255, 0.6) !important",
    color: "#1d1d1f !important",
    fontWeight: "600 !important",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1) !important",
  },
  selectedTextPreview: {
    marginTop: "12px",
    padding: "12px",
    background: "rgba(255, 255, 255, 0.6)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.4)",
  },
  previewText: {
    fontSize: "13px",
    color: "#333",
    lineHeight: "1.5",
    marginBottom: "8px",
  },
  refreshSelectionButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    color: "#666",
    transition: "all 0.2s ease",
    ":hover": {
      border: "1px solid rgba(102, 111, 246, 0.6)",
      color: "#666ff6",
      background: "rgba(255, 255, 255, 0.95)",
    },
  },
  loadingText: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#666",
    fontSize: "13px",
  },
  noTextMessage: {
    color: "#999",
    fontSize: "13px",
    fontStyle: "italic",
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
  footer: {
    padding: "16px 24px",
    borderTop: "1px solid rgba(0, 0, 0, 0.08)",
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
  },
  runButton: {
    width: "100%",
  },
});

export const NegotiationPage: React.FC = () => {
  const { goBack } = useNavigation();
  const { translations } = useLanguage();
  const { toast } = useToast();
  const styles = useStyles();

  // Position options - defined early so we can use in useEffect
  const positionOptions: { value: Position; label: string }[] = [
    { value: "buyer", label: translations.negotiationPage?.positionBuyer || "Buyer" },
    { value: "seller", label: translations.negotiationPage?.positionSeller || "Seller" },
    { value: "lessor", label: translations.negotiationPage?.positionLessor || "Lessor" },
    { value: "lessee", label: translations.negotiationPage?.positionLessee || "Lessee" },
    { value: "licensor", label: translations.negotiationPage?.positionLicensor || "Licensor" },
    { value: "licensee", label: translations.negotiationPage?.positionLicensee || "Licensee" },
    { value: "employer", label: translations.negotiationPage?.positionEmployer || "Employer" },
    { value: "employee", label: translations.negotiationPage?.positionEmployee || "Employee" },
    { value: "custom", label: translations.negotiationPage?.positionCustom || "Custom" },
  ];

  // Get cached positions from shared context
  const { positions: extractedPositions, isLoading: isExtractingPositions, extract } = useDocumentAnnotations();
  
  // Position selection
  const [position, setPosition] = React.useState<Position>("buyer");
  const [customPosition, setCustomPosition] = React.useState<string>("");
  const [showPositionOverride, setShowPositionOverride] = React.useState(false);

  // Instructions
  const [instructions, setInstructions] = React.useState<NegotiationInstruction[]>([]);
  const [currentInstruction, setCurrentInstruction] = React.useState<string>("");

  // Text selection
  const [textScope, setTextScope] = React.useState<TextScope>("selected");
  const [selectedText, setSelectedText] = React.useState<string>("");
  const [isLoadingText, setIsLoadingText] = React.useState(false);

  // Source config for GeneralSourceSelector
  const [sourceConfig, setSourceConfig] = React.useState<GeneralSourceConfig>({
    includeDocument: false,
    vaultClauses: [],
    vaultPlaybooks: [],
    vaultStandards: [],
    uploadedFiles: [],
    importedSources: [],
  });

  // Processing
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState<{ step: number; total: number; message: string } | null>(null);
  const [results, setResults] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Trigger extraction on mount if not cached
  React.useEffect(() => {
    if (!extractedPositions) {
      extract();
    }
  }, [extract, extractedPositions]);

  // Update position when extraction completes
  React.useEffect(() => {
    if (extractedPositions?.normalized?.length) {
      const detectedLabel = extractedPositions.normalized[0].toLowerCase();
      const matched = positionOptions.find(
        opt => opt.value !== "custom" && opt.value === detectedLabel
      );
      if (matched) {
        setPosition(matched.value);
      } else {
        // Use as custom if not a standard type
        setPosition("custom");
        setCustomPosition(extractedPositions.normalized[0]);
      }
    }
  }, [extractedPositions]);

  // Load selected text on mount
  React.useEffect(() => {
    if (textScope === "selected") {
      loadSelectedText();
    }
  }, [textScope]);

  const loadSelectedText = async () => {
    setIsLoadingText(true);
    try {
      const text = await importParagraphFromSelection();
      setSelectedText(text || "");
      if (!text && textScope === "selected") {
        setError(translations.negotiationPage?.noTextSelected || "Please select text in the document");
      }
    } catch (err) {
      console.error("Error loading selected text:", err);
      setError(err instanceof Error ? err.message : "Failed to load selected text");
    } finally {
      setIsLoadingText(false);
    }
  };

  const handleAddInstruction = () => {
    if (!currentInstruction.trim()) return;

    const newInstruction: NegotiationInstruction = {
      id: Date.now().toString(),
      text: currentInstruction.trim(),
      timestamp: Date.now(),
    };

    setInstructions([...instructions, newInstruction]);
    setCurrentInstruction("");
  };

  const handleRemoveInstruction = (id: string) => {
    setInstructions(instructions.filter((inst) => inst.id !== id));
  };

  const handleRunNegotiation = async () => {
    // Validation
    if (textScope === "selected" && !selectedText.trim()) {
      setError(translations.negotiationPage?.noTextSelected || "Please select text or choose whole document");
      return;
    }

    if (position === "custom" && !customPosition.trim()) {
      setError(translations.negotiationPage?.customPositionRequired || "Please enter your custom position");
      return;
    }

    if (instructions.length === 0) {
      setError(translations.negotiationPage?.noInstructions || "Please add at least one negotiation instruction");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress({ step: 1, total: 4, message: translations.negotiationPage?.parsingDocument || "Parsing document..." });

    try {
      // Step 1: Parse document or use selected text
      let documentText = selectedText;
      let documentStructure = null;

      if (textScope === "whole-document") {
        setProgress({ step: 1, total: 4, message: translations.negotiationPage?.parsingDocument || "Parsing document..." });
        const parsed = await parseDocument();
        documentStructure = parsed.structure;
        // Extract full text from structure
        documentText = parsed.structure.map((s: any) => s.text).join("\n\n");
      }

      // Step 2: Prepare reference data from sourceConfig
      setProgress({ step: 2, total: 4, message: translations.negotiationPage?.loadingReferences || "Loading references..." });
      let referenceData: { type: "clause" | "playbook" | "project"; data: GeneralSourceConfig } | null = null;

      // Build reference data from GeneralSourceConfig
      if (sourceConfig.vaultClauses.length > 0 || sourceConfig.vaultPlaybooks.length > 0 || sourceConfig.uploadedFiles.length > 0 || sourceConfig.importedSources.length > 0) {
        referenceData = {
          type: "project",
          data: sourceConfig,
        };
      }

      // Step 3: Call negotiation API
      setProgress({ step: 3, total: 4, message: translations.negotiationPage?.analyzing || "Analyzing negotiation points..." });
      
      const baseUrl = (backendApi as any).baseUrl || "";
      const response = await fetch(`${baseUrl}/api/negotiation/analyze`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          position: position === "custom" ? customPosition : position,
          instructions: instructions.map((inst) => inst.text),
          text: documentText,
          structure: documentStructure,
          reference: referenceData,
        }),
      });

      let result: any = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        const errorMessage =
          result?.error?.message ||
          result?.error ||
          result?.message ||
          "Negotiation analysis failed";
        throw new Error(`${errorMessage} (HTTP ${response.status})`);
      }

      if (result?.success === false) {
        const errorMessage =
          result?.error?.message ||
          result?.error ||
          "Negotiation analysis failed";
        throw new Error(errorMessage);
      }

      // Step 4: Display results
      setProgress({ step: 4, total: 4, message: translations.negotiationPage?.completing || "Completing..." });
      setResults(result);
      
      toast({
        title: translations.negotiationPage?.success || "Negotiation Analysis Complete",
        description: translations.negotiationPage?.successDescription || "Suggested amendments have been generated",
      });
    } catch (err) {
      console.error("Error running negotiation:", err);
      setError(err instanceof Error ? err.message : translations.negotiationPage?.error || "Failed to analyze negotiation");
      toast({
        title: translations.negotiationPage?.error || "Error",
        description: err instanceof Error ? err.message : "Failed to analyze negotiation",
      });
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const canRun = !isProcessing && (textScope === "whole-document" || selectedText.trim().length > 0) && instructions.length > 0;

  return (
    <div className={styles.pageRoot}>
      {/* Header */}
      <div className={styles.header}>
        <Button
          variant="outline"
          size="sm"
          onClick={goBack}
          disabled={isProcessing}
          style={{ padding: "4px 8px", fontSize: "12px" }}
        >
          <ArrowLeft style={{ width: "14px", height: "14px", marginRight: "4px" }} />
          Back
        </Button>
        <h1 className={styles.title}>{translations.negotiationPage?.title || "Negotiation"}</h1>
      </div>

      {!results ? (
        <>
          {/* Content */}
          <div className={styles.content}>
            {/* Position Selection */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Position</h3>
              {isExtractingPositions ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#666", fontSize: "13px" }}>
                  <Loader size={16} style={{ animation: "spin 1s linear infinite" }} />
                  <span>Detecting position...</span>
                </div>
              ) : (
                <>
                  <div className={styles.positionDetected}>
                    <span className={styles.positionPill}>
                      <User size={14} />
                      <span>
                        {position === "custom" ? customPosition : positionOptions.find(o => o.value === position)?.label || "Buyer"}
                      </span>
                    </span>
                    <button
                      className={styles.positionChangeButton}
                      onClick={() => setShowPositionOverride(!showPositionOverride)}
                      type="button"
                    >
                      Change
                    </button>
                  </div>
                  {showPositionOverride && (
                    <div className={styles.positionOverrideMenu}>
                      {positionOptions.map((option) => (
                        <button
                          key={option.value}
                          className={styles.positionOverrideOption}
                          onClick={() => {
                            setPosition(option.value);
                            if (option.value !== "custom") {
                              setShowPositionOverride(false);
                            }
                          }}
                          type="button"
                        >
                          <User size={14} />
                          <span>{option.label}</span>
                        </button>
                      ))}
                      {position === "custom" && (
                        <input
                          type="text"
                          className={styles.customPositionInput}
                          placeholder={translations.negotiationPage?.customPositionPlaceholder || "Enter your position"}
                          value={customPosition}
                          onChange={(e) => setCustomPosition(e.target.value)}
                          autoFocus
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Instructions */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                {translations.negotiationPage?.negotiationInstructions || "NEGOTIATION INSTRUCTIONS"}
              </h3>
              <div className={styles.instructionsContainer}>
                <div className={styles.instructionsList}>
                  {instructions.map((instruction) => (
                    <div key={instruction.id} className={styles.instructionItem}>
                      <div className={styles.instructionText}>{instruction.text}</div>
                      <button
                        className={styles.instructionRemove}
                        onClick={() => handleRemoveInstruction(instruction.id)}
                        aria-label="Remove instruction"
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className={styles.instructionInputContainer}>
                  <Textarea
                    className={styles.instructionInput}
                    placeholder={translations.negotiationPage?.instructionPlaceholder || "Add negotiation point or instruction..."}
                    value={currentInstruction}
                    onChange={(_, data) => setCurrentInstruction(data.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleAddInstruction();
                      }
                    }}
                    rows={3}
                  />
                  <button
                    className={styles.instructionAddButton}
                    onClick={handleAddInstruction}
                    disabled={!currentInstruction.trim()}
                    type="button"
                  >
                    <MessageSquare size={18} />
                    <span>{translations.common.add || "Add"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Text Selection */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>{translations.negotiationPage?.textScope || "TEXT SCOPE"}</h3>
              <div className={styles.textScopeSelector}>
                <button
                  className={`${styles.scopeButton} ${textScope === "selected" ? styles.scopeButtonActive : ""}`}
                  onClick={() => setTextScope("selected")}
                  type="button"
                >
                  <FileText size={18} />
                  <span>{translations.negotiationPage?.selectedText || "Selected Text"}</span>
                </button>
                <button
                  className={`${styles.scopeButton} ${textScope === "whole-document" ? styles.scopeButtonActive : ""}`}
                  onClick={() => setTextScope("whole-document")}
                  type="button"
                >
                  <FileText size={18} />
                  <span>{translations.negotiationPage?.wholeDocument || "Whole Document"}</span>
                </button>
              </div>
              {textScope === "selected" && (
                <div className={styles.selectedTextPreview}>
                  {isLoadingText ? (
                    <div className={styles.loadingText}>
                      <Loader size={16} style={{ animation: "spin 1s linear infinite" }} />
                      <span>{translations.negotiationPage?.loadingText || "Loading selected text..."}</span>
                    </div>
                  ) : selectedText ? (
                    <>
                      <div className={styles.previewText}>{selectedText.length > 200 ? `${selectedText.substring(0, 200)}...` : selectedText}</div>
                      <button className={styles.refreshSelectionButton} onClick={loadSelectedText} type="button">
                        <RefreshCw size={16} />
                        <span>{translations.negotiationPage?.refreshSelection || "Refresh"}</span>
                      </button>
                    </>
                  ) : (
                    <div className={styles.noTextMessage}>
                      {translations.negotiationPage?.noTextSelected || "No text selected. Please select text in the document."}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reference Sources */}
            <div className={styles.section}>
              <GeneralSourceSelector
                sourceConfig={sourceConfig}
                onSourceConfigChange={setSourceConfig}
                disabled={isProcessing}
                variant="glass_compact"
              />
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            {error && (
              <div className={styles.errorMessage}>
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}
            <FButton
              appearance="primary"
              onClick={handleRunNegotiation}
              disabled={!canRun}
              className={styles.runButton}
            >
              {isProcessing ? (
                <>
                  <Spinner size="tiny" style={{ marginRight: "8px" }} />
                  {progress ? `${progress.message} (${progress.step}/${progress.total})` : translations.common.loading}
                </>
              ) : (
                <>
                  <Scale size={20} style={{ marginRight: "8px" }} />
                  {translations.negotiationPage?.runAnalysis || "Run Negotiation Analysis"}
                </>
              )}
            </FButton>
          </div>
        </>
      ) : (
        <div className={styles.content}>
          <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "20px" }}>
            {translations.negotiationPage?.suggestedAmendments || "Suggested Amendments"}
          </h2>
          <div style={{ background: "#fff", borderRadius: "8px", padding: "20px", border: "1px solid #e1e1e1", marginBottom: "20px" }}>
            <pre style={{ margin: 0, fontSize: "13px", color: "#333", whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button variant="outline" onClick={() => setResults(null)}>
              {translations.common.back}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};