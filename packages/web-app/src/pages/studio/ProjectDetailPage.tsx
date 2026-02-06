import { useParams } from "react-router-dom";
import { useProject, useProjectFiles } from "@/services/projectsApi";
import { Upload, FileText, AlertTriangle, CheckCircle, Loader2, Play } from "lucide-react";
import { useUploadFiles } from "@/services/projectsApi";
import { useBatchAnalysisResults } from "@/services/batchAnalysisApi";
import { useState } from "react";
import BatchAnalysisPanel from "@/components/studio/BatchAnalysisPanel";
import BatchAnalysisResults from "@/components/studio/BatchAnalysisResults";

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading: projectLoading } = useProject(projectId || "");
  const { data: files, isLoading: filesLoading } = useProjectFiles(projectId || "");
  const { data: batchResults } = useBatchAnalysisResults(projectId || null);
  const uploadFiles = useUploadFiles();
  const [isUploading, setIsUploading] = useState(false);
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [selectedBatchJobId, setSelectedBatchJobId] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || !projectId) return;

    setIsUploading(true);
    try {
      await uploadFiles.mutateAsync({
        projectId,
        files: Array.from(selectedFiles),
      });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">
          Project not found
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{project.name}</h1>
        {project.description && (
          <p className="text-muted-foreground mt-2">{project.description}</p>
        )}
      </div>

      {/* Upload Section */}
      <div className="mb-8 rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Documents</h2>
          <label className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
            <Upload className="h-4 w-4" />
            {isUploading ? "Uploading..." : "Upload Files"}
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              accept=".docx,.doc,.pdf"
            />
          </label>
        </div>

        {filesLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : files && files.length > 0 ? (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent"
              >
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">{file.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {(file.sizeBytes / 1024).toFixed(2)} KB
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No documents yet. Upload files to get started.
          </div>
        )}
      </div>

      {/* Analysis Section */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Analysis</h2>
          {files && files.length > 0 && (
            <button
              onClick={() => setShowBatchPanel(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Play className="h-4 w-4" />
              Batch Analysis
            </button>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-sm font-medium">High Risk Issues</span>
            </div>
            <div className="text-2xl font-bold">0</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium">Medium Risk</span>
            </div>
            <div className="text-2xl font-bold">0</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Low Risk</span>
            </div>
            <div className="text-2xl font-bold">0</div>
          </div>
        </div>
      </div>

      {/* Recent Batch Analysis Results */}
      {batchResults && batchResults.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Batch Analyses</h2>
          <div className="space-y-2">
            {batchResults.slice(0, 5).map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => setSelectedBatchJobId(job.id)}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {job.analysisType.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {job.totalFiles} documents • {job.status === "completed" ? "Completed" : job.status === "processing" ? "Processing..." : "Pending"}
                    </div>
                  </div>
                </div>
                {job.status === "completed" && job.results && (
                  <div className="text-sm text-muted-foreground">
                    {job.results.totalIssues} issues found
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Batch Analysis Panel */}
      {showBatchPanel && projectId && (
        <BatchAnalysisPanel
          projectId={projectId}
          onClose={() => setShowBatchPanel(false)}
          onComplete={(batchJobId) => {
            setShowBatchPanel(false);
            setSelectedBatchJobId(batchJobId);
          }}
        />
      )}

      {/* Batch Analysis Results */}
      {selectedBatchJobId && (
        <BatchAnalysisResults
          batchJobId={selectedBatchJobId}
          onClose={() => setSelectedBatchJobId(null)}
        />
      )}
    </div>
  );
}

