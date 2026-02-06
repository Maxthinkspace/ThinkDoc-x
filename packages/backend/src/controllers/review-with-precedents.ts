import type { Context } from 'hono';
import { logger } from '@/config/logger';
import { createJob, setJobResult, setJobError, updateJobProgress } from '@/utils/jobStore';
import {
  sectionMapping,
  processAdditions,
  processDeletions,
  consolidateAdditionsAndDeletions,
  mapAdditionsAndDeletionsToSections,
  generateAllAmendments,
  formatResultsForUI,
} from '@/services/review-with-precedents';


interface ReviewWithPrecedentsBody {
  originalDocument: {
    structure: any[];
    recitals?: any[];
    closing?: any[];
  };
  referenceDocument: {
    structure: any[];
    recitals?: any[];
    closing?: any[];
  };
  debug?: string;
}

// ============================================
// REQUEST PARSER / VALIDATOR
// ============================================

function parseReviewWithPrecedentsRequest(body: any): ReviewWithPrecedentsBody {
  const { originalDocument, referenceDocument, debug } = body;

  if (!originalDocument || !referenceDocument) {
    throw new Error('Missing required fields: originalDocument, referenceDocument');
  }

  if (!originalDocument.structure || !referenceDocument.structure) {
    throw new Error('Invalid document structure: missing structure field');
  }

  return { originalDocument, referenceDocument, debug };
}

// ============================================
// WORKFLOW FUNCTION (runs in background)
// ============================================

async function runReviewWithPrecedentsWorkflow(
  body: ReviewWithPrecedentsBody,
  jobId: string
): Promise<{ success: true; formattedResults: any[] }> {
  const workflowStartTime = Date.now();
  const { originalDocument, referenceDocument, debug } = body;

  const TOTAL_STEPS = 7;

  logger.info(
    {
      jobId,
      originalSections: originalDocument.structure.length,
      referenceSections: referenceDocument.structure.length,
      debugMode: debug || 'none',
    },
    'Review with Precedents: Workflow started (background job)'
  );

  // ========================================
  // STEP 1: SECTION MAPPING
  // ========================================
    
    updateJobProgress(jobId, 1, TOTAL_STEPS, 'Mapping sections between documents');
    
    const mappingResult = await sectionMapping(
      originalDocument.structure,
      referenceDocument.structure,
      {} as Context,
      debug
    );

    if (!mappingResult.success) {
      throw new Error('Step 1 (Section Mapping) failed');
    }

    const groupedMappings = mappingResult.mappings;
    const structure = originalDocument.structure;

    // ========================================
    // STEP 2: PROCESS ADDITIONS
    // ========================================
    
    updateJobProgress(jobId, 2, TOTAL_STEPS, 'Identifying additions from precedent');
    
    const additionsResponse = await processAdditions(
      originalDocument.structure,
      referenceDocument.structure,
      groupedMappings,
      {} as Context
    );

    if (!additionsResponse.success) {
      throw new Error('Step 2 (Process Additions) failed');
    }

    // ========================================
    // STEP 3: PROCESS DELETIONS
    // ========================================
    
    updateJobProgress(jobId, 3, TOTAL_STEPS, 'Identifying deletions from original');
    
    const deletionsResponse = await processDeletions(
      originalDocument.structure,
      referenceDocument.structure,
      groupedMappings,
      {} as Context
    );

    if (!deletionsResponse.success) {
      throw new Error('Step 3 (Process Deletions) failed');
    }

    // ===========================================
    // STEP 4: CONSOLIDATE ADDITIONS AND DELETIONS
    // ===========================================
    
    updateJobProgress(jobId, 4, TOTAL_STEPS, 'Consolidating changes');

    const consolidated = consolidateAdditionsAndDeletions(
      additionsResponse.comparisons,
      deletionsResponse.comparisons,
      mappingResult.mappings,
      originalDocument.structure,
      referenceDocument.structure
    );

    if (!consolidated.success) {
      throw new Error('Step 4 (Consolidate additions and deletions) failed');
    }

    // ========================================
    // STEP 5: MAP TO SECTIONS
    // ========================================
    
    updateJobProgress(jobId, 5, TOTAL_STEPS, 'Mapping changes to sections');
    
    const mappingToSectionsResult = await mapAdditionsAndDeletionsToSections(
      consolidated.additions,
      consolidated.deletions,
      structure,
      {} as Context
    );

    // ========================================
    // STEP 6: GENERATE AMENDMENTS
    // ========================================
    
    updateJobProgress(jobId, 6, TOTAL_STEPS, 'Generating amendments');
    
    const { amendments, newSections } = await generateAllAmendments(
      mappingToSectionsResult,
      consolidated.additions,
      consolidated.deletions,
      structure,
      {} as Context
    );

    // ========================================
    // STEP 7: FORMAT FOR UI
    // ========================================
    
    updateJobProgress(jobId, 7, TOTAL_STEPS, 'Formatting results');

    const formattedResults = formatResultsForUI(
      amendments,
      newSections,
      consolidated.ruleMetadata
    );

    const totalProcessingTimeMs = Date.now() - workflowStartTime;
    const totalApiCalls =
      mappingResult.metadata.apiCallsMade +
      additionsResponse.metadata.totalApiCalls +
      deletionsResponse.metadata.totalApiCalls;

    logger.info(
      {
        totalProcessingTimeMs,
        totalApiCalls,
      },
      'Review with Precedents: Workflow completed successfully'
    );

    return {
      success: true,
      formattedResults,
    };
  }

    // ============================================
// CONTROLLER (HTTP handler)
// ============================================

export const reviewWithPrecedents = async (c: Context) => {
  try {
    // Parse and validate request
    const rawBody = await c.req.json();
    const body = parseReviewWithPrecedentsRequest(rawBody);

    // Get user context for job tracking
    const user = c.get('user') as { id: string; email: string; name: string | null } | undefined

    // Create job and return immediately
    const jobId = createJob({
      userId: user?.id,
      userEmail: user?.email,
      jobType: 'review-with-precedents',
      jobName: 'Review with Precedents',
    });

    logger.info(
      {
        jobId,
        originalSections: body.originalDocument.structure.length,
        referenceSections: body.referenceDocument.structure.length,
      },
      'Review with Precedents: Job created, starting background processing'
    );

    // Run workflow in background (don't await!)
    runReviewWithPrecedentsWorkflow(body, jobId)
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
          'Review with Precedents: Background job failed'
        );
        setJobError(
          jobId,
          error instanceof Error ? error.message : 'Unknown error'
        );
      });

    // Return job ID immediately (no waiting for workflow!)
    return c.json({ jobId });

  } catch (error) {
    // This only catches parsing/validation errors
    logger.error(
      {
        error: error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
      },
      'Review with Precedents: Request validation failed'
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

export const reviewWithPrecedentsController = {
  reviewWithPrecedents,
};
