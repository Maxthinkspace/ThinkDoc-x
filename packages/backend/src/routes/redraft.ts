import { Hono } from 'hono';
import { redraftController } from '@/controllers/redraft';
import { authMiddleware } from '@/middleware/auth';
import { subscriptionMiddleware } from '@/middleware/subscription';
import { getJobStatus } from '@/controllers/jobController';

const redraftRoutes = new Hono();

// Apply auth and subscription middleware
redraftRoutes.use(authMiddleware());
redraftRoutes.use(subscriptionMiddleware());

// Start redraft job
redraftRoutes.post('/', redraftController.redraft);

// Get job status
redraftRoutes.get('/jobs/:jobId', getJobStatus);

export { redraftRoutes };