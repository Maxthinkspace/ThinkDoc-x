import { useProjects } from "@/services/projectsApi";
import AnalysisDashboard from "@/components/studio/AnalysisDashboard";
import { Loader2 } from "lucide-react";

export default function StudioDashboard() {
  const { data: projects, isLoading } = useProjects();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your legal projects and analysis
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="rounded-lg border bg-card p-6">
              <div className="text-sm font-medium text-muted-foreground">
                Active Projects
              </div>
              <div className="mt-2 text-3xl font-bold">
                {projects?.length || 0}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <div className="text-sm font-medium text-muted-foreground">
                Documents Analyzed
              </div>
              <div className="mt-2 text-3xl font-bold">0</div>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <div className="text-sm font-medium text-muted-foreground">
                Issues Found
              </div>
              <div className="mt-2 text-3xl font-bold">0</div>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <div className="text-sm font-medium text-muted-foreground">
                Workflows Run
              </div>
              <div className="mt-2 text-3xl font-bold">0</div>
            </div>
          </div>

          {/* Analysis Dashboard */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Analysis Overview</h2>
            <AnalysisDashboard
              issues={[]}
              totalDocuments={0}
              analyzedDocuments={0}
            />
          </div>
        </>
      )}
    </div>
  );
}

