import { Hono } from 'hono';
import { redomicileController } from '@/controllers/redomicile';
import { authMiddleware } from '@/middleware/auth';
import { subscriptionMiddleware } from '@/middleware/subscription';
import { getJobStatus } from '@/controllers/jobController';

const redomicileRoutes = new Hono();

// Apply auth and subscription middleware
redomicileRoutes.use(authMiddleware());
redomicileRoutes.use(subscriptionMiddleware());

// Start redomicile job
redomicileRoutes.post('/', redomicileController.redomicile);

// Get job status
redomicileRoutes.get('/jobs/:jobId', getJobStatus);

export { redomicileRoutes };

