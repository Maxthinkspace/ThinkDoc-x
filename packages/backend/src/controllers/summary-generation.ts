import type { Context } from 'hono';
import { logger } from '@/config/logger';
import { createJob, setJobResult, setJobError, updateJobProgress } from '@/utils/jobStore';
import { generateSummaryFromAnnotations } from '@/services/summary-generation';
import type { SummaryGenerationResult } from '@/services/summary-generation';
import { rerunSummary } from '@/services/summary-generation';
import { extractPositionsFromRecitals } from '@/utils/positionExtractor';
import { normalizeAnnotations } from '@/services/playbook-generation';
import { classifyAnnotationsFull } from '@/controllers/annotation-classifier';
import type { FullClassificationOutput } from '@/types/annotation-classifier';


// ============================================
// REQUEST PARSER
// ============================================

function parseGenerateSummaryRequest(body: any) {
  const { parsedDocument, comments, highlights, trackChanges, classificationResult, userPosition, includeRecommendations } = body;

  if (!parsedDocument || !parsedDocument.structure) {
    throw new Error('Missing required field: parsedDocument with structure');
  }

  return {
    parsedDocument,
    comments: comments || [],
    highlights: highlights || [],
    trackChanges: trackChanges || {
      wordLevelTrackChanges: [],
      fullSentenceDeletions: [],
      fullSentenceInsertions: [],
      structuralChanges: [],
      summary: {
        totalSentencesWithChanges: 0,
        totalFullSentenceDeletions: 0,
        totalDeletions: 0,
        totalInsertions: 0,
      },
    },
    classificationResult: classificationResult || null,
    userPosition: userPosition || undefined,
    includeRecommendations: includeRecommendations ?? true,
  };
}

function logReceivedPayload(body: any): void {
  logger.info('========== SUMMARY GENERATION PAYLOAD ==========');

  // Classification (cached from prepare step)
  if (body.classificationResult) {
    logger.info({
      total: body.classificationResult.summary?.total,
      byCategory: body.classificationResult.summary?.byCategory,
      conditional: body.classificationResult.summary?.conditional,
    }, 'Classification Result (from cache)');
  } else {
    logger.info('Classification Result: Not provided (will run classification)');
  }

  // User Position
  if (body.userPosition) {
    logger.info({ userPosition: body.userPosition }, 'User Position');
  }

  // Comments
  if (body.comments?.length) {
    logger.info('--- COMMENTS ---');
    body.comments.forEach((c: any, i: number) => {
      logger.info({
        index: i + 1,
        section: c.sectionNumber,
        range: `[${c.startOffset}-${c.endOffset}]`,
        selectedText: c.selectedText,
        comment: c.commentContent,
        author: c.author,
        affectedSentences: c.affectedSentences?.length || 0,
        affectedSentenceDetails: c.affectedSentences?.map((s: any) => ({
          id: s.sentenceId,
          text: s.sentence,
        })) || [],
      }, `Comment ${i + 1}`);
    });
  }

  // Word-level track changes
  if (body.trackChanges?.wordLevelTrackChanges?.length) {
    logger.info('--- WORD-LEVEL TRACK CHANGES ---');
    body.trackChanges.wordLevelTrackChanges.forEach((tc: any, i: number) => {
      logger.info({
        index: i + 1,
        sentenceId: tc.sentenceId,  // Add this for debugging frontend merge
        section: tc.sectionNumber,
        originalSentence: tc.originalSentence,
        amendedSentence: tc.amendedSentence,
        deleted: tc.deleted?.map((d: any) => d.text),
        added: tc.added?.map((a: any) => a.text),
        sentenceFragmentsCount: tc.sentenceFragments?.length || 0,  // Add this
      }, `Track Change ${i + 1}`);
    });
  }

  // Full sentence deletions
  if (body.trackChanges?.fullSentenceDeletions?.length) {
    logger.info('--- FULL SENTENCE DELETIONS ---');
    body.trackChanges.fullSentenceDeletions.forEach((d: any, i: number) => {
      logger.info({
        index: i + 1,
        section: d.sectionNumber,
        deletedText: d.deletedText,
      }, `Full Sentence Deletion ${i + 1}`);
    });
  }

  // Full sentence insertions
  if (body.trackChanges?.fullSentenceInsertions?.length) {
    logger.info('--- FULL SENTENCE INSERTIONS ---');
    body.trackChanges.fullSentenceInsertions.forEach((ins: any, i: number) => {
      logger.info({
        index: i + 1,
        section: ins.sectionNumber,
        insertedText: ins.insertedText,
      }, `Full Sentence Insertion ${i + 1}`);
    });
  }

  logger.info('=================================================');
}

// ============================================
// WORKFLOW
// ============================================

const TOTAL_STEPS = 4;

async function runSummaryGenerationWorkflow(
  body: any,
  jobId: string
): Promise<SummaryGenerationResult & { classificationResult?: FullClassificationOutput; rerunContexts?: Record<string, any> }> {
  const { parsedDocument, comments, highlights, trackChanges, classificationResult, userPosition, includeRecommendations } = body;

  // ========================================
  // STEP 1: NORMALIZE ANNOTATIONS
  // ========================================
  updateJobProgress(jobId, 1, TOTAL_STEPS, 'Normalizing annotations');

  const annotations = normalizeAnnotations(comments, highlights, trackChanges);

  if (annotations.length === 0) {
    return {
      success: true,
      summary: { sections: [] },
      metadata: { totalSentences: 0, processingTimeMs: 0 },
    };
  }

  // Assign original indices before classification
  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i];
    if (annotation) {
      annotation.originalIndex = i + 1;
    }
  }

  // ========================================
  // STEP 2: CLASSIFY ANNOTATIONS (or use cached)
  // ========================================
  updateJobProgress(jobId, 2, TOTAL_STEPS, 'Classifying annotations');

  let fullClassification: FullClassificationOutput;

  if (classificationResult) {
    logger.info({ jobId }, 'Summary Generation: Using provided classification from frontend');
    fullClassification = classificationResult;
  } else {
    logger.info({ jobId }, 'Summary Generation: Running classification');
    fullClassification = await classifyAnnotationsFull(
      annotations,
      parsedDocument.structure,
      jobId
    );
  }

  // ========================================
  // STEP 3: GENERATE SUMMARIES
  // ========================================
  updateJobProgress(jobId, 3, TOTAL_STEPS, 'Generating summaries');

  const result = await generateSummaryFromAnnotations(
    {
      parsedDocument,
      comments,
      highlights,
      trackChanges,
      userPosition,
      includeRecommendations,
      classificationResult: fullClassification,
    },
    jobId
  );

  // ========================================
  // STEP 4: FORMAT RESULTS
  // ========================================
  updateJobProgress(jobId, 4, TOTAL_STEPS, 'Formatting results');

  logger.info(
    { jobId, totalChanges: result.metadata.totalSentences },
    'Summary Generation: Workflow completed'
  );

  // Return classification so frontend can cache it
  return {
    ...result,
    classificationResult: fullClassification,
  };
}

// ============================================
// CONTROLLER
// ============================================

const generateSummary = async (c: Context) => {
  try {
    const rawBody = await c.req.json();
    const body = parseGenerateSummaryRequest(rawBody);

    // Get user context for job tracking
    const user = c.get('user') as { id: string; email: string; name: string | null } | undefined

    const jobId = createJob({
      userId: user?.id,
      userEmail: user?.email,
      jobType: 'summary-generation',
      jobName: 'Summary Generation',
    });

    logReceivedPayload(body);

    logger.info(
      {
        jobId,
        comments: body.comments.length,
        highlights: body.highlights.length,
        trackChanges: body.trackChanges.wordLevelTrackChanges?.length || 0,
      },
      'Summary Generation: Job created'
    );

    // Run in background
    runSummaryGenerationWorkflow(body, jobId)
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
          'Summary Generation: Background job failed'
        );
        setJobError(
          jobId,
          error instanceof Error ? error.message : 'Unknown error'
        );
      });

    return c.json({ jobId });

  } catch (error) {
    logger.error(
      {
        error: error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
      },
      'Summary Generation: Request validation failed'
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

// ============================================
// CONTROLLER: extractPositions
// ============================================

const extractPositions = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { recitals } = body;

    if (!recitals) {
      return c.json({ success: true, data: { positions: [], normalized: [] } });
    }

    const result = await extractPositionsFromRecitals(recitals);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : error },
      'Position Extraction: Failed'
    );
    return c.json(
      { success: false, error: { message: 'Failed to extract positions' } },
      500
    );
  }
};

// ============================================
// CONTROLLER: rerunSummary
// ============================================

const rerunSummaryController = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { generationContext, previousSummaries } = body;

    if (!generationContext || !previousSummaries) {
      return c.json(
        {
          success: false,
          error: { message: 'Missing required fields: generationContext and previousSummaries' },
        },
        400
      );
    }

    const jobId = `summary-rerun-${Date.now()}`;

    const result = await rerunSummary({ generationContext, previousSummaries }, jobId);

    return c.json({
      success: true,
      data: { newSummary: result.newSummary },
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : error },
      'Summary Generation: Re-run failed'
    );
    return c.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Unknown error' },
      },
      500
    );
  }
};

export const summaryGenerationController = {
  generateSummary,
  extractPositions,
  rerunSummary: rerunSummaryController,
};