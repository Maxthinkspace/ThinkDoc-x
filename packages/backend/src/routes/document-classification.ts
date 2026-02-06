import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { classifyDocument, validateMainBodyCandidates } from '@/services/document-classification';
import { authMiddleware } from '@/middleware/auth';
import { subscriptionMiddleware } from '@/middleware/subscription';

const documentClassificationRoutes = new Hono();

// Apply auth and subscription middleware
documentClassificationRoutes.use(authMiddleware());
documentClassificationRoutes.use(subscriptionMiddleware());

// ============================================
// Validation Schemas
// ============================================

const classifyDocumentSchema = z.object({
  paragraphs: z.array(z.string()),
});

const mainBodyCandidateSchema = z.object({
  gapText: z.string(),
  candidateText: z.string(),
});

const validateMainBodyCandidatesSchema = z.object({
  candidateA: mainBodyCandidateSchema,
  candidateB: mainBodyCandidateSchema,
});

// ============================================
// Routes
// ============================================

/**
 * POST /classify
 * Classifies document as tree or flat, detects language and boundaries
 */
documentClassificationRoutes.post(
  '/classify',
  zValidator('json', classifyDocumentSchema),
  async (c) => {
    try {
      const { paragraphs } = c.req.valid('json');
      const result = await classifyDocument({ paragraphs });
      return c.json({ success: true, data: result });
    } catch (error) {
      console.error('Document classification failed:', error);
      return c.json(
        { success: false, error: { message: 'Classification failed' } },
        500
      );
    }
  }
);

/**
 * POST /validate-main-body-candidates
 * Validates two main body candidates using LLM, returns winner (A or B)
 */
documentClassificationRoutes.post(
  '/validate-main-body-candidates',
  zValidator('json', validateMainBodyCandidatesSchema),
  async (c) => {
    try {
      const { candidateA, candidateB } = c.req.valid('json');
      const result = await validateMainBodyCandidates({ candidateA, candidateB });
      return c.json({ success: true, data: result });
    } catch (error) {
      console.error('Main body candidate validation failed:', error);
      return c.json(
        { success: false, error: { message: 'Validation failed' } },
        500
      );
    }
  }
);

export { documentClassificationRoutes };