import { z } from 'zod'

const sectionNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    sectionNumber: z.string(),
    text: z.string(),
    level: z.number(),
    additionalParagraphs: z.array(z.string()).optional(),
    children: z.array(sectionNodeSchema).optional(),
    rules: z.array(z.string()).optional(),
  })
)

const ruleSchema = z.object({
  id: z.string(),
  content: z.string(),
  example: z.string().optional(),
})

const irRuleSchema = z.object({
  id: z.string(),
  content: z.string(),
})

export const generateAmendmentsRequestSchema = z.object({
  sectionNumber: z.string(),
  sectionText: z.string(),
  lockedParents: z.array(z.string()),
  rules: z.array(ruleSchema),
})

export const reviewWithPlaybooksRequestSchema = z.object({
  structure: z.array(sectionNodeSchema),
  rules: z.array(ruleSchema),
})

export const explainUnappliedRuleRequestSchema = z.object({
  sectionText: z.string(),
  rule: ruleSchema,
})

export const handleMissingLanguageRequestSchema = z.object({
  rule: z.string(),
  exampleLanguage: z.string(),
  documentOutline: z.array(sectionNodeSchema), 
  fullDocumentText: z.string()
})

export const rerunAmendmentsRequestSchema = z.object({
  sections: z.array(z.object({
    sectionNumber: z.string(),
    sectionText: z.string(),
    lockedParents: z.array(z.string()).optional().default([]),
    rules: z.array(ruleSchema).min(1),
    previousAttempts: z.array(z.string()).min(1),  // Each: amended text OR "noChanges: true"
    currentMappedSections: z.array(z.string()).optional().default([]),
  })),
  structure: z.array(sectionNodeSchema),
})

export const rerunInstructionRequestsRequestSchema = z.object({
  sections: z.array(z.object({
    sectionNumber: z.string(),
    sectionText: z.string(),
    rules: z.array(irRuleSchema).min(1),
    previousAttempts: z.array(z.string()).min(1),  // Each: the "issue" text from previous response
    currentMappedSections: z.array(z.string()).optional().default([]),
  })),
  structure: z.array(sectionNodeSchema),
})