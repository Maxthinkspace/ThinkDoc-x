import { Hono } from 'hono';
import { negotiationController } from '@/controllers/negotiation';
import { authMiddleware } from '@/middleware/auth';

const negotiationRoutes = new Hono();

// Apply auth middleware
negotiationRoutes.use(authMiddleware());

// Analyze negotiation and generate suggested amendments
negotiationRoutes.post('/analyze', negotiationController.analyzeNegotiation);

export { negotiationRoutes };

