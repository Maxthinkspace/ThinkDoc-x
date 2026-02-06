import { z } from 'zod';

export const translateRequestSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  sourceLanguage: z.string().min(2, 'Source language code is required'),
  targetLanguage: z.string().min(2, 'Target language code is required'),
});

export type TranslateRequest = z.infer<typeof translateRequestSchema>;

export const translateExportPdfRequestSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  fileName: z.string().optional(),
});

export type TranslateExportPdfRequest = z.infer<typeof translateExportPdfRequestSchema>;

