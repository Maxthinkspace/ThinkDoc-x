import { z } from 'zod';
import { env } from './env';

export const tavilyConfigSchema = z.object({
  TAVILY_API_KEY: z.string().optional(),
  TAVILY_BASE_URL: z.string().default('https://api.tavily.com'),
});

export const tavilyConfig = tavilyConfigSchema.parse({
  TAVILY_API_KEY: env.TAVILY_API_KEY,
  TAVILY_BASE_URL: process.env.TAVILY_BASE_URL || 'https://api.tavily.com',
});

export type TavilyConfig = z.infer<typeof tavilyConfigSchema>;

