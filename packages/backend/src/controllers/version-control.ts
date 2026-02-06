import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { db } from '@/config/database';
import { documentVersions, versionedDocuments, reviewRequests } from '@/db/schema/document-versions';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/config/logger';
import { getUserId } from '@/middleware/auth';

export const versionControlController = {
  async listVersions(c: Context) {
    try {
      const userId = getUserId(c);
      const { documentId } = c.req.param();

      const versions = await db
        .select()
        .from(documentVersions)
        .where(and(
          eq(documentVersions.documentId, documentId),
          eq(documentVersions.userId, userId)
        ))
        .orderBy(desc(documentVersions.createdAt));

      return c.json({
        success: true,
        data: versions,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to list versions');
      throw new HTTPException(500, { message: 'Failed to fetch versions' });
    }
  },

  async getVersion(c: Context) {
    try {
      const userId = getUserId(c);
      const { documentId, versionId } = c.req.param();

      const [version] = await db
        .select()
        .from(documentVersions)
        .where(and(
          eq(documentVersions.id, versionId),
          eq(documentVersions.documentId, documentId),
          eq(documentVersions.userId, userId)
        ))
        .limit(1);

      if (!version) {
        throw new HTTPException(404, { message: 'Version not found' });
      }

      return c.json({
        success: true,
        data: version,
      });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      logger.error({ error }, 'Failed to get version');
      throw new HTTPException(500, { message: 'Failed to fetch version' });
    }
  },

  async createVersion(c: Context) {
    try {
      const userId = getUserId(c);
      const { documentId } = c.req.param();
      const body = await c.req.json();

      // Get current version to determine next version number
      const [currentVersion] = await db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId))
        .orderBy(desc(documentVersions.mainVersion))
        .limit(1);

      const nextVersion = currentVersion ? currentVersion.mainVersion + 1 : 1;

      const newVersion = {
        id: uuidv4(),
        documentId,
        mainVersion: nextVersion,
        description: body.message || `Version ${nextVersion}`,
        editorName: body.editorName || 'User',
        editorUserId: userId,
        content: body.content,
        status: body.status || 'draft',
        metadata: {
          ...(body.metadata || {}),
          branch: body.branch || 'main',
        },
      };

      const [version] = await db
        .insert(documentVersions)
        .values(newVersion)
        .returning();

      return c.json({
        success: true,
        data: version,
      }, 201);
    } catch (error) {
      logger.error({ error }, 'Failed to create version');
      throw new HTTPException(500, { message: 'Failed to create version' });
    }
  },

  async listBranches(c: Context) {
    try {
      const userId = getUserId(c);
      const { documentId } = c.req.param();

      // Get unique branches from versions metadata
      const versions = await db
        .select({ metadata: documentVersions.metadata })
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId));

      const branches = new Set<string>(['main']);
      versions.forEach(v => {
        if (v.metadata && typeof v.metadata === 'object' && 'branch' in v.metadata) {
          branches.add(String(v.metadata.branch));
        }
      });

      return c.json({
        success: true,
        data: Array.from(branches),
      });
    } catch (error) {
      logger.error({ error }, 'Failed to list branches');
      throw new HTTPException(500, { message: 'Failed to fetch branches' });
    }
  },

  async createBranch(c: Context) {
    try {
      const userId = getUserId(c);
      const { documentId } = c.req.param();
      const body = await c.req.json();

      // Get the latest version from source branch
      const versions = await db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId))
        .orderBy(desc(documentVersions.createdAt));

      // Find version from source branch
      const sourceVersion = versions.find(v => {
        const metadata = v.metadata as any;
        return metadata?.branch === (body.fromBranch || 'main');
      }) || versions[0];

      if (!sourceVersion) {
        throw new HTTPException(404, { message: 'Source branch not found' });
      }

      // Get next version number
      const nextVersion = versions.length > 0 ? versions[0].mainVersion + 1 : 1;

      // Create new version on new branch
      const newVersion = {
        id: uuidv4(),
        documentId,
        mainVersion: nextVersion,
        description: `Branched from ${body.fromBranch}`,
        editorName: body.editorName || 'User',
        editorUserId: userId,
        content: sourceVersion.content,
        status: 'draft',
        metadata: {
          branch: body.branchName,
          branchedFrom: body.fromBranch,
        },
      };

      const [version] = await db
        .insert(documentVersions)
        .values(newVersion)
        .returning();

      return c.json({
        success: true,
        data: version,
      }, 201);
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      logger.error({ error }, 'Failed to create branch');
      throw new HTTPException(500, { message: 'Failed to create branch' });
    }
  },

  async mergeBranch(c: Context) {
    try {
      const userId = getUserId(c);
      const { documentId } = c.req.param();
      const body = await c.req.json();

      // Get all versions to find source branch
      const versions = await db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId))
        .orderBy(desc(documentVersions.createdAt));

      const sourceVersion = versions.find(v => {
        const metadata = v.metadata as any;
        return metadata?.branch === body.sourceBranch;
      });

      if (!sourceVersion) {
        throw new HTTPException(404, { message: 'Source branch not found' });
      }

      // Get next version number
      const nextVersion = versions.length > 0 ? versions[0].mainVersion + 1 : 1;

      // Create merged version on target branch
      const mergedVersion = {
        id: uuidv4(),
        documentId,
        mainVersion: nextVersion,
        description: `Merged from ${body.sourceBranch}`,
        editorName: body.editorName || 'User',
        editorUserId: userId,
        content: sourceVersion.content,
        status: 'draft',
        metadata: {
          branch: body.targetBranch || 'main',
          mergedFrom: body.sourceBranch,
        },
      };

      const [version] = await db
        .insert(documentVersions)
        .values(mergedVersion)
        .returning();

      return c.json({
        success: true,
        data: version,
      }, 201);
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      logger.error({ error }, 'Failed to merge branch');
      throw new HTTPException(500, { message: 'Failed to merge branch' });
    }
  },

  async getVersionGraph(c: Context) {
    try {
      const userId = getUserId(c);
      const { documentId } = c.req.param();

      const versions = await db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId))
        .orderBy(desc(documentVersions.createdAt));

      // Build graph structure
      const graph = {
        branches: {} as Record<string, any[]>,
        timeline: versions.map(v => {
          const metadata = v.metadata as any;
          return {
            id: v.id,
            branch: metadata?.branch || 'main',
            message: v.description,
            version: v.mainVersion,
            createdAt: v.createdAt,
          };
        }),
      };

      versions.forEach(v => {
        const metadata = v.metadata as any;
        const branch = metadata?.branch || 'main';
        if (!graph.branches[branch]) {
          graph.branches[branch] = [];
        }
        graph.branches[branch].push({
          id: v.id,
          message: v.description,
          version: v.mainVersion,
          createdAt: v.createdAt,
        });
      });

      return c.json({
        success: true,
        data: graph,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get version graph');
      throw new HTTPException(500, { message: 'Failed to fetch version graph' });
    }
  },

  async createReviewRequest(c: Context) {
    try {
      const userId = getUserId(c);
      const body = await c.req.json();

      const newRequest = {
        id: uuidv4(),
        documentId: body.documentId,
        versionId: body.versionId,
        requesterId: userId,
        reviewers: JSON.stringify(body.reviewers),
        status: 'pending' as const,
        message: body.message || null,
      };

      const [request] = await db
        .insert(reviewRequests)
        .values(newRequest)
        .returning();

      return c.json({
        success: true,
        data: request,
      }, 201);
    } catch (error) {
      logger.error({ error }, 'Failed to create review request');
      throw new HTTPException(500, { message: 'Failed to create review request' });
    }
  },

  async listReviewRequests(c: Context) {
    try {
      const userId = getUserId(c);

      const requests = await db
        .select()
        .from(reviewRequests)
        .where(eq(reviewRequests.requesterId, userId))
        .orderBy(desc(reviewRequests.createdAt));

      return c.json({
        success: true,
        data: requests,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to list review requests');
      throw new HTTPException(500, { message: 'Failed to fetch review requests' });
    }
  },

  async getReviewRequest(c: Context) {
    try {
      const userId = getUserId(c);
      const { requestId } = c.req.param();

      const [request] = await db
        .select()
        .from(reviewRequests)
        .where(and(
          eq(reviewRequests.id, requestId),
          eq(reviewRequests.requesterId, userId)
        ))
        .limit(1);

      if (!request) {
        throw new HTTPException(404, { message: 'Review request not found' });
      }

      return c.json({
        success: true,
        data: request,
      });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      logger.error({ error }, 'Failed to get review request');
      throw new HTTPException(500, { message: 'Failed to fetch review request' });
    }
  },

  async approveReview(c: Context) {
    try {
      const userId = getUserId(c);
      const { requestId } = c.req.param();

      const [request] = await db
        .update(reviewRequests)
        .set({
          status: 'approved',
          approvedBy: userId,
          approvedAt: new Date(),
        })
        .where(eq(reviewRequests.id, requestId))
        .returning();

      if (!request) {
        throw new HTTPException(404, { message: 'Review request not found' });
      }

      return c.json({
        success: true,
        data: request,
      });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      logger.error({ error }, 'Failed to approve review');
      throw new HTTPException(500, { message: 'Failed to approve review' });
    }
  },

  async rejectReview(c: Context) {
    try {
      const userId = getUserId(c);
      const { requestId } = c.req.param();
      const body = await c.req.json();

      const [request] = await db
        .update(reviewRequests)
        .set({
          status: 'rejected',
          rejectedBy: userId,
          rejectedAt: new Date(),
          rejectionReason: body.reason || null,
        })
        .where(eq(reviewRequests.id, requestId))
        .returning();

      if (!request) {
        throw new HTTPException(404, { message: 'Review request not found' });
      }

      return c.json({
        success: true,
        data: request,
      });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      logger.error({ error }, 'Failed to reject review');
      throw new HTTPException(500, { message: 'Failed to reject review' });
    }
  },

  async runAgentReview(c: Context) {
    try {
      const userId = getUserId(c);
      const { documentId, versionId } = c.req.param();

      // TODO: Implement AI agent review
      // This would call LLM services to review changes

      return c.json({
        success: true,
        data: {
          status: 'completed',
          issues: [],
          riskScore: 0,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to run agent review');
      throw new HTTPException(500, { message: 'Failed to run agent review' });
    }
  },
};

