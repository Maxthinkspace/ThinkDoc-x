import { useState, useEffect, useRef } from "react";
import { jobTracker } from "../utils/jobTracker";

export type JobType = "review" | "draft" | "precedent" | "redomicile" | "playbook" | "vault";

export interface JobProgress {
  currentStep: number;
  totalSteps: number;
  stepName: string;
}

export interface JobPollingResult<T = any> {
  status: "pending" | "done" | "error";
  progress?: JobProgress;
  result?: T;
  error?: string;
  isPolling: boolean;
}

/**
 * Hook to poll for job status and update jobTracker
 */
export function useJobPolling<T = any>(
  jobId: string | null,
  jobType: JobType
): JobPollingResult<T> {
  const [status, setStatus] = useState<"pending" | "done" | "error">("pending");
  const [progress, setProgress] = useState<JobProgress | undefined>();
  const [result, setResult] = useState<T | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!jobId) {
      setIsPolling(false);
      return () => {}; // Return cleanup function
    }

    // Check if job is already complete in tracker
    const trackedJob = jobTracker.getJobByJobId(jobId);
    if (trackedJob?.status === "done") {
      setStatus("done");
      setProgress(trackedJob.progress);
      setIsPolling(false);
      return () => {}; // Return cleanup function
    }
    if (trackedJob?.status === "error") {
      setStatus("error");
      setIsPolling(false);
      return () => {}; // Return cleanup function
    }

    setIsPolling(true);
    setStatus("pending");

    // Determine the correct endpoint based on job type
    const getJobEndpoint = (type: JobType): string => {
      switch (type) {
        case "review":
          return `/api/contract-review/jobs/${jobId}`;
        case "draft":
          return `/api/redraft/jobs/${jobId}`;
        case "precedent":
          return `/api/review-with-precedents/jobs/${jobId}`;
        case "redomicile":
          return `/api/redomicile/jobs/${jobId}`;
        case "playbook":
          return `/api/playbook-generation/jobs/${jobId}`;
        case "vault":
          return `/api/vault/jobs/${jobId}`;
        default:
          return `/api/contract-review/jobs/${jobId}`;
      }
    };

    const pollJobStatus = async (): Promise<void> => {
      if (!isMountedRef.current) return;

      try {
        const endpoint = getJobEndpoint(jobType);
        const response = await fetch(endpoint);

        if (!response.ok) {
          // If endpoint doesn't exist or job not found, try common endpoints
          const endpoints = [
            `/api/contract-review/jobs/${jobId}`,
            `/api/playbook-generation/jobs/${jobId}`,
            `/api/redraft/jobs/${jobId}`,
            `/api/review-with-precedents/jobs/${jobId}`,
            `/api/redomicile/jobs/${jobId}`,
            `/api/vault/jobs/${jobId}`,
          ];

          let jobData: any = null;
          for (const ep of endpoints) {
            try {
              const res = await fetch(ep);
              if (res.ok) {
                jobData = await res.json();
                break;
              }
            } catch {
              continue;
            }
          }

          if (!jobData) {
            throw new Error("Job not found");
          }

          const data = jobData;
          
          if (data.status === "done") {
            if (isMountedRef.current) {
              setStatus("done");
              setProgress(data.progress);
              setResult(data.result);
              setIsPolling(false);
              
              // Update jobTracker
              jobTracker.updateJob(jobId, {
                status: "done",
                progress: data.progress,
              });
              
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
            }
            return;
          } else if (data.status === "error") {
            if (isMountedRef.current) {
              setStatus("error");
              setError(data.error || "Job failed");
              setIsPolling(false);
              
              // Update jobTracker
              jobTracker.updateJob(jobId, {
                status: "error",
              });
              
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
            }
            return;
          } else {
            // Still pending, update progress
            if (isMountedRef.current && data.progress) {
              setProgress(data.progress);
              jobTracker.updateJob(jobId, { progress: data.progress });
            }
            return;
          }
        } else {
          const data = await response.json();
          
          if (data.status === "done") {
            if (isMountedRef.current) {
              setStatus("done");
              setProgress(data.progress);
              setResult(data.result);
              setIsPolling(false);
              
              // Update jobTracker
              jobTracker.updateJob(jobId, {
                status: "done",
                progress: data.progress,
              });
              
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
            }
            return;
          } else if (data.status === "error") {
            if (isMountedRef.current) {
              setStatus("error");
              setError(data.error || "Job failed");
              setIsPolling(false);
              
              // Update jobTracker
              jobTracker.updateJob(jobId, {
                status: "error",
              });
              
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
            }
            return;
          } else {
            // Still pending, update progress
            if (isMountedRef.current && data.progress) {
              setProgress(data.progress);
              jobTracker.updateJob(jobId, { progress: data.progress });
            }
            return;
          }
        }
      } catch (err) {
        console.error("Error polling job status:", err);
        // Don't stop polling on error, just log it
        return;
      }
    };

    // Poll immediately
    pollJobStatus();

    // Then poll every 2 seconds
    intervalRef.current = setInterval(pollJobStatus, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [jobId, jobType]);

  return {
    status,
    progress,
    result,
    error,
    isPolling,
  };
}

