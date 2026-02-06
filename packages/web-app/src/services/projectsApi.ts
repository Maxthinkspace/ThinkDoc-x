import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api";

export interface Project {
  id: string;
  name: string;
  description?: string;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  extractedText?: string;
  parsedStructure?: any;
  createdAt: string;
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await apiClient.getProjects();
      if (response.success && response.data) {
        return response.data.projects as Project[];
      }
      throw new Error(response.error?.message || "Failed to fetch projects");
    },
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId],
    queryFn: async () => {
      const response = await apiClient.getProject(projectId);
      if (response.success && response.data) {
        return response.data.project as Project;
      }
      throw new Error(response.error?.message || "Failed to fetch project");
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await apiClient.createProject(data.name, data.description);
      if (response.success && response.data) {
        // Handle both { success: true, project } and { project } response formats
        const project = (response.data as any).project || response.data;
        if (project && project.id) {
          return project as Project;
        }
        throw new Error("Invalid response format: project data missing");
      }
      throw new Error(response.error?.message || "Failed to create project");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useProjectFiles(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId, "files"],
    queryFn: async () => {
      const response = await apiClient.getProjectDocuments(projectId);
      if (response.success && response.data) {
        return response.data.files as ProjectFile[];
      }
      throw new Error(response.error?.message || "Failed to fetch files");
    },
    enabled: !!projectId,
  });
}

export function useUploadFiles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      files,
    }: {
      projectId: string;
      files: File[];
    }) => {
      const response = await apiClient.uploadDocuments(projectId, files);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["projects", variables.projectId, "files"],
      });
      queryClient.invalidateQueries({
        queryKey: ["projects", variables.projectId],
      });
    },
  });
}

