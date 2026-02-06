import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api";

export interface Clause {
  id: string;
  name: string;
  text: string;
  category?: string;
  tags?: string[];
  description?: string;
  sourceDocument?: string;
  createdAt: string;
  updatedAt: string;
}

export function useClauses(category?: string) {
  return useQuery({
    queryKey: ["clauses", category],
    queryFn: async () => {
      const response = await apiClient.getClauses(category);
      if (response.success && response.data) {
        return response.data.clauses as Clause[];
      }
      throw new Error(response.error?.message || "Failed to fetch clauses");
    },
  });
}

export function useCreateClause() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clause: {
      name: string;
      text: string;
      category?: string;
      tags?: string[];
      description?: string;
    }) => {
      const response = await apiClient.createClause(clause);
      if (response.success && response.data) {
        return response.data.clause as Clause;
      }
      throw new Error(response.error?.message || "Failed to create clause");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clauses"] });
    },
  });
}

