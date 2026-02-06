import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api";

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  blocks: any[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: "pending" | "running" | "completed" | "failed";
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  jobId?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export function useWorkflows() {
  return useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const response = await apiClient.getWorkflows();
      if (response.success && response.data) {
        return response.data.data as Workflow[];
      }
      throw new Error(response.error?.message || "Failed to fetch workflows");
    },
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (workflow: {
      name: string;
      description?: string;
      blocks: any[];
      enabled?: boolean;
    }) => {
      const response = await apiClient.createWorkflow(workflow);
      if (response.success && response.data) {
        return response.data.data as Workflow;
      }
      throw new Error(response.error?.message || "Failed to create workflow");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}

export function useRunWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workflowId,
      ...input
    }: {
      workflowId: string;
      documentId?: string;
      projectId?: string;
      fileIds?: string[];
      input?: Record<string, any>;
    }) => {
      // This will be implemented when we add the run endpoint
      const response = await fetch(
        `${apiClient["baseUrl"]}/api/workflows/${workflowId}/run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
          body: JSON.stringify(input),
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}

