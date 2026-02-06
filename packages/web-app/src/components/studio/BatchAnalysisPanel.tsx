import { useState } from "react";
import { useProjectFiles } from "@/services/projectsApi";
import { useRunBatchAnalysis, useBatchAnalysisStatus, type AnalysisType } from "@/services/batchAnalysisApi";
import { usePlaybooks } from "@/services/playbooksApi";
import { Check, X, Loader2, Play, FileText } from "lucide-react";

interface BatchAnalysisPanelProps {
  projectId: string;
  onClose: () => void;
  onComplete?: (jobId: string) => void;
}

export default function BatchAnalysisPanel({
  projectId,
  onClose,
  onComplete,
}: BatchAnalysisPanelProps) {
  const { data: files } = useProjectFiles(projectId);
  const { data: playbooks } = usePlaybooks();
  const runBatchAnalysis = useRunBatchAnalysis();
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [analysisType, setAnalysisType] = useState<AnalysisType>("definition-check");
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string>("");
  const [language, setLanguage] = useState<"english" | "chinese">("english");
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: jobStatus } = useBatchAnalysisStatus(jobId);

  const handleSelectAll = () => {
    if (files && selectedFileIds.size === files.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(files?.map((f) => f.id) || []));
    }
  };

  const handleFileToggle = (fileId: string) => {
    const newSelected = new Set(selectedFileIds);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFileIds(newSelected);
  };

  const handleRun = async () => {
    if (selectedFileIds.size === 0) {
      setError("Please select at least one document");
      return;
    }

    if (analysisType === "contract-review" && !selectedPlaybookId) {
      setError("Please select a playbook for contract review");
      return;
    }

    setError(null);
    try {
      const response = await runBatchAnalysis.mutateAsync({
        projectId,
        fileIds: Array.from(selectedFileIds),
        analysisType,
        options: {
          playbookId: analysisType === "contract-review" ? selectedPlaybookId : undefined,
          language,
        },
      });

      if (response.success && response.jobId) {
        setJobId(response.jobId);
        if (onComplete) {
          onComplete(response.batchJobId);
        }
      } else {
        throw new Error(response.error?.message || "Failed to start batch analysis");
      }
    } catch (error) {
      console.error("Failed to run batch analysis:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start batch analysis. Please check your connection and try again.";
      setError(errorMessage);
    }
  };

  const isRunning = jobStatus?.status === "processing" || jobStatus?.status === "pending";
  const isComplete = jobStatus?.status === "completed";
  const hasError = jobStatus?.status === "failed";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg border shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Batch Analysis</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-accent"
            disabled={isRunning}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="border rounded-lg p-4 bg-destructive/10 border-destructive/20">
              <div className="flex items-center gap-2 text-destructive">
                <X className="h-5 w-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
            </div>
          )}
          
          {/* Document Selection */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Select Documents</h3>
              <button
                onClick={handleSelectAll}
                className="text-sm text-primary hover:underline"
              >
                {files && selectedFileIds.size === files.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="border rounded-lg max-h-64 overflow-auto">
              {files && files.length > 0 ? (
                <div className="divide-y">
                  {files.map((file) => (
                    <label
                      key={file.id}
                      className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFileIds.has(file.id)}
                        onChange={() => handleFileToggle(file.id)}
                        className="rounded"
                        disabled={isRunning}
                      />
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="flex-1">{file.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {(file.sizeBytes / 1024).toFixed(2)} KB
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No documents in this project
                </div>
              )}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {selectedFileIds.size} of {files?.length || 0} documents selected
            </div>
          </div>

          {/* Analysis Type Selection */}
          <div>
            <h3 className="font-semibold mb-4">Analysis Type</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "definition-check", label: "Definition Check" },
                { value: "contract-review", label: "Contract Review" },
                { value: "risk-analysis", label: "Risk Analysis" },
                { value: "cross-document", label: "Cross-Document Consistency" },
              ].map((type) => (
                <label
                  key={type.value}
                  className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-accent ${
                    analysisType === type.value ? "border-primary bg-primary/10" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="analysisType"
                    value={type.value}
                    checked={analysisType === type.value}
                    onChange={(e) => setAnalysisType(e.target.value as AnalysisType)}
                    className="rounded"
                    disabled={isRunning}
                  />
                  <span>{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          {analysisType === "contract-review" && (
            <div>
              <h3 className="font-semibold mb-2">Playbook</h3>
              <select
                value={selectedPlaybookId}
                onChange={(e) => setSelectedPlaybookId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                disabled={isRunning}
              >
                <option value="">Select a playbook</option>
                {playbooks?.map((playbook) => (
                  <option key={playbook.id} value={playbook.id}>
                    {playbook.playbookName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(analysisType === "definition-check" || analysisType === "cross-document") && (
            <div>
              <h3 className="font-semibold mb-2">Language</h3>
              <div className="flex gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="language"
                    value="english"
                    checked={language === "english"}
                    onChange={(e) => setLanguage(e.target.value as "english" | "chinese")}
                    disabled={isRunning}
                  />
                  English
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="language"
                    value="chinese"
                    checked={language === "chinese"}
                    onChange={(e) => setLanguage(e.target.value as "english" | "chinese")}
                    disabled={isRunning}
                  />
                  Chinese
                </label>
              </div>
            </div>
          )}

          {/* Progress */}
          {isRunning && jobStatus && (
            <div className="border rounded-lg p-4 bg-accent/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Processing...</span>
                <span className="text-sm text-muted-foreground">
                  {jobStatus.progress || 0} / {jobStatus.totalFiles}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${((jobStatus.progress || 0) / jobStatus.totalFiles) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {isComplete && (
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <Check className="h-5 w-5" />
                <span className="font-medium">Analysis completed successfully</span>
              </div>
            </div>
          )}

          {hasError && (
            <div className="border rounded-lg p-4 bg-destructive/10">
              <div className="flex items-center gap-2 text-destructive">
                <X className="h-5 w-5" />
                <span className="font-medium">Analysis failed</span>
              </div>
              {jobStatus?.error && (
                <p className="text-sm text-muted-foreground mt-2">{jobStatus.error}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
            disabled={isRunning}
          >
            Cancel
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning || selectedFileIds.size === 0 || (analysisType === "contract-review" && !selectedPlaybookId)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Analysis
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

