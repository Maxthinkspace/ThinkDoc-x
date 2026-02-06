import crypto from 'crypto';
import { notify } from '@/services/notifications';
import { logger } from '@/config/logger';

export type JobStatus = 'pending' | 'done' | 'error';

export interface JobProgress {
  currentStep: number;
  totalSteps: number;
  stepName: string;
}

export interface JobOptions {
  userId?: string | undefined;
  userEmail?: string | undefined;
  jobType?: string;
  jobName?: string | null;
}

export interface Job {
  status: JobStatus;
  progress?: JobProgress;
  thinkingSteps?: string[];
  result?: unknown;
  error?: string;
  createdAt: number;
  userId?: string;
  userEmail?: string;
  jobType?: string;
  jobName?: string | null;
}

const jobs = new Map<string, Job>();

export function createJob(options?: JobOptions): string {
  const jobId = crypto.randomUUID();
  const job: Job = { 
    status: 'pending',
    createdAt: Date.now(),
  };
  
  if (options?.userId) job.userId = options.userId;
  if (options?.userEmail) job.userEmail = options.userEmail;
  if (options?.jobType) job.jobType = options.jobType;
  if (options?.jobName !== undefined) job.jobName = options.jobName;
  
  jobs.set(jobId, job);
  return jobId;
}

export function updateJobProgress(
  jobId: string,
  currentStep: number,
  totalSteps: number,
  stepName: string
): void {
  const job = jobs.get(jobId);
  if (job) {
    job.progress = { currentStep, totalSteps, stepName };
  }
}

export function addJobThinkingStep(jobId: string, step: string): void {
  const job = jobs.get(jobId);
  if (job) {
    if (!job.thinkingSteps) {
      job.thinkingSteps = [];
    }
    job.thinkingSteps.push(step);
  }
}

export function setJobResult(jobId: string, result: unknown): void {
  const job = jobs.get(jobId);
  if (job) {
    job.status = 'done';
    job.result = result;

    // Send notification if user info is available
    if (job.userId && job.jobType && job.userEmail) {
      notify(job.userId, 'job_complete', {
        userEmail: job.userEmail,
        jobType: job.jobType,
        jobName: job.jobName || null,
      }).catch((error) => {
        logger.error({ error, jobId }, 'Failed to send job completion notification');
      });
    }
  }
}

export function setJobError(jobId: string, error: string): void {
  const job = jobs.get(jobId);
  if (job) {
    job.status = 'error';
    job.error = error;

    // Send notification if user info is available
    if (job.userId && job.jobType && job.userEmail) {
      notify(job.userId, 'job_failed', {
        userEmail: job.userEmail,
        jobType: job.jobType,
        jobName: job.jobName || null,
        errorMessage: error,
      }).catch((notificationError) => {
        logger.error({ error: notificationError, jobId }, 'Failed to send job failure notification');
      });
    }
  }
}

export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

export function deleteJob(jobId: string): void {
  jobs.delete(jobId);
}

// Cleanup old jobs every 30 minutes
// Jobs older than 1 hour will be removed
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt < oneHourAgo) {
      jobs.delete(id);
    }
  }
}, 30 * 60 * 1000);