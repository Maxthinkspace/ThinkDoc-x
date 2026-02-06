import { z } from 'zod';

export const documentNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    sectionNumber: z.string(),
    text: z.string(),
    level: z.number().int().min(0),
    additionalParagraphs: z.array(z.string()).optional(),
    children: z.array(documentNodeSchema).optional(),
  })
);

export const parsedDocumentSchema = z.object({
  recitals: z.string(),
  structure: z.array(documentNodeSchema),
});

export const reviewWithPrecedentsRequestSchema = z.object({
  originalDocument: parsedDocumentSchema,
  referenceDocument: parsedDocumentSchema,
  debug: z.string().optional(),
});

export const formattedAmendmentSchema = z.object({
  change_type: z.enum(['addition', 'deletion']),
  original_section: z.string(),
  reference_section: z.string().nullable(),  
  original_language: z.string(),
  amended_language: z.string(),
});

export const reviewWithPrecedentsResponseSchema = z.object({
  success: z.boolean(),
  formattedResults: z.array(formattedAmendmentSchema),  
});

export type DocumentNode = z.infer<typeof documentNodeSchema>;
export type ParsedDocument = z.infer<typeof parsedDocumentSchema>;
export type CompleteReviewRequest = z.infer<typeof reviewWithPrecedentsRequestSchema>;
export type CompleteReviewResponse = z.infer<typeof reviewWithPrecedentsResponseSchema>;
export type FormattedAmendment = z.infer<typeof formattedAmendmentSchema>;