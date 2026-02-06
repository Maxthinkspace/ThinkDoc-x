import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api";

export type AnalysisType = "contract-review" | "definition-check" | "risk-analysis" | "cross-document";

export interface BatchAnalysisOptions {
  playbookId?: string;
  language?: "english" | "chinese";
}

export interface BatchAnalysisRequest {
  projectId: string;
  fileIds: string[];
  analysisType: AnalysisType;
  options?: BatchAnalysisOptions;
}

export interface BatchAnalysisJob {
  id: string;
  jobId: string;
  projectId: string;
  analysisType: AnalysisType;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  totalFiles: number;
  results?: AggregatedResults;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AggregatedResults {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  totalIssues: number;
  issuesBySeverity: {
    high: number;
    medium: number;
    low: number;
  };
  averageRiskScore: number;
  documentsWithMostIssues: Array<{
    fileId: string;
    fileName: string;
    issueCount: number;
  }>;
  crossDocumentIssues?: Array<{
    type: string;
    description: string;
    affectedFiles: string[];
  }>;
  perDocumentResults: Array<{
    fileId: string;
    fileName: string;
    status: "completed" | "failed";
    issues?: Array<{
      severity: "high" | "medium" | "low";
      category: string;
      description: string;
      section?: string;
    }>;
    riskScore?: number;
    error?: string;
  }>;
}

export interface BatchAnalysisResult {
  id: string;
  jobId: string;
  fileId: string;
  analysisType: AnalysisType;
  results: any;
  issues?: Array<{
    severity: "high" | "medium" | "low";
    category: string;
    description: string;
    section?: string;
  }>;
  riskScore?: number;
  status: "pending" | "completed" | "failed";
  error?: string;
  createdAt: string;
}

// Add methods to apiClient
const runBatchAnalysis = async (request: BatchAnalysisRequest) => {
  const baseUrl = apiClient.baseUrl;
  const token = localStorage.getItem("auth_token");
  
  if (!token) {
    throw new Error("Authentication required. Please log in.");
  }

  try {
    const response = await fetch(`${baseUrl}/api/batch-analysis/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        message: `HTTP ${response.status}: ${response.statusText}` 
      }));
      
      // Handle different error formats
      let errorMessage = "Request failed";
      if (error.error) {
        if (typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.error.message) {
          errorMessage = error.error.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend at ${baseUrl}. Please ensure the backend is running.`);
    }
    throw error;
  }
};

const getBatchAnalysisStatus = async (jobId: string) => {
  const response = await fetch(`${apiClient["baseUrl"]}/api/batch-analysis/jobs/${jobId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch batch analysis status`);
  }

  return response.json();
};

const getBatchAnalysisResults = async (projectId: string) => {
  const response = await fetch(`${apiClient["baseUrl"]}/api/batch-analysis/projects/${projectId}/results`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch batch analysis results`);
  }

  return response.json();
};

const getBatchAnalysisJobDetails = async (batchJobId: string) => {
  const response = await fetch(`${apiClient["baseUrl"]}/api/batch-analysis/jobs/${batchJobId}/details`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch batch analysis job details`);
  }

  return response.json();
};

export function useRunBatchAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: BatchAnalysisRequest) => {
      const response = await runBatchAnalysis(request);
      if (response.success) {
        return response;
      }
      throw new Error(response.error?.message || "Failed to run batch analysis");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["batch-analysis", variables.projectId] });
    },
  });
}

export function useBatchAnalysisStatus(jobId: string | null) {
  return useQuery({
    queryKey: ["batch-analysis-status", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const response = await getBatchAnalysisStatus(jobId);
      if (response.success && response.data) {
        return response.data as BatchAnalysisJob;
      }
      throw new Error(response.error?.message || "Failed to fetch status");
    },
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Poll every 2 seconds if job is still processing
      if (data?.status === "processing" || data?.status === "pending") {
        return 2000;
      }
      return false;
    },
  });
}

export function useBatchAnalysisResults(projectId: string | null) {
  return useQuery({
    queryKey: ["batch-analysis-results", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const response = await getBatchAnalysisResults(projectId);
      if (response.success && response.data) {
        return response.data as BatchAnalysisJob[];
      }
      throw new Error(response.error?.message || "Failed to fetch results");
    },
    enabled: !!projectId,
  });
}

export function useBatchAnalysisJobDetails(batchJobId: string | null) {
  return useQuery({
    queryKey: ["batch-analysis-details", batchJobId],
    queryFn: async () => {
      if (!batchJobId) return null;
      const response = await getBatchAnalysisJobDetails(batchJobId);
      if (response.success && response.data) {
        return response.data as {
          job: BatchAnalysisJob;
          results: BatchAnalysisResult[];
        };
      }
      throw new Error(response.error?.message || "Failed to fetch job details");
    },
    enabled: !!batchJobId,
  });
}

