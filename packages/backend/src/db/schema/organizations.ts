import { pgTable, text, timestamp, uuid, boolean, index, jsonb, unique } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { relations } from 'drizzle-orm'
import { users, playbooks } from './tables'

// ============================================
// ORGANIZATIONS
// ============================================

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  domain: text('domain').notNull().unique(), // e.g., "company.com"
  name: text('name').notNull(), // Auto-generated or set by admin
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  domainIdx: index('organizations_domain_idx').on(table.domain),
}))

// ============================================
// TEAMS
// ============================================

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  organizationIdIdx: index('teams_organization_id_idx').on(table.organizationId),
  ownerIdIdx: index('teams_owner_id_idx').on(table.ownerId),
}))

// ============================================
// TEAM MEMBERS
// ============================================

export const teamMembers = pgTable('team_members', {
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'), // 'admin' | 'member'
  invitedByUserId: uuid('invited_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  teamIdIdx: index('team_members_team_id_idx').on(table.teamId),
  userIdIdx: index('team_members_user_id_idx').on(table.userId),
  uniqueMember: index('team_members_unique_idx').on(table.teamId, table.userId),
}))

// ============================================
// TEAM SHARES
// ============================================

export const teamShares = pgTable('team_shares', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  resourceType: text('resource_type').notNull(), // 'clause' | 'project' | 'playbook' | 'chat_session' | 'document'
  resourceId: uuid('resource_id').notNull(),
  permission: text('permission').notNull().default('view'), // 'view' | 'use' | 'edit' | 'remix' | 'admin'
  sharedByUserId: uuid('shared_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  teamIdIdx: index('team_shares_team_id_idx').on(table.teamId),
  resourceIdx: index('team_shares_resource_idx').on(table.resourceType, table.resourceId),
  sharedByIdx: index('team_shares_shared_by_idx').on(table.sharedByUserId),
}))

// ============================================
// ORGANIZATION DEFAULT PLAYBOOKS
// ============================================

export const organizationPlaybooks = pgTable('organization_playbooks', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  playbookId: uuid('playbook_id').notNull().references(() => playbooks.id, { onDelete: 'cascade' }),
  isDefault: boolean('is_default').default(false), // True for ThinkDoc-provided
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  organizationIdIdx: index('organization_playbooks_org_id_idx').on(table.organizationId),
  playbookIdIdx: index('organization_playbooks_playbook_id_idx').on(table.playbookId),
}))

// ============================================
// ORGANIZATION INTEGRATIONS
// ============================================

export const organizationIntegrations = pgTable('organization_integrations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  integrationType: text('integration_type').notNull(), // 'imanage', 'imanage-onprem', 'sharepoint', 'googledrive'
  enabled: boolean('enabled').notNull().default(false),
  config: jsonb('config').default('{}').notNull(), // Store subdomain, customerId, resourceUrl, etc.
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  organizationIdIdx: index('organization_integrations_org_id_idx').on(table.organizationId),
  integrationTypeIdx: index('organization_integrations_type_idx').on(table.integrationType),
  uniqueOrgIntegration: unique('organization_integrations_unique').on(table.organizationId, table.integrationType),
}))

// ============================================
// RELATIONS
// ============================================

export const organizationsRelations = relations(organizations, ({ many }) => ({
  teams: many(teams),
  playbooks: many(organizationPlaybooks),
  integrations: many(organizationIntegrations),
}))

export const teamsRelations = relations(teams, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [teams.organizationId],
    references: [organizations.id],
  }),
  owner: one(users, {
    fields: [teams.ownerId],
    references: [users.id],
  }),
  members: many(teamMembers),
  shares: many(teamShares),
}))

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}))

export const teamSharesRelations = relations(teamShares, ({ one }) => ({
  team: one(teams, {
    fields: [teamShares.teamId],
    references: [teams.id],
  }),
  sharedBy: one(users, {
    fields: [teamShares.sharedByUserId],
    references: [users.id],
  }),
}))

// ============================================
// TYPE EXPORTS
// ============================================

export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert

export type Team = typeof teams.$inferSelect
export type NewTeam = typeof teams.$inferInsert

export type TeamMember = typeof teamMembers.$inferSelect
export type NewTeamMember = typeof teamMembers.$inferInsert

export type TeamShare = typeof teamShares.$inferSelect
export type NewTeamShare = typeof teamShares.$inferInsert

export type OrganizationPlaybook = typeof organizationPlaybooks.$inferSelect
export type NewOrganizationPlaybook = typeof organizationPlaybooks.$inferInsert

export type OrganizationIntegration = typeof organizationIntegrations.$inferSelect
export type NewOrganizationIntegration = typeof organizationIntegrations.$inferInsert

