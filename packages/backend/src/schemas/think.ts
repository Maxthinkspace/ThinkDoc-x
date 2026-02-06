import { z } from 'zod';

// Clause-level think intents
export const thinkIntentClauseSchema = z.enum(['risk', 'compare', 'explain', 'translate']);

// Document-level think intents
export const thinkIntentDocumentSchema = z.enum(['overview', 'key_risks', 'regulatory', 'inconsistencies']);

// Draft intents
export const draftIntentSchema = z.enum(['buyer', 'seller', 'fallback', 'clean']);

// Annotations schema
export const annotationsSchema = z.object({
  trackChanges: z.array(z.object({
    type: z.enum(['insertion', 'deletion']),
    text: z.string(),
    author: z.string().optional(),
  })).optional(),
  comments: z.array(z.object({
    text: z.string(),
    author: z.string().optional(),
    replies: z.array(z.string()).optional(),
  })).optional(),
  highlights: z.array(z.object({
    text: z.string(),
    color: z.string().optional(),
  })).optional(),
}).optional();

// Source config schema
export const sourceConfigSchema = z.object({
  includeDocument: z.boolean().optional(),
  enableWebSearch: z.boolean().optional(),
  vaultClauses: z.array(z.string()).optional(),
  vaultPlaybooks: z.array(z.string()).optional(),
  vaultStandards: z.array(z.string()).optional(),
  uploadedFiles: z.array(z.object({
    id: z.string(),
    name: z.string(),
    content: z.string(),
  })).optional(),
  importedSources: z.array(z.object({
    id: z.string(),
    type: z.enum(['imanage', 'googledrive', 'sharepoint']),
    name: z.string(),
    content: z.string(),
    sourceId: z.string().optional(),
  })).optional(),
}).optional();

// Think clause request
export const thinkClauseRequestSchema = z.object({
  intent: thinkIntentClauseSchema,
  clauseText: z.string().min(1, 'Clause text is required'),
  annotations: annotationsSchema,
  sourceConfig: sourceConfigSchema,
});

// Think document request
export const thinkDocumentRequestSchema = z.object({
  intent: thinkIntentDocumentSchema,
  docContext: z.object({
    title: z.string().optional(),
    summary: z.string().optional(),
    outline: z.array(z.string()).optional(),
  }),
  sourceConfig: sourceConfigSchema,
});

// Draft request
export const draftRequestSchema = z.object({
  intent: draftIntentSchema,
  clauseText: z.string().min(1, 'Clause text is required'),
  annotations: annotationsSchema,
  sourceConfig: sourceConfigSchema,
});

export type ThinkClauseRequest = z.infer<typeof thinkClauseRequestSchema>;
export type ThinkDocumentRequest = z.infer<typeof thinkDocumentRequestSchema>;
export type DraftRequest = z.infer<typeof draftRequestSchema>;

