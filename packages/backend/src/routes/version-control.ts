import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '@/middleware/auth';
import { subscriptionMiddleware } from '@/middleware/subscription';
import { versionControlController } from '@/controllers/version-control';
import { z } from 'zod';

const versionControlRoutes = new Hono();

// Apply auth and subscription middleware
versionControlRoutes.use(authMiddleware());
versionControlRoutes.use(subscriptionMiddleware());

// Version schemas
const createVersionSchema = z.object({
  documentId: z.string(),
  content: z.string(),
  message: z.string().optional(),
  branch: z.string().default('main'),
});

const createBranchSchema = z.object({
  documentId: z.string(),
  branchName: z.string().min(1),
  fromBranch: z.string().default('main'),
});

const mergeBranchSchema = z.object({
  documentId: z.string(),
  sourceBranch: z.string(),
  targetBranch: z.string().default('main'),
});

const reviewRequestSchema = z.object({
  documentId: z.string(),
  versionId: z.string(),
  reviewers: z.array(z.string()),
  message: z.string().optional(),
});

// Document versions
versionControlRoutes.get('/documents/:documentId/versions', versionControlController.listVersions);
versionControlRoutes.get('/documents/:documentId/versions/:versionId', versionControlController.getVersion);
versionControlRoutes.post(
  '/documents/:documentId/versions',
  zValidator('json', createVersionSchema),
  versionControlController.createVersion
);

// Branches
versionControlRoutes.get('/documents/:documentId/branches', versionControlController.listBranches);
versionControlRoutes.post(
  '/documents/:documentId/branches',
  zValidator('json', createBranchSchema),
  versionControlController.createBranch
);
versionControlRoutes.post(
  '/documents/:documentId/branches/merge',
  zValidator('json', mergeBranchSchema),
  versionControlController.mergeBranch
);

// Version graph
versionControlRoutes.get('/documents/:documentId/graph', versionControlController.getVersionGraph);

// Review requests
versionControlRoutes.post(
  '/review-requests',
  zValidator('json', reviewRequestSchema),
  versionControlController.createReviewRequest
);
versionControlRoutes.get('/review-requests', versionControlController.listReviewRequests);
versionControlRoutes.post('/review-requests/:requestId/approve', versionControlController.approveReview);
versionControlRoutes.post('/review-requests/:requestId/reject', versionControlController.rejectReview);

// Agent review
versionControlRoutes.post('/documents/:documentId/versions/:versionId/agent-review', versionControlController.runAgentReview);

export { versionControlRoutes };

