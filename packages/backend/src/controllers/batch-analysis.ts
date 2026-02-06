import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from '@/config/logger';
import { env } from '@/config/env';
import { db } from '@/config/database';
import { batchAnalysisJobs, batchAnalysisResults } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getUserId } from '@/middleware/auth';
import { createJob, setJobResult, setJobError } from '@/utils/jobStore';
import { runBatchAnalysisWorkflow } from '@/services/batch-analysis';

export const batchAnalysisController = {
  async runBatchAnalysis(c: Context) {
    try {
      const userId = getUserId(c);
      const body = await c.req.json();

      const { projectId, fileIds, analysisType, options } = body;

      // Validate input
      if (!projectId || !fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        throw new HTTPException(400, { message: 'Missing required fields: projectId, fileIds' });
      }

      if (!analysisType || !['contract-review', 'definition-check', 'risk-analysis', 'cross-document'].includes(analysisType)) {
        throw new HTTPException(400, { message: 'Invalid analysisType. Must be one of: contract-review, definition-check, risk-analysis, cross-document' });
      }

      // Get user context for job tracking
      const user = c.get('user') as { id: string; email: string; name: string | null } | undefined;

      // Create job store job
      const jobId = createJob({
        userId: user?.id,
        userEmail: user?.email,
        jobType: 'batch-analysis',
        jobName: `Batch ${analysisType}`,
      });

      // Create batch analysis job record
      const [batchJob] = await db
        .insert(batchAnalysisJobs)
        .values({
          projectId,
          userId,
          analysisType,
          fileIds,
          options: options || {},
          status: 'pending',
          totalFiles: fileIds.length,
          jobId,
        })
        .returning();

      if (!batchJob) {
        throw new HTTPException(500, { message: 'Failed to create batch analysis job' });
      }

      logger.info({
        jobId,
        batchJobId: batchJob.id,
        projectId,
        fileCount: fileIds.length,
        analysisType,
      }, 'Batch Analysis: Job created, starting background processing');

      // Run workflow in background
      runBatchAnalysisWorkflow(jobId, batchJob.id, projectId, fileIds, analysisType, options || {})
        .then((result) => {
          setJobResult(jobId, result);
        })
        .catch((error) => {
          logger.error(
            {
              jobId,
              batchJobId: batchJob.id,
              error: error instanceof Error
                ? { message: error.message, stack: error.stack }
                : error,
            },
            'Batch Analysis: Background job failed'
          );
          setJobError(jobId, error instanceof Error ? error.message : 'Unknown error');
          
          // Update batch job status
          db.update(batchAnalysisJobs)
            .set({ status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' })
            .where(eq(batchAnalysisJobs.id, batchJob.id))
            .catch((dbError) => {
              logger.error({ error: dbError, batchJobId: batchJob.id }, 'Failed to update batch job status');
            });
        });

      return c.json({
        success: true,
        jobId,
        batchJobId: batchJob.id,
      });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      
      // Log detailed error information
      const errorDetails = error instanceof Error 
        ? { message: error.message, stack: error.stack, name: error.name }
        : error;
      
      // Try to get request body for debugging (but don't fail if it's already consumed)
      let requestBody = null;
      try {
        // Clone the request to avoid consuming the original body
        const clonedReq = c.req.raw.clone();
        requestBody = await clonedReq.json().catch(() => null);
      } catch {
        // Body already consumed or not available, use the body we already parsed
        requestBody = body;
      }
      
      logger.error({ 
        error: errorDetails,
        body: requestBody,
        userId: getUserId(c),
      }, 'Batch Analysis: Failed to run batch analysis');
      
      // In development, expose more error details
      const errorMessage = env.NODE_ENV === 'development' && error instanceof Error
        ? `Failed to run batch analysis: ${error.message}`
        : 'Failed to run batch analysis';
      
      throw new HTTPException(500, { message: errorMessage });
    }
  },

  async getBatchAnalysisStatus(c: Context) {
    try {
      const userId = getUserId(c);
      const { jobId } = c.req.param();

      const [batchJob] = await db
        .select()
        .from(batchAnalysisJobs)
        .where(and(
          eq(batchAnalysisJobs.jobId, jobId),
          eq(batchAnalysisJobs.userId, userId)
        ))
        .limit(1);

      if (!batchJob) {
        throw new HTTPException(404, { message: 'Batch analysis job not found' });
      }

      return c.json({
        success: true,
        data: {
          id: batchJob.id,
          jobId: batchJob.jobId,
          status: batchJob.status,
          progress: batchJob.progress,
          totalFiles: batchJob.totalFiles,
          results: batchJob.results,
          error: batchJob.error,
          createdAt: batchJob.createdAt,
          completedAt: batchJob.completedAt,
        },
      });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      logger.error({ error }, 'Batch Analysis: Failed to get status');
      throw new HTTPException(500, { message: 'Failed to get batch analysis status' });
    }
  },

  async getBatchAnalysisResults(c: Context) {
    try {
      const userId = getUserId(c);
      const { projectId } = c.req.param();

      // Verify project ownership
      const { vaultProjects } = await import('@/db/schema/vault');
      const [project] = await db
        .select()
        .from(vaultProjects)
        .where(and(
          eq(vaultProjects.id, projectId),
          eq(vaultProjects.userId, userId)
        ))
        .limit(1);

      if (!project) {
        throw new HTTPException(404, { message: 'Project not found' });
      }

      // Get all batch analysis jobs for this project
      const jobs = await db
        .select()
        .from(batchAnalysisJobs)
        .where(eq(batchAnalysisJobs.projectId, projectId))
        .orderBy(desc(batchAnalysisJobs.createdAt));

      return c.json({
        success: true,
        data: jobs,
      });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      logger.error({ error }, 'Batch Analysis: Failed to get results');
      throw new HTTPException(500, { message: 'Failed to get batch analysis results' });
    }
  },

  async getBatchAnalysisJobDetails(c: Context) {
    try {
      const userId = getUserId(c);
      const { batchJobId } = c.req.param();

      // Get batch job
      const [batchJob] = await db
        .select()
        .from(batchAnalysisJobs)
        .where(and(
          eq(batchAnalysisJobs.id, batchJobId),
          eq(batchAnalysisJobs.userId, userId)
        ))
        .limit(1);

      if (!batchJob) {
        throw new HTTPException(404, { message: 'Batch analysis job not found' });
      }

      // Get per-document results
      const results = await db
        .select()
        .from(batchAnalysisResults)
        .where(eq(batchAnalysisResults.jobId, batchJobId));

      return c.json({
        success: true,
        data: {
          job: batchJob,
          results,
        },
      });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      logger.error({ error }, 'Batch Analysis: Failed to get job details');
      throw new HTTPException(500, { message: 'Failed to get batch analysis job details' });
    }
  },
};

