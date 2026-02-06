import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { db } from '@/config/database';
import { workflows, workflowExecutions } from '@/db/schema/index';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/config/logger';
import { getUserId } from '@/middleware/auth';
import { createJob, setJobResult, setJobError } from '@/utils/jobStore';

export const workflowsController = {
  async list(c: Context) {
    try {
      const userId = getUserId(c);
      
      const workflowList = await db
        .select()
        .from(workflows)
        .where(and(
          eq(workflows.userId, userId),
          eq(workflows.isActive, true)
        ))
        .orderBy(desc(workflows.createdAt));

      return c.json({
        success: true,
        data: workflowList,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to list workflows');
      throw new HTTPException(500, { message: 'Failed to fetch workflows' });
    }
  },

  async get(c: Context) {
    try {
      const userId = getUserId(c);
      const { id } = c.req.param();

      const [workflow] = await db
        .select()
        .from(workflows)
        .where(and(
          eq(workflows.id, id),
          eq(workflows.userId, userId),
          eq(workflows.isActive, true)
        ))
        .limit(1);

      if (!workflow) {
        throw new HTTPException(404, { message: 'Workflow not found' });
      }

      return c.json({
        success: true,
        data: workflow,
      });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      logger.error({ error }, 'Failed to get workflow');
      throw new HTTPException(500, { message: 'Failed to fetch workflow' });
    }
  },

  async create(c: Context) {
    try {
      const userId = getUserId(c);
      const body = await c.req.json();

      const newWorkflow = {
        id: uuidv4(),
        userId,
        name: body.name,
        description: body.description || null,
        blocks: body.blocks || [],
        enabled: body.enabled !== false,
        isActive: true,
      };

      const [workflow] = await db
        .insert(workflows)
        .values(newWorkflow)
        .returning();

      return c.json({
        success: true,
        data: workflow,
      }, 201);
    } catch (error) {
      logger.error({ error }, 'Failed to create workflow');
      throw new HTTPException(500, { message: 'Failed to create workflow' });
    }
  },

  async update(c: Context) {
    try {
      const userId = getUserId(c);
      const { id } = c.req.param();
      const body = await c.req.json();

      const [workflow] = await db
        .update(workflows)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(and(
          eq(workflows.id, id),
          eq(workflows.userId, userId),
          eq(workflows.isActive, true)
        ))
        .returning();

      if (!workflow) {
        throw new HTTPException(404, { message: 'Workflow not found' });
      }

      return c.json({
        success: true,
        data: workflow,
      });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      logger.error({ error }, 'Failed to update workflow');
      throw new HTTPException(500, { message: 'Failed to update workflow' });
    }
  },

  async delete(c: Context) {
    try {
      const userId = getUserId(c);
      const { id } = c.req.param();

      const [workflow] = await db
        .update(workflows)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(and(
          eq(workflows.id, id),
          eq(workflows.userId, userId),
          eq(workflows.isActive, true)
        ))
        .returning({ id: workflows.id });

      if (!workflow) {
        throw new HTTPException(404, { message: 'Workflow not found' });
      }

      return c.json({
        success: true,
        message: 'Workflow deleted successfully',
      });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      logger.error({ error }, 'Failed to delete workflow');
      throw new HTTPException(500, { message: 'Failed to delete workflow' });
    }
  },

  async run(c: Context) {
    try {
      const userId = getUserId(c);
      const { id } = c.req.param();
      const body = await c.req.json();

      // Get workflow
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(and(
          eq(workflows.id, id),
          eq(workflows.userId, userId),
          eq(workflows.isActive, true),
          eq(workflows.enabled, true)
        ))
        .limit(1);

      if (!workflow) {
        throw new HTTPException(404, { message: 'Workflow not found or disabled' });
      }

      // Create execution record
      const executionId = uuidv4();
      const jobId = createJob();

      await db.insert(workflowExecutions).values({
        id: executionId,
        workflowId: id,
        userId,
        status: 'pending',
        input: body.input || {},
        jobId,
      });

      // TODO: Execute workflow asynchronously
      // For now, return job ID
      return c.json({
        success: true,
        data: {
          executionId,
          jobId,
        },
      });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      logger.error({ error }, 'Failed to run workflow');
      throw new HTTPException(500, { message: 'Failed to run workflow' });
    }
  },

  async getExecution(c: Context) {
    try {
      const userId = getUserId(c);
      const { executionId } = c.req.param();

      const [execution] = await db
        .select()
        .from(workflowExecutions)
        .where(and(
          eq(workflowExecutions.id, executionId),
          eq(workflowExecutions.userId, userId)
        ))
        .limit(1);

      if (!execution) {
        throw new HTTPException(404, { message: 'Execution not found' });
      }

      return c.json({
        success: true,
        data: execution,
      });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      logger.error({ error }, 'Failed to get execution');
      throw new HTTPException(500, { message: 'Failed to fetch execution' });
    }
  },
};

