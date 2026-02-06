import type { Context } from 'hono';
import { logger } from '@/config/logger';
import { createJob, setJobResult, setJobError, updateJobProgress } from '@/utils/jobStore';
import type {
  GeneratedRule,
  GeneratePlaybookBody,
  GeneratePlaybookResult,
  TrackChangeExtractionResults,
  RuleCategory,
} from '@/types/playbook-generation';
import {
  normalizeAnnotations,
  generateRulesFromBatches,
  expandRulesBySection,
  removeConditionsFromRules,
  rerunRules,
  mergeRuleCategories,
  applyConditionalStatusToRules,
} from '@/services/playbook-generation';

import { classifyAnnotationsFull } from '@/controllers/annotation-classifier';

import {
  groupAnnotationsBySentence,
  createBatches,
  splitAnnotationsByCategoryFull,
  PLAYBOOK_BATCH_CONFIG,
} from '@/services/annotation-batcher';

import type { FullClassificationOutput } from '@/types/annotation-classifier';

const TOTAL_STEPS = 5;

function logReceivedPayload(body: GeneratePlaybookBody): void {
  logger.info('========== PLAYBOOK GENERATION PAYLOAD ==========');

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

  // Comments
  if (body.comments?.length) {
    logger.info('--- COMMENTS ---');
    body.comments.forEach((c, i) => {
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

  // Highlights
  if (body.highlights?.length) {
    logger.info('--- HIGHLIGHTS ---');
    body.highlights.forEach((h, i) => {
      logger.info({
        index: i + 1,
        section: h.sectionNumber,
        range: `[${h.startOffset}-${h.endOffset}]`,
        color: h.highlightColor,
        selectedText: h.selectedText,
        affectedSentences: h.affectedSentences?.length || 0,
        affectedSentenceDetails: h.affectedSentences?.map((s: any) => ({
          id: s.sentenceId,
          text: s.sentence,
        })) || [],
      }, `Highlight ${i + 1}`);
    });
  }

  // Word-level track changes
  if (body.trackChanges?.wordLevelTrackChanges?.length) {
    logger.info('--- WORD-LEVEL TRACK CHANGES ---');
    body.trackChanges.wordLevelTrackChanges.forEach((tc, i) => {
      logger.info({
        index: i + 1,
        section: tc.sectionNumber,
        originalSentence: tc.originalSentence,
        amendedSentence: tc.amendedSentence,
        deleted: tc.deleted?.map((d: any) => ({ text: d.text, range: `[${d.startOffset}-${d.endOffset}]` })),
        added: tc.added?.map((a: any) => ({ text: a.text, range: `[${a.startOffset}-${a.endOffset}]` })),
      }, `Track Change ${i + 1}`);
    });
  }

  // Full sentence deletions
  if (body.trackChanges?.fullSentenceDeletions?.length) {
    logger.info('--- FULL SENTENCE DELETIONS ---');
    body.trackChanges.fullSentenceDeletions.forEach((d, i) => {
      logger.info({
        index: i + 1,
        section: d.sectionNumber,
        topLevel: d.topLevelSectionNumber,
        range: `[${d.startOffset}-${d.endOffset}]`,
        deletedText: d.deletedText,
      }, `Full Sentence Deletion ${i + 1}`);
    });
  }

  // Full sentence insertions
  if (body.trackChanges?.fullSentenceInsertions?.length) {
    logger.info('--- FULL SENTENCE INSERTIONS ---');
    body.trackChanges.fullSentenceInsertions.forEach((ins, i) => {
      logger.info({
        index: i + 1,
        section: ins.sectionNumber,
        inferredTopLevel: ins.inferredTopLevelSection,
        range: `[${ins.startOffset}-${ins.endOffset}]`,
        insertedText: ins.insertedText,
      }, `Full Sentence Insertion ${i + 1}`);
    });
  }

  // Structural changes
  if (body.trackChanges?.structuralChanges?.length) {
    logger.info('--- STRUCTURAL CHANGES ---');
    body.trackChanges.structuralChanges.forEach((sc, i) => {
      logger.info({
        index: i + 1,
        type: sc.type,
        section: sc.sectionNumber,
        title: sc.sectionTitle,
        content: sc.fullContent,
      }, `Structural Change ${i + 1}`);
    });
  }

  logger.info('=================================================');
}
// ============================================
// REQUEST PARSER / VALIDATOR
// ============================================

function parseGeneratePlaybookRequest(body: any): GeneratePlaybookBody {
  const { parsedDocument, comments, highlights, trackChanges, classificationResult } = body;

  if (!parsedDocument || !parsedDocument.structure) {
    throw new Error('Missing required field: parsedDocument with structure');
  }

  return {
    parsedDocument,
    comments: comments || [],
    highlights: highlights || [],
    trackChanges: trackChanges || {
      wordLevelTrackChanges: [],
      fullParagraphDeletions: [],
      summary: {
        totalSentencesWithChanges: 0,
        totalFullParagraphDeletions: 0,
        totalDeletions: 0,
        totalInsertions: 0,
      },
    },
    classificationResult: classificationResult || null,
  };
}

// ============================================
// HELPER: Count total track changes
// ============================================

function getTrackChangeCount(trackChanges: TrackChangeExtractionResults): number {
  return (
    trackChanges.wordLevelTrackChanges.length +
    trackChanges.fullSentenceDeletions.length +
    trackChanges.fullSentenceInsertions.length +
    trackChanges.structuralChanges.length
  );
}

// ============================================
// WORKFLOW FUNCTION
// ============================================

async function runPlaybookGenerationWorkflow(
  body: GeneratePlaybookBody,
  jobId: string
): Promise<GeneratePlaybookResult> {
  const workflowStartTime = Date.now();
  const { parsedDocument, comments, highlights, trackChanges, classificationResult } = body;

  const trackChangeCount = getTrackChangeCount(trackChanges);

  logger.info(
    {
      jobId,
      comments: comments.length,
      highlights: highlights.length,
      trackChanges: trackChangeCount,
      sections: parsedDocument.structure.length,
    },
    'Playbook Generation: Workflow started'
  );

  // ========================================
  // STEP 1: NORMALIZE AND CLASSIFY ANNOTATIONS
  // ========================================

  updateJobProgress(jobId, 1, TOTAL_STEPS, 'Classifying annotations');

  const annotations = normalizeAnnotations(comments, highlights, trackChanges);

  if (annotations.length === 0) {
    throw new Error('No annotations provided');
  }

  // Assign original indices before classification
  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i];
    if (annotation) {
      annotation.originalIndex = i + 1;  // 1-indexed to match classifier
    }
  }

  // Use cached classification if provided, otherwise run classification
  let fullClassification: FullClassificationOutput;

  if (classificationResult) {
    logger.info({ jobId }, 'Playbook Generation: Using provided classification from frontend');
    fullClassification = classificationResult;
  } else {
    logger.info({ jobId }, 'Playbook Generation: Running classification (no cache provided)');
    fullClassification = await classifyAnnotationsFull(
      annotations,
      parsedDocument.structure,
      jobId
    );
  }

  // Split by category (S → CA, Q → IR, E → discard)
  const { substantive, query } = splitAnnotationsByCategoryFull(
    annotations,
    fullClassification
  );

  logger.info(
    {
      jobId,
      total: annotations.length,
      substantive: substantive.length,
      query: query.length,
      discarded: annotations.length - substantive.length - query.length,
      conditionalAnnotations: fullClassification.summary.conditional,
    },
    'Playbook Generation: Annotations classified and split'
  );

  // ========================================
  // STEP 2: BATCH AND GENERATE RULES
  // ========================================

  updateJobProgress(jobId, 2, TOTAL_STEPS, 'Generating rules from annotations');

  // Batch substantive annotations for CA rules
  const caSentenceGroups = groupAnnotationsBySentence(substantive);
  const caBatches = createBatches(caSentenceGroups, parsedDocument.structure, PLAYBOOK_BATCH_CONFIG);

  // Batch query annotations for IR rules
  const irSentenceGroups = groupAnnotationsBySentence(query);
  const irBatches = createBatches(irSentenceGroups, parsedDocument.structure, PLAYBOOK_BATCH_CONFIG);

  logger.info(
    { jobId, caBatches: caBatches.length, irBatches: irBatches.length },
    'Playbook Generation: Batches created'
  );

  // Log CA batch details
  for (const batch of caBatches) {
    logger.info(
      {
        jobId,
        batchId: batch.batchId,
        section: batch.topLevelSectionNumber,
        annotations: batch.annotations.map((a, idx) => ({
          annotationId: idx + 1,
          type: a.type,
          data: a.data,
        })),
      },
      'Playbook Generation: CA Batch'
    );
  }

  // Log IR batch details
  for (const batch of irBatches) {
    logger.info(
      {
        jobId,
        batchId: batch.batchId,
        section: batch.topLevelSectionNumber,
        annotations: batch.annotations.map((a, idx) => ({
          annotationId: idx + 1,
          type: a.type,
          data: a.data,
        })),
      },
      'Playbook Generation: IR Batch'
    );
  }

  // Generate CA rules
  const { ruleCategories: caCategories, generationContexts: caContexts } =
    await generateRulesFromBatches(caBatches, jobId, 'CA', parsedDocument.structure);

  // Generate IR rules
  const { ruleCategories: irCategories, generationContexts: irContexts } =
    await generateRulesFromBatches(irBatches, jobId, 'IR', parsedDocument.structure);

  // Merge contexts
  const generationContexts = { ...caContexts, ...irContexts };

  // Debug: log all rerun contexts (sourceAnnotationKey → full annotation info)
  logger.info('========== RERUN CONTEXTS (sourceAnnotationKey map) ==========');
  for (const [key, ctx] of Object.entries(generationContexts)) {
    const context = ctx as any;
    logger.info(
      {
        sourceAnnotationKey: key,
        batchId: context.batchId,
        topLevelSectionNumber: context.topLevelSectionNumber,
        ruleType: context.ruleType,
        sentences: context.sentences,
        formattedAnnotation: context.formattedAnnotation,
        annotation: context.annotation,
        context: context.context,
        location_text: context.location_text,
        selected_text: context.selected_text,
      },
      `Rerun Context: ${key}`
    );
  }
  logger.info('==============================================================');

  // Merge and renumber rules
  const allRules = mergeRuleCategories(caCategories, irCategories);

  logger.info(
    { 
      jobId, 
      caRules: caCategories.reduce((sum, c) => sum + (c.rules?.length || 0), 0),
      irRules: irCategories.reduce((sum, c) => sum + (c.rules?.length || 0), 0),
    },
    'Playbook Generation: Rules generated'
  );

  // ========================================
  // STEP 3: EXPAND RULES BY SECTION
  // ========================================

  updateJobProgress(jobId, 3, TOTAL_STEPS, 'Expanding rules with section context');

  const expandedRules = await expandRulesBySection(allRules, parsedDocument.structure, jobId);

  // ========================================
  // STEP 4: APPLY CONDITIONAL STATUS TO RULES
  // ========================================

  updateJobProgress(jobId, 4, TOTAL_STEPS, 'Applying conditional status to rules');

  // Extract IR and CA rules from expanded categories
  const irRulesExpanded = expandedRules
    .find((c: RuleCategory) => c.type === 'Rules for Instruction Requests')?.rules || [];
  const caRulesExpanded = expandedRules
    .find((c: RuleCategory) => c.type === 'Rules for Contract Amendments')?.rules || [];

  // Apply conditional status based on source annotations
  const {
    instructionRequestRules,
    alwaysAppliedAmendmentRules,
    conditionalAmendmentRules,
  } = applyConditionalStatusToRules(
    irRulesExpanded,
    caRulesExpanded,
    fullClassification,
    jobId
  );

  // ========================================
  // STEP 5: FORMAT RESULTS
  // ========================================

  updateJobProgress(jobId, 5, TOTAL_STEPS, 'Formatting results');

  const totalProcessingTimeMs = Date.now() - workflowStartTime;

  logger.info(
    { jobId, totalProcessingTimeMs },
    'Playbook Generation: Workflow completed successfully'
  );
  return {
    success: true,
    playbook: {
      instructionRequestRules,
      alwaysAppliedRules: alwaysAppliedAmendmentRules,
      conditionalRules: conditionalAmendmentRules,
    },
    rerunContexts: generationContexts,  // Include for re-run capability
  };
}

// ============================================
// CONTROLLER: generatePlaybook
// ============================================

const generatePlaybook = async (c: Context) => {
  try {
    // Parse and validate request
    const rawBody = await c.req.json();
    const body = parseGeneratePlaybookRequest(rawBody);

    // Get user context for job tracking
    const user = c.get('user') as { id: string; email: string; name: string | null } | undefined

    // Create job and return immediately
    logReceivedPayload(body);

    const jobId = createJob({
      userId: user?.id,
      userEmail: user?.email,
      jobType: 'playbook-generation',
      jobName: 'Playbook Generation',
    });

    const trackChangeCount = getTrackChangeCount(body.trackChanges);

    logger.info(
      {
        jobId,
        comments: body.comments.length,
        highlights: body.highlights.length,
        trackChanges: trackChangeCount,
      },
      'Playbook Generation: Job created, starting background processing'
    );

    // Run workflow in background (don't await!)
    runPlaybookGenerationWorkflow(body, jobId)
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
          'Playbook Generation: Background job failed'
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
      'Playbook Generation: Request validation failed'
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
// CONTROLLER: rerunRules
// ============================================

const rerunRulesController = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { generationContext, previousRules } = body;

    if (!generationContext || !previousRules) {
      return c.json(
        {
          success: false,
          error: { message: 'Missing required fields: generationContext and previousRules' },
        },
        400
      );
    }

    const jobId = `rerun-${Date.now()}`;

    const result = await rerunRules(
      { generationContext, previousRules },
      jobId
    );

    return c.json({
      success: true,
      data: {
        newRules: result.newRules,
      },
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
      },
      'Playbook Generation: Re-run failed'
    );

    return c.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      500
    );
  }
};

// ============================================
// CONTROLLER: removeConditions
// ============================================

const removeConditions = async (c: Context) => {
  try {
    const rulesInput = await c.req.json();

    // Parse rules if they come as a string
    let rules: GeneratedRule[];
    if (typeof rulesInput === 'string') {
      try {
        rules = JSON.parse(rulesInput);
      } catch {
        rules = [];
      }
    } else if (Array.isArray(rulesInput)) {
      rules = rulesInput;
    } else {
      rules = [rulesInput];
    }

    if (rules.length === 0) {
      return c.json({
        success: true,
        data: [],
      });
    }

    logger.info(
      { ruleCount: rules.length },
      'Playbook Generation: Removing conditions from rules'
    );

    const cleanedRules = await removeConditionsFromRules(rules);

    logger.info(
      {
        inputCount: rules.length,
        outputCount: Array.isArray(cleanedRules) ? cleanedRules.length : 1,
      },
      'Playbook Generation: Conditions removed successfully'
    );

    return c.json({
      success: true,
      data: cleanedRules,
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : error },
      'Playbook Generation: removeConditions failed'
    );
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
};

// ============================================
// CONTROLLER EXPORT
// ============================================

export const playbookGenerationController = {
  generatePlaybook,
  removeConditions,
  rerunRules: rerunRulesController,
};