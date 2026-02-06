import React, { useState, useRef } from "react";
import { makeStyles, mergeClasses, Button, Tooltip } from "@fluentui/react-components";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { parseDocument } from "@/src/services/documentParser";
import { parseUploadedDocument } from "@/src/services/uploadedDocumentParser";
import { backendApi } from "@/src/services/api";
import type { FormattedAmendment } from "@/src/services/api";
import { jobTracker } from "../../utils/jobTracker";

interface PrecedentUploadPageProps {
  onComplete: (results: FormattedAmendment[], referenceParsed: any) => void;
  onBack: () => void;
}

const useStyles = makeStyles({
  pageRoot: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#ffffff",
    position: "relative" as const,
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #e5e5e5",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: "16px",
    color: "#999999",
    border: "none",
    backgroundColor: "transparent",
    zIndex: 10,
    "&:hover": {
      color: "#999999",
      border: "none",
      backgroundColor: "transparent",
    },
  },
  headerTitle: {
    flex: 1,
    textAlign: "center" as const,
    fontSize: "16px",
    fontWeight: 600,
    color: "#1a1a1a",
    margin: 0,
    paddingLeft: "40px",
    paddingRight: "40px",
  },
  subtitleSection: {
    padding: "16px 24px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#666666",
    margin: 0,
    lineHeight: "20px",
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "16px 20px 20px 20px",
  },
  uploadCard: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    border: "1px dashed #cccccc",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
  },
  uploadCardDragOver: {
    border: "1px dashed #0F62FE",
    backgroundColor: "#f5faff",
  },
  uploadSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 24px",
    cursor: "pointer",
    textAlign: "center" as const,
  },
  cloudIconContainer: {
    position: "relative",
    marginBottom: "20px",
  },
  cloudIcon: {
    width: "64px",
    height: "64px",
    color: "#0F62FE",
  },
  uploadArrow: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "20px",
    height: "20px",
    color: "#0F62FE",
  },
  uploadTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#1a1a1a",
    marginBottom: "8px",
  },
  uploadDescription: {
    fontSize: "14px",
    color: "#666666",
    marginBottom: "24px",
  },
  browseButton: {
    backgroundColor: "#0F62FE",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    padding: "8px 20px",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    ":hover": {
      backgroundColor: "#0353E9",
    },
  },
  supportedFormats: {
    fontSize: "12px",
    color: "#999999",
    marginTop: "16px",
  },
  fileInput: {
    display: "none",
  },
  vaultSection: {
    padding: "16px 24px",
    textAlign: "center" as const,
  },
  vaultButton: {
    width: "100%",
    backgroundColor: "#ffffff",
    color: "#999999",
    border: "1px solid #cccccc",
    borderRadius: "4px",
    padding: "12px 20px",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "not-allowed",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "2px",
  },
  vaultButtonSubtext: {
    fontSize: "12px",
    fontWeight: 400,
  },
  previewCard: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  toastOverlay: {
    position: "absolute" as const,
    top: "70px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 100,
  },
  toastSuccess: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "8px 16px",
    backgroundColor: "#E6F4EA",
    borderRadius: "4px",
    border: "1px solid #34A853",
    whiteSpace: "nowrap" as const,
  },
  toastError: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "8px 16px",
    backgroundColor: "#FFF9F9",
    borderRadius: "4px",
    border: "1px solid #FD434A",
    whiteSpace: "nowrap" as const,
  },
  toastIconSuccess: {
    width: "16px",
    height: "16px",
    flexShrink: 0,
  },
  toastIconError: {
    width: "16px",
    height: "16px",
    flexShrink: 0,
  },
  toastTextSuccess: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#1E7E34",
  },
  toastTextError: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#FD434A",
  },
  filePreviewBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    backgroundColor: "#F6F6F6",
    borderRadius: "8px",
  },
  wordIcon: {
    width: "32px",
    height: "32px",
    flexShrink: 0,
  },
  fileInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
    flex: 1,
  },
  fileName: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#333333",
  },
  fileSize: {
    fontSize: "12px",
    color: "#999999",
  },
  readyBox: {
    padding: "16px",
    backgroundColor: "#F6F9FF",
    borderRadius: "8px",
    border: "1px solid #0F62FE",
  },
  readyHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  readyIcon: {
    width: "16px",
    height: "16px",
    color: "#0F62FE",
  },
  readyTitle: {
    fontSize: "14px",
    color: "#333333",
    fontWeight: 600,
    margin: 0,
  },
  readyDescription: {
    fontSize: "14px",
    color: "#666666",
    margin: 0,
    lineHeight: "20px",
  },
  buttonGroup: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    marginTop: "8px",
  },
  removeButton: {
    backgroundColor: "#ffffff",
    color: "#333333",
    border: "1px solid #d0d0d0",
    borderRadius: "4px",
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "#f5f5f5",
      border: "1px solid #bdbdbd",
    },
  },
  startButton: {
    backgroundColor: "#0F62FE",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    ":hover": {
      backgroundColor: "#0353E9",
    },
  },
  processingOverlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  processingCard: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    padding: "32px 40px",
    maxWidth: "320px",
    width: "100%",
    textAlign: "center" as const,
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    border: "1px solid #e5e5e5",
  },
  processingTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#1a1a1a",
    marginBottom: "8px",
    margin: "0 0 8px 0",
  },
  processingHint: {
    fontSize: "14px",
    color: "#666666",
    margin: "0 0 24px 0",
  },
  processingStatusRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  processingSpinner: {
    width: "16px",
    height: "16px",
    color: "#0F62FE",
  },
  processingStatus: {
    fontSize: "14px",
    color: "#0F62FE",
    margin: 0,
  },
  // ============================================
  // NEW: Progress bar styles
  // ============================================
  progressContainer: {
    width: "100%",
    marginTop: "16px",
    marginBottom: "8px",
  },
  progressBarBackground: {
    width: "100%",
    height: "8px",
    backgroundColor: "#e0e0e0",
    borderRadius: "4px",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#0F62FE",
    borderRadius: "4px",
    transition: "width 0.3s ease",
  },
  progressText: {
    fontSize: "12px",
    color: "#666666",
    marginTop: "8px",
    textAlign: "center" as const,
  },
  // ============================================
  animateSpin: {
    animationName: {
      "0%": { transform: "rotate(0deg)" },
      "100%": { transform: "rotate(360deg)" },
    },
    animationDuration: "1s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
});

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
}

function truncateFileName(filename: string, maxLength: number = 25): string {
  const extension = getFileExtension(filename);
  const nameWithoutExt = filename.slice(0, filename.lastIndexOf("."));
  
  if (filename.length <= maxLength) {
    return filename;
  }
  
  const availableLength = maxLength - extension.length - 4;
  return `${nameWithoutExt.slice(0, availableLength)}...${extension}`;
}

const CloudUploadIcon: React.FC = () => (
  <svg
    width="80"
    height="64"
    viewBox="0 0 80 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M64 28C64 20 58 14 50 14C49.5 14 49 14 48.5 14.1C45.5 8 39 4 31.5 4C21.5 4 13.5 12 13.5 22C13.5 22.4 13.5 22.9 13.6 23.3C6.5 24.7 1 31 1 38.5C1 47 8 54 16.5 54H58C66.5 54 74 47 74 38.5C74 31.5 69 25.5 64 24.5V28Z"
      fill="#5B9BF8"
    />
    <circle cx="58" cy="46" r="14" fill="white" />
    <circle cx="58" cy="46" r="11" fill="#0F62FE" />
    <path
      d="M58 52V41M58 41L54 45M58 41L62 45"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const WordIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="6" y="2" width="20" height="28" rx="2" fill="#E8E8E8" />
    <path d="M20 2V8H26L20 2Z" fill="#C4C4C4" />
    <rect x="2" y="8" width="16" height="16" rx="1" fill="#2B579A" />
    <path
      d="M5.5 11H7L8.5 17.5L10 11H11.5L13 17.5L14.5 11H16L13.5 21H12L10.5 14.5L9 21H7.5L5.5 11Z"
      fill="white"
    />
  </svg>
);

const SuccessCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="8" cy="8" r="8" fill="#34A853" />
    <path
      d="M5 8L7 10L11 6"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BlueCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="8" cy="8" r="8" fill="#0F62FE" />
    <path
      d="M5 8L7 10L11 6"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ErrorIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="8" cy="8" r="8" fill="#FD434A" />
    <path
      d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const PrecedentUploadPage: React.FC<PrecedentUploadPageProps> = ({
  onComplete,
  onBack,
}) => {
  const styles = useStyles();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [toastState, setToastState] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // ============================================
  // NEW: Progress state for background job
  // ============================================
  const [progressInfo, setProgressInfo] = useState<{
    currentStep: number;
    totalSteps: number;
    stepName: string;
  } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToastState({ type, message });
    setTimeout(() => {
      setToastState({ type: null, message: "" });
    }, 3000);
  };

  const handleFileSelect = (file: File) => {
    const extension = getFileExtension(file.name).toLowerCase();
    if (extension !== "docx" && extension !== "doc") {
      showToast("error", "Failed to upload");
      toast({
        title: "Invalid File Type",
        description: "Please upload a Word document (.docx or .doc)",
      });
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast("error", "Failed to upload");
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB",
      });
      return;
    }

    setUploadedFile(file);
    showToast("success", "File uploaded successfully");
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleStartComparison = async () => {
    if (!uploadedFile) {
      toast({
        title: "No File Selected",
        description: "Please upload a precedent document first",
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStatus("Parsing documents...");
    setProgressInfo(null); // Reset progress

    try {
      const removeParentRefs = (nodes: any[]): any[] => {
        return nodes.map((node) => {
          const { parent, ...rest } = node;
          return {
            ...rest,
            children: node.children ? removeParentRefs(node.children) : [],
          };
        });
      };

      const originalParsed = await parseDocument();
      console.log("✅ Draft document parsed");

      const referenceParsed = await parseUploadedDocument(uploadedFile);
      console.log("✅ Precedent document parsed");

      setProcessingStatus("Comparing documents...");

      // Get jobId first to track the job
      const baseUrl = (backendApi as any).baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
      const authToken = localStorage.getItem("authToken");
      
      const requestBody = {
        originalDocument: {
          recitals: originalParsed.recitals || "",
          structure: removeParentRefs(originalParsed.structure),
        },
        referenceDocument: {
          recitals: referenceParsed.recitals || "",
          structure: removeParentRefs(referenceParsed.structure),
        },
      };

      // Make initial request to get jobId
      const jobIdResponse = await fetch(`${baseUrl}/api/review-with-precedents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      if (!jobIdResponse.ok) {
        throw new Error("Failed to start comparison job");
      }

      const jobIdData = await jobIdResponse.json();
      const jobId = jobIdData.jobId;

      // Track the job if we got a jobId (background job)
      if (jobId) {
        const trackingId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        jobTracker.addJob({
          id: trackingId,
          jobId: jobId,
          type: "precedent",
          title: "Review with Precedents",
          subtitle: `Comparing documents`,
          createdAt: Date.now(),
          status: "pending",
          navigationTarget: "precedent-comparison",
          inputContext: {
            type: "precedent",
            data: {
              originalDocument: requestBody.originalDocument,
              referenceDocument: requestBody.referenceDocument,
              referenceParsed: referenceParsed,
            },
          },
        });

        // Manually poll for job completion
        const pollIntervalMs = 2000;
        const maxAttempts = 300; // 10 minutes max
        let attempts = 0;

        while (attempts < maxAttempts) {
          attempts++;

          const statusResponse = await fetch(`${baseUrl}/api/review-with-precedents/jobs/${jobId}`, {
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
            setProgressInfo(statusData.progress);
            setProcessingStatus(statusData.progress.stepName);
            jobTracker.updateJob(jobId, { progress: statusData.progress });
          }

          if (statusData.status === "done") {
            if (!statusData.result || !statusData.result.success) {
              jobTracker.updateJob(jobId, { status: "error" });
              throw new Error("Comparison failed");
            }

            jobTracker.updateJob(jobId, { status: "done" });
            console.log("✅ Backend processing complete");
            console.log(`Found ${statusData.result.formattedResults.length} changes`);
            onComplete(statusData.result.formattedResults, referenceParsed);
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
        const response = await backendApi.reviewWithPrecedents(
          requestBody,
          // Progress callback - updates UI as each step completes
          (progress) => {
            setProgressInfo(progress);
            setProcessingStatus(progress.stepName);
          }
        );

        console.log("✅ Backend processing complete");
        console.log(`Found ${response.formattedResults.length} changes`);

        onComplete(response.formattedResults, referenceParsed);
      }
    } catch (error) {
      console.error("❌ Error during comparison:", error);
      toast({
        title: "Comparison Failed",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred during document comparison",
      });
      setIsProcessing(false);
      setProgressInfo(null);
    }
  };

  const renderUploadState = () => (
    <>
      <div
        className={mergeClasses(
          styles.uploadCard,
          isDragOver && styles.uploadCardDragOver
        )}
      >
        <div
          className={styles.uploadSection}
          onClick={handleClickUpload}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleClickUpload();
            }
          }}
          aria-label="Upload precedent document"
        >
          <div className={styles.cloudIconContainer}>
            <CloudUploadIcon />
          </div>

          <h3 className={styles.uploadTitle}>Upload Precedent Document</h3>

          <p className={styles.uploadDescription}>
            Drag and drop your file here, or
          </p>

          <button
            type="button"
            className={styles.browseButton}
            onClick={(e) => {
              e.stopPropagation();
              handleClickUpload();
            }}
          >
            Click to Browse
          </button>

          <p className={styles.supportedFormats}>
            Supported formats: docx, doc (Max 10M)
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".doc,.docx"
            onChange={handleFileInputChange}
            className={styles.fileInput}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className={styles.vaultSection}>
        <button type="button" className={styles.vaultButton} disabled>
          <span>Upload from Vault</span>
          <span className={styles.vaultButtonSubtext}>(Coming Soon)</span>
        </button>
      </div>
    </>
  );

  const renderPreviewState = () => (
    <div className={styles.previewCard}>
      <div className={styles.filePreviewBox}>
        <WordIcon className={styles.wordIcon} />
        <div className={styles.fileInfo}>
          <span className={styles.fileName}>
            {uploadedFile && truncateFileName(uploadedFile.name)}
          </span>
          <span className={styles.fileSize}>
            {uploadedFile && formatFileSize(uploadedFile.size)}
          </span>
        </div>
      </div>

      <div className={styles.readyBox}>
        <div className={styles.readyHeader}>
          <BlueCheckIcon className={styles.readyIcon} />
          <p className={styles.readyTitle}>Ready to Compare</p>
        </div>
        <p className={styles.readyDescription}>
          Click "Start Comparison" to analyze differences between your draft
          and this precedent document.
        </p>
      </div>

      <div className={styles.buttonGroup}>
        <button
          type="button"
          className={styles.removeButton}
          onClick={handleRemoveFile}
        >
          Remove File
        </button>
        <button
          type="button"
          className={styles.startButton}
          onClick={handleStartComparison}
        >
          Start Comparison
        </button>
      </div>
    </div>
  );

  // ============================================
  // UPDATED: Processing overlay with progress bar
  // ============================================
  const renderProcessingOverlay = () => {
    const progressPercentage = progressInfo
      ? Math.round((progressInfo.currentStep / progressInfo.totalSteps) * 100)
      : 0;

    return (
      <div className={styles.processingOverlay}>
        <div className={styles.processingCard}>
          <h3 className={styles.processingTitle}>Processing Documents</h3>
          <p className={styles.processingHint}>This may take a few minutes...</p>
          
          {/* Progress Bar */}
          {progressInfo && (
            <div className={styles.progressContainer}>
              <div className={styles.progressBarBackground}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className={styles.progressText}>
                Step {progressInfo.currentStep} of {progressInfo.totalSteps}
              </p>
            </div>
          )}

          <div className={styles.processingStatusRow}>
            <Loader2
              className={mergeClasses(styles.processingSpinner, styles.animateSpin)}
            />
            <p className={styles.processingStatus}>{processingStatus}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderToast = () => {
    if (!toastState.type) return null;

    return (
      <div className={styles.toastOverlay}>
        {toastState.type === "success" ? (
          <div className={styles.toastSuccess}>
            <SuccessCheckIcon className={styles.toastIconSuccess} />
            <span className={styles.toastTextSuccess}>{toastState.message}</span>
          </div>
        ) : (
          <div className={styles.toastError}>
            <ErrorIcon className={styles.toastIconError} />
            <span className={styles.toastTextError}>{toastState.message}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.pageRoot}>
      {renderToast()}

      <header className={styles.header}>
        <Tooltip
          appearance="inverted"
          content="Back"
          positioning="below"
          withArrow
          relationship="label"
        >
          <Button
            icon={<ArrowLeft size={18} />}
            onClick={onBack}
            className={styles.backButton}
          />
        </Tooltip>
        <h1 className={styles.headerTitle}>Compare Precedent</h1>
      </header>

      {!uploadedFile && (
        <div className={styles.subtitleSection}>
          <p className={styles.subtitle}>
            Upload a precedent document to compare with your current draft.
          </p>
        </div>
      )}

      <div className={styles.content}>
        {!uploadedFile ? renderUploadState() : renderPreviewState()}
      </div>

      {isProcessing && renderProcessingOverlay()}
    </div>
  );
};
