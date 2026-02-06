import { useState } from "react";
import { useProjects, useCreateProject } from "@/services/projectsApi";
import { Link } from "react-router-dom";
import { Plus, FolderKanban, Calendar, FileText, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!projectName.trim()) return;
    setError(null);
    try {
      await createProject.mutateAsync({
        name: projectName,
        description: projectDescription || undefined,
      });
      setProjectName("");
      setProjectDescription("");
      setShowCreateDialog(false);
      setError(null);
    } catch (error) {
      console.error("Failed to create project:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create project. Please try again.";
      setError(errorMessage);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage multi-document projects and transactions
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {showCreateDialog && (
        <div className="mb-6 rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Create New Project</h3>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  setError(null);
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g., Acme Acquisition"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && projectName.trim()) {
                    handleCreate();
                  }
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Description (optional)
              </label>
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Brief description of the project"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!projectName.trim() || createProject.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {createProject.isPending ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setProjectName("");
                  setProjectDescription("");
                  setError(null);
                }}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/dashboard/projects/${project.id}`}
              className="rounded-lg border bg-card p-6 hover:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">{project.name}</h3>
                </div>
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {project.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {project.fileCount} files
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(project.updatedAt), "MMM d, yyyy")}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="p-8 text-center text-muted-foreground">
            <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No projects yet. Create your first project to get started.</p>
          </div>
        </div>
      )}
    </div>
  );
}

