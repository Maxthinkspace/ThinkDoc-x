import { Hono } from 'hono';
import { redactionController } from '@/controllers/redaction';
import { authMiddleware } from '@/middleware/auth';
import { subscriptionMiddleware } from '@/middleware/subscription';

const redactionRoutes = new Hono();

// Apply auth and subscription middleware
redactionRoutes.use(authMiddleware());
redactionRoutes.use(subscriptionMiddleware());

// ============================================
// Routes
// ============================================

/**
 * POST /suggest-terms
 * Uses LLM to identify deal-specific terms that should be redacted.
 * Accepts parsed document structure and returns categorized terms.
 */
redactionRoutes.post('/suggest-terms', redactionController.suggestTerms);

export { redactionRoutes };
