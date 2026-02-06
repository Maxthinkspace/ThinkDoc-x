import React, { useState, useRef } from "react";
import {
  makeStyles,
  Button as FButton,
  Dropdown,
  Option,
  Textarea,
  Spinner,
  ProgressBar,
  Radio,
  RadioGroup,
} from "@fluentui/react-components";
import { ArrowLeft, Upload, FileText } from "lucide-react";
import { Button } from "../../components/ui/button";
import { parseDocument } from "@/src/services/documentParser";
import { parseUploadedDocument } from "@/src/services/uploadedDocumentParser";
import { backendApi } from "@/src/services/api";
import type { RedomiciledSection, RedomicileMetadata } from "@/src/types/redomicile";
import { jobTracker } from "../../utils/jobTracker";

interface RedomicileConfig {
  sourceJurisdiction: string;
  targetJurisdiction: string;
  documentType: string;
  additionalGuidance?: string;
}

interface RedomicileConfigPageProps {
  onComplete: (
    sections: RedomiciledSection[],
    metadata: RedomicileMetadata,
    originalParsed: any,
    config: RedomicileConfig
  ) => void;
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
  },
  section: {
    marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "8px",
    color: "#333",
  },
  sectionDescription: {
    fontSize: "13px",
    color: "#666",
    marginBottom: "12px",
  },
  dropdownContainer: {
    marginBottom: "16px",
  },
  label: {
    fontSize: "13px",
    fontWeight: 500,
    marginBottom: "4px",
    display: "block",
    color: "#333",
  },
  footer: {
    padding: "16px 24px",
    borderTop: "1px solid #e1e1e1",
    backgroundColor: "#fff",
  },
  progressContainer: {
    marginBottom: "12px",
  },
  progressText: {
    fontSize: "13px",
    color: "#666",
    marginBottom: "8px",
  },
  errorText: {
    color: "#d32f2f",
    fontSize: "13px",
    marginTop: "8px",
  },
  sourceToggle: {
    display: "flex",
    gap: "12px",
    marginBottom: "16px",
  },
  uploadCard: {
    border: "1px dashed #cccccc",
    borderRadius: "8px",
    padding: "24px",
    textAlign: "center",
    cursor: "pointer",
    backgroundColor: "#fff",
    transition: "all 0.2s ease",
    "&:hover": {
      border: "1px dashed #0F62FE",
      backgroundColor: "#f5faff",
    },
  },
  uploadCardDragOver: {
    border: "1px dashed #0F62FE",
    backgroundColor: "#f5faff",
  },
  fileInput: {
    display: "none",
  },
  filePreview: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px",
    backgroundColor: "#F6F6F6",
    borderRadius: "8px",
    marginTop: "12px",
  },
  fileName: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#333",
  },
});

const JURISDICTIONS = [
  { value: "China", label: "China" },
  { value: "Singapore", label: "Singapore" },
  { value: "Hong Kong", label: "Hong Kong" },
  { value: "England and Wales", label: "England and Wales" },
  { value: "United States (Delaware)", label: "United States (Delaware)" },
  { value: "United States (New York)", label: "United States (New York)" },
  { value: "Australia", label: "Australia" },
];

const DOCUMENT_TYPES = [
  { value: "employment", label: "Employment Contract" },
  { value: "commercial", label: "Commercial Agreement" },
  { value: "corporate", label: "Corporate Document" },
  { value: "service", label: "Service Agreement" },
  { value: "nda", label: "Non-Disclosure Agreement" },
  { value: "other", label: "Other" },
];

export const RedomicileConfigPage: React.FC<RedomicileConfigPageProps> = ({
  onComplete,
  onBack,
}) => {
  const styles = useStyles();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documentSource, setDocumentSource] = useState<"upload" | "open">("open");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [config, setConfig] = useState<RedomicileConfig>({
    sourceJurisdiction: "",
    targetJurisdiction: "Singapore",
    documentType: "employment",
    additionalGuidance: "",
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ step: 0, total: 4, message: "" });
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    const extension = file.name.slice(((file.name.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
    if (extension !== "docx" && extension !== "doc") {
      setError("Please upload a Word document (.docx or .doc)");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Please upload a file smaller than 10MB");
      return;
    }

    setUploadedFile(file);
    setError(null);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleStartRedomicile = async () => {
    if (!config.sourceJurisdiction || !config.targetJurisdiction) {
      setError("Please select both source and target jurisdictions");
      return;
    }

    if (documentSource === "upload" && !uploadedFile) {
      setError("Please upload a document or switch to using the open document");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress({ step: 1, total: 4, message: "Parsing document..." });

    try {
      let parsed;
      
      if (documentSource === "upload" && uploadedFile) {
        parsed = await parseUploadedDocument(uploadedFile);
      } else {
        parsed = await parseDocument();
      }

      if (!parsed.structure || parsed.structure.length === 0) {
        throw new Error("Could not parse document structure. Please ensure the document has numbered sections.");
      }

      setProgress({ step: 2, total: 4, message: "Analyzing jurisdiction requirements..." });

      // Get jobId first to track the job
      const baseUrl = (backendApi as any).baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
      const authToken = localStorage.getItem("authToken");
      
      const requestBody = {
        originalStructure: parsed.structure,
        sourceJurisdiction: config.sourceJurisdiction,
        targetJurisdiction: config.targetJurisdiction,
        documentType: config.documentType,
        additionalGuidance: config.additionalGuidance,
      };

      // Make initial request to get jobId
      const jobIdResponse = await fetch(`${baseUrl}/api/redomicile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      if (!jobIdResponse.ok) {
        throw new Error("Failed to start redomicile job");
      }

      const jobIdData = await jobIdResponse.json();
      const jobId = jobIdData.jobId;

      // Track the job if we got a jobId (background job)
      if (jobId) {
        const trackingId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        jobTracker.addJob({
          id: trackingId,
          jobId: jobId,
          type: "vault", // Note: Redomicile uses "vault" type
          title: "Redomicile Document",
          subtitle: `${config.sourceJurisdiction} → ${config.targetJurisdiction}`,
          createdAt: Date.now(),
          status: "pending",
          navigationTarget: "redomicile",
          inputContext: {
            type: "redomicile",
            data: {
              config,
              originalStructure: parsed.structure,
              originalParsed: parsed,
            },
          },
        });

        // Manually poll for job completion
        const pollIntervalMs = 2000;
        const maxAttempts = 300; // 10 minutes max
        let attempts = 0;

        while (attempts < maxAttempts) {
          attempts++;

          const statusResponse = await fetch(`${baseUrl}/api/redomicile/jobs/${jobId}`, {
            method: "GET",
            headers: {
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
          });

          if (!statusResponse.ok) {
            throw new Error("Failed to check job status");
          }

          const statusData = await statusResponse.json();

          // Update progress
          if (statusData.progress) {
            setProgress({
              step: statusData.progress.currentStep,
              total: statusData.progress.totalSteps,
              message: statusData.progress.stepName,
            });
            jobTracker.updateJob(jobId, { progress: statusData.progress });
          }

          if (statusData.status === "done") {
            if (!statusData.result || !statusData.result.success) {
              jobTracker.updateJob(jobId, { status: "error" });
              throw new Error("Redomicile failed");
            }

            jobTracker.updateJob(jobId, { status: "done" });
            onComplete(statusData.result.sections, statusData.result.metadata, parsed, config);
            return;
          }

          if (statusData.status === "error") {
            jobTracker.updateJob(jobId, { status: "error" });
            throw new Error(statusData.error || "Job failed");
          }

          // Still pending, wait and try again
          await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }

        throw new Error("Job timed out after 10 minutes");
      } else {
        // Synchronous response (no jobId) - handle normally
        const result = await backendApi.redomicile(
          requestBody,
          (progressInfo) => {
            setProgress({
              step: progressInfo.currentStep,
              total: progressInfo.totalSteps,
              message: progressInfo.stepName,
            });
          }
        );

        if (!result.success) {
          throw new Error("Redomicile failed");
        }

        onComplete(result.sections, result.metadata, parsed, config);
      }

    } catch (err) {
      console.error("Redomicile error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
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
          disabled={isProcessing}
          style={{ padding: "4px 8px", fontSize: "12px" }}
        >
          <ArrowLeft style={{ width: "14px", height: "14px", marginRight: "4px" }} />
          Back
        </Button>
        <h1 className={styles.title}>Redomicile Document</h1>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Document Source Selection */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Document Source</h3>
          <p className={styles.sectionDescription}>
            Choose whether to use the document currently open in Word or upload a file.
          </p>
          <RadioGroup
            value={documentSource}
            onChange={(_, data) => {
              const newValue = data.value;
              if (newValue === "open" || newValue === "upload") {
                setDocumentSource(newValue);
                setUploadedFile(null);
                setError(null);
              }
            }}
            disabled={isProcessing}
          >
            <Radio value="open" label="Use open document" />
            <Radio value="upload" label="Upload file" />
          </RadioGroup>

          {documentSource === "upload" && (
            <div style={{ marginTop: "16px" }}>
              <div
                className={`${styles.uploadCard} ${isDragOver ? styles.uploadCardDragOver : ""}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={32} style={{ color: "#0F62FE", marginBottom: "8px" }} />
                <p style={{ margin: "8px 0", fontSize: "14px", color: "#666" }}>
                  Drag and drop a file here, or click to browse
                </p>
                <p style={{ margin: "4px 0", fontSize: "12px", color: "#999" }}>
                  Supported: .docx, .doc (Max 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".doc,.docx"
                  onChange={handleFileInputChange}
                  className={styles.fileInput}
                />
              </div>
              {uploadedFile && (
                <div className={styles.filePreview}>
                  <FileText size={20} style={{ color: "#0F62FE" }} />
                  <span className={styles.fileName}>{uploadedFile.name}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Source Jurisdiction */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Source Jurisdiction</h3>
          <p className={styles.sectionDescription}>
            Select the jurisdiction of the original document.
          </p>
          <div className={styles.dropdownContainer}>
            <label className={styles.label}>Governing Law</label>
            <Dropdown
              value={config.sourceJurisdiction}
              selectedOptions={config.sourceJurisdiction ? [config.sourceJurisdiction] : []}
              onOptionSelect={(_, data) => {
                if (data.optionValue) {
                  setConfig(prev => ({ ...prev, sourceJurisdiction: data.optionValue as string }));
                }
              }}
              disabled={isProcessing}
              style={{ width: "100%" }}
              placeholder="Select source jurisdiction"
            >
              {JURISDICTIONS.map(j => (
                <Option key={j.value} value={j.value}>{j.label}</Option>
              ))}
            </Dropdown>
          </div>
        </div>

        {/* Target Jurisdiction */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Target Jurisdiction</h3>
          <p className={styles.sectionDescription}>
            Select the jurisdiction for the redomiciled document.
          </p>
          <div className={styles.dropdownContainer}>
            <label className={styles.label}>Governing Law</label>
            <Dropdown
              value={config.targetJurisdiction}
              selectedOptions={[config.targetJurisdiction]}
              onOptionSelect={(_, data) => {
                if (data.optionValue) {
                  setConfig(prev => ({ ...prev, targetJurisdiction: data.optionValue as string }));
                }
              }}
              disabled={isProcessing}
              style={{ width: "100%" }}
            >
              {JURISDICTIONS.map(j => (
                <Option key={j.value} value={j.value}>{j.label}</Option>
              ))}
            </Dropdown>
          </div>
        </div>

        {/* Document Type */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Document Type</h3>
          <p className={styles.sectionDescription}>
            Select the type of document to help identify jurisdiction-specific requirements.
          </p>
          <div className={styles.dropdownContainer}>
            <label className={styles.label}>Type</label>
            <Dropdown
              value={config.documentType}
              selectedOptions={[config.documentType]}
              onOptionSelect={(_, data) => {
                if (data.optionValue) {
                  setConfig(prev => ({ ...prev, documentType: data.optionValue as string }));
                }
              }}
              disabled={isProcessing}
              style={{ width: "100%" }}
            >
              {DOCUMENT_TYPES.map(dt => (
                <Option key={dt.value} value={dt.value}>{dt.label}</Option>
              ))}
            </Dropdown>
          </div>
        </div>

        {/* Additional Guidance */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Additional Guidance (Optional)</h3>
          <p className={styles.sectionDescription}>
            Provide any specific instructions for the redomicile process.
          </p>
          <Textarea
            value={config.additionalGuidance || ""}
            onChange={(_, data) => setConfig(prev => ({ ...prev, additionalGuidance: data.value }))}
            placeholder="e.g., Preserve specific clauses, emphasize certain requirements..."
            disabled={isProcessing}
            style={{ width: "100%", minHeight: "100px" }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        {isProcessing && (
          <div className={styles.progressContainer}>
            <p className={styles.progressText}>
              Step {progress.step} of {progress.total}: {progress.message}
            </p>
            <ProgressBar
              value={progress.step / progress.total}
              style={{ height: "4px" }}
            />
          </div>
        )}

        {error && <p className={styles.errorText}>{error}</p>}

        <FButton
          appearance="primary"
          onClick={handleStartRedomicile}
          disabled={isProcessing || !config.sourceJurisdiction || !config.targetJurisdiction}
          style={{ width: "100%" }}
        >
          {isProcessing ? (
            <>
              <Spinner size="tiny" style={{ marginRight: "8px" }} />
              Processing...
            </>
          ) : (
            "Start Redomicile"
          )}
        </FButton>
      </div>
    </div>
  );
};

