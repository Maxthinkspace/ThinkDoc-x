import { Hono } from 'hono';
import { complianceController } from '@/controllers/compliance';
import { authMiddleware } from '@/middleware/auth';

const complianceRoutes = new Hono();

// Apply auth middleware
complianceRoutes.use(authMiddleware());

// Check compliance for selected text
complianceRoutes.post('/check', complianceController.checkCompliance);

export { complianceRoutes };

