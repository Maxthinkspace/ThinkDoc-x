import type { Context } from 'hono';
import { createJob, setJobResult, setJobError, updateJobProgress, getJob } from '@/utils/jobStore';

export const getJobStatus = async (c: Context) => {
  const jobId = c.req.param('jobId');
  
  if (!jobId) {
    return c.json({ error: 'Missing jobId parameter' }, 400);
  }

  const job = getJob(jobId);
  
  if (!job) {
    return c.json({ error: 'Job not found' }, 404);
  }

  // Return the job status
  // Frontend will poll this endpoint until status is 'done' or 'error'
  return c.json({
    status: job.status,
    progress: job.progress,
    thinkingSteps: job.thinkingSteps,
    result: job.status === 'done' ? job.result : undefined,
    error: job.status === 'error' ? job.error : undefined,
  });
};
