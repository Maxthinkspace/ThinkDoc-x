import { useState } from "react";
import { useWorkflows, useCreateWorkflow } from "@/services/workflowsApi";
import { Plus, Workflow, Loader2, Play, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function WorkflowsPage() {
  const { data: workflows, isLoading } = useWorkflows();
  const createWorkflow = useCreateWorkflow();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [workflowName, setWorkflowName] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");

  const handleCreate = async () => {
    if (!workflowName.trim()) return;
    try {
      await createWorkflow.mutateAsync({
        name: workflowName,
        description: workflowDescription || undefined,
        blocks: [],
        enabled: true,
      });
      setWorkflowName("");
      setWorkflowDescription("");
      setShowCreateDialog(false);
    } catch (error) {
      console.error("Failed to create workflow:", error);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage custom AI workflows
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Workflow
        </button>
      </div>

      {showCreateDialog && (
        <div className="mb-6 rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Create New Workflow</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Workflow Name
              </label>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g., NDA First Pass Review"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Description (optional)
              </label>
              <textarea
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Describe what this workflow does"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!workflowName.trim() || createWorkflow.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {createWorkflow.isPending ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setWorkflowName("");
                  setWorkflowDescription("");
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
      ) : workflows && workflows.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="rounded-lg border bg-card p-6 hover:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">{workflow.name}</h3>
                </div>
                <div
                  className={`h-2 w-2 rounded-full ${
                    workflow.enabled ? "bg-green-500" : "bg-gray-400"
                  }`}
                  title={workflow.enabled ? "Enabled" : "Disabled"}
                />
              </div>
              {workflow.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {workflow.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <span>{workflow.blocks.length} blocks</span>
                <span>•</span>
                <span>{format(new Date(workflow.updatedAt), "MMM d, yyyy")}</span>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-1 rounded border px-3 py-1.5 text-xs font-medium hover:bg-accent">
                  <Play className="h-3 w-3" />
                  Run
                </button>
                <button className="rounded border px-3 py-1.5 text-xs font-medium hover:bg-accent">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="p-8 text-center text-muted-foreground">
            <Workflow className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No workflows yet. Create your first workflow to automate legal tasks.</p>
          </div>
        </div>
      )}
    </div>
  );
}

