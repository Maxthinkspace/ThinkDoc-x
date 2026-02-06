import { z } from 'zod';

// ============================================
// COLUMN CONFIGURATION
// ============================================

export const columnTypeSchema = z.enum(['free-response', 'date', 'classification', 'verbatim', 'duration', 'currency', 'number']);

export const columnConfigSchema = z.object({
  id: z.string().min(1),
  type: columnTypeSchema,
  name: z.string().min(1).max(255),
  query: z.string().min(1).max(2000),
  classificationOptions: z.array(z.string()).optional(),
});

// ============================================
// PROJECT SCHEMAS
// ============================================

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  description: z.string().max(1000).optional(),
  clientMatter: z.string().max(255).optional(),
  visibility: z.enum(['private', 'shared']).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(1000).optional(),
  clientMatter: z.string().max(255).optional(),
  visibility: z.enum(['private', 'shared']).optional(),
});

// ============================================
// FILE SCHEMAS
// ============================================

export const fileUploadMetadataSchema = z.object({
  category: z.string().max(100).optional(),
});

// ============================================
// COLUMN GENERATION SCHEMAS
// ============================================

export const generateColumnsRequestSchema = z.object({
  prompt: z.string().min(10).max(5000),
  existingColumns: z.array(columnConfigSchema).optional(),
});

export const generateColumnsResponseSchema = z.object({
  success: z.boolean(),
  columns: z.array(columnConfigSchema),
});

// ============================================
// EXTRACTION SCHEMAS
// ============================================

export const queryTypeSchema = z.enum(['review', 'ask']);

export const runExtractionRequestSchema = z.object({
  projectId: z.string().uuid(),
  fileIds: z.array(z.string().uuid()).min(1).max(100),
  columns: z.array(columnConfigSchema).min(1).max(50),
  queryType: queryTypeSchema,
  queryText: z.string().max(5000).optional(),
});

export const askQueryRequestSchema = z.object({
  projectId: z.string().uuid(),
  fileIds: z.array(z.string().uuid()).min(1).max(100),
  question: z.string().min(1).max(5000),
});

// ============================================
// EXTRACTION RESULT SCHEMAS
// ============================================

export const extractionColumnResultSchema = z.object({
  value: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  sourceText: z.string().optional(),
  sourceLocation: z.string().optional(),
  pageNumber: z.number().int().positive().optional(),
  highlightBox: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      pageWidth: z.number(),
      pageHeight: z.number(),
      pageNumber: z.number().int().positive().optional(),
    })
    .optional(),
});

export const extractionResultSchema = z.object({
  fileId: z.string().uuid(),
  fileName: z.string(),
  columns: z.record(z.string(), extractionColumnResultSchema),
});

// ============================================
// RESPONSE SCHEMAS
// ============================================

export const jobResponseSchema = z.object({
  success: z.boolean(),
  jobId: z.string(),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.string().optional(),
  code: z.string().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type ColumnType = z.infer<typeof columnTypeSchema>;
export type ColumnConfig = z.infer<typeof columnConfigSchema>;
export type CreateProjectRequest = z.infer<typeof createProjectSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectSchema>;
export type GenerateColumnsRequest = z.infer<typeof generateColumnsRequestSchema>;
export type RunExtractionRequest = z.infer<typeof runExtractionRequestSchema>;
export type AskQueryRequest = z.infer<typeof askQueryRequestSchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;
export type ExtractionColumnResult = z.infer<typeof extractionColumnResultSchema>;
