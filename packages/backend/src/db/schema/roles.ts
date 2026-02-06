import { pgTable, text, timestamp, uuid, jsonb, boolean, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './tables'
import { organizations } from './organizations'

// ============================================
// ROLES
// ============================================

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull().unique(),
  description: text('description'),
  permissions: jsonb('permissions').notNull().default('[]'),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('roles_name_idx').on(table.name),
}))

// ============================================
// USER ROLES (Many-to-Many)
// ============================================

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_roles_user_id_idx').on(table.userId),
  roleIdIdx: index('user_roles_role_id_idx').on(table.roleId),
  organizationIdIdx: index('user_roles_organization_id_idx').on(table.organizationId),
  uniqueUserRoleOrg: index('user_roles_unique_idx').on(table.userId, table.roleId, table.organizationId),
}))

// ============================================
// TYPE EXPORTS
// ============================================

export type Role = typeof roles.$inferSelect
export type NewRole = typeof roles.$inferInsert
export type UserRole = typeof userRoles.$inferSelect
export type NewUserRole = typeof userRoles.$inferInsert


