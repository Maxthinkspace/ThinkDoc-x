import React, { useEffect } from "react";
import {
  makeStyles,
  Spinner,
} from "@fluentui/react-components";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useJobPolling } from "../../hooks/useJobPolling";
import { jobTracker } from "../../utils/jobTracker";
import type { FormattedAmendment } from "@/src/services/api";

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
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    padding: "32px 40px",
    maxWidth: "400px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    border: "1px solid #e5e5e5",
  },
  progressTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#1a1a1a",
    marginBottom: "8px",
    margin: "0 0 8px 0",
  },
  progressHint: {
    fontSize: "14px",
    color: "#666666",
    margin: "0 0 24px 0",
  },
  progressContainer: {
    width: "100%",
    marginTop: "16px",
    marginBottom: "8px",
  },
  progressText: {
    fontSize: "13px",
    color: "#666",
    marginBottom: "8px",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginTop: "16px",
  },
  spinner: {
    width: "16px",
    height: "16px",
    color: "#0F62FE",
  },
  statusText: {
    fontSize: "14px",
    color: "#0F62FE",
    margin: 0,
  },
  errorText: {
    color: "#d32f2f",
    fontSize: "13px",
    marginTop: "8px",
  },
});

interface PrecedentProgressPageProps {
  jobId: string;
  progress?: {
    currentStep: number;
    totalSteps: number;
    stepName: string;
  };
  onBack: () => void;
  onComplete: (results: FormattedAmendment[], referenceParsed: any) => void;
}

export const PrecedentProgressPage: React.FC<PrecedentProgressPageProps> = ({
  jobId,
  progress: initialProgress,
  onBack,
  onComplete,
}) => {
  const styles = useStyles();
  const pollingResult = useJobPolling<{
    success: boolean;
    formattedResults: FormattedAmendment[];
  }>(jobId, "precedent");

  const progress = pollingResult.progress || initialProgress;
  const progressPercentage = progress
    ? Math.round((progress.currentStep / progress.totalSteps) * 100)
    : 0;

  // Handle completion
  useEffect(() => {
    if (pollingResult.status === "done" && pollingResult.result) {
      const result = pollingResult.result;
      if (result && result.success !== false) {
        // Fetch reference parsed document from jobTracker
        const trackedJob = jobTracker.getJobByJobId(jobId);
        const referenceParsed = trackedJob?.inputContext?.data?.referenceParsed || null;
        
        // Extract results from result
        const formattedResults = result.formattedResults || [];
        
        onComplete(formattedResults, referenceParsed);
      }
    } else if (pollingResult.status === "error") {
      // Error is already displayed in the UI
    }
  }, [pollingResult.status, pollingResult.result, pollingResult.error, jobId, onComplete]);

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
        <h1 className={styles.title}>Review with Precedents</h1>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.progressCard}>
          <h3 className={styles.progressTitle}>Processing Documents</h3>
          <p className={styles.progressHint}>This may take a few minutes...</p>
          
          {/* Progress Bar */}
          {progress && (
            <div className={styles.progressContainer}>
              <div style={{
                width: "100%",
                height: "8px",
                backgroundColor: "#e0e0e0",
                borderRadius: "4px",
                overflow: "hidden",
              }}>
                <div
                  style={{
                    height: "100%",
                    backgroundColor: "#0F62FE",
                    borderRadius: "4px",
                    transition: "width 0.3s ease",
                    width: `${progressPercentage}%`,
                  }}
                />
              </div>
              <p className={styles.progressText}>
                Step {progress.currentStep} of {progress.totalSteps}: {progress.stepName}
              </p>
            </div>
          )}

          <div className={styles.statusRow}>
            <Spinner size="tiny" />
            <p className={styles.statusText}>
              {progress?.stepName || "Processing..."}
            </p>
          </div>

          {pollingResult.status === "error" && (
            <p className={styles.errorText}>
              {pollingResult.error || "An error occurred during processing"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

