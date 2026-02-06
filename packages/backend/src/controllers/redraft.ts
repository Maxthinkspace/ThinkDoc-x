import type { Context } from 'hono';
import { logger } from '@/config/logger';
import { createJob, setJobResult, setJobError, updateJobProgress } from '@/utils/jobStore';
import {
  generateSkeleton,
  draftSectionsParallel,
  formatForUI,
} from '@/services/redraft';
import type {
  RedraftRequest,
  SkeletonSection,
  DraftedSection,
} from '@/services/redraft';

// ============================================
// REQUEST BODY INTERFACE
// ============================================

interface RedraftRequestBody {
  originalStructure: any[];
  instructions: {
    targetJurisdiction: string;
    targetLegalSystem: string;
    preserveBusinessTerms: boolean;
    additionalGuidance?: string;
  };
}

// ============================================
// REQUEST PARSER / VALIDATOR
// ============================================

function parseRedraftRequest(body: any): RedraftRequestBody {
  const { originalStructure, instructions } = body;

  if (!originalStructure || !Array.isArray(originalStructure)) {
    throw new Error('Missing or invalid field: originalStructure');
  }

  if (!instructions) {
    throw new Error('Missing required field: instructions');
  }

  if (!instructions.targetJurisdiction) {
    throw new Error('Missing required field: instructions.targetJurisdiction');
  }

  if (!instructions.targetLegalSystem) {
    throw new Error('Missing required field: instructions.targetLegalSystem');
  }

  return {
    originalStructure,
    instructions: {
      targetJurisdiction: instructions.targetJurisdiction,
      targetLegalSystem: instructions.targetLegalSystem,
      preserveBusinessTerms: instructions.preserveBusinessTerms ?? true,
      additionalGuidance: instructions.additionalGuidance,
    },
  };
}

// ============================================
// WORKFLOW FUNCTION (runs in background)
// ============================================

async function runRedraftWorkflow(
  body: RedraftRequestBody,
  jobId: string
): Promise<{
  success: true;
  skeleton: SkeletonSection[];
  draftedSections: DraftedSection[];
  metadata: {
    totalSections: number;
    totalApiCalls: number;
    processingTimeMs: number;
  };
}> {
  const workflowStartTime = Date.now();
  const { originalStructure, instructions } = body;

  const TOTAL_STEPS = 3;
  let totalApiCalls = 0;

  logger.info(
    {
      jobId,
      originalSections: originalStructure.length,
      targetJurisdiction: instructions.targetJurisdiction,
      targetLegalSystem: instructions.targetLegalSystem,
    },
    'Re-Draft: Workflow started (background job)'
  );

  // ========================================
  // STEP 1: GENERATE SKELETON
  // ========================================

  updateJobProgress(jobId, 1, TOTAL_STEPS, 'Analyzing document structure');

  const { skeleton, apiCallsMade: skeletonCalls } = await generateSkeleton(
    originalStructure,
    instructions,
    {} as Context
  );
  totalApiCalls += skeletonCalls;

  if (!skeleton || skeleton.length === 0) {
    throw new Error('Step 1 (Generate Skeleton) failed: No skeleton generated');
  }

  logger.info(
    { jobId, skeletonSections: skeleton.length },
    'Re-Draft: Skeleton generated'
  );

  // ========================================
  // STEP 2: DRAFT SECTIONS IN PARALLEL
  // ========================================

  updateJobProgress(jobId, 2, TOTAL_STEPS, `Drafting ${skeleton.length} sections`);

  const { draftedSections, apiCallsMade: draftCalls } = await draftSectionsParallel(
    skeleton,
    originalStructure,
    instructions,
    5 // batchSize
  );
  totalApiCalls += draftCalls;

  logger.info(
    { jobId, draftedSections: draftedSections.length },
    'Re-Draft: Sections drafted'
  );

  // ========================================
  // STEP 3: FORMAT FOR UI
  // ========================================

  updateJobProgress(jobId, 3, TOTAL_STEPS, 'Formatting results');

  const formattedSections = formatForUI(skeleton, draftedSections);

  const processingTimeMs = Date.now() - workflowStartTime;

  logger.info(
    {
      jobId,
      totalApiCalls,
      processingTimeMs,
      sectionsGenerated: formattedSections.length,
    },
    'Re-Draft: Workflow completed successfully'
  );

  return {
    success: true,
    skeleton,
    draftedSections: formattedSections,
    metadata: {
      totalSections: formattedSections.length,
      totalApiCalls,
      processingTimeMs,
    },
  };
}

// ============================================
// CONTROLLER (HTTP handler)
// ============================================

export const redraft = async (c: Context) => {
  try {
    // Parse and validate request
    const rawBody = await c.req.json();
    const body = parseRedraftRequest(rawBody);

    // Get user context for job tracking
    const user = c.get('user') as { id: string; email: string; name: string | null } | undefined

    // Create job and return immediately
    const jobId = createJob({
      userId: user?.id,
      userEmail: user?.email,
      jobType: 'redraft',
      jobName: 'Redraft',
    });

    logger.info(
      {
        jobId,
        originalSections: body.originalStructure.length,
        targetJurisdiction: body.instructions.targetJurisdiction,
      },
      'Re-Draft: Job created, starting background processing'
    );

    // Run workflow in background (don't await!)
    runRedraftWorkflow(body, jobId)
      .then((result) => {
        setJobResult(jobId, result);
      })
      .catch((error) => {
        logger.error(
          {
            jobId,
            error: error instanceof Error
              ? { message: error.message, stack: error.stack }
              : error,
          },
          'Re-Draft: Background job failed'
        );
        setJobError(
          jobId,
          error instanceof Error ? error.message : 'Unknown error'
        );
      });

    // Return job ID immediately
    return c.json({ jobId });

  } catch (error) {
    logger.error(
      {
        error: error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
      },
      'Re-Draft: Request validation failed'
    );

    return c.json(
      {
        success: false,
        error: 'Invalid request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      400
    );
  }
};

export const redraftController = {
  redraft,
};