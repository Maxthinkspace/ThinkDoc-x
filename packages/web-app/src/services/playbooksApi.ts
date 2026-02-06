import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api";

export interface Playbook {
  id: string;
  playbookName: string;
  description?: string;
  playbookType?: string;
  userPosition?: string;
  jurisdiction?: string;
  tags?: string[];
  rules: any[];
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export function usePlaybooks() {
  return useQuery({
    queryKey: ["playbooks"],
    queryFn: async () => {
      const response = await apiClient.getPlaybooks();
      if (response.success && response.data) {
        return response.data.data as Playbook[];
      }
      throw new Error(response.error?.message || "Failed to fetch playbooks");
    },
  });
}

export function useCreatePlaybook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (playbook: {
      playbookName: string;
      description?: string;
      rules: any[];
      playbookType?: string;
      userPosition?: string;
      jurisdiction?: string;
    }) => {
      const response = await apiClient.createPlaybook(playbook);
      if (response.success && response.data) {
        return response.data.data as Playbook;
      }
      throw new Error(response.error?.message || "Failed to create playbook");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbooks"] });
    },
  });
}

