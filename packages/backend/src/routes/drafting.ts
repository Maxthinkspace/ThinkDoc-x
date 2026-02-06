import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { draftingController } from '@/controllers/drafting';
import { authMiddleware } from '@/middleware/auth';
import { subscriptionMiddleware } from '@/middleware/subscription';
import { getJobStatus } from '@/controllers/jobController';

const draftingRoutes = new Hono();

draftingRoutes.use(authMiddleware());
draftingRoutes.use(subscriptionMiddleware());

draftingRoutes.post(
  '/draft-with-instructions',
  zValidator('json', z.object({
    structure: z.array(z.any()),
    instructions: z.string(),
    selectedPrompts: z.array(z.object({
      id: z.string(),
      prompt: z.string(),
    })).optional().default([]),
    conversationHistory: z.array(z.object({
      instructions: z.string(),
      amendedSections: z.array(z.object({
        sectionNumber: z.string(),
        status: z.enum(['amended', 'not-amended', 'new-section', 'not-found']),
      })),
    })).optional().default([]),
    definitionSection: z.string().optional(),
  })),
  draftingController.draftWithInstructions
);

draftingRoutes.get('/jobs/:jobId', getJobStatus);

export { draftingRoutes };
