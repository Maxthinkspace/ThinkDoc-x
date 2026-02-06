import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { integrationsController } from '@/controllers/integrations';
import { updateIntegrationSchema } from '@/schemas/integrations';
import { authMiddleware } from '@/middleware/auth';

const integrationsRoutes = new Hono();

// Apply auth middleware to all integration routes
integrationsRoutes.use(authMiddleware());

// ============================================
// INTEGRATION ROUTES
// ============================================

// List all integrations for the organization
integrationsRoutes.get('/', integrationsController.list);

// Update an integration (enable/disable and configure)
integrationsRoutes.put(
  '/:type',
  zValidator('json', updateIntegrationSchema),
  integrationsController.update
);

export { integrationsRoutes };

