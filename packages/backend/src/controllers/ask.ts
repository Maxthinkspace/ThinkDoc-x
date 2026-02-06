import type { Context } from 'hono';
import { askService } from '@/services/ask';
import { askRequestSchema, type AskRequest } from '@/schemas/ask';
import { logger } from '@/config/logger';
import { getUserId } from '@/middleware/auth';
import { ZodError, z } from 'zod';

/**
 * Handle streaming ask request
 */
export async function handleAskStream(c: Context) {
  try {
    // Check authentication first
    const user = c.get('user');
    if (!user?.id) {
      return c.json(
        {
          success: false,
          error: {
            message: 'Authentication required',
          },
        },
        401
      );
    }
    const userId = user.id;
    
    // Request is already validated by zValidator middleware
    // TypeScript doesn't infer the validated type from zValidator middleware
    // We need to assert the type since zValidator ensures it matches the schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawRequest = (c.req as any).valid('json') as z.infer<typeof askRequestSchema>;
    
    // Construct request ensuring conversationHistory is either present or omitted (not undefined)
    // This satisfies exactOptionalPropertyTypes requirement
    const validatedRequest = {
      question: rawRequest.question,
      sourceConfig: rawRequest.sourceConfig,
      ...(rawRequest.conversationHistory ? { conversationHistory: rawRequest.conversationHistory } : {}),
    } as AskRequest;

    logger.info(
      { userId, question: validatedRequest.question, sourceConfig: validatedRequest.sourceConfig },
      'Ask: Starting streaming request'
    );

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          // Emit SSE events from ask service
          // Type assertion needed due to exactOptionalPropertyTypes mismatch between Zod schema and interface
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for await (const event of askService.processAsk(validatedRequest as any, userId)) {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        } catch (error) {
          logger.error({ error }, 'Ask: Stream error');
          const errorEvent = {
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          };
          const data = `data: ${JSON.stringify(errorEvent)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error) {
    logger.error({ error }, 'Ask: Request validation error');
    
    if (error instanceof ZodError) {
      return c.json(
        {
          success: false,
          error: {
            message: 'Invalid request format',
            details: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
          },
        },
        400
      );
    }

    return c.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to process ask request',
        },
      },
      500
    );
  }
}

