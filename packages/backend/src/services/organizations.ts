import { db } from '@/config/database'
import {
  organizations,
  organizationPlaybooks,
  type Organization,
  type NewOrganization,
  type OrganizationPlaybook,
  type NewOrganizationPlaybook,
} from '@/db/schema/organizations'
import { playbooks, type NewPlaybook } from '@/db/schema/tables'
import { eq, and } from 'drizzle-orm'
import { logger } from '@/config/logger'

export class OrganizationService {
  /**
   * Get or create organization by email domain
   */
  async getOrCreateByDomain(domain: string, name?: string): Promise<Organization> {
    // Extract domain from email if full email provided
    const cleanDomain = domain.includes('@') ? domain.split('@')[1] : domain

    // Try to find existing organization
    const [existing] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.domain, cleanDomain))
      .limit(1)

    if (existing) {
      return existing
    }

    // Create new organization
    const orgName = name || cleanDomain.split('.')[0].charAt(0).toUpperCase() + cleanDomain.split('.')[0].slice(1) + ' Organization'
    
    const [newOrg] = await db
      .insert(organizations)
      .values({
        domain: cleanDomain,
        name: orgName,
      })
      .returning()

    if (!newOrg) {
      throw new Error('Failed to create organization')
    }

    logger.info({ organizationId: newOrg.id, domain: cleanDomain }, 'Created new organization')

    // Seed default playbooks for new organization
    await this.seedDefaultPlaybooks(newOrg.id)

    return newOrg
  }

  /**
   * Get organization by ID
   */
  async getOrganization(organizationId: string): Promise<Organization | null> {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    return org || null
  }

  /**
   * Get organization by domain
   */
  async getOrganizationByDomain(domain: string): Promise<Organization | null> {
    const cleanDomain = domain.includes('@') ? domain.split('@')[1] : domain

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.domain, cleanDomain))
      .limit(1)

    return org || null
  }

  /**
   * Seed default playbooks for an organization
   */
  async seedDefaultPlaybooks(organizationId: string): Promise<void> {
    const defaultPlaybooks = [
      {
        playbookName: 'General Contract Review',
        description: 'Standard contract review checklist for general agreements',
        playbookType: 'review',
        userPosition: 'Neutral',
        rules: {
          sections: [
            {
              name: 'General Terms',
              rules: [
                {
                  type: 'instruction_request',
                  briefName: 'Review governing law',
                  instruction: 'Check that governing law clause is appropriate for the transaction',
                },
              ],
            },
          ],
        },
      },
      {
        playbookName: 'NDA Review',
        description: 'Non-disclosure agreement review guide',
        playbookType: 'review',
        userPosition: 'Neutral',
        rules: {
          sections: [
            {
              name: 'Confidentiality',
              rules: [
                {
                  type: 'instruction_request',
                  briefName: 'Review definition of confidential information',
                  instruction: 'Ensure definition of confidential information is not overly broad',
                },
              ],
            },
          ],
        },
      },
      {
        playbookName: 'Employment Agreement Review',
        description: 'Employment contract review template',
        playbookType: 'review',
        userPosition: 'Neutral',
        rules: {
          sections: [
            {
              name: 'Compensation',
              rules: [
                {
                  type: 'instruction_request',
                  briefName: 'Review compensation terms',
                  instruction: 'Verify compensation structure is clearly defined',
                },
              ],
            },
          ],
        },
      },
    ]

    // Create playbooks for ThinkDoc (system user) or use a special system user ID
    // For now, we'll need to handle this - ideally there's a system user
    // For MVP, we can create these as organization-owned playbooks
    // Note: This requires a system user or we need to adjust the schema
    
    logger.info({ organizationId, count: defaultPlaybooks.length }, 'Seeding default playbooks')
    
    // TODO: Create playbooks with a system user ID or adjust schema to allow org-owned playbooks
    // For now, this is a placeholder - the actual implementation will depend on how we handle system playbooks
  }

  /**
   * Get organization playbooks (including defaults)
   */
  async getOrganizationPlaybooks(organizationId: string): Promise<OrganizationPlaybook[]> {
    return await db
      .select()
      .from(organizationPlaybooks)
      .where(eq(organizationPlaybooks.organizationId, organizationId))
  }

  /**
   * Add playbook to organization
   */
  async addPlaybookToOrganization(
    organizationId: string,
    playbookId: string,
    isDefault: boolean = false
  ): Promise<OrganizationPlaybook> {
    const [orgPlaybook] = await db
      .insert(organizationPlaybooks)
      .values({
        organizationId,
        playbookId,
        isDefault,
      })
      .returning()

    if (!orgPlaybook) {
      throw new Error('Failed to add playbook to organization')
    }

    return orgPlaybook
  }
}

export const organizationService = new OrganizationService()

