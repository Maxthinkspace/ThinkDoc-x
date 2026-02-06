import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { askRequestSchema } from '@/schemas/ask';
import { authMiddleware } from '@/middleware/auth';
import { subscriptionMiddleware } from '@/middleware/subscription';
import { handleAskStream } from '@/controllers/ask';

const askRoutes = new Hono();

// Apply auth and subscription middleware
askRoutes.use(authMiddleware());
askRoutes.use(subscriptionMiddleware());

// Streaming ask endpoint with validation
askRoutes.post('/stream', zValidator('json', askRequestSchema), handleAskStream);

export { askRoutes };

