import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '@/middleware/auth';
import { subscriptionMiddleware } from '@/middleware/subscription';
import { batchAnalysisController } from '@/controllers/batch-analysis';
import { z } from 'zod';

const batchAnalysisRoutes = new Hono();

// Apply auth and subscription middleware
batchAnalysisRoutes.use(authMiddleware());
batchAnalysisRoutes.use(subscriptionMiddleware());

// Schema for batch analysis request
const runBatchAnalysisSchema = z.object({
  projectId: z.string().uuid(),
  fileIds: z.array(z.string().uuid()).min(1),
  analysisType: z.enum(['contract-review', 'definition-check', 'risk-analysis', 'cross-document']),
  options: z.object({
    playbookId: z.string().uuid().optional(),
    language: z.enum(['english', 'chinese']).optional(),
  }).optional(),
});

// POST /api/batch-analysis/run
batchAnalysisRoutes.post(
  '/run',
  zValidator('json', runBatchAnalysisSchema),
  batchAnalysisController.runBatchAnalysis
);

// GET /api/batch-analysis/jobs/:jobId
batchAnalysisRoutes.get('/jobs/:jobId', batchAnalysisController.getBatchAnalysisStatus);

// GET /api/batch-analysis/projects/:projectId/results
batchAnalysisRoutes.get('/projects/:projectId/results', batchAnalysisController.getBatchAnalysisResults);

// GET /api/batch-analysis/jobs/:batchJobId/details
batchAnalysisRoutes.get('/jobs/:batchJobId/details', batchAnalysisController.getBatchAnalysisJobDetails);

export { batchAnalysisRoutes };

