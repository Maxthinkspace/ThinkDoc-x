import React, { useState } from "react";
import {
  makeStyles,
  Button as FButton,
  Dropdown,
  Option,
  Textarea,
  Spinner,
  ProgressBar,
} from "@fluentui/react-components";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../components/ui/button";
import { parseDocument } from "@/src/services/documentParser";
import { backendApi } from "@/src/services/api";
import type { DraftedSection, SkeletonSection } from "@/src/services/api";
import { jobTracker } from "../../utils/jobTracker";

interface RedraftConfig {
  targetJurisdiction: string;
  targetLegalSystem: string;
  preserveBusinessTerms: boolean;
  additionalGuidance?: string;
}

interface RedraftConfigPageProps {
  onComplete: (
    sections: DraftedSection[],
    skeleton: SkeletonSection[],
    originalParsed: any
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
});

const JURISDICTIONS = [
  { value: "Singapore", label: "Singapore" },
  { value: "Hong Kong", label: "Hong Kong" },
  { value: "England and Wales", label: "England and Wales" },
  { value: "United States (Delaware)", label: "United States (Delaware)" },
  { value: "United States (New York)", label: "United States (New York)" },
  { value: "Australia", label: "Australia" },
];

const LEGAL_SYSTEMS = [
  { value: "common law", label: "Common Law" },
  { value: "civil law", label: "Civil Law" },
];

export const RedraftConfigPage: React.FC<RedraftConfigPageProps> = ({
  onComplete,
  onBack,
}) => {
  const styles = useStyles();

  const [config, setConfig] = useState<RedraftConfig>({
    targetJurisdiction: "Singapore",
    targetLegalSystem: "common law",
    preserveBusinessTerms: true,
    additionalGuidance: "",
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ step: 0, total: 3, message: "" });
  const [error, setError] = useState<string | null>(null);

  const handleStartRedraft = async () => {
    setIsProcessing(true);
    setError(null);
    setProgress({ step: 1, total: 3, message: "Parsing document..." });

    try {
      // Step 1: Parse the current document
      const parsed = await parseDocument();

      if (!parsed.structure || parsed.structure.length === 0) {
        throw new Error("Could not parse document structure. Please ensure the document has numbered sections.");
      }

      setProgress({ step: 2, total: 3, message: "Generating redraft..." });

      // Step 2: Call backend API - get jobId first, then poll manually
      const baseUrl = (backendApi as any).baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
      const authToken = localStorage.getItem("authToken");
      
      // Make initial request to get jobId
      const jobIdResponse = await fetch(`${baseUrl}/api/redraft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          originalStructure: parsed.structure,
          instructions: config,
        }),
      });

      if (!jobIdResponse.ok) {
        throw new Error("Failed to start redraft job");
      }

      const jobIdData = await jobIdResponse.json();
      const jobId = jobIdData.jobId;

      // If no jobId, it's a synchronous response - handle normally
      if (!jobId) {
        const result = await backendApi.redraft(
          {
            originalStructure: parsed.structure,
            instructions: config,
          },
          (progressInfo) => {
            setProgress({
              step: progressInfo.currentStep,
              total: progressInfo.totalSteps,
              message: progressInfo.stepName,
            });
          }
        );

        if (!result.success) {
          throw new Error("Redraft failed");
        }

        onComplete(result.draftedSections, result.skeleton, parsed);
        return;
      }

      // Track the job
      const trackingId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      jobTracker.addJob({
        id: trackingId,
        jobId: jobId,
        type: "draft",
        title: "Re-Draft Agreement",
        subtitle: `Target: ${config.targetJurisdiction}`,
        createdAt: Date.now(),
        status: "pending",
        navigationTarget: "redraft",
        inputContext: {
          type: "draft",
          data: {
            config,
            originalStructure: parsed.structure,
            originalParsed: parsed,
          },
        },
      });

      // Manually poll for job completion (similar to backendApi.pollJobResult)
      const pollIntervalMs = 2000;
      const maxAttempts = 300; // 10 minutes max
      let attempts = 0;

      while (attempts < maxAttempts) {
        attempts++;

        const statusResponse = await fetch(`${baseUrl}/api/redraft/jobs/${jobId}`, {
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
            throw new Error("Redraft failed");
          }

          jobTracker.updateJob(jobId, { status: "done" });
          onComplete(statusData.result.draftedSections, statusData.result.skeleton, parsed);
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

    } catch (err) {
      console.error("Redraft error:", err);
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
        <h1 className={styles.title}>Re-Draft Agreement</h1>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Target Jurisdiction */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Target Jurisdiction</h3>
          <p className={styles.sectionDescription}>
            Select the jurisdiction for the redrafted agreement.
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

          <div className={styles.dropdownContainer}>
            <label className={styles.label}>Legal System</label>
            <Dropdown
              value={config.targetLegalSystem}
              selectedOptions={[config.targetLegalSystem]}
              onOptionSelect={(_, data) => {
                if (data.optionValue) {
                  setConfig(prev => ({ ...prev, targetLegalSystem: data.optionValue as string }));
                }
              }}
              disabled={isProcessing}
              style={{ width: "100%" }}
            >
              {LEGAL_SYSTEMS.map(s => (
                <Option key={s.value} value={s.value}>{s.label}</Option>
              ))}
            </Dropdown>
          </div>
        </div>

        {/* Additional Guidance */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Additional Guidance (Optional)</h3>
          <p className={styles.sectionDescription}>
            Provide any specific instructions for the redraft.
          </p>
          <Textarea
            value={config.additionalGuidance || ""}
            onChange={(_, data) => setConfig(prev => ({ ...prev, additionalGuidance: data.value }))}
            placeholder="e.g., Use formal language, include specific clauses..."
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
          onClick={handleStartRedraft}
          disabled={isProcessing}
          style={{ width: "100%" }}
        >
          {isProcessing ? (
            <>
              <Spinner size="tiny" style={{ marginRight: "8px" }} />
              Processing...
            </>
          ) : (
            "Start Re-Draft"
          )}
        </FButton>
      </div>
    </div>
  );
};