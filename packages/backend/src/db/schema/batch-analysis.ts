import { pgTable, text, timestamp, uuid, integer, jsonb, index, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './tables';
import { vaultProjects } from './vault';

// Batch analysis jobs table
export const batchAnalysisJobs = pgTable('batch_analysis_jobs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').notNull().references(() => vaultProjects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  analysisType: text('analysis_type').notNull(), // 'contract-review', 'definition-check', 'risk-analysis', 'cross-document'
  fileIds: jsonb('file_ids').notNull(), // Array of file IDs
  options: jsonb('options'), // Analysis-specific options (playbookId, etc.)
  status: text('status').notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  progress: integer('progress').default(0), // Current file being processed
  totalFiles: integer('total_files').notNull(),
  results: jsonb('results'), // Aggregated results
  error: text('error'),
  jobId: text('job_id'), // Reference to job store
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  projectIdIdx: index('batch_analysis_jobs_project_id_idx').on(table.projectId),
  userIdIdx: index('batch_analysis_jobs_user_id_idx').on(table.userId),
  statusIdx: index('batch_analysis_jobs_status_idx').on(table.status),
  createdAtIdx: index('batch_analysis_jobs_created_at_idx').on(table.createdAt),
}));

// Batch analysis results table (per-document results)
export const batchAnalysisResults = pgTable('batch_analysis_results', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  jobId: uuid('job_id').notNull().references(() => batchAnalysisJobs.id, { onDelete: 'cascade' }),
  fileId: uuid('file_id').notNull(),
  analysisType: text('analysis_type').notNull(),
  results: jsonb('results').notNull(), // Document-specific results
  issues: jsonb('issues'), // Array of issues found
  riskScore: integer('risk_score'), // 0-100 risk score
  status: text('status').notNull().default('pending'), // 'pending', 'completed', 'failed'
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  jobIdIdx: index('batch_analysis_results_job_id_idx').on(table.jobId),
  fileIdIdx: index('batch_analysis_results_file_id_idx').on(table.fileId),
  statusIdx: index('batch_analysis_results_status_idx').on(table.status),
}));

export type BatchAnalysisJob = typeof batchAnalysisJobs.$inferSelect;
export type NewBatchAnalysisJob = typeof batchAnalysisJobs.$inferInsert;
export type BatchAnalysisResult = typeof batchAnalysisResults.$inferSelect;
export type NewBatchAnalysisResult = typeof batchAnalysisResults.$inferInsert;

