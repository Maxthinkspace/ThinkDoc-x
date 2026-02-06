import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '@/middleware/auth';
import { subscriptionMiddleware } from '@/middleware/subscription';
import { workflowsController } from '@/controllers/workflows';
import { z } from 'zod';

const workflowsRoutes = new Hono();

// Apply auth and subscription middleware
workflowsRoutes.use(authMiddleware());
workflowsRoutes.use(subscriptionMiddleware());

// Workflow schemas
const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  blocks: z.array(z.any()),
  enabled: z.boolean().default(true),
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  blocks: z.array(z.any()).optional(),
  enabled: z.boolean().optional(),
});

const runWorkflowSchema = z.object({
  documentId: z.string().optional(),
  projectId: z.string().optional(),
  fileIds: z.array(z.string()).optional(),
  input: z.record(z.any()).optional(),
});

// List workflows
workflowsRoutes.get('/', workflowsController.list);

// Get workflow by ID
workflowsRoutes.get('/:id', workflowsController.get);

// Create workflow
workflowsRoutes.post(
  '/',
  zValidator('json', createWorkflowSchema),
  workflowsController.create
);

// Update workflow
workflowsRoutes.patch(
  '/:id',
  zValidator('json', updateWorkflowSchema),
  workflowsController.update
);

// Delete workflow
workflowsRoutes.delete('/:id', workflowsController.delete);

// Run workflow
workflowsRoutes.post(
  '/:id/run',
  zValidator('json', runWorkflowSchema),
  workflowsController.run
);

// Get workflow execution status
workflowsRoutes.get('/executions/:executionId', workflowsController.getExecution);

export { workflowsRoutes };

