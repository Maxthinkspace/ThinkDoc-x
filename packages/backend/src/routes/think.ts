import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { thinkController } from '@/controllers/think';
import {
  thinkClauseRequestSchema,
  thinkDocumentRequestSchema,
  draftRequestSchema,
} from '@/schemas/think';
import { authMiddleware } from '@/middleware/auth';

const thinkRoutes = new Hono();

// Apply auth middleware
thinkRoutes.use(authMiddleware());

// Think clause endpoint
thinkRoutes.post(
  '/clause',
  zValidator('json', thinkClauseRequestSchema),
  thinkController.thinkClause
);

// Think document endpoint
thinkRoutes.post(
  '/document',
  zValidator('json', thinkDocumentRequestSchema),
  thinkController.thinkDocument
);

// Draft endpoint
thinkRoutes.post(
  '/draft',
  zValidator('json', draftRequestSchema),
  thinkController.draft
);

export { thinkRoutes };

