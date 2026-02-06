import type { Context } from 'hono';
import { logger } from '../config/logger';
import { createJob, setJobResult, setJobError } from '@/utils/jobStore';
import { draftWithInstructions } from '../services/drafting';
import type { DraftWithInstructionsBody } from '../services/drafting';

function parseDraftWithInstructionsRequest(body: any): DraftWithInstructionsBody {
  const { structure, instructions, selectedPrompts, conversationHistory, definitionSection } = body;

  if (!structure || !instructions) {
    throw new Error('Missing required fields: structure, instructions');
  }

  return {
    structure,
    instructions,
    selectedPrompts: selectedPrompts || [],
    conversationHistory: conversationHistory || [],
    definitionSection: definitionSection || undefined,
  };
}

export const draftWithInstructionsHandler = async (c: Context) => {
  try {
    const rawBody = await c.req.json();
    const body = parseDraftWithInstructionsRequest(rawBody);

    const user = c.get('user') as { id: string; email: string; name: string | null } | undefined;

    const jobId = createJob({
      userId: user?.id,
      userEmail: user?.email,
      jobType: 'drafting',
      jobName: 'Draft with Instructions',
    });

    logger.info(
      {
        jobId,
        structureSections: body.structure.length,
        instructionsLength: body.instructions.length,
        selectedPromptsCount: body.selectedPrompts.length,
      },
      'Drafting: Job created, starting background processing'
    );

    // Run workflow in background
    draftWithInstructions(body.structure, body.instructions, body.selectedPrompts, jobId, body.conversationHistory, body.definitionSection)
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
          'Drafting: Background job failed'
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
      'Drafting: Request validation failed'
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

export const draftingController = {
  draftWithInstructions: draftWithInstructionsHandler,
};
