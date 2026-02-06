import { OpenAPIHono } from '@hono/zod-openapi'

// Create OpenAPI app instance
export function createOpenAPIApp() {
  return new OpenAPIHono({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          {
            error: {
              message: 'Validation failed',
              details: result.error.flatten(),
            },
          },
          400
        )
      }
      return;
    },
  })
}

// OpenAPI configuration
export const openAPIConfig = {
  openapi: '3.1.0',
  info: {
    title: 'Office Add-in Backend API',
    description: 'A comprehensive API for Office Add-in functionality with document management, collaboration features, and LLM integration.',
    version: '1.0.0',
    contact: {
      name: 'API Support',
      url: 'https://github.com/your-repo/office-addin-backend',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'https://localhost:3003',
      description: 'Development server',
    },
    {
      url: 'https://api.your-domain.com',
      description: 'Production server',
    },
  ],
  security: [
    {
      bearerAuth: [],
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /api/auth/login',
      },
    },
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints',
    },
    {
      name: 'Documents',
      description: 'Document management operations',
    },
    {
      name: 'Comments',
      description: 'Document comment management',
    },
    {
      name: 'Highlights',
      description: 'Text highlighting functionality',
    },
    {
      name: 'LLM',
      description: 'Large Language Model integration endpoints',
    },
    {
      name: 'Health',
      description: 'System health and monitoring',
    },
  ],
} as const

const createErrorSchema = (messageType: 'string' | 'number' = 'number') => ({
  type: 'object' as const,
  properties: {
    error: {
      type: 'object' as const,
      properties: {
        message: { type: 'string' as const },
        ...(messageType === 'number' ? { status: { type: 'number' as const } } : { details: { type: 'object' as const } }),
      },
      required: messageType === 'number' ? ['message', 'status'] : ['message'],
    },
  },
  required: ['error'],
});

// Common response schemas
export const commonResponses = {
  400: {
    description: 'Bad Request - Validation Error',
    content: {
      'application/json': {
        schema: createErrorSchema('string'), // Specifically for 400 validation details
      },
    },
  },
  401: {
    description: 'Unauthorized - Authentication Required',
    content: {
      'application/json': {
        schema: createErrorSchema('number'),
      },
    },
  },
  404: {
    description: 'Not Found - Resource Does Not Exist',
    content: {
      'application/json': {
        schema: createErrorSchema('number'),
      },
    },
  },
  500: {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: createErrorSchema('number'),
      },
    },
  },
};

// // Common response schemas
// export const commonResponses = {
//   400: {
//     description: 'Bad Request - Validation Error',
//     content: {
//       'application/json': {
//         schema: {
//           type: 'object',
//           properties: {
//             error: {
//               type: 'object',
//               properties: {
//                 message: { type: 'string' },
//                 details: { type: 'object' },
//               },
//               required: ['message'],
//             },
//           },
//           required: ['error'],
//         },
//       },
//     },
//   },
//   401: {
//     description: 'Unauthorized - Authentication Required',
//     content: {
//       'application/json': {
//         schema: {
//           type: 'object',
//           properties: {
//             error: {
//               type: 'object',
//               properties: {
//                 message: { type: 'string' },
//                 status: { type: 'number' },
//               },
//               required: ['message', 'status'],
//             },
//           },
//           required: ['error'],
//         },
//       },
//     },
//   },
//   404: {
//     description: 'Not Found - Resource Does Not Exist',
//     content: {
//       'application/json': {
//         schema: {
//           type: 'object',
//           properties: {
//             error: {
//               type: 'object',
//               properties: {
//                 message: { type: 'string' },
//                 status: { type: 'number' },
//               },
//               required: ['message', 'status'],
//             },
//           },
//           required: ['error'],
//         },
//       },
//     },
//   },
//   500: {
//     description: 'Internal Server Error',
//     content: {
//       'application/json': {
//         schema: {
//           type: 'object',
//           properties: {
//             error: {
//               type: 'object',
//               properties: {
//                 message: { type: 'string' },
//                 status: { type: 'number' },
//               },
//               required: ['message', 'status'],
//             },
//           },
//           required: ['error'],
//         },
//       },
//     },
//   },
// } as const

// Pagination response wrapper
export const paginatedResponse = (dataSchema: any) => ({
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: dataSchema,
    },
    pagination: {
      type: 'object',
      properties: {
        page: { type: 'number', minimum: 1 },
        limit: { type: 'number', minimum: 1, maximum: 50 },
        hasMore: { type: 'boolean' },
      },
      required: ['page', 'limit', 'hasMore'],
    },
  },
  required: ['data', 'pagination'],
})

// Standard data response wrapper
export const dataResponse = (dataSchema: any) => ({
  type: 'object' as const,
  properties: {
    data: dataSchema,
  },
  required: ['data'],
})