import type { Context } from 'hono';
import { logger } from '@/config/logger';
import { createJob, setJobResult, setJobError, updateJobProgress } from '@/utils/jobStore';
import {
  analyzeDocument,
  draftSections,
  assembleMetadata,
} from '@/services/redomicile';
import type {
  RedomicileRequest,
  RedomiciledSection,
} from '@/services/redomicile';

// ============================================
// REQUEST BODY INTERFACE
// ============================================

interface RedomicileRequestBody {
  originalStructure: any[];
  sourceJurisdiction: string;
  targetJurisdiction: string;
  documentType: string;
  additionalGuidance?: string;
}

// ============================================
// REQUEST PARSER / VALIDATOR
// ============================================

function parseRedomicileRequest(body: any): RedomicileRequestBody {
  const { originalStructure, sourceJurisdiction, targetJurisdiction, documentType, additionalGuidance } = body;

  if (!originalStructure || !Array.isArray(originalStructure)) {
    throw new Error('Missing or invalid field: originalStructure');
  }

  if (!sourceJurisdiction) {
    throw new Error('Missing required field: sourceJurisdiction');
  }

  if (!targetJurisdiction) {
    throw new Error('Missing required field: targetJurisdiction');
  }

  if (!documentType) {
    throw new Error('Missing required field: documentType');
  }

  return {
    originalStructure,
    sourceJurisdiction,
    targetJurisdiction,
    documentType,
    additionalGuidance,
  };
}

// ============================================
// WORKFLOW FUNCTION (runs in background)
// ============================================

async function runRedomicileWorkflow(
  body: RedomicileRequestBody,
  jobId: string
): Promise<{
  success: true;
  sections: RedomiciledSection[];
  metadata: {
    removedClauses: string[];
    addedClauses: string[];
    adaptedClauses: string[];
  };
}> {
  const workflowStartTime = Date.now();
  const { originalStructure, sourceJurisdiction, targetJurisdiction, documentType, additionalGuidance } = body;

  const TOTAL_STEPS = 3;
  let totalApiCalls = 0;

  logger.info(
    {
      jobId,
      originalSections: originalStructure.length,
      sourceJurisdiction,
      targetJurisdiction,
      documentType,
    },
    'Redomicile: Workflow started (background job)'
  );

  // ========================================
  // STEP 1: ANALYZE DOCUMENT
  // ========================================

  updateJobProgress(jobId, 1, TOTAL_STEPS, 'Analyzing document structure and jurisdiction requirements');

  const { analysis, apiCallsMade: analysisCalls } = await analyzeDocument(
    originalStructure,
    sourceJurisdiction,
    targetJurisdiction,
    documentType,
    {} as Context
  );
  totalApiCalls += analysisCalls;

  logger.info(
    { jobId, analysis },
    'Redomicile: Analysis complete'
  );

  // ========================================
  // STEP 2: DRAFT SECTIONS
  // ========================================

  updateJobProgress(jobId, 2, TOTAL_STEPS, `Drafting ${analysis.sectionsToAdapt.length + analysis.sectionsToAdd.length} sections`);

  const { sections, apiCallsMade: draftCalls } = await draftSections(
    originalStructure,
    analysis,
    sourceJurisdiction,
    targetJurisdiction,
    documentType,
    additionalGuidance,
    3 // batchSize
  );
  totalApiCalls += draftCalls;

  logger.info(
    { jobId, draftedSections: sections.length },
    'Redomicile: Sections drafted'
  );

  // ========================================
  // STEP 3: ASSEMBLE METADATA
  // ========================================

  updateJobProgress(jobId, 3, TOTAL_STEPS, 'Assembling final document');

  const metadata = assembleMetadata(
    analysis,
    sourceJurisdiction,
    targetJurisdiction,
    documentType
  );

  const processingTimeMs = Date.now() - workflowStartTime;

  logger.info(
    {
      jobId,
      totalApiCalls,
      processingTimeMs,
      sectionsGenerated: sections.length,
    },
    'Redomicile: Workflow complete'
  );

  return {
    success: true,
    sections,
    metadata,
  };
}

// ============================================
// CONTROLLER METHODS
// ============================================

export const redomicileController = {
  async redomicile(c: Context) {
    try {
      const body = await c.req.json();
      const parsed = parseRedomicileRequest(body);

      // Get user context for job tracking
      const user = c.get('user') as { id: string; email: string; name: string | null } | undefined

      // Create background job
      const jobId = createJob({
        userId: user?.id,
        userEmail: user?.email,
        jobType: 'redomicile',
        jobName: 'Redomicile',
      });

      // Start workflow in background (don't await)
      runRedomicileWorkflow(parsed, jobId).then(
        (result) => {
          setJobResult(jobId, result);
        },
        (error) => {
          logger.error({ jobId, error }, 'Redomicile workflow failed');
          setJobError(jobId, error instanceof Error ? error.message : 'Unknown error');
        }
      );

      // Return job ID immediately
      return c.json({ jobId }, 202);
    } catch (error) {
      logger.error({ error }, 'Redomicile request failed');
      return c.json(
        {
          error: {
            message: error instanceof Error ? error.message : 'Invalid request',
          },
        },
        400
      );
    }
  },
};

