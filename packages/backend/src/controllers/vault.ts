import type { Context } from 'hono';
import { logger } from '@/config/logger';
import { db } from '@/config/database';
import { vaultProjects, vaultFiles, vaultQueries, vaultClauses } from '@/db/schema/vault';
import { eq, desc, and, inArray, sql } from 'drizzle-orm';
import { createJob, setJobResult, setJobError, updateJobProgress } from '@/utils/jobStore';
import { getUserId } from '@/middleware/auth';
import {
  generateColumnsFromPrompt,
  runExtractionWorkflow,
  runAskQueryWorkflow,
} from '@/services/vault';
import { uploadFileToStorage, deleteFileFromStorage, getFileFromStorage } from '@/services/storage';
import { parseDocument } from '@/services/vault/documentParser';
import { llmService } from '@/services/llm';
import type { CreateProjectRequest, RunExtractionRequest, AskQueryRequest, GenerateColumnsRequest } from '@/schemas/vault';

// NOTE: Vault routes are protected by `authMiddleware()`, so we always use the real authenticated userId.

// ============================================
// PROJECT HANDLERS
// ============================================

const listProjects = async (c: Context) => {
  try {
    const userId = getUserId(c);

    const projects = await db
      .select()
      .from(vaultProjects)
      .where(eq(vaultProjects.userId, userId))
      .orderBy(desc(vaultProjects.updatedAt));

    // Ensure backward compatibility: add default values for new columns if missing
    const projectsWithDefaults = projects.map(project => ({
      ...project,
      visibility: (project as any).visibility || 'private',
      clientMatter: (project as any).clientMatter || null,
    }));

    return c.json({ success: true, projects: projectsWithDefaults });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to list projects');
    // Check if error is due to missing columns
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('column') && (errorMessage.includes('visibility') || errorMessage.includes('client_matter'))) {
      logger.error({ error }, 'Vault: Database migration required. Please run migration 004_add_vault_ui_enhancements.sql');
      return c.json({ 
        success: false, 
        error: 'Database migration required. Please run migration 004_add_vault_ui_enhancements.sql' 
      }, 500);
    }
    return c.json({ success: false, error: 'Failed to list projects' }, 500);
  }
};

const createProject = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const body = (await c.req.json()) as CreateProjectRequest;

    const result = await db
      .insert(vaultProjects)
      .values({
        userId,
        name: body.name,
        description: body.description,
        clientMatter: body.clientMatter,
        visibility: body.visibility || 'private',
        fileCount: 0,
      })
      .returning();

    const project = result[0];
    if (!project) {
      return c.json({ success: false, error: 'Failed to create project' }, 500);
    }

    logger.info({ projectId: project.id, userId }, 'Vault: Project created');

    return c.json({ success: true, project });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to create project');
    return c.json({ success: false, error: 'Failed to create project' }, 500);
  }
};

const getProject = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const projectId = c.req.param('projectId');

    const result = await db
      .select()
      .from(vaultProjects)
      .where(and(eq(vaultProjects.id, projectId), eq(vaultProjects.userId, userId)));

    const project = result[0];
    if (!project) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    return c.json({ success: true, project });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to get project');
    return c.json({ success: false, error: 'Failed to get project' }, 500);
  }
};

const updateProject = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const projectId = c.req.param('projectId');
    const body = await c.req.json();

    const result = await db
      .update(vaultProjects)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(and(eq(vaultProjects.id, projectId), eq(vaultProjects.userId, userId)))
      .returning();

    const project = result[0];
    if (!project) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    return c.json({ success: true, project });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to update project');
    return c.json({ success: false, error: 'Failed to update project' }, 500);
  }
};

const deleteProject = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const projectId = c.req.param('projectId');

    // Get all files to delete from storage
    const files = await db
      .select({ storagePath: vaultFiles.storagePath })
      .from(vaultFiles)
      .where(eq(vaultFiles.projectId, projectId));

    // Delete files from storage
    for (const file of files) {
      if (file.storagePath) {
        await deleteFileFromStorage(file.storagePath).catch((err: Error) => {
          logger.warn({ error: err, storagePath: file.storagePath }, 'Failed to delete file from storage');
        });
      }
    }

    // Delete project (cascades to files and queries)
    const result = await db
      .delete(vaultProjects)
      .where(and(eq(vaultProjects.id, projectId), eq(vaultProjects.userId, userId)))
      .returning();

    const deleted = result[0];
    if (!deleted) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    logger.info({ projectId, userId }, 'Vault: Project deleted');

    return c.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to delete project');
    return c.json({ success: false, error: 'Failed to delete project' }, 500);
  }
};

// ============================================
// FILE HANDLERS
// ============================================

const listFiles = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const projectId = c.req.param('projectId');

    // Verify project ownership
    const projectResult = await db
      .select()
      .from(vaultProjects)
      .where(and(eq(vaultProjects.id, projectId), eq(vaultProjects.userId, userId)));

    if (!projectResult[0]) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    const files = await db
      .select()
      .from(vaultFiles)
      .where(eq(vaultFiles.projectId, projectId))
      .orderBy(desc(vaultFiles.createdAt));

    return c.json({ success: true, files });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to list files');
    return c.json({ success: false, error: 'Failed to list files' }, 500);
  }
};

const uploadFiles = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const projectId = c.req.param('projectId');

    // Verify project ownership
    const projectResult = await db
      .select()
      .from(vaultProjects)
      .where(and(eq(vaultProjects.id, projectId), eq(vaultProjects.userId, userId)));

    if (!projectResult[0]) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    const formData = await c.req.formData();
    const uploadedFiles: Array<typeof vaultFiles.$inferSelect> = [];
    const errors: Array<{ fileName: string; error: string }> = [];

    // Get all files from formData
    const fileEntries = formData.getAll('files');

    for (const entry of fileEntries) {
      if (entry instanceof File) {
        const file = entry;
        try {
          // Upload to storage
          const storagePath = `vault/${userId}/${projectId}/${Date.now()}-${file.name}`;
          await uploadFileToStorage(storagePath, file);

          // Parse document to extract text
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const parsed = await parseDocument(buffer, file.name, file.type);

          // Insert file record
          const fileResult = await db
            .insert(vaultFiles)
            .values({
              projectId,
              name: file.name,
              storagePath,
              sizeBytes: file.size,
              mimeType: file.type,
              extractedText: parsed.text,
              parsedStructure: parsed.structure,
            })
            .returning();

          const fileRecord = fileResult[0];
          if (fileRecord) {
            uploadedFiles.push(fileRecord);
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          errors.push({ fileName: file.name, error: errorMessage });
          logger.error({ error: err, fileName: file.name }, 'Vault: Failed to upload file');
        }
      }
    }

    // Update project file count
    await db
      .update(vaultProjects)
      .set({
        fileCount: sql`${vaultProjects.fileCount} + ${uploadedFiles.length}`,
        updatedAt: new Date(),
      })
      .where(eq(vaultProjects.id, projectId));

    logger.info({ projectId, filesUploaded: uploadedFiles.length, errors: errors.length }, 'Vault: Files uploaded');

    return c.json({
      success: true,
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to upload files');
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload files';
    return c.json({ 
      success: false, 
      error: {
        message: errorMessage,
        code: 'UPLOAD_FAILED'
      }
    }, 500);
  }
};

const getFile = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const fileId = c.req.param('fileId');

    const result = await db
      .select()
      .from(vaultFiles)
      .innerJoin(vaultProjects, eq(vaultFiles.projectId, vaultProjects.id))
      .where(and(eq(vaultFiles.id, fileId), eq(vaultProjects.userId, userId)));

    const file = result[0];
    if (!file) {
      return c.json({ success: false, error: 'File not found' }, 404);
    }

    return c.json({ success: true, file: file.vault_files });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to get file');
    return c.json({ success: false, error: 'Failed to get file' }, 500);
  }
};

const deleteFile = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const fileId = c.req.param('fileId');

    // Get file with project ownership check
    const result = await db
      .select({
        file: vaultFiles,
        project: vaultProjects,
      })
      .from(vaultFiles)
      .innerJoin(vaultProjects, eq(vaultFiles.projectId, vaultProjects.id))
      .where(and(eq(vaultFiles.id, fileId), eq(vaultProjects.userId, userId)));

    const fileWithProject = result[0];
    if (!fileWithProject) {
      return c.json({ success: false, error: 'File not found' }, 404);
    }

    // Delete from storage
    if (fileWithProject.file.storagePath) {
      await deleteFileFromStorage(fileWithProject.file.storagePath).catch((err: Error) => {
        logger.warn({ error: err }, 'Failed to delete file from storage');
      });
    }

    // Delete record
    await db.delete(vaultFiles).where(eq(vaultFiles.id, fileId));

    // Update project file count
    await db
      .update(vaultProjects)
      .set({
        fileCount: sql`GREATEST(${vaultProjects.fileCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(vaultProjects.id, fileWithProject.project.id));

    return c.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to delete file');
    return c.json({ success: false, error: 'Failed to delete file' }, 500);
  }
};

const downloadFile = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const fileId = c.req.param('fileId');

    const result = await db
      .select({
        file: vaultFiles,
        project: vaultProjects,
      })
      .from(vaultFiles)
      .innerJoin(vaultProjects, eq(vaultFiles.projectId, vaultProjects.id))
      .where(and(eq(vaultFiles.id, fileId), eq(vaultProjects.userId, userId)));

    const fileWithProject = result[0];
    if (!fileWithProject || !fileWithProject.file.storagePath) {
      return c.json({ success: false, error: 'File not found' }, 404);
    }

    const fileBuffer = await getFileFromStorage(fileWithProject.file.storagePath);

    // Convert Buffer to Uint8Array for Hono response
    const uint8Array = new Uint8Array(fileBuffer);

    return new Response(uint8Array, {
      headers: {
        'Content-Type': fileWithProject.file.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileWithProject.file.name}"`,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to download file');
    return c.json({ success: false, error: 'Failed to download file' }, 500);
  }
};

// ============================================
// AI FEATURE HANDLERS
// ============================================

const generateColumns = async (c: Context) => {
  try {
    const body = (await c.req.json()) as GenerateColumnsRequest;

    const columns = await generateColumnsFromPrompt(body.prompt, body.existingColumns);

    return c.json({ success: true, columns });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to generate columns');
    return c.json({ success: false, error: 'Failed to generate columns' }, 500);
  }
};

const runExtraction = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const body = (await c.req.json()) as RunExtractionRequest;

    // Verify project ownership
    const projectResult = await db
      .select()
      .from(vaultProjects)
      .where(and(eq(vaultProjects.id, body.projectId), eq(vaultProjects.userId, userId)));

    if (!projectResult[0]) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    // Get files
    const files = await db
      .select()
      .from(vaultFiles)
      .where(and(eq(vaultFiles.projectId, body.projectId), inArray(vaultFiles.id, body.fileIds)));

    if (files.length === 0) {
      return c.json({ success: false, error: 'No valid files found' }, 400);
    }

    // Create query record - cast columns to the expected JSON type
    const queryResult = await db
      .insert(vaultQueries)
      .values({
        projectId: body.projectId,
        queryType: body.queryType,
        queryText: body.queryText ?? null,
        columns: body.columns as unknown as typeof vaultQueries.$inferInsert.columns,
        fileIds: body.fileIds,
        status: 'pending',
      })
      .returning();

    const query = queryResult[0];
    if (!query) {
      return c.json({ success: false, error: 'Failed to create query' }, 500);
    }

    // Get user context for job tracking
    const user = c.get('user') as { id: string; email: string; name: string | null } | undefined

    // Create job
    const jobId = createJob({
      userId: user?.id,
      userEmail: user?.email,
      jobType: 'vault-extraction',
      jobName: 'Vault Extraction',
    });

    logger.info(
      {
        jobId,
        queryId: query.id,
        projectId: body.projectId,
        fileCount: files.length,
        columnCount: body.columns.length,
      },
      'Vault: Starting extraction job'
    );

    // Run workflow in background
    runExtractionWorkflow(jobId, query.id, files, body.columns)
      .then((result) => {
        setJobResult(jobId, result);
      })
      .catch((error: Error) => {
        logger.error({ error, jobId, queryId: query.id }, 'Vault: Extraction job failed');
        setJobError(jobId, error.message || 'Unknown error');
      });

    return c.json({ success: true, jobId, queryId: query.id });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to start extraction');
    return c.json({ success: false, error: 'Failed to start extraction' }, 500);
  }
};

const askQuery = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const body = (await c.req.json()) as AskQueryRequest;

    // Verify project ownership
    const projectResult = await db
      .select()
      .from(vaultProjects)
      .where(and(eq(vaultProjects.id, body.projectId), eq(vaultProjects.userId, userId)));

    if (!projectResult[0]) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    // Get files
    const files = await db
      .select()
      .from(vaultFiles)
      .where(and(eq(vaultFiles.projectId, body.projectId), inArray(vaultFiles.id, body.fileIds)));

    if (files.length === 0) {
      return c.json({ success: false, error: 'No valid files found' }, 400);
    }

    // Create query record
    const queryResult = await db
      .insert(vaultQueries)
      .values({
        projectId: body.projectId,
        queryType: 'ask',
        queryText: body.question,
        fileIds: body.fileIds,
        status: 'pending',
      })
      .returning();

    const query = queryResult[0];
    if (!query) {
      return c.json({ success: false, error: 'Failed to create query' }, 500);
    }

    // Get user context for job tracking
    const user = c.get('user') as { id: string; email: string; name: string | null } | undefined

    // Create job
    const jobId = createJob({
      userId: user?.id,
      userEmail: user?.email,
      jobType: 'vault-ask',
      jobName: 'Vault Query',
    });

    logger.info(
      {
        jobId,
        queryId: query.id,
        projectId: body.projectId,
        fileCount: files.length,
      },
      'Vault: Starting ask query job'
    );

    // Run workflow in background
    runAskQueryWorkflow(jobId, query.id, files, body.question)
      .then((result) => {
        setJobResult(jobId, result);
      })
      .catch((error: Error) => {
        logger.error({ error, jobId, queryId: query.id }, 'Vault: Ask query job failed');
        setJobError(jobId, error.message || 'Unknown error');
      });

    return c.json({ success: true, jobId, queryId: query.id });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to start ask query');
    return c.json({ success: false, error: 'Failed to start ask query' }, 500);
  }
};

// ============================================
// QUERY HISTORY HANDLERS
// ============================================

const listQueries = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const projectId = c.req.param('projectId');

    // Verify project ownership
    const projectResult = await db
      .select()
      .from(vaultProjects)
      .where(and(eq(vaultProjects.id, projectId), eq(vaultProjects.userId, userId)));

    if (!projectResult[0]) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    const queries = await db
      .select()
      .from(vaultQueries)
      .where(eq(vaultQueries.projectId, projectId))
      .orderBy(desc(vaultQueries.createdAt))
      .limit(50);

    return c.json({ success: true, queries });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to list queries');
    return c.json({ success: false, error: 'Failed to list queries' }, 500);
  }
};

const getQueryResults = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const queryId = c.req.param('queryId');

    const result = await db
      .select({
        query: vaultQueries,
        project: vaultProjects,
      })
      .from(vaultQueries)
      .innerJoin(vaultProjects, eq(vaultQueries.projectId, vaultProjects.id))
      .where(and(eq(vaultQueries.id, queryId), eq(vaultProjects.userId, userId)));

    const queryWithProject = result[0];
    if (!queryWithProject) {
      return c.json({ success: false, error: 'Query not found' }, 404);
    }

    return c.json({ success: true, query: queryWithProject.query });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to get query results');
    return c.json({ success: false, error: 'Failed to get query results' }, 500);
  }
};

// ============================================
// CLAUSE HANDLERS
// ============================================

const saveClause = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json() as {
      name: string;
      text: string;
      category?: string;
      tags?: string[];
      description?: string;
      sourceDocument?: string;
    };

    if (!body.name || !body.text) {
      return c.json({ success: false, error: 'Name and text are required' }, 400);
    }

    const result = await db
      .insert(vaultClauses)
      .values({
        userId,
        name: body.name,
        text: body.text,
        category: body.category || null,
        tags: body.tags || [],
        description: body.description || null,
        sourceDocument: body.sourceDocument || null,
      })
      .returning();

    const clause = result[0];
    if (!clause) {
      return c.json({ success: false, error: 'Failed to save clause' }, 500);
    }

    logger.info({ clauseId: clause.id, userId }, 'Vault: Clause saved');

    return c.json({ success: true, clause });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to save clause');
    return c.json({ success: false, error: 'Failed to save clause' }, 500);
  }
};

const listClauses = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const category = c.req.query('category');

    let clauses;
    if (category) {
      clauses = await db
        .select()
        .from(vaultClauses)
        .where(and(eq(vaultClauses.userId, userId), eq(vaultClauses.category, category)))
        .orderBy(desc(vaultClauses.updatedAt));
    } else {
      clauses = await db
        .select()
        .from(vaultClauses)
        .where(eq(vaultClauses.userId, userId))
        .orderBy(desc(vaultClauses.updatedAt));
    }

    return c.json({ success: true, clauses });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to list clauses');
    return c.json({ success: false, error: 'Failed to list clauses' }, 500);
  }
};

const getClause = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const clauseId = c.req.param('clauseId');

    const result = await db
      .select()
      .from(vaultClauses)
      .where(and(eq(vaultClauses.id, clauseId), eq(vaultClauses.userId, userId)));

    const clause = result[0];
    if (!clause) {
      return c.json({ success: false, error: 'Clause not found' }, 404);
    }

    return c.json({ success: true, clause });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to get clause');
    return c.json({ success: false, error: 'Failed to get clause' }, 500);
  }
};

const updateClause = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const clauseId = c.req.param('clauseId');
    const body = await c.req.json() as Partial<{
      name: string;
      text: string;
      category: string;
      tags: string[];
      description: string;
    }>;

    const result = await db
      .update(vaultClauses)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(and(eq(vaultClauses.id, clauseId), eq(vaultClauses.userId, userId)))
      .returning();

    const clause = result[0];
    if (!clause) {
      return c.json({ success: false, error: 'Clause not found' }, 404);
    }

    return c.json({ success: true, clause });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to update clause');
    return c.json({ success: false, error: 'Failed to update clause' }, 500);
  }
};

const deleteClause = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const clauseId = c.req.param('clauseId');

    const result = await db
      .delete(vaultClauses)
      .where(and(eq(vaultClauses.id, clauseId), eq(vaultClauses.userId, userId)))
      .returning();

    if (result.length === 0) {
      return c.json({ success: false, error: 'Clause not found' }, 404);
    }

    logger.info({ clauseId, userId }, 'Vault: Clause deleted');

    return c.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to delete clause');
    return c.json({ success: false, error: 'Failed to delete clause' }, 500);
  }
};

const draftClause = async (c: Context) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json() as {
      instructions: string;
      clauseType?: string;
      referenceClauses?: string[];
      referencePlaybooks?: string[];
      referenceProjects?: string[];
    };

    if (!body.instructions || !body.instructions.trim()) {
      return c.json({ success: false, error: 'Instructions are required' }, 400);
    }

    // Build the prompt for clause drafting
    let systemPrompt = `You are an expert legal drafter. Your task is to draft a professional legal clause based on the user's instructions. 
The clause should be:
- Clear and precise
- Legally sound
- Well-structured
- Appropriate for the specified clause type (if provided)
- Consistent with the reference materials (if provided)

Return ONLY the drafted clause text, without any explanations or additional commentary.`;

    let userPrompt = `Please draft a legal clause based on the following instructions:\n\n${body.instructions}`;

    if (body.clauseType) {
      userPrompt += `\n\nClause Type: ${body.clauseType}`;
    }

    if (body.referenceClauses && body.referenceClauses.length > 0) {
      userPrompt += `\n\nReference Clauses:\n${body.referenceClauses.map((clause, idx) => `${idx + 1}. ${clause}`).join('\n')}`;
    }

    if (body.referencePlaybooks && body.referencePlaybooks.length > 0) {
      userPrompt += `\n\nReference Playbooks:\n${body.referencePlaybooks.map((playbook, idx) => `${idx + 1}. ${playbook}`).join('\n')}`;
    }

    if (body.referenceProjects && body.referenceProjects.length > 0) {
      userPrompt += `\n\nReference Projects:\n${body.referenceProjects.map((project, idx) => `${idx + 1}. ${project}`).join('\n')}`;
    }

    // Call LLM service to draft the clause
    const response = await llmService.generate({
      model: {
        provider: 'azure',
        model: 'gpt-4o',
        deployment: 'gpt-4o',
      },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 2000,
    });

    const draftedClauseText = response.content.trim();

    logger.info({ userId, clauseType: body.clauseType }, 'Vault: Clause drafted');

    return c.json({
      success: true,
      clauseText: draftedClauseText,
    });
  } catch (error) {
    logger.error({ error }, 'Vault: Failed to draft clause');
    return c.json({ success: false, error: 'Failed to draft clause' }, 500);
  }
};

// ============================================
// EXPORT CONTROLLER
// ============================================

export const vaultController = {
  // Projects
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  // Files
  listFiles,
  uploadFiles,
  getFile,
  deleteFile,
  downloadFile,
  // AI Features
  generateColumns,
  runExtraction,
  askQuery,
  // Query History
  listQueries,
  getQueryResults,
  // Clauses
  saveClause,
  listClauses,
  getClause,
  updateClause,
  deleteClause,
  draftClause,
};
