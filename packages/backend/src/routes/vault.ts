import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { vaultController } from '@/controllers/vault';
import {
  createProjectSchema,
  updateProjectSchema,
  generateColumnsRequestSchema,
  runExtractionRequestSchema,
  askQueryRequestSchema,
} from '@/schemas/vault';
import { authMiddleware } from '@/middleware/auth';
import { subscriptionMiddleware } from '@/middleware/subscription';
import { getJobStatus } from '@/controllers/jobController';

const vaultRoutes = new Hono();

// Apply auth and subscription middleware to all vault routes
vaultRoutes.use(authMiddleware());
vaultRoutes.use(subscriptionMiddleware());

// ============================================
// PROJECT ROUTES
// ============================================

// List all projects for the authenticated user
vaultRoutes.get('/projects', vaultController.listProjects);

// Create a new project
vaultRoutes.post(
  '/projects',
  zValidator('json', createProjectSchema),
  vaultController.createProject
);

// Get a single project by ID
vaultRoutes.get('/projects/:projectId', vaultController.getProject);

// Update a project
vaultRoutes.patch(
  '/projects/:projectId',
  zValidator('json', updateProjectSchema),
  vaultController.updateProject
);

// Delete a project (and all associated files/queries)
vaultRoutes.delete('/projects/:projectId', vaultController.deleteProject);

// ============================================
// FILE ROUTES
// ============================================

// List files in a project
vaultRoutes.get('/projects/:projectId/files', vaultController.listFiles);

// Upload files to a project (multipart form data)
vaultRoutes.post('/projects/:projectId/files', vaultController.uploadFiles);

// Get a single file
vaultRoutes.get('/files/:fileId', vaultController.getFile);

// Delete a file
vaultRoutes.delete('/files/:fileId', vaultController.deleteFile);

// Download a file
vaultRoutes.get('/files/:fileId/download', vaultController.downloadFile);

// ============================================
// AI FEATURES
// ============================================

// Generate columns based on user prompt
vaultRoutes.post(
  '/columns/generate',
  zValidator('json', generateColumnsRequestSchema),
  vaultController.generateColumns
);

// Run extraction (review query - per-file table)
vaultRoutes.post(
  '/extract',
  zValidator('json', runExtractionRequestSchema),
  vaultController.runExtraction
);

// Ask query (aggregate answer across files)
vaultRoutes.post(
  '/ask',
  zValidator('json', askQueryRequestSchema),
  vaultController.askQuery
);

// ============================================
// QUERY HISTORY
// ============================================

// List queries for a project
vaultRoutes.get('/projects/:projectId/queries', vaultController.listQueries);

// Get query results
vaultRoutes.get('/queries/:queryId', vaultController.getQueryResults);

// ============================================
// CLAUSE ROUTES
// ============================================

// Save a clause
vaultRoutes.post('/clauses', vaultController.saveClause);

// List clauses for the authenticated user
vaultRoutes.get('/clauses', vaultController.listClauses);

// Get a single clause by ID
vaultRoutes.get('/clauses/:clauseId', vaultController.getClause);

// Update a clause
vaultRoutes.patch('/clauses/:clauseId', vaultController.updateClause);

// Delete a clause
vaultRoutes.delete('/clauses/:clauseId', vaultController.deleteClause);

// Draft a clause using AI
vaultRoutes.post('/clauses/draft', vaultController.draftClause);

// ============================================
// JOB STATUS (async operations)
// ============================================

vaultRoutes.get('/jobs/:jobId', getJobStatus);

export { vaultRoutes };
