/**
 * Job Tracker Utility
 * Tracks active background jobs across the application
 * Allows users to navigate away and return to check job status
 */

import type { PageType } from "../hooks/use-navigation";

export interface TrackedJob {
  id: string;
  jobId: string;
  type: "review" | "draft" | "playbook" | "precedent" | "vault";
  title: string;
  subtitle: string;
  createdAt: number;
  status: "pending" | "done" | "error";
  progress?: {
    currentStep: number;
    totalSteps: number;
    stepName: string;
  };
  navigationTarget: PageType;  // e.g., "redraft", "precedent-comparison"
  inputContext?: {
    // Job-specific context needed to resume and display results
    type: "review" | "draft" | "precedent" | "redomicile" | "playbook";
    data: any;  // Original inputs/config
  };
}

const STORAGE_KEY = "activeJobs";
const UPDATE_EVENT = "jobTracker:updated";

const notifyUpdate = (): void => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const jobTracker = {
  /**
   * Add a new job to tracking
   */
  addJob(job: TrackedJob): void {
    const jobs = this.getJobs();
    jobs.push(job);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    notifyUpdate();
  },

  /**
   * Update job status
   */
  updateJob(jobId: string, updates: Partial<TrackedJob>): void {
    const jobs = this.getJobs();
    const index = jobs.findIndex((j) => j.jobId === jobId);
    if (index !== -1) {
      jobs[index] = { ...jobs[index], ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
      notifyUpdate();
    }
  },

  /**
   * Get all tracked jobs
   */
  getJobs(): TrackedJob[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  /**
   * Get active (pending) jobs
   */
  getActiveJobs(): TrackedJob[] {
    return this.getJobs().filter((j) => j.status === "pending");
  },

  /**
   * Remove a job from tracking
   */
  removeJob(jobId: string): void {
    const jobs = this.getJobs().filter((j) => j.jobId !== jobId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    notifyUpdate();
  },

  /**
   * Get a job by its jobId (backend job ID)
   */
  getJobByJobId(jobId: string): TrackedJob | undefined {
    const jobs = this.getJobs();
    return jobs.find((j) => j.jobId === jobId);
  },

  /**
   * Get a job by its tracking id
   */
  getJobById(id: string): TrackedJob | undefined {
    const jobs = this.getJobs();
    return jobs.find((j) => j.id === id);
  },

  /**
   * Clean up completed/error jobs older than 1 hour
   */
  cleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const jobs = this.getJobs().filter(
      (j) => j.status === "pending" || j.createdAt > oneHourAgo
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    notifyUpdate();
  },
};

// Cleanup on load
if (typeof window !== "undefined") {
  jobTracker.cleanup();
}

