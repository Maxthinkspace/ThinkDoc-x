import { z } from 'zod';

export const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

export const askSourceConfigSchema = z.object({
  includeDocument: z.boolean(),
  documentContext: z.string().optional(),
  vaultFileIds: z.array(z.string().uuid()).optional(),
  // Legacy vault support (deprecated, use new library structure)
  vaultPlaybookIds: z.array(z.string().uuid()).optional(),
  vaultClauseIds: z.array(z.string().uuid()).optional(),
  // New library structure
  clauseIds: z.array(z.string().uuid()).optional(),
  clauseTagIds: z.array(z.string().uuid()).optional(),
  playbookIds: z.array(z.string().uuid()).optional(),
  projectIds: z.array(z.string().uuid()).optional(),
  enableWebSearch: z.boolean(),
  
  // NEW: Selection context fields
  /** Formatted selection context from Word (track changes, comments, plain text) */
  selectionContext: z.string().optional(),
  /** Session ID for document caching across requests */
  sessionId: z.string().uuid().optional(),
  /** Whether this is the first request in the session (triggers document caching) */
  isFirstRequest: z.boolean().optional(),
  /** Full document text - only sent on first request, then cached server-side */
  fullDocument: z.string().optional(),
});

export const askRequestSchema = z.object({
  question: z.string().min(1).max(5000),
  conversationHistory: z.array(messageSchema).optional(),
  sourceConfig: askSourceConfigSchema,
});

export type AskRequest = z.infer<typeof askRequestSchema>;
export type AskSourceConfig = z.infer<typeof askSourceConfigSchema>;
export type Message = z.infer<typeof messageSchema>;