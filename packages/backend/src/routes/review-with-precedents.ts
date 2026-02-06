import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { reviewWithPrecedentsController } from '@/controllers/review-with-precedents';
import { reviewWithPrecedentsRequestSchema } from '@/schemas/review-with-precedents';
import { authMiddleware } from '@/middleware/auth';
import { subscriptionMiddleware } from '@/middleware/subscription';
import { getJobStatus } from '@/controllers/jobController';

const reviewWithPrecedentsRoutes = new Hono();
// Apply auth and subscription middleware to all rule generation routes
reviewWithPrecedentsRoutes.use(authMiddleware());
reviewWithPrecedentsRoutes.use(subscriptionMiddleware());

reviewWithPrecedentsRoutes.post(
  '/complete',
  zValidator('json', reviewWithPrecedentsRequestSchema),
  reviewWithPrecedentsController.reviewWithPrecedents
);

reviewWithPrecedentsRoutes.get('/jobs/:jobId', getJobStatus);

export { reviewWithPrecedentsRoutes };