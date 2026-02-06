import { useBatchAnalysisJobDetails } from "@/services/batchAnalysisApi";
import { AlertTriangle, CheckCircle, Info, Download, FileText } from "lucide-react";
import { format } from "date-fns";

interface BatchAnalysisResultsProps {
  batchJobId: string;
  onClose: () => void;
}

export default function BatchAnalysisResults({
  batchJobId,
  onClose,
}: BatchAnalysisResultsProps) {
  const { data, isLoading } = useBatchAnalysisJobDetails(batchJobId);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card rounded-lg border shadow-lg p-8">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading results...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card rounded-lg border shadow-lg p-8">
          <p className="text-muted-foreground">No results found</p>
          <button
            onClick={onClose}
            className="mt-4 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const { job, results } = data;
  const aggregated = job.results;

  const handleExport = () => {
    // TODO: Implement CSV/Excel export
    alert("Export functionality coming soon");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg border shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Batch Analysis Results</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(job.createdAt), "PPpp")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-accent"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Summary Statistics */}
          {aggregated && (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-medium">High Risk</span>
                </div>
                <div className="text-2xl font-bold">
                  {aggregated.issuesBySeverity.high}
                </div>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium">Medium Risk</span>
                </div>
                <div className="text-2xl font-bold">
                  {aggregated.issuesBySeverity.medium}
                </div>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium">Low Risk</span>
                </div>
                <div className="text-2xl font-bold">
                  {aggregated.issuesBySeverity.low}
                </div>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Avg Risk Score</span>
                </div>
                <div className="text-2xl font-bold">
                  {aggregated.averageRiskScore}%
                </div>
              </div>
            </div>
          )}

          {/* Cross-Document Issues */}
          {aggregated?.crossDocumentIssues && aggregated.crossDocumentIssues.length > 0 && (
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-4">Cross-Document Issues</h3>
              <div className="space-y-3">
                {aggregated.crossDocumentIssues.map((issue, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium mb-1">{issue.type}</div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {issue.description}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          Affected files: {issue.affectedFiles.join(", ")}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents with Most Issues */}
          {aggregated && aggregated.documentsWithMostIssues.length > 0 && (
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-4">Documents with Most Issues</h3>
              <div className="space-y-2">
                {aggregated.documentsWithMostIssues.map((doc) => (
                  <div
                    key={doc.fileId}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{doc.fileName}</span>
                    </div>
                    <span className="text-sm font-medium">
                      {doc.issueCount} issue{doc.issueCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-Document Results */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold mb-4">Per-Document Results</h3>
            <div className="space-y-4">
              {results.map((result) => {
                const docResult = aggregated?.perDocumentResults.find(
                  (r) => r.fileId === result.fileId
                );
                return (
                  <div key={result.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{docResult?.fileName || result.fileId}</div>
                          <div className="text-sm text-muted-foreground">
                            {result.status === "completed" ? (
                              <span className="text-green-600">Completed</span>
                            ) : result.status === "failed" ? (
                              <span className="text-destructive">Failed</span>
                            ) : (
                              <span className="text-yellow-600">Pending</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {result.riskScore !== undefined && (
                        <div className="text-sm font-medium">
                          Risk: {result.riskScore}%
                        </div>
                      )}
                    </div>

                    {result.issues && result.issues.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {result.issues.slice(0, 5).map((issue, idx) => (
                          <div
                            key={idx}
                            className={`flex items-start gap-2 p-2 rounded text-sm ${
                              issue.severity === "high"
                                ? "bg-destructive/10"
                                : issue.severity === "medium"
                                ? "bg-yellow-500/10"
                                : "bg-blue-500/10"
                            }`}
                          >
                            {issue.severity === "high" ? (
                              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                            ) : issue.severity === "medium" ? (
                              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                            ) : (
                              <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <span className="font-medium">{issue.category}</span>
                              {issue.section && (
                                <span className="text-muted-foreground ml-2">
                                  ({issue.section})
                                </span>
                              )}
                              <div className="text-muted-foreground mt-1">
                                {issue.description}
                              </div>
                            </div>
                          </div>
                        ))}
                        {result.issues.length > 5 && (
                          <div className="text-sm text-muted-foreground text-center pt-2">
                            +{result.issues.length - 5} more issues
                          </div>
                        )}
                      </div>
                    )}

                    {result.error && (
                      <div className="mt-3 p-2 bg-destructive/10 rounded text-sm text-destructive">
                        {result.error}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

