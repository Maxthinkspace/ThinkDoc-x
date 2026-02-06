import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { llmService } from '@/services/llm';
import { llmConfig } from '@/config/llm';
import type { Message } from '@/types/llm';
import { authMiddleware } from '@/middleware/auth';
import { subscriptionMiddleware } from '@/middleware/subscription';

const llmRoutes = new Hono();

// Apply auth and subscription middleware to all LLM routes
llmRoutes.use(authMiddleware());
//llmRoutes.use(subscriptionMiddleware());

const generateSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google', 'openrouter', 'ollama', 'azure']),
  model: z.string(),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  stream: z.boolean().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
});

// Generate text endpoint
llmRoutes.post('/generate', zValidator('json', generateSchema), async (c) => {
  try {
    const {
      provider,
      model,
      messages,
      temperature,
      maxTokens,
      apiKey,
      baseUrl,
    } = c.req.valid('json');

    const providerDefaults = {
      openai: { apiKey: llmConfig.OPENAI_API_KEY, baseUrl: llmConfig.OPENAI_BASE_URL },
      anthropic: { apiKey: llmConfig.ANTHROPIC_API_KEY, baseUrl: llmConfig.ANTHROPIC_BASE_URL },
      google: { apiKey: llmConfig.GOOGLE_API_KEY, baseUrl: llmConfig.GOOGLE_BASE_URL },
      openrouter: { apiKey: llmConfig.OPENROUTER_API_KEY, baseUrl: llmConfig.OPENROUTER_BASE_URL },
      ollama: { apiKey: undefined, baseUrl: llmConfig.OLLAMA_BASE_URL },
      azure: { apiKey: llmConfig.AZURE_OPENAI_API_KEY, baseUrl: llmConfig.AZURE_OPENAI_ENDPOINT },
    } as const;

    const resolvedApiKey = apiKey ?? providerDefaults[provider].apiKey;
    const resolvedBaseUrl = baseUrl ?? providerDefaults[provider].baseUrl;

    console.log(resolvedApiKey, resolvedBaseUrl)

    const options = {
      model: {
        provider,
        model,
        ...(resolvedApiKey ? { apiKey: resolvedApiKey } : {}),
        ...(resolvedBaseUrl ? { baseUrl: resolvedBaseUrl } : {}),
      },
      messages: messages as Message[],
      ...(temperature !== undefined ? { temperature } : {}),
      ...(maxTokens !== undefined ? { maxTokens } : {}),
    };

    const result = await llmService.generate(options);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('LLM generation error:', error);

    return c.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to generate text',
        code: 'GENERATION_ERROR',
      },
    }, 500);
  }
});

// Stream text endpoint
llmRoutes.post('/stream', zValidator('json', generateSchema), async (c) => {
  try {
    const {
      provider,
      model,
      messages,
      temperature,
      maxTokens,
      apiKey,
      baseUrl,
    } = c.req.valid('json');

    const providerDefaults = {
      openai: { apiKey: llmConfig.OPENAI_API_KEY, baseUrl: llmConfig.OPENAI_BASE_URL },
      anthropic: { apiKey: llmConfig.ANTHROPIC_API_KEY, baseUrl: llmConfig.ANTHROPIC_BASE_URL },
      google: { apiKey: llmConfig.GOOGLE_API_KEY, baseUrl: llmConfig.GOOGLE_BASE_URL },
      openrouter: { apiKey: llmConfig.OPENROUTER_API_KEY, baseUrl: llmConfig.OPENROUTER_BASE_URL },
      ollama: { apiKey: undefined, baseUrl: llmConfig.OLLAMA_BASE_URL },
      azure: { apiKey: llmConfig.AZURE_OPENAI_API_KEY, baseUrl: llmConfig.AZURE_OPENAI_ENDPOINT },
    } as const;

    const resolvedApiKey = apiKey ?? providerDefaults[provider].apiKey;
    const resolvedBaseUrl = baseUrl ?? providerDefaults[provider].baseUrl;

    const options = {
      model: {
        provider,
        model,
        ...(resolvedApiKey ? { apiKey: resolvedApiKey } : {}),
        ...(resolvedBaseUrl ? { baseUrl: resolvedBaseUrl } : {}),
      },
      messages: messages as Message[],
      ...(temperature !== undefined ? { temperature } : {}),
      ...(maxTokens !== undefined ? { maxTokens } : {}),
    };

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of llmService.generateStream(options)) {
            const data = `data: ${JSON.stringify(chunk)}\\n\\n`;
            controller.enqueue(new TextEncoder().encode(data));
          }
          controller.close();
        } catch (error) {
          const errorData = `data: ${JSON.stringify({
            error: {
              message: error instanceof Error ? error.message : 'Stream error',
              code: 'STREAM_ERROR',
            },
          })}\\n\\n`;
          controller.enqueue(new TextEncoder().encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('LLM streaming error:', error);

    return c.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to stream text',
        code: 'STREAM_ERROR',
      },
    }, 500);
  }
});

// Get available models endpoint
llmRoutes.get('/models', async (c) => {
  const models = {
    openai: [
      'o3',
      'o3-mini',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
    ],
    anthropic: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
    google: [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro',
    ],
    openrouter: [
      'anthropic/claude-sonnet-4',
      'openai/gpt-4o',
      'openai/o3',
      'google/gemini-pro-1.5',
      'meta-llama/llama-3.1-405b',
      'mistralai/mistral-large',
    ],
    ollama: [
      'llama3.1',
      'llama3.1:70b',
      'llama3.1:405b',
      'qwen2.5',
      'codellama',
      'mistral',
    ],
    azure: [
      'gpt-4o',
      'o3',
      'o3-mini',
    ],
  };

  return c.json({
    success: true,
    data: models,
  });
});

export { llmRoutes };
