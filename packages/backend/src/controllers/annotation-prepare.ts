import type { Context } from 'hono';
import { logger } from '@/config/logger';
import { normalizeAnnotations } from '@/services/playbook-generation';
import { extractPositionsFromRecitals } from '@/utils/positionExtractor';
import { classifyAnnotationsFull } from '@/controllers/annotation-classifier';
import type { FullClassificationOutput } from '@/types/annotation-classifier';
import type { TrackChangeExtractionResults } from '@/types/playbook-generation';

interface PrepareAnnotationsRequest {
  parsedDocument: {
    structure: any[];
  };
  comments: any[];
  highlights: any[];
  trackChanges?: TrackChangeExtractionResults;
  recitals?: string;
}

interface PrepareAnnotationsResponse {
  success: boolean;
  classificationResult?: FullClassificationOutput;
  positions?: { positions: { party: string; position: string }[]; normalized: string[] };
  error?: { message: string };
}

const prepareAnnotations = async (c: Context) => {
  const requestId = `prepare-${Date.now()}`;

  try {
    const body: PrepareAnnotationsRequest = await c.req.json();

    const { parsedDocument, comments, highlights, trackChanges, recitals } = body;

    if (!parsedDocument?.structure) {
      return c.json(
        {
          success: false,
          error: { message: 'Missing required field: parsedDocument.structure' },
        },
        400
      );
    }

    logger.info(
      {
        requestId,
        comments: comments?.length || 0,
        highlights: highlights?.length || 0,
        trackChanges: trackChanges?.wordLevelTrackChanges?.length || 0,
      },
      'Annotation Prepare: Starting'
    );

    // Build trackChanges with required summary
    const normalizedTrackChanges: TrackChangeExtractionResults = {
      wordLevelTrackChanges: trackChanges?.wordLevelTrackChanges || [],
      fullSentenceDeletions: trackChanges?.fullSentenceDeletions || [],
      fullSentenceInsertions: trackChanges?.fullSentenceInsertions || [],
      structuralChanges: trackChanges?.structuralChanges || [],
      summary: trackChanges?.summary || {
        totalSentencesWithChanges: 0,
        totalFullSentenceDeletions: 0,
        totalFullSentenceInsertions: 0,
        totalDeletions: 0,
        totalInsertions: 0,
        totalSectionsDeleted: 0,
        totalSectionsInserted: 0,
      },
    };

    // Normalize annotations
    const annotations = normalizeAnnotations(
      comments || [],
      highlights || [],
      normalizedTrackChanges
    );

    if (annotations.length === 0) {
      return c.json({
        success: true,
        classificationResult: {
          results: [],
          summary: {
            total: 0,
            byCategory: { S: 0, Q: 0, E: 0 },
            conditional: 0,
            unconditional: 0,
          },
        },
      });
    }

    // Assign original indices
    for (let i = 0; i < annotations.length; i++) {
      const annotation = annotations[i];
      if (annotation) {
        annotation.originalIndex = i + 1;
      }
    }

    // Run classification and position extraction in parallel
    const [classificationResult, positionsResult] = await Promise.all([
      classifyAnnotationsFull(annotations, parsedDocument.structure, requestId),
      recitals ? extractPositionsFromRecitals(recitals) : Promise.resolve({ positions: [], normalized: [] }),
    ]);

    logger.info(
      {
        requestId,
        total: classificationResult.summary.total,
        byCategory: classificationResult.summary.byCategory,
        conditional: classificationResult.summary.conditional,
        positions: positionsResult.normalized,
      },
      'Annotation Prepare: Complete'
    );

    return c.json({
      success: true,
      classificationResult,
      positions: positionsResult,
    });
  } catch (error) {
    logger.error(
      {
        requestId,
        error: error instanceof Error ? error.message : error,
      },
      'Annotation Prepare: Failed'
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

export const annotationPrepareController = {
  prepareAnnotations,
};