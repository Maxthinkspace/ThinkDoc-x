import { pgTable, text, timestamp, uuid, integer, index, boolean, customType } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { relations } from 'drizzle-orm'
import { users } from './tables'
import { organizations } from './organizations'

// Custom type for PostgreSQL bytea
const bytea = customType<{ data: Buffer }>({
  dataType: () => 'bytea',
})

// ============================================
// VERSIONED DOCUMENTS
// ============================================

export const versionedDocuments = pgTable('versioned_documents', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  
  // Document identity
  name: text('name').notNull(), // Original filename
  currentMainVersion: integer('current_main_version').default(1),
  currentSubVersion: text('current_sub_version'), // null, 'A', 'B', etc.
  
  // Latest version reference
  latestVersionId: uuid('latest_version_id'),
  latestSubVersionId: uuid('latest_sub_version_id'),
  
  // Metadata
  documentType: text('document_type'), // 'contract', 'nda', 'memo', etc.
  matterReference: text('matter_reference'), // Optional matter/project ref
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('versioned_documents_user_id_idx').on(table.userId),
  organizationIdIdx: index('versioned_documents_organization_id_idx').on(table.organizationId),
}))

// ============================================
// MAIN VERSIONS (v1, v2, v3...)
// ============================================

export const documentVersions = pgTable('document_versions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  documentId: uuid('document_id').notNull().references(() => versionedDocuments.id, { onDelete: 'cascade' }),
  
  // Version number
  mainVersion: integer('main_version').notNull(), // 1, 2, 3...
  
  // Version metadata (required)
  description: text('description').notNull(), // e.g., "Circulated to CFO"
  editorName: text('editor_name').notNull(), // Who saved this version
  editorUserId: uuid('editor_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  
  // Document content (full snapshot)
  content: text('content'), // Full document text/XML
  fileBlob: bytea('file_blob'), // Binary .docx if needed
  fileSizeBytes: integer('file_size_bytes'),
  
  // Status
  isMilestone: boolean('is_milestone').default(true), // Main versions are milestones
  status: text('status'), // 'draft', 'circulated', 'executed', 'archived'
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  documentIdIdx: index('document_versions_document_id_idx').on(table.documentId),
  mainVersionIdx: index('document_versions_main_version_idx').on(table.documentId, table.mainVersion),
  editorUserIdIdx: index('document_versions_editor_user_id_idx').on(table.editorUserId),
}))

// ============================================
// SUB-VERSIONS (v1.A, v1.B, v1.C...)
// ============================================

export const documentSubVersions = pgTable('document_sub_versions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  parentVersionId: uuid('parent_version_id').notNull().references(() => documentVersions.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull().references(() => versionedDocuments.id, { onDelete: 'cascade' }),
  
  // Sub-version letter
  subVersionLetter: text('sub_version_letter').notNull(), // 'A', 'B', 'C'...
  
  // Version metadata (required)
  description: text('description').notNull(), // e.g., "CFO comments incorporated"
  editorName: text('editor_name').notNull(),
  editorUserId: uuid('editor_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  
  // Document content (full snapshot)
  content: text('content'),
  fileBlob: bytea('file_blob'),
  fileSizeBytes: integer('file_size_bytes'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  parentVersionIdIdx: index('document_sub_versions_parent_version_id_idx').on(table.parentVersionId),
  documentIdIdx: index('document_sub_versions_document_id_idx').on(table.documentId),
  subVersionIdx: index('document_sub_versions_sub_version_idx').on(table.parentVersionId, table.subVersionLetter),
  editorUserIdIdx: index('document_sub_versions_editor_user_id_idx').on(table.editorUserId),
}))

// ============================================
// RELATIONS
// ============================================

export const versionedDocumentsRelations = relations(versionedDocuments, ({ one, many }) => ({
  user: one(users, {
    fields: [versionedDocuments.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [versionedDocuments.organizationId],
    references: [organizations.id],
  }),
  versions: many(documentVersions),
  subVersions: many(documentSubVersions),
}))

export const documentVersionsRelations = relations(documentVersions, ({ one, many }) => ({
  document: one(versionedDocuments, {
    fields: [documentVersions.documentId],
    references: [versionedDocuments.id],
  }),
  editor: one(users, {
    fields: [documentVersions.editorUserId],
    references: [users.id],
  }),
  subVersions: many(documentSubVersions),
}))

export const documentSubVersionsRelations = relations(documentSubVersions, ({ one }) => ({
  parentVersion: one(documentVersions, {
    fields: [documentSubVersions.parentVersionId],
    references: [documentVersions.id],
  }),
  document: one(versionedDocuments, {
    fields: [documentSubVersions.documentId],
    references: [versionedDocuments.id],
  }),
  editor: one(users, {
    fields: [documentSubVersions.editorUserId],
    references: [users.id],
  }),
}))

// ============================================
// TYPE EXPORTS
// ============================================

export type VersionedDocument = typeof versionedDocuments.$inferSelect
export type NewVersionedDocument = typeof versionedDocuments.$inferInsert

export type DocumentVersion = typeof documentVersions.$inferSelect
export type NewDocumentVersion = typeof documentVersions.$inferInsert

export type DocumentSubVersion = typeof documentSubVersions.$inferSelect
export type NewDocumentSubVersion = typeof documentSubVersions.$inferInsert

