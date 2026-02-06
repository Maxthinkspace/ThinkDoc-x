import { z } from 'zod';

// ============================================
// INTEGRATION TYPES
// ============================================

export const integrationTypeSchema = z.enum(['imanage', 'imanage-onprem', 'sharepoint', 'googledrive']);

// ============================================
// INTEGRATION CONFIG SCHEMAS
// ============================================

// iManage config
export const imanageConfigSchema = z.object({
  customerId: z.string().optional(),
  subdomain: z.string().url().optional(),
});

// SharePoint config
export const sharepointConfigSchema = z.object({
  resourceUrl: z.string().url().optional(),
});

// Google Drive config (no specific config needed for now)
export const googledriveConfigSchema = z.object({});

// Union of all config types
export const integrationConfigSchema = z.union([
  imanageConfigSchema,
  sharepointConfigSchema,
  googledriveConfigSchema,
]).or(z.record(z.unknown())); // Allow any JSONB structure

// ============================================
// REQUEST SCHEMAS
// ============================================

export const updateIntegrationSchema = z.object({
  enabled: z.boolean(),
  config: integrationConfigSchema.optional(),
});

export const getIntegrationsResponseSchema = z.array(
  z.object({
    id: z.string().uuid(),
    integrationType: integrationTypeSchema,
    enabled: z.boolean(),
    config: z.record(z.unknown()),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
);

export const updateIntegrationResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  integrationType: integrationTypeSchema,
  enabled: z.boolean(),
  config: z.record(z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type IntegrationType = z.infer<typeof integrationTypeSchema>;
export type UpdateIntegrationRequest = z.infer<typeof updateIntegrationSchema>;
export type GetIntegrationsResponse = z.infer<typeof getIntegrationsResponseSchema>;
export type UpdateIntegrationResponse = z.infer<typeof updateIntegrationResponseSchema>;

