import { pgTable, text, timestamp, jsonb, integer, uuid, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// VAULT PROJECTS
// ============================================

export const vaultProjects = pgTable('vault_projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  fileCount: integer('file_count').default(0).notNull(),
  visibility: text('visibility').$type<'private' | 'shared'>().default('private').notNull(),
  clientMatter: text('client_matter'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('vault_projects_user_id_idx').on(table.userId),
  visibilityIdx: index('vault_projects_visibility_idx').on(table.visibility),
}));

export const vaultProjectsRelations = relations(vaultProjects, ({ many }) => ({
  files: many(vaultFiles),
  queries: many(vaultQueries),
}));

// ============================================
// VAULT FILES
// ============================================

export const vaultFiles = pgTable('vault_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => vaultProjects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  storagePath: text('storage_path'),
  category: text('category'),
  documentType: text('document_type'),
  sizeBytes: integer('size_bytes'),
  mimeType: text('mime_type'),
  
  // Extracted/parsed content for analysis
  extractedText: text('extracted_text'),
  parsedStructure: jsonb('parsed_structure'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index('vault_files_project_id_idx').on(table.projectId),
  documentTypeIdx: index('vault_files_document_type_idx').on(table.documentType),
}));

export const vaultFilesRelations = relations(vaultFiles, ({ one }) => ({
  project: one(vaultProjects, {
    fields: [vaultFiles.projectId],
    references: [vaultProjects.id],
  }),
}));

// ============================================
// VAULT QUERIES (Analysis Sessions)
// ============================================

export const vaultQueries = pgTable('vault_queries', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => vaultProjects.id, { onDelete: 'cascade' }),
  
  // Query configuration
  queryType: text('query_type').notNull().$type<'review' | 'ask'>(),
  queryText: text('query_text'),
  columns: jsonb('columns').$type<ColumnConfigDB[]>(),
  
  // Target files
  fileIds: jsonb('file_ids').$type<string[]>(),
  
  // Status tracking
  status: text('status').notNull().$type<'pending' | 'processing' | 'completed' | 'failed'>().default('pending'),
  
  // Results
  results: jsonb('results').$type<ExtractionResultDB[]>(),
  error: text('error'),
  
  // Metadata
  processingTimeMs: integer('processing_time_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  projectIdIdx: index('vault_queries_project_id_idx').on(table.projectId),
  statusIdx: index('vault_queries_status_idx').on(table.status),
}));

export const vaultQueriesRelations = relations(vaultQueries, ({ one }) => ({
  project: one(vaultProjects, {
    fields: [vaultQueries.projectId],
    references: [vaultProjects.id],
  }),
}));

// ============================================
// DB-specific types (JSON column shapes)
// ============================================

interface ColumnConfigDB {
  id: string;
  type: 'free-response' | 'date' | 'classification' | 'verbatim' | 'duration' | 'currency' | 'number';
  name: string;
  query: string;
  classificationOptions?: string[];
}

interface ExtractionResultDB {
  fileId: string;
  fileName: string;
  columns: Record<string, {
    value: string;
    confidence: 'high' | 'medium' | 'low';
    sourceText?: string;
    sourceLocation?: string;
    pageNumber?: number;
    highlightBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
      pageWidth: number;
      pageHeight: number;
      pageNumber?: number;
    };
    verified?: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
    flagged?: boolean;
    assignedTo?: string;
    assignedAt?: string;
  }>;
}

// ============================================
// Type exports for use in services
// ============================================

export type VaultProjectRecord = typeof vaultProjects.$inferSelect;
export type VaultProjectInsert = typeof vaultProjects.$inferInsert;

export type VaultFileRecord = typeof vaultFiles.$inferSelect;
export type VaultFileInsert = typeof vaultFiles.$inferInsert;

export type VaultQueryRecord = typeof vaultQueries.$inferSelect;
export type VaultQueryInsert = typeof vaultQueries.$inferInsert;

// ============================================
// VAULT CLAUSES
// ============================================

export const vaultClauses = pgTable('vault_clauses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  text: text('text').notNull(),
  category: text('category'),
  tags: jsonb('tags').$type<string[]>(),
  description: text('description'),
  sourceDocument: text('source_document'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('vault_clauses_user_id_idx').on(table.userId),
  categoryIdx: index('vault_clauses_category_idx').on(table.category),
}));

export type VaultClauseRecord = typeof vaultClauses.$inferSelect;
export type VaultClauseInsert = typeof vaultClauses.$inferInsert;
