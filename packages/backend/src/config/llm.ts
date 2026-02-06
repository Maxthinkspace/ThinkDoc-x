import { z } from 'zod';

export const llmConfigSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_BASE_URL: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  GOOGLE_BASE_URL: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().optional(),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_ENDPOINT: z.string().optional(),
  AZURE_OPENAI_API_VERSION: z.string().default('2024-08-01-preview'),
});

export const llmConfig = llmConfigSchema.parse({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  GOOGLE_BASE_URL: process.env.GOOGLE_BASE_URL,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
  AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION,
});

export type LLMConfig = z.infer<typeof llmConfigSchema>;