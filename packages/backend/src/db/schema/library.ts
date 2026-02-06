import { pgTable, text, timestamp, uuid, jsonb, boolean, index, integer } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { relations } from 'drizzle-orm'
import { users } from './tables'

// ============================================
// SHARED INFRASTRUCTURE
// ============================================

// Hierarchical Tags
export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Tag identity
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  color: text('color').default('#6B7280'),
  icon: text('icon'),
  
  // Hierarchy
  parentId: uuid('parent_id').references(() => tags.id, { onDelete: 'set null' }),
  path: text('path').notNull(),
  level: integer('level').notNull().default(0),
  
  // Scope
  scope: text('scope').notNull().default('all'), // 'all', 'clauses', 'projects', 'playbooks'
  isSystem: boolean('is_system').default(false),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('tags_user_id_idx').on(table.userId),
  parentIdIdx: index('tags_parent_id_idx').on(table.parentId),
  slugIdx: index('tags_slug_idx').on(table.userId, table.slug),
  scopeIdx: index('tags_scope_idx').on(table.scope),
}))

// Labels for simple classification
export const labels = pgTable('labels', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  name: text('name').notNull(),
  color: text('color').notNull().default('#6B7280'),
  category: text('category').notNull(), // 'risk_level', 'status', 'priority', 'jurisdiction', 'position'
  sortOrder: integer('sort_order').default(0),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('labels_user_id_idx').on(table.userId),
  categoryIdx: index('labels_category_idx').on(table.category),
  uniqueLabel: index('labels_unique_idx').on(table.userId, table.category, table.name),
}))

// ============================================
// CLAUSE LIBRARY
// ============================================

export const clauses = pgTable('clauses', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Core content
  name: text('name').notNull(),
  description: text('description'),
  currentVersionId: uuid('current_version_id'),
  
  // Classification
  clauseType: text('clause_type'), // 'standard', 'fallback', 'aggressive', 'neutral', 'alternative'
  jurisdiction: text('jurisdiction'),
  language: text('language').default('en'),
  
  // Source tracking
  sourceType: text('source_type'), // 'manual', 'extracted', 'generated', 'imported'
  sourceDocumentName: text('source_document_name'),
  sourcePlaybookId: uuid('source_playbook_id'),
  sourceRuleId: text('source_rule_id'),
  
  // Sharing & visibility
  visibility: text('visibility').default('private'), // 'private', 'shared', 'public'
  
  // Usage stats
  useCount: integer('use_count').default(0),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  
  // Search optimization
  searchVector: text('search_vector'), // TSVECTOR - will be managed via triggers
  
  // Metadata
  metadata: jsonb('metadata'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('clauses_user_id_idx').on(table.userId),
  visibilityIdx: index('clauses_visibility_idx').on(table.visibility),
  clauseTypeIdx: index('clauses_clause_type_idx').on(table.clauseType),
  jurisdictionIdx: index('clauses_jurisdiction_idx').on(table.jurisdiction),
  sourcePlaybookIdx: index('clauses_source_playbook_idx').on(table.sourcePlaybookId),
}))

export const clauseVersions = pgTable('clause_versions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  clauseId: uuid('clause_id').notNull().references(() => clauses.id, { onDelete: 'cascade' }),
  
  // Version info
  versionNumber: integer('version_number').notNull(),
  previousVersionId: uuid('previous_version_id').references(() => clauseVersions.id),
  
  // Content
  text: text('text').notNull(),
  summary: text('summary'),
  
  // Change tracking
  changeType: text('change_type'), // 'created', 'edited', 'restored', 'merged'
  changeDescription: text('change_description'),
  changedBy: uuid('changed_by').references(() => users.id),
  
  // Comparison data
  diffFromPrevious: jsonb('diff_from_previous'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  clauseIdIdx: index('clause_versions_clause_id_idx').on(table.clauseId),
  versionNumberIdx: index('clause_versions_version_number_idx').on(table.clauseId, table.versionNumber),
}))

// ============================================
// PLAYBOOK LIBRARY (Enhanced)
// ============================================

export const playbooksNew = pgTable('playbooks_new', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Core info
  name: text('name').notNull(),
  description: text('description'),
  
  // Classification
  playbookType: text('playbook_type'), // 'review', 'draft', 'negotiate', 'compliance'
  userPosition: text('user_position'), // 'neutral', 'buyer', 'seller', 'landlord', 'tenant'
  jurisdiction: text('jurisdiction'),
  documentTypes: jsonb('document_types'), // Array of applicable doc types
  
  // Version tracking
  currentVersionId: uuid('current_version_id'),
  
  // Sharing
  visibility: text('visibility').default('private'),
  
  // Stats
  useCount: integer('use_count').default(0),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  ruleCount: integer('rule_count').default(0),
  
  // Search
  searchVector: text('search_vector'),
  
  // Metadata
  metadata: jsonb('metadata'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('playbooks_new_user_id_idx').on(table.userId),
  typeIdx: index('playbooks_new_type_idx').on(table.playbookType),
  jurisdictionIdx: index('playbooks_new_jurisdiction_idx').on(table.jurisdiction),
  visibilityIdx: index('playbooks_new_visibility_idx').on(table.visibility),
}))

export const playbookVersions = pgTable('playbook_versions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  playbookId: uuid('playbook_id').notNull().references(() => playbooksNew.id, { onDelete: 'cascade' }),
  
  // Version info
  versionNumber: integer('version_number').notNull(),
  previousVersionId: uuid('previous_version_id').references(() => playbookVersions.id),
  
  // Snapshot of rules at this version
  rulesSnapshot: jsonb('rules_snapshot').notNull(),
  
  // Change tracking
  changeType: text('change_type'), // 'created', 'rules_added', 'rules_removed', 'rules_modified', 'restored'
  changeDescription: text('change_description'),
  changedBy: uuid('changed_by').references(() => users.id),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  playbookIdIdx: index('playbook_versions_playbook_id_idx').on(table.playbookId),
  versionNumberIdx: index('playbook_versions_version_number_idx').on(table.playbookId, table.versionNumber),
}))

export const playbookRules = pgTable('playbook_rules', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  playbookId: uuid('playbook_id').notNull().references(() => playbooksNew.id, { onDelete: 'cascade' }),
  
  // Rule identity
  ruleNumber: text('rule_number').notNull(), // 'IR1', 'CA1', etc.
  ruleType: text('rule_type').notNull(), // 'instruction_request', 'amendment_always', 'amendment_conditional'
  
  // Rule content
  briefName: text('brief_name').notNull(),
  instruction: text('instruction').notNull(),
  exampleLanguage: text('example_language'),
  
  // Clause reference
  linkedClauseId: uuid('linked_clause_id').references(() => clauses.id, { onDelete: 'set null' }),
  
  // Conditions (for conditional rules)
  conditions: jsonb('conditions'),
  
  // Source tracking
  sourceAnnotationType: text('source_annotation_type'), // 'comment', 'highlight', 'trackChange'
  sourceAnnotationKey: text('source_annotation_key'),
  
  // Organization
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  
  // Search
  searchVector: text('search_vector'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  playbookIdIdx: index('playbook_rules_playbook_id_idx').on(table.playbookId),
  typeIdx: index('playbook_rules_type_idx').on(table.ruleType),
  clauseIdx: index('playbook_rules_clause_idx').on(table.linkedClauseId),
}))

// ============================================
// PROJECT LIBRARY
// ============================================

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Core info
  name: text('name').notNull(),
  description: text('description'),
  projectType: text('project_type'), // 'matter', 'template_set', 'precedent_bank', 'workspace'
  
  // Status
  status: text('status').default('active'), // 'active', 'archived', 'completed'
  
  // Sharing
  visibility: text('visibility').default('private'),
  
  // Version tracking
  currentVersionId: uuid('current_version_id'),
  
  // Stats
  itemCount: integer('item_count').default(0),
  
  // Search
  searchVector: text('search_vector'),
  
  // Metadata
  metadata: jsonb('metadata'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('projects_user_id_idx').on(table.userId),
  statusIdx: index('projects_status_idx').on(table.status),
  visibilityIdx: index('projects_visibility_idx').on(table.visibility),
}))

export const projectFiles = pgTable('project_files', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  
  // File info
  name: text('name').notNull(),
  storagePath: text('storage_path'),
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes'),
  
  // Parsed content
  extractedText: text('extracted_text'),
  parsedStructure: jsonb('parsed_structure'),
  
  // Search
  searchVector: text('search_vector'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index('project_files_project_id_idx').on(table.projectId),
}))

export const projectItems = pgTable('project_items', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  
  // Item type and reference
  itemType: text('item_type').notNull(), // 'file', 'clause', 'playbook', 'folder'
  
  // References (only one will be set based on item_type)
  fileId: uuid('file_id').references(() => projectFiles.id, { onDelete: 'cascade' }),
  clauseId: uuid('clause_id').references(() => clauses.id, { onDelete: 'set null' }),
  playbookId: uuid('playbook_id').references(() => playbooksNew.id, { onDelete: 'set null' }),
  
  // For folders
  parentItemId: uuid('parent_item_id').references(() => projectItems.id, { onDelete: 'cascade' }),
  
  // Organization
  name: text('name'),
  sortOrder: integer('sort_order').default(0),
  
  // Metadata
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index('project_items_project_id_idx').on(table.projectId),
  typeIdx: index('project_items_type_idx').on(table.itemType),
  parentIdx: index('project_items_parent_idx').on(table.parentItemId),
}))

// ============================================
// JUNCTION TABLES (Tags & Labels)
// ============================================

export const clauseTags = pgTable('clause_tags', {
  clauseId: uuid('clause_id').notNull().references(() => clauses.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: index('clause_tags_pk').on(table.clauseId, table.tagId),
  clauseIdIdx: index('clause_tags_clause_id_idx').on(table.clauseId),
  tagIdIdx: index('clause_tags_tag_id_idx').on(table.tagId),
}))

export const clauseLabels = pgTable('clause_labels', {
  clauseId: uuid('clause_id').notNull().references(() => clauses.id, { onDelete: 'cascade' }),
  labelId: uuid('label_id').notNull().references(() => labels.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: index('clause_labels_pk').on(table.clauseId, table.labelId),
  clauseIdIdx: index('clause_labels_clause_id_idx').on(table.clauseId),
  labelIdIdx: index('clause_labels_label_id_idx').on(table.labelId),
}))

export const projectTags = pgTable('project_tags', {
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: index('project_tags_pk').on(table.projectId, table.tagId),
  projectIdIdx: index('project_tags_project_id_idx').on(table.projectId),
  tagIdIdx: index('project_tags_tag_id_idx').on(table.tagId),
}))

export const projectLabels = pgTable('project_labels', {
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  labelId: uuid('label_id').notNull().references(() => labels.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: index('project_labels_pk').on(table.projectId, table.labelId),
  projectIdIdx: index('project_labels_project_id_idx').on(table.projectId),
  labelIdIdx: index('project_labels_label_id_idx').on(table.labelId),
}))

export const playbookTags = pgTable('playbook_tags', {
  playbookId: uuid('playbook_id').notNull().references(() => playbooksNew.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: index('playbook_tags_pk').on(table.playbookId, table.tagId),
  playbookIdIdx: index('playbook_tags_playbook_id_idx').on(table.playbookId),
  tagIdIdx: index('playbook_tags_tag_id_idx').on(table.tagId),
}))

export const playbookLabels = pgTable('playbook_labels', {
  playbookId: uuid('playbook_id').notNull().references(() => playbooksNew.id, { onDelete: 'cascade' }),
  labelId: uuid('label_id').notNull().references(() => labels.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: index('playbook_labels_pk').on(table.playbookId, table.labelId),
  playbookIdIdx: index('playbook_labels_playbook_id_idx').on(table.playbookId),
  labelIdIdx: index('playbook_labels_label_id_idx').on(table.labelId),
}))

// ============================================
// UNIFIED SHARING
// ============================================

export const libraryShares = pgTable('library_shares', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  
  // What is being shared
  resourceType: text('resource_type').notNull(), // 'clause', 'project', 'playbook'
  resourceId: uuid('resource_id').notNull(),
  
  // Who is sharing
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Who it's shared with
  sharedWithUserId: uuid('shared_with_user_id').references(() => users.id, { onDelete: 'cascade' }),
  sharedWithEmail: text('shared_with_email'),
  
  // Permissions
  permission: text('permission').notNull().default('view'), // 'view', 'use', 'edit', 'remix', 'admin'
  
  // Expiration
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  resourceIdx: index('library_shares_resource_idx').on(table.resourceType, table.resourceId),
  ownerIdx: index('library_shares_owner_idx').on(table.ownerId),
  sharedWithIdx: index('library_shares_shared_with_idx').on(table.sharedWithUserId),
}))

// ============================================
// RELATIONS
// ============================================

export const tagsRelations = relations(tags, ({ one, many }) => ({
  parent: one(tags, {
    fields: [tags.parentId],
    references: [tags.id],
    relationName: 'parent',
  }),
  children: many(tags, {
    relationName: 'parent',
  }),
}))

export const clausesRelations = relations(clauses, ({ one, many }) => ({
  currentVersion: one(clauseVersions, {
    fields: [clauses.currentVersionId],
    references: [clauseVersions.id],
  }),
  versions: many(clauseVersions),
  tags: many(clauseTags),
  labels: many(clauseLabels),
}))

export const clauseVersionsRelations = relations(clauseVersions, ({ one }) => ({
  clause: one(clauses, {
    fields: [clauseVersions.clauseId],
    references: [clauses.id],
  }),
  previousVersion: one(clauseVersions, {
    fields: [clauseVersions.previousVersionId],
    references: [clauseVersions.id],
    relationName: 'previous',
  }),
}))

export const projectsRelations = relations(projects, ({ many }) => ({
  items: many(projectItems),
  files: many(projectFiles),
  tags: many(projectTags),
  labels: many(projectLabels),
}))

export const projectItemsRelations = relations(projectItems, ({ one }) => ({
  project: one(projects, {
    fields: [projectItems.projectId],
    references: [projects.id],
  }),
  file: one(projectFiles, {
    fields: [projectItems.fileId],
    references: [projectFiles.id],
  }),
  clause: one(clauses, {
    fields: [projectItems.clauseId],
    references: [clauses.id],
  }),
  parent: one(projectItems, {
    fields: [projectItems.parentItemId],
    references: [projectItems.id],
    relationName: 'parent',
  }),
}))

export const playbooksNewRelations = relations(playbooksNew, ({ one, many }) => ({
  currentVersion: one(playbookVersions, {
    fields: [playbooksNew.currentVersionId],
    references: [playbookVersions.id],
  }),
  versions: many(playbookVersions),
  rules: many(playbookRules),
  tags: many(playbookTags),
  labels: many(playbookLabels),
}))

export const playbookRulesRelations = relations(playbookRules, ({ one }) => ({
  playbook: one(playbooksNew, {
    fields: [playbookRules.playbookId],
    references: [playbooksNew.id],
  }),
  linkedClause: one(clauses, {
    fields: [playbookRules.linkedClauseId],
    references: [clauses.id],
  }),
}))

// ============================================
// TYPE EXPORTS
// ============================================

export type Tag = typeof tags.$inferSelect
export type NewTag = typeof tags.$inferInsert

export type Label = typeof labels.$inferSelect
export type NewLabel = typeof labels.$inferInsert

export type Clause = typeof clauses.$inferSelect
export type NewClause = typeof clauses.$inferInsert

export type ClauseVersion = typeof clauseVersions.$inferSelect
export type NewClauseVersion = typeof clauseVersions.$inferInsert

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert

export type ProjectFile = typeof projectFiles.$inferSelect
export type NewProjectFile = typeof projectFiles.$inferInsert

export type ProjectItem = typeof projectItems.$inferSelect
export type NewProjectItem = typeof projectItems.$inferInsert

export type PlaybookNew = typeof playbooksNew.$inferSelect
export type NewPlaybookNew = typeof playbooksNew.$inferInsert

export type PlaybookVersion = typeof playbookVersions.$inferSelect
export type NewPlaybookVersion = typeof playbookVersions.$inferInsert

export type PlaybookRule = typeof playbookRules.$inferSelect
export type NewPlaybookRule = typeof playbookRules.$inferInsert

export type LibraryShare = typeof libraryShares.$inferSelect
export type NewLibraryShare = typeof libraryShares.$inferInsert

