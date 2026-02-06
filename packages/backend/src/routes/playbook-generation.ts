import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { playbookGenerationController } from '@/controllers/playbook-generation';
import { getJobStatus } from '@/controllers/jobController';
import { authMiddleware } from '@/middleware/auth';
import { subscriptionMiddleware } from '@/middleware/subscription';

const playbookGenRoutes = new Hono();

// Apply auth and subscription middleware to all playbook generation routes
playbookGenRoutes.use(authMiddleware());
playbookGenRoutes.use(subscriptionMiddleware());

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

const generatePlaybookSchema = z.object({
  parsedDocument: z.object({
    recitals: z.string(),
    structure: z.array(documentNodeSchema),
    closing: z.string().optional().default(''),
    badFormatSections: z.array(z.string()).optional(),
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
});

const rerunRulesSchema = z.object({
  generationContext: z.object({
    sourceAnnotationKey: z.string(),
    batchId: z.string(),
    topLevelSectionNumber: z.string(),
    context: z.string(),
    sentences: z.array(z.string()),
    formattedAnnotation: z.string(),
    annotation: z.any(),
  }),
  previousRules: z.array(z.object({
    id: z.string(),
    rule_number: z.string(),
    brief_name: z.string(),
    instruction: z.string(),
    example_language: z.string().optional(),
    location_text: z.string().optional(),
    sourceAnnotationKey: z.string().optional(),
  })),
});

const removeConditionsSchema = z.string();

// ============================================
// Routes
// ============================================

/**
 * POST /generate
 * Starts playbook generation as a background job.
 * Returns { jobId } immediately.
 */
playbookGenRoutes.post(
  '/generate',
  zValidator('json', generatePlaybookSchema),
  playbookGenerationController.generatePlaybook
);

/**
 * GET /jobs/:jobId
 * Polls for job status and result.
 * Returns { status, progress?, result?, error? }
 */
playbookGenRoutes.get('/jobs/:jobId', getJobStatus);

/**
 * POST /rerun
 * Re-runs rule generation for a specific annotation with a different interpretation.
 */
playbookGenRoutes.post(
  '/rerun',
  zValidator('json', rerunRulesSchema),
  playbookGenerationController.rerunRules
);

/**
 * POST /remove-conditions
 * Removes conditional aspects from rules.
 * (To be refactored later)
 */
playbookGenRoutes.post(
  '/remove-conditions',
  zValidator('json', removeConditionsSchema),
  playbookGenerationController.removeConditions
);

export { playbookGenRoutes };
