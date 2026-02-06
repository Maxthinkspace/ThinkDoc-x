import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { summaryGenerationController } from '@/controllers/summary-generation';
import { getJobStatus } from '@/controllers/jobController';
import { authMiddleware } from '@/middleware/auth';
import { subscriptionMiddleware } from '@/middleware/subscription';

const summaryGenRoutes = new Hono();

// Apply auth and subscription middleware
summaryGenRoutes.use(authMiddleware());
summaryGenRoutes.use(subscriptionMiddleware());

// ============================================
// Validation Schemas
// ============================================

const documentNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    sectionNumber: z.string(),
    text: z.string(),
    level: z.number(),
    additionalParagraphs: z.array(z.string()).optional(),
    children: z.array(documentNodeSchema).optional(),
  })
);

const generateSummarySchema = z.object({
  parsedDocument: z.object({
    recitals: z.string(),
    structure: z.array(documentNodeSchema),
    closing: z.string().optional().default(''),
    badFormatSections: z.array(z.string()).optional(),
    sourceAnnotations: z.record(z.string(), z.any()).optional().default({}),
  }),
  comments: z.array(z.any()).optional().default([]),
  highlights: z.array(z.any()).optional().default([]),
  trackChanges: z.object({
    wordLevelTrackChanges: z.array(z.any()).optional().default([]),
    fullSentenceDeletions: z.array(z.any()).optional().default([]),
    fullSentenceInsertions: z.array(z.any()).optional().default([]),
    structuralChanges: z.array(z.any()).optional().default([]),
    summary: z.object({
      totalSentencesWithChanges: z.number(),
      totalFullSentenceDeletions: z.number(),
      totalFullSentenceInsertions: z.number(),
      totalDeletions: z.number(),
      totalInsertions: z.number(),
      totalSectionsDeleted: z.number(),
      totalSectionsInserted: z.number(),
    }).optional(),
  }).optional().default({
    wordLevelTrackChanges: [],
    fullSentenceDeletions: [],
    fullSentenceInsertions: [],
    structuralChanges: [],
  }),
  userPosition: z.string().optional(),
  includeRecommendations: z.boolean().optional().default(true),
});

const extractPositionsSchema = z.object({
  recitals: z.string(),
});

const rerunSummarySchema = z.object({
  generationContext: z.object({
    sourceAnnotationKey: z.string(),
    batchId: z.string(),
    topLevelSectionNumber: z.string(),
    context: z.string(),
    formattedAnnotation: z.string(),
    annotation: z.any(),
    userPosition: z.string().optional(),
  }),
  previousSummaries: z.array(z.object({
    attempt: z.number(),
    changeDescription: z.string(),
    implication: z.string(),
    recommendation: z.string().optional(),
  })),
});

// ============================================
// Routes
// ============================================

/**
 * POST /generate
 * Starts summary generation as a background job.
 * Returns { jobId } immediately.
 */
summaryGenRoutes.post(
  '/generate',
  zValidator('json', generateSummarySchema),
  summaryGenerationController.generateSummary
);

/**
 * GET /jobs/:jobId
 * Polls for job status and result.
 * Returns { status, progress?, result?, error? }
 */
summaryGenRoutes.get('/jobs/:jobId', getJobStatus);

/**
 * POST /extract-positions
 * Extracts party positions from recitals using LLM.
 */
summaryGenRoutes.post(
  '/extract-positions',
  zValidator('json', extractPositionsSchema),
  summaryGenerationController.extractPositions
);

/**
 * POST /rerun
 * Re-runs summary generation for a single annotation with different interpretation.
 */
summaryGenRoutes.post(
  '/rerun',
  zValidator('json', rerunSummarySchema),
  summaryGenerationController.rerunSummary
);

export { summaryGenRoutes };