import { AlertTriangle, CheckCircle, Info, TrendingUp } from "lucide-react";

export interface AnalysisIssue {
  id: string;
  severity: "high" | "medium" | "low";
  category: string;
  description: string;
  section?: string;
  document?: string;
}

interface AnalysisDashboardProps {
  issues?: AnalysisIssue[];
  totalDocuments?: number;
  analyzedDocuments?: number;
}

export default function AnalysisDashboard({
  issues = [],
  totalDocuments = 0,
  analyzedDocuments = 0,
}: AnalysisDashboardProps) {
  const highRisk = issues.filter((i) => i.severity === "high").length;
  const mediumRisk = issues.filter((i) => i.severity === "medium").length;
  const lowRisk = issues.filter((i) => i.severity === "low").length;

  const riskScore = totalDocuments > 0
    ? Math.round(
        ((highRisk * 3 + mediumRisk * 2 + lowRisk * 1) / (totalDocuments * 10)) * 100
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium">High Risk</span>
          </div>
          <div className="text-3xl font-bold">{highRisk}</div>
          <div className="text-xs text-muted-foreground mt-1">Critical issues</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium">Medium Risk</span>
          </div>
          <div className="text-3xl font-bold">{mediumRisk}</div>
          <div className="text-xs text-muted-foreground mt-1">Review needed</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium">Low Risk</span>
          </div>
          <div className="text-3xl font-bold">{lowRisk}</div>
          <div className="text-xs text-muted-foreground mt-1">Minor issues</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Risk Score</span>
          </div>
          <div className="text-3xl font-bold">{riskScore}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            {analyzedDocuments}/{totalDocuments} docs analyzed
          </div>
        </div>
      </div>

      {/* Issues List */}
      {issues.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h3 className="font-semibold">Issues Found</h3>
          </div>
          <div className="divide-y">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="p-4 hover:bg-accent transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 rounded-full p-1 ${
                      issue.severity === "high"
                        ? "bg-destructive/10 text-destructive"
                        : issue.severity === "medium"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-blue-500/10 text-blue-500"
                    }`}
                  >
                    {issue.severity === "high" ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : issue.severity === "medium" ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Info className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{issue.category}</span>
                      {issue.section && (
                        <span className="text-xs text-muted-foreground">
                          {issue.section}
                        </span>
                      )}
                      {issue.document && (
                        <span className="text-xs text-muted-foreground">
                          • {issue.document}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {issue.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {issues.length === 0 && (
        <div className="rounded-lg border bg-card p-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
          <p className="text-muted-foreground">
            No issues found. All documents appear to be in good shape.
          </p>
        </div>
      )}
    </div>
  );
}

