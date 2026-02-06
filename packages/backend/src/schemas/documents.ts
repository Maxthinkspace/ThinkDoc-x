import { z } from 'zod'
import { createRoute } from '@hono/zod-openapi'
import { commonResponses, dataResponse, paginatedResponse } from '@/lib/openapi'

// Document schemas with OpenAPI metadata
export const documentSchema = z
  .object({
    id: z.string().openapi({
      description: 'Unique document identifier',
      example: 'cuid2_doc_id_12345',
    }),
    userId: z.string().openapi({
      description: 'Owner user identifier',
      example: 'cuid2_user_id_12345',
    }),
    title: z.string().openapi({
      description: 'Document title',
      example: 'Project Proposal Draft',
    }),
    content: z.string().openapi({
      description: 'Document content in markdown or plain text',
      example: '# Project Proposal\n\nThis document outlines...',
    }),
    metadata: z.record(z.string(), z.unknown()).openapi({
      description: 'Additional document metadata',
      example: { tags: ['proposal', 'draft'], priority: 'high' },
    }),
    isActive: z.boolean().openapi({
      description: 'Whether the document is active (not deleted)',
      example: true,
    }),
    createdAt: z.string().datetime().openapi({
      description: 'Document creation timestamp',
      example: '2024-01-01T00:00:00.000Z',
    }),
    updatedAt: z.string().datetime().openapi({
      description: 'Last update timestamp',
      example: '2024-01-01T00:00:00.000Z',
    }),
  })
  .openapi({
    title: 'Document',
    description: 'Document information with content and metadata',
  })

export const createDocumentSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .max(255)
      .openapi({
        description: 'Document title (1-255 characters)',
        example: 'New Project Proposal',
        minLength: 1,
        maxLength: 255,
      }),
    content: z
      .string()
      .optional()
      .openapi({
        description: 'Initial document content',
        example: '# New Project\n\nProject description goes here...',
      }),
    metadata: z
      .record(z.string(), z.unknown())
      .optional()
      .openapi({
        description: 'Additional metadata for the document',
        example: { tags: ['project', 'new'], category: 'proposal' },
      }),
  })
  .openapi({
    title: 'Create Document',
    description: 'Data required to create a new document',
  })

export const updateDocumentSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .openapi({
        description: 'Updated document title',
        example: 'Updated Project Proposal',
      }),
    content: z
      .string()
      .optional()
      .openapi({
        description: 'Updated document content',
        example: '# Updated Project\n\nRevised content...',
      }),
    metadata: z
      .record(z.string(), z.unknown())
      .optional()
      .openapi({
        description: 'Updated metadata',
        example: { tags: ['project', 'revised'], status: 'review' },
      }),
  })
  .openapi({
    title: 'Update Document',
    description: 'Data for updating an existing document',
  })

export const queryDocumentsSchema = z
  .object({
    page: z
      .string()
      .transform(Number)
      .optional()
      .openapi({
        description: 'Page number for pagination (starts at 1)',
        example: '1',
        param: {
          name: 'page',
          in: 'query',
        },
      }),
    limit: z
      .string()
      .transform(Number)
      .optional()
      .openapi({
        description: 'Number of items per page (max 50)',
        example: '10',
        param: {
          name: 'limit',
          in: 'query',
        },
      }),
  })
  .openapi({
    title: 'Query Documents',
    description: 'Query parameters for listing documents',
  })

export const documentListItemSchema = z
  .object({
    id: z.string().openapi({
      description: 'Document identifier',
      example: 'cuid2_doc_id_12345',
    }),
    title: z.string().openapi({
      description: 'Document title',
      example: 'Project Proposal Draft',
    }),
    metadata: z.record(z.string(), z.unknown()).openapi({
      description: 'Document metadata',
      example: { tags: ['proposal'], status: 'draft' },
    }),
    createdAt: z.string().datetime().openapi({
      description: 'Creation timestamp',
      example: '2024-01-01T00:00:00.000Z',
    }),
    updatedAt: z.string().datetime().openapi({
      description: 'Last update timestamp',
      example: '2024-01-01T00:00:00.000Z',
    }),
  })
  .openapi({
    title: 'Document List Item',
    description: 'Simplified document information for listing',
  })

// OpenAPI route definitions
export const listDocumentsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Documents'],
  summary: 'List user documents',
  description: 'Retrieve a paginated list of the authenticated user\'s documents',
  security: [{ bearerAuth: [] }],
  request: {
    query: queryDocumentsSchema,
  },
  responses: {
    200: {
      description: 'Documents retrieved successfully',
      content: {
        'application/json': {
          schema: paginatedResponse(documentListItemSchema),
        },
      },
    },
    ...commonResponses,
  },
})

export const getDocumentRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Documents'],
  summary: 'Get document by ID',
  description: 'Retrieve a specific document by its ID',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({
        description: 'Document identifier',
        example: 'cuid2_doc_id_12345',
        param: {
          name: 'id',
          in: 'path',
        },
      }),
    }),
  },
  responses: {
    200: {
      description: 'Document retrieved successfully',
      content: {
        'application/json': {
          schema: dataResponse(documentSchema),
        },
      },
    },
    ...commonResponses,
  },
})

export const createDocumentRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Documents'],
  summary: 'Create new document',
  description: 'Create a new document for the authenticated user',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createDocumentSchema,
        },
      },
      description: 'Document creation data',
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Document created successfully',
      content: {
        'application/json': {
          schema: dataResponse(documentSchema),
        },
      },
    },
    ...commonResponses,
  },
})

export const updateDocumentRoute = createRoute({
  method: 'put',
  path: '/{id}',
  tags: ['Documents'],
  summary: 'Update document',
  description: 'Update an existing document\'s content or metadata',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({
        description: 'Document identifier',
        example: 'cuid2_doc_id_12345',
        param: {
          name: 'id',
          in: 'path',
        },
      }),
    }),
    body: {
      content: {
        'application/json': {
          schema: updateDocumentSchema,
        },
      },
      description: 'Document update data',
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Document updated successfully',
      content: {
        'application/json': {
          schema: dataResponse(documentSchema),
        },
      },
    },
    ...commonResponses,
  },
})

export const deleteDocumentRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Documents'],
  summary: 'Delete document',
  description: 'Soft delete a document (marks as inactive)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({
        description: 'Document identifier to delete',
        example: 'cuid2_doc_id_12345',
        param: {
          name: 'id',
          in: 'path',
        },
      }),
    }),
  },
  responses: {
    200: {
      description: 'Document deleted successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string().openapi({
              description: 'Deletion confirmation message',
              example: 'Document deleted successfully',
            }),
          }),
        },
      },
    },
    ...commonResponses,
  },
})