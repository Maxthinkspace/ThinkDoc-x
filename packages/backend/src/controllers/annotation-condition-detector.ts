import { logger } from '@/config/logger';
import { generateTextWithJsonParsing } from '@/controllers/generate';
import type {
  ConditionDetectionResult,
  ConditionDetectionOutput,
  AnnotationMarker,
} from '@/types/annotation-condition';
import type { NormalizedAnnotation, CommentForLLM, TrackChangeForLLM } from '@/types/playbook-generation';
import {
  getConditionDetectionPrompt,
  getConditionClassificationPrompt,
  calculateConditionCategory,
  CONDITION_DETECTION_CONFIG,
} from '@/controllers/annotation-condition-prompts';

// ============================================
// STEP 0: EXTRACT MARKERS
// ============================================

export function extractAnnotationMarkers(annotations: NormalizedAnnotation[]): AnnotationMarker[] {
  const markers: AnnotationMarker[] = [];

  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i];
    if (!annotation) continue;

    if (annotation.type === 'comment') {
      const data = annotation.data as CommentForLLM;
      markers.push({
        index: i + 1,
        type: 'comment',
        marker: data.commentContent,
      });
    } else if (annotation.type === 'wordLevelTrackchange') {
      const data = annotation.data as TrackChangeForLLM;
      if (data.added && data.added.length > 0) {
        markers.push({
          index: i + 1,
          type: 'trackChange',
          marker: data.added.map(a => a.text).join(' '),
        });
      }
    } else if (annotation.type === 'fullSentenceInsertion') {
      const data = annotation.data as { insertedText: string };
      markers.push({
        index: i + 1,
        type: 'trackChange',
        marker: data.insertedText,
      });
    }
  }

  return markers;
}

// ============================================
// STEP 1 & 2: DETECT CONDITIONS
// ============================================

interface DetectionResult {
  index: number;
  hasCondition: boolean;
  conditionText: string | null;
}

async function detectConditionsInMarkers(
  markers: AnnotationMarker[],
  jobId: string
): Promise<Map<number, DetectionResult>> {
  const results = new Map<number, DetectionResult>();

  if (markers.length === 0) {
    return results;
  }

  const batches: AnnotationMarker[][] = [];
  for (let i = 0; i < markers.length; i += CONDITION_DETECTION_CONFIG.maxMarkersPerBatch) {
    batches.push(markers.slice(i, i + CONDITION_DETECTION_CONFIG.maxMarkersPerBatch));
  }

  for (const batch of batches) {
    const prompt = getConditionDetectionPrompt(batch);

    logger.info(
      {
        jobId,
        batchSize: batch.length,
        prompt,
      },
      'Condition Detector: Full prompt to LLM - Condition detection'
    );

    try {
      const result = await generateTextWithJsonParsing('', prompt, {
        model: CONDITION_DETECTION_CONFIG.step1Model,
      });

      logger.info(
        {
          jobId,
          rawResponse: result,
        },
        'Condition Detector: Full LLM response - Condition detection'
      );

      if (Array.isArray(result)) {
        for (const item of result) {
          results.set(item.index, {
            index: item.index,
            hasCondition: item.hasCondition ?? false,
            conditionText: item.conditionText ?? null,
          });
        }
      }
    } catch (error) {
      logger.error(
        { jobId, error: error instanceof Error ? error.message : error },
        'Condition Detector: Detection batch failed'
      );
      for (const marker of batch) {
        results.set(marker.index, {
          index: marker.index,
          hasCondition: false,
          conditionText: null,
        });
      }
    }
  }

  return results;
}

// ============================================
// STEP 3: CLASSIFY CONDITIONS
// ============================================

interface ClassificationInput {
  index: number;
  conditionText: string;
  marker: string;
  context: string;
}

async function classifyConditions(
  conditions: ClassificationInput[],
  jobId: string
): Promise<Map<number, { isConditional: boolean; scores: { C: number; U: number }; matchedQuestions: string[] }>> {
  const results = new Map<number, { isConditional: boolean; scores: { C: number; U: number }; matchedQuestions: string[] }>();

  if (conditions.length === 0) {
    return results;
  }

  const byContext = new Map<string, ClassificationInput[]>();
  for (const cond of conditions) {
    const existing = byContext.get(cond.context) || [];
    existing.push(cond);
    byContext.set(cond.context, existing);
  }

  for (const [context, contextConditions] of byContext) {
    const prompt = getConditionClassificationPrompt(
      contextConditions.map((c) => ({
        index: c.index,
        conditionText: c.conditionText,
        marker: c.marker,
      })),
      context
    );

    logger.info(
      {
        jobId,
        conditionCount: contextConditions.length,
        prompt,
      },
      'Condition Detector: Full prompt to LLM - Condition classification'
    );

    try {
      const result = await generateTextWithJsonParsing('', prompt, {
        model: CONDITION_DETECTION_CONFIG.step3Model,
      });

      logger.info(
        {
          jobId,
          rawResponse: result,
        },
        'Condition Detector: Full LLM response - Condition classification'
      );

      if (Array.isArray(result)) {
        for (const item of result) {
          const answers = item.answers || {};
          const scoring = calculateConditionCategory(answers);
          results.set(item.index, scoring);
        }
      }
    } catch (error) {
      logger.error(
        { jobId, error: error instanceof Error ? error.message : error },
        'Condition Detector: Classification batch failed'
      );
      for (const cond of contextConditions) {
        results.set(cond.index, {
          isConditional: true,
          scores: { C: 0, U: 0 },
          matchedQuestions: [],
        });
      }
    }
  }

  return results;
}

// ============================================
// MAIN FUNCTION
// ============================================

export async function detectAnnotationConditions(
  annotations: NormalizedAnnotation[],
  contexts: Map<number, string>,
  jobId: string
): Promise<ConditionDetectionOutput> {
  logger.info(
    { jobId, totalAnnotations: annotations.length },
    'Condition Detector: Starting'
  );

  const allResults: ConditionDetectionResult[] = [];
  const markers = extractAnnotationMarkers(annotations);

  logger.info(
    {
      jobId,
      markersExtracted: markers.length,
      markers: markers.map(m => ({
        index: m.index,
        type: m.type,
        marker: m.marker,
      })),
    },
    'Condition Detector: Markers extracted'
  );

  for (let i = 0; i < annotations.length; i++) {
    allResults.push({
      index: i + 1,
      hasCondition: false,
      conditionText: undefined,
      scores: { C: 0, U: 0 },
      matchedQuestions: [],
      isConditional: false,
    });
  }

  if (markers.length === 0) {
    return {
      results: allResults,
      summary: {
        total: annotations.length,
        withConditions: 0,
        conditional: 0,
        unconditional: 0,
      },
    };
  }

  const detectionResults = await detectConditionsInMarkers(markers, jobId);

  for (const [index, detection] of detectionResults) {
    const result = allResults.find((r) => r.index === index);
    if (result) {
      result.hasCondition = detection.hasCondition;
      result.conditionText = detection.conditionText ?? undefined;
    }
  }

  const conditionsToClassify: ClassificationInput[] = [];
  for (const marker of markers) {
    const detection = detectionResults.get(marker.index);
    if (detection?.hasCondition && detection.conditionText) {
      const context = contexts.get(marker.index) || '';
      conditionsToClassify.push({
        index: marker.index,
        conditionText: detection.conditionText,
        marker: marker.marker,
        context,
      });
    }
  }

  logger.info(
    {
      jobId,
      conditionsToClassify: conditionsToClassify.length,
      conditions: conditionsToClassify.map(c => ({
        index: c.index,
        conditionText: c.conditionText,
      })),
    },
    'Condition Detector: Classifying conditions'
  );

  if (conditionsToClassify.length > 0) {
    const classificationResults = await classifyConditions(conditionsToClassify, jobId);

    for (const [index, classification] of classificationResults) {
      const result = allResults.find((r) => r.index === index);
      if (result) {
        result.isConditional = classification.isConditional;
        result.scores = classification.scores;
        result.matchedQuestions = classification.matchedQuestions;
      }
    }
  }

  const summary = {
    total: annotations.length,
    withConditions: allResults.filter((r) => r.hasCondition).length,
    conditional: allResults.filter((r) => r.isConditional).length,
    unconditional: allResults.filter((r) => r.hasCondition && !r.isConditional).length,
  };

  logger.info(
    {
      jobId,
      summary,
      results: allResults.map((r) => ({
        index: r.index,
        hasCondition: r.hasCondition,
        conditionText: r.conditionText,
        isConditional: r.isConditional,
        scores: r.scores,
        matchedQuestions: r.matchedQuestions,
      })),
    },
    'Condition Detector: Complete'
  );

  return { results: allResults, summary };
}