import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from '@/config/logger';
import { db } from '@/config/database';
import { organizationIntegrations } from '@/db/schema/organizations';
import { organizationService } from '@/services/organizations';
import { eq, and } from 'drizzle-orm';
import { updateIntegrationSchema, integrationTypeSchema } from '@/schemas/integrations';

export const integrationsController = {
  /**
   * Get all integrations for the current user's organization
   */
  async list(c: Context) {
    try {
      const user = c.get('user');
      if (!user?.id || !user?.email) {
        throw new HTTPException(401, { message: 'Authentication required' });
      }

      // Get user's organization
      let org = await organizationService.getOrganizationByDomain(user.email);
      if (!org) {
        // Auto-create organization if it doesn't exist
        org = await organizationService.getOrCreateByDomain(user.email);
      }

      // Fetch all integrations for this organization
      const integrations = await db
        .select()
        .from(organizationIntegrations)
        .where(eq(organizationIntegrations.organizationId, org.id));

      // Transform to response format
      const response = integrations.map(integration => ({
        id: integration.id,
        integrationType: integration.integrationType,
        enabled: integration.enabled,
        config: integration.config || {},
        createdAt: integration.createdAt.toISOString(),
        updatedAt: integration.updatedAt.toISOString(),
      }));

      return c.json({ data: response });
    } catch (error) {
      logger.error({ error }, 'Failed to list integrations');
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(500, { message: 'Failed to fetch integrations' });
    }
  },

  /**
   * Update an integration (enable/disable and configure)
   */
  async update(c: Context) {
    try {
      const user = c.get('user');
      if (!user?.id || !user?.email) {
        throw new HTTPException(401, { message: 'Authentication required' });
      }

      const integrationType = c.req.param('type');
      if (!integrationType) {
        throw new HTTPException(400, { message: 'Integration type is required' });
      }

      // Validate integration type
      const typeValidation = integrationTypeSchema.safeParse(integrationType);
      if (!typeValidation.success) {
        throw new HTTPException(400, { 
          message: `Invalid integration type. Must be one of: imanage, imanage-onprem, sharepoint, googledrive` 
        });
      }

      // Get request body
      const body = await c.req.json();
      const validation = updateIntegrationSchema.safeParse(body);
      if (!validation.success) {
        throw new HTTPException(400, { 
          message: 'Invalid request body',
          cause: validation.error.errors 
        });
      }

      const { enabled, config } = validation.data;

      // Get user's organization
      let org = await organizationService.getOrganizationByDomain(user.email);
      if (!org) {
        // Auto-create organization if it doesn't exist
        org = await organizationService.getOrCreateByDomain(user.email);
      }

      // Check if integration already exists
      const [existing] = await db
        .select()
        .from(organizationIntegrations)
        .where(
          and(
            eq(organizationIntegrations.organizationId, org.id),
            eq(organizationIntegrations.integrationType, integrationType)
          )
        )
        .limit(1);

      let integration;
      if (existing) {
        // Update existing integration
        const [updated] = await db
          .update(organizationIntegrations)
          .set({
            enabled,
            config: config || existing.config || {},
            updatedAt: new Date(),
          })
          .where(eq(organizationIntegrations.id, existing.id))
          .returning();

        if (!updated) {
          throw new HTTPException(500, { message: 'Failed to update integration' });
        }
        integration = updated;
      } else {
        // Create new integration
        const [created] = await db
          .insert(organizationIntegrations)
          .values({
            organizationId: org.id,
            integrationType: integrationType,
            enabled,
            config: config || {},
          })
          .returning();

        if (!created) {
          throw new HTTPException(500, { message: 'Failed to create integration' });
        }
        integration = created;
      }

      // Transform to response format
      const response = {
        id: integration.id,
        organizationId: integration.organizationId,
        integrationType: integration.integrationType,
        enabled: integration.enabled,
        config: integration.config || {},
        createdAt: integration.createdAt.toISOString(),
        updatedAt: integration.updatedAt.toISOString(),
      };

      logger.info(
        { 
          userId: user.id, 
          organizationId: org.id, 
          integrationType, 
          enabled 
        },
        'Integration updated'
      );

      return c.json({ data: response });
    } catch (error) {
      logger.error({ error }, 'Failed to update integration');
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(500, { message: 'Failed to update integration' });
    }
  },
};

