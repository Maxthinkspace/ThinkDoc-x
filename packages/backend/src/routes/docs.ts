import { apiReference } from '@scalar/hono-api-reference'
import type { OpenAPIHono } from '@hono/zod-openapi'

export function setupApiDocs(app: OpenAPIHono) {
  // Simple static OpenAPI spec for now to get it working
  app.get('/api/docs/openapi.json', (c) => {
    const spec = {
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
          description: 'Development server (HTTPS)',
        },
        {
          url: 'http://localhost:3003',
          description: 'Development server (HTTP)',
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
        responses: {
          BadRequest: {
            description: 'Bad Request - Validation Error',
            content: {
              'application/json': {
                schema: { '$ref': '#/components/schemas/Error' },
              },
            },
          },
          Unauthorized: {
            description: 'Unauthorized - Authentication Required',
            content: {
              'application/json': {
                schema: { '$ref': '#/components/schemas/Error' },
              },
            },
          },
          NotFound: {
            description: 'Not Found - Resource Does Not Exist',
            content: {
              'application/json': {
                schema: { '$ref': '#/components/schemas/Error' },
              },
            },
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  status: { type: 'number' },
                },
                required: ['message'],
              },
            },
            required: ['error'],
          },
          User: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'cuid2_user_id_12345' },
              email: { type: 'string', format: 'email', example: 'user@example.com' },
              name: { type: 'string', nullable: true, example: 'John Doe' },
              createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
              updatedAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
            },
            required: ['id', 'email', 'createdAt', 'updatedAt'],
          },
          Document: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'cuid2_doc_id_12345' },
              userId: { type: 'string', example: 'cuid2_user_id_12345' },
              title: { type: 'string', example: 'Project Proposal Draft' },
              content: { type: 'string', example: '# Project Proposal\\n\\nThis document outlines...' },
              metadata: {
                type: 'object',
                additionalProperties: true,
                example: { tags: ['proposal', 'draft'], priority: 'high' },
              },
              isActive: { type: 'boolean', example: true },
              createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
              updatedAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
            },
            required: ['id', 'userId', 'title', 'content', 'metadata', 'isActive', 'createdAt', 'updatedAt'],
          },
          Playbook: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid-playbook-id-12345' },
              userId: { type: 'string', example: 'cuid2_user_id_12345' },
              playbookName: { type: 'string', example: 'Legal Contract Review' },
              description: { type: 'string', nullable: true, example: 'Comprehensive contract review process for legal teams' },
              playbookType: { type: 'string', nullable: true, example: 'legal' },
              userPosition: { type: 'string', nullable: true, example: 'Legal Counsel' },
              jurisdiction: { type: 'string', nullable: true, example: 'US' },
              tags: { type: 'string', nullable: true, example: 'contract,review,legal' },
              rules: {
                description: 'Playbook rules and logic structure',
                example: {
                  steps: [
                    { id: 1, action: 'Review contract terms', conditions: ['standard_terms'] },
                    { id: 2, action: 'Check compliance', conditions: ['regulatory_check'] }
                  ]
                }
              },
              metadata: {
                type: 'object',
                additionalProperties: true,
                example: { version: '1.0', priority: 'high', isRemix: false },
              },
              isActive: { type: 'boolean', example: true },
              createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
              updatedAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
            },
            required: ['id', 'userId', 'playbookName', 'rules', 'metadata', 'isActive', 'createdAt', 'updatedAt'],
          },
          Subscription: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid-subscription-id-12345' },
              userId: { type: 'string', example: 'cuid2_user_id_12345' },
              subscriptionType: { 
                type: 'string', 
                enum: ['free', 'basic', 'professional', 'enterprise'],
                example: 'professional' 
              },
              status: { 
                type: 'string',
                enum: ['active', 'cancelled', 'expired', 'pending', 'trialing'],
                example: 'active' 
              },
              startDate: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
              endDate: { type: 'string', format: 'date-time', example: '2025-01-01T00:00:00.000Z' },
              trialEndDate: { type: 'string', format: 'date-time', nullable: true, example: '2024-01-15T00:00:00.000Z' },
              autoRenew: { type: 'boolean', example: true },
              amount: { type: 'string', nullable: true, example: '299.99' },
              currency: { type: 'string', example: 'USD' },
              billingPeriod: { 
                type: 'string',
                enum: ['monthly', 'yearly', 'quarterly'],
                example: 'yearly' 
              },
              paymentProvider: { type: 'string', nullable: true, example: 'stripe' },
              paymentId: { type: 'string', nullable: true, example: 'sub_xxxxxxxxxxxxxx' },
              createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
              updatedAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
            },
            required: ['id', 'userId', 'subscriptionType', 'status', 'startDate', 'endDate', 'currency', 'billingPeriod', 'createdAt', 'updatedAt'],
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
          name: 'LLM',
          description: 'Large Language Model integration endpoints for text generation',
        },
        {
          name: 'Playbooks',
          description: 'Playbook management, sharing, and remix functionality',
        },
        {
          name: 'Subscriptions',
          description: 'Subscription and payment management with Stripe integration',
        },
      ],
      paths: {
        '/api/auth/login': {
          post: {
            tags: ['Authentication'],
            summary: 'Authenticate user',
            description: 'Login with email and password to receive JWT token',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      email: { type: 'string', format: 'email', example: 'admin@example.com', description: 'Default: admin@example.com' },
                      password: { type: 'string', example: 'password123', description: 'Default: password123' },
                    },
                    required: ['email', 'password'],
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Login successful',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                            expiresIn: { type: 'string', example: '7d' },
                            user: { '$ref': '#/components/schemas/User' },
                          },
                          required: ['token', 'expiresIn', 'user'],
                        },
                      },
                      required: ['data'],
                    },
                  },
                },
              },
              '400': { '$ref': '#/components/responses/BadRequest' },
              '401': { '$ref': '#/components/responses/Unauthorized' },
            },
          },
        },
        '/api/auth/register': {
          post: {
            tags: ['Authentication'],
            summary: 'Register a new user',
            description: 'Create a new user account with email and password',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      email: { type: 'string', format: 'email', example: 'newuser@example.com' },
                      password: { type: 'string', minLength: 8, example: 'password123' },
                      name: { type: 'string', example: 'New User' },
                    },
                    required: ['email', 'password'],
                  },
                },
              },
            },
            responses: {
              '201': {
                description: 'User successfully registered',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            token: { type: 'string' },
                            expiresIn: { type: 'string' },
                            user: { '$ref': '#/components/schemas/User' },
                          },
                        },
                      },
                    },
                  },
                },
              },
              '400': { '$ref': '#/components/responses/BadRequest' },
            },
          },
        },
        '/api/auth/me': {
          get: {
            tags: ['Authentication'],
            summary: 'Get current user profile',
            description: 'Retrieve the authenticated user\'s profile information',
            security: [{ bearerAuth: [] }],
            responses: {
              '200': {
                description: 'User profile retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: { '$ref': '#/components/schemas/User' },
                      },
                      required: ['data'],
                    },
                  },
                },
              },
              '401': { '$ref': '#/components/responses/Unauthorized' },
            },
          },
        },
        '/api/documents': {
          get: {
            tags: ['Documents'],
            summary: 'List user documents',
            description: 'Retrieve a paginated list of the authenticated user\'s documents',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: 'page',
                in: 'query',
                description: 'Page number for pagination (starts at 1)',
                schema: { type: 'integer', minimum: 1, example: 1 },
              },
              {
                name: 'limit',
                in: 'query',
                description: 'Number of items per page (max 50)',
                schema: { type: 'integer', minimum: 1, maximum: 50, example: 10 },
              },
            ],
            responses: {
              '200': {
                description: 'Documents retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              title: { type: 'string' },
                              metadata: { type: 'object', additionalProperties: true },
                              createdAt: { type: 'string', format: 'date-time' },
                              updatedAt: { type: 'string', format: 'date-time' },
                            },
                          },
                        },
                        pagination: {
                          type: 'object',
                          properties: {
                            page: { type: 'integer' },
                            limit: { type: 'integer' },
                            hasMore: { type: 'boolean' },
                          },
                        },
                      },
                    },
                  },
                },
              },
              '401': { '$ref': '#/components/responses/Unauthorized' },
            },
          },
          post: {
            tags: ['Documents'],
            summary: 'Create new document',
            description: 'Create a new document for the authenticated user',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      title: { type: 'string', minLength: 1, maxLength: 255, example: 'New Project Proposal' },
                      content: { type: 'string', example: '# New Project\\n\\nProject description...' },
                      metadata: { type: 'object', additionalProperties: true, example: { tags: ['project'], category: 'proposal' } },
                    },
                    required: ['title'],
                  },
                },
              },
            },
            responses: {
              '201': {
                description: 'Document created successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: { '$ref': '#/components/schemas/Document' },
                      },
                    },
                  },
                },
              },
              '400': { '$ref': '#/components/responses/BadRequest' },
              '401': { '$ref': '#/components/responses/Unauthorized' },
            },
          },
        },
        '/api/documents/{id}': {
          get: {
            tags: ['Documents'],
            summary: 'Get document by ID',
            description: 'Retrieve a specific document by its ID',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                description: 'Document identifier',
                schema: { type: 'string', example: 'cuid2_doc_id_12345' },
              },
            ],
            responses: {
              '200': {
                description: 'Document retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: { '$ref': '#/components/schemas/Document' },
                      },
                    },
                  },
                },
              },
              '401': { '$ref': '#/components/responses/Unauthorized' },
              '404': { '$ref': '#/components/responses/NotFound' },
            },
          },
          put: {
            tags: ['Documents'],
            summary: 'Update document',
            description: 'Update an existing document\'s content or metadata',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                description: 'Document identifier',
                schema: { type: 'string' },
              },
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      title: { type: 'string', minLength: 1, maxLength: 255 },
                      content: { type: 'string' },
                      metadata: { type: 'object', additionalProperties: true },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Document updated successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: { '$ref': '#/components/schemas/Document' },
                      },
                    },
                  },
                },
              },
              '400': { '$ref': '#/components/responses/BadRequest' },
              '401': { '$ref': '#/components/responses/Unauthorized' },
              '404': { '$ref': '#/components/responses/NotFound' },
            },
          },
          delete: {
            tags: ['Documents'],
            summary: 'Delete document',
            description: 'Soft delete a document (marks as inactive)',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                description: 'Document identifier to delete',
                schema: { type: 'string' },
              },
            ],
            responses: {
              '200': {
                description: 'Document deleted successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: { type: 'string', example: 'Document deleted successfully' },
                      },
                    },
                  },
                },
              },
              '401': { '$ref': '#/components/responses/Unauthorized' },
              '404': { '$ref': '#/components/responses/NotFound' },
            },
          },
        },
        '/api/llm/generate': {
          post: {
            tags: ['LLM'],
            summary: 'Generate text using AI models',
            description: 'Generate text completion using various LLM providers',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      provider: {
                        type: 'string',
                        enum: ['openai', 'anthropic', 'google', 'openrouter', 'ollama'],
                        example: 'openai',
                        description: 'LLM provider to use'
                      },
                      model: {
                        type: 'string',
                        example: 'gpt-4o',
                        description: 'Model identifier'
                      },
                      messages: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            role: {
                              type: 'string',
                              enum: ['system', 'user', 'assistant'],
                              example: 'user'
                            },
                            content: {
                              type: 'string',
                              example: 'Hello, how are you?'
                            }
                          },
                          required: ['role', 'content']
                        },
                        minItems: 1
                      },
                      temperature: {
                        type: 'number',
                        minimum: 0,
                        maximum: 2,
                        example: 0.7,
                        description: 'Sampling temperature'
                      },
                      maxTokens: {
                        type: 'integer',
                        minimum: 1,
                        example: 1000,
                        description: 'Maximum tokens to generate'
                      },
                      apiKey: {
                        type: 'string',
                        description: 'API key for the provider (optional if configured)'
                      },
                      baseUrl: {
                        type: 'string',
                        description: 'Custom base URL for the provider'
                      }
                    },
                    required: ['provider', 'model', 'messages']
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Text generated successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: true },
                        data: {
                          type: 'object',
                          properties: {
                            content: { type: 'string', example: 'Generated text response' },
                            usage: {
                              type: 'object',
                              properties: {
                                promptTokens: { type: 'integer' },
                                completionTokens: { type: 'integer' },
                                totalTokens: { type: 'integer' }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              '400': { '$ref': '#/components/responses/BadRequest' },
              '500': {
                description: 'Generation error',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: false },
                        error: {
                          type: 'object',
                          properties: {
                            message: { type: 'string' },
                            code: { type: 'string', example: 'GENERATION_ERROR' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '/api/llm/stream': {
          post: {
            tags: ['LLM'],
            summary: 'Stream text generation',
            description: 'Stream text completion using various LLM providers with Server-Sent Events',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      provider: {
                        type: 'string',
                        enum: ['openai', 'anthropic', 'google', 'openrouter', 'ollama'],
                        example: 'openai'
                      },
                      model: { type: 'string', example: 'gpt-4o' },
                      messages: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            role: { type: 'string', enum: ['system', 'user', 'assistant'] },
                            content: { type: 'string' }
                          }
                        }
                      },
                      temperature: { type: 'number', minimum: 0, maximum: 2 },
                      maxTokens: { type: 'integer', minimum: 1 },
                      apiKey: { type: 'string' },
                      baseUrl: { type: 'string' }
                    },
                    required: ['provider', 'model', 'messages']
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Streaming response started',
                content: {
                  'text/event-stream': {
                    schema: {
                      type: 'string',
                      example: 'data: {"content": "Hello", "delta": "Hello"}\n\n'
                    }
                  }
                }
              },
              '400': { '$ref': '#/components/responses/BadRequest' },
              '500': {
                description: 'Stream error',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: false },
                        error: {
                          type: 'object',
                          properties: {
                            message: { type: 'string' },
                            code: { type: 'string', example: 'STREAM_ERROR' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '/api/llm/models': {
          get: {
            tags: ['LLM'],
            summary: 'Get available models',
            description: 'Retrieve list of available models for each provider',
            responses: {
              '200': {
                description: 'Available models retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: true },
                        data: {
                          type: 'object',
                          properties: {
                            openai: {
                              type: 'array',
                              items: { type: 'string' },
                              example: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']
                            },
                            anthropic: {
                              type: 'array',
                              items: { type: 'string' },
                              example: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022']
                            },
                            google: {
                              type: 'array',
                              items: { type: 'string' },
                              example: ['gemini-1.5-pro', 'gemini-1.5-flash']
                            },
                            openrouter: {
                              type: 'array',
                              items: { type: 'string' },
                              example: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o']
                            },
                            ollama: {
                              type: 'array',
                              items: { type: 'string' },
                              example: ['llama3.1', 'qwen2.5', 'codellama']
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '/api/playbooks': {
          get: {
            tags: ['Playbooks'],
            summary: 'List user playbooks',
            description: 'Retrieve a paginated list of the authenticated user\'s playbooks',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: 'page',
                in: 'query',
                description: 'Page number for pagination (starts at 1)',
                schema: { type: 'integer', minimum: 1, example: 1 },
              },
              {
                name: 'limit',
                in: 'query',
                description: 'Number of items per page (max 50)',
                schema: { type: 'integer', minimum: 1, maximum: 50, example: 10 },
              },
            ],
            responses: {
              '200': {
                description: 'Playbooks retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { '$ref': '#/components/schemas/Playbook' }
                        },
                        pagination: {
                          type: 'object',
                          properties: {
                            page: { type: 'integer' },
                            limit: { type: 'integer' },
                            hasMore: { type: 'boolean' }
                          }
                        }
                      }
                    }
                  }
                }
              },
              '401': { '$ref': '#/components/responses/Unauthorized' }
            }
          },
          post: {
            tags: ['Playbooks'],
            summary: 'Create new playbook',
            description: 'Create a new playbook for the authenticated user',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      playbookName: {
                        type: 'string',
                        minLength: 1,
                        example: 'Legal Contract Review',
                        description: 'Name of the playbook'
                      },
                      description: {
                        type: 'string',
                        example: 'Comprehensive contract review process for legal teams',
                        description: 'Optional description of the playbook'
                      },
                      playbookType: {
                        type: 'string',
                        example: 'legal',
                        description: 'Category or type of playbook'
                      },
                      userPosition: {
                        type: 'string',
                        example: 'Legal Counsel',
                        description: 'User\'s position relevant to this playbook'
                      },
                      jurisdiction: {
                        type: 'string',
                        example: 'US',
                        description: 'Legal jurisdiction if applicable'
                      },
                      tags: {
                        type: 'string',
                        example: 'contract,review,legal',
                        description: 'Comma-separated tags'
                      },
                      rules: {
                        description: 'Playbook rules and logic structure',
                        example: {
                          steps: [
                            { id: 1, action: 'Review contract terms', conditions: ['standard_terms'] },
                            { id: 2, action: 'Check compliance', conditions: ['regulatory_check'] }
                          ]
                        }
                      },
                      metadata: {
                        type: 'object',
                        additionalProperties: true,
                        example: { version: '1.0', priority: 'high' },
                        description: 'Additional metadata'
                      }
                    },
                    required: ['playbookName', 'rules']
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Playbook created successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: { '$ref': '#/components/schemas/Playbook' }
                      }
                    }
                  }
                }
              },
              '400': { '$ref': '#/components/responses/BadRequest' },
              '401': { '$ref': '#/components/responses/Unauthorized' }
            }
          }
        },
        '/api/playbooks/shared-with-me': {
          get: {
            tags: ['Playbooks'],
            summary: 'List shared playbooks',
            description: 'Retrieve playbooks that have been shared with the authenticated user',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: 'page',
                in: 'query',
                description: 'Page number for pagination (starts at 1)',
                schema: { type: 'integer', minimum: 1, example: 1 },
              },
              {
                name: 'limit',
                in: 'query',
                description: 'Number of items per page (max 50)',
                schema: { type: 'integer', minimum: 1, maximum: 50, example: 10 },
              },
            ],
            responses: {
              '200': {
                description: 'Shared playbooks retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: {
                            allOf: [
                              { '$ref': '#/components/schemas/Playbook' },
                              {
                                type: 'object',
                                properties: {
                                  shareType: {
                                    type: 'string',
                                    enum: ['view', 'remix'],
                                    description: 'Type of access granted'
                                  },
                                  ownerEmail: {
                                    type: 'string',
                                    format: 'email',
                                    description: 'Email of playbook owner'
                                  },
                                  ownerId: {
                                    type: 'string',
                                    description: 'ID of playbook owner'
                                  }
                                }
                              }
                            ]
                          }
                        },
                        pagination: {
                          type: 'object',
                          properties: {
                            page: { type: 'integer' },
                            limit: { type: 'integer' },
                            hasMore: { type: 'boolean' }
                          }
                        }
                      }
                    }
                  }
                }
              },
              '401': { '$ref': '#/components/responses/Unauthorized' }
            }
          }
        },
        '/api/playbooks/{id}': {
          get: {
            tags: ['Playbooks'],
            summary: 'Get playbook by ID',
            description: 'Retrieve a specific playbook by its ID',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                description: 'Playbook identifier',
                schema: { type: 'string', example: 'uuid-playbook-id' }
              }
            ],
            responses: {
              '200': {
                description: 'Playbook retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: { '$ref': '#/components/schemas/Playbook' }
                      }
                    }
                  }
                }
              },
              '401': { '$ref': '#/components/responses/Unauthorized' },
              '404': { '$ref': '#/components/responses/NotFound' }
            }
          },
          put: {
            tags: ['Playbooks'],
            summary: 'Update playbook',
            description: 'Update an existing playbook\'s content or metadata',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                description: 'Playbook identifier',
                schema: { type: 'string' }
              }
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      playbookName: { type: 'string', minLength: 1 },
                      description: { type: 'string' },
                      playbookType: { type: 'string' },
                      userPosition: { type: 'string' },
                      jurisdiction: { type: 'string' },
                      tags: { type: 'string' },
                      rules: { description: 'Playbook rules structure' },
                      metadata: { type: 'object', additionalProperties: true }
                    }
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Playbook updated successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: { '$ref': '#/components/schemas/Playbook' }
                      }
                    }
                  }
                }
              },
              '400': { '$ref': '#/components/responses/BadRequest' },
              '401': { '$ref': '#/components/responses/Unauthorized' },
              '404': { '$ref': '#/components/responses/NotFound' }
            }
          },
          delete: {
            tags: ['Playbooks'],
            summary: 'Delete playbook',
            description: 'Soft delete a playbook (marks as inactive)',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                description: 'Playbook identifier',
                schema: { type: 'string' }
              }
            ],
            responses: {
              '200': {
                description: 'Playbook deleted successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: { type: 'string', example: 'Playbook deleted successfully' }
                      }
                    }
                  }
                }
              },
              '401': { '$ref': '#/components/responses/Unauthorized' },
              '404': { '$ref': '#/components/responses/NotFound' }
            }
          }
        },
        '/api/playbooks/{id}/share': {
          post: {
            tags: ['Playbooks'],
            summary: 'Share playbook',
            description: 'Share a playbook with another user by email',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                description: 'Playbook identifier',
                schema: { type: 'string' }
              }
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      sharedWithEmail: {
                        type: 'string',
                        format: 'email',
                        example: 'colleague@example.com',
                        description: 'Email of user to share with'
                      },
                      shareType: {
                        type: 'string',
                        enum: ['view', 'remix'],
                        example: 'view',
                        description: 'Type of access to grant (view or remix)'
                      }
                    },
                    required: ['sharedWithEmail', 'shareType']
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Playbook shared successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            playbookId: { type: 'string' },
                            ownerId: { type: 'string' },
                            sharedWithUserId: { type: 'string' },
                            shareType: { type: 'string', enum: ['view', 'remix'] },
                            createdAt: { type: 'string', format: 'date-time' }
                          }
                        }
                      }
                    }
                  }
                }
              },
              '400': { '$ref': '#/components/responses/BadRequest' },
              '401': { '$ref': '#/components/responses/Unauthorized' },
              '404': { '$ref': '#/components/responses/NotFound' }
            }
          }
        },
        '/api/playbooks/{id}/remix': {
          post: {
            tags: ['Playbooks'],
            summary: 'Remix playbook',
            description: 'Create a remix (copy) of an existing playbook with modifications',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                description: 'Original playbook identifier',
                schema: { type: 'string' }
              }
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      playbookName: {
                        type: 'string',
                        minLength: 1,
                        example: 'My Contract Review Remix',
                        description: 'Name for the remixed playbook'
                      },
                      description: {
                        type: 'string',
                        example: 'Customized version of the original contract review process',
                        description: 'Optional description for the remix'
                      }
                    },
                    required: ['playbookName']
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Playbook remixed successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: { '$ref': '#/components/schemas/Playbook' }
                      }
                    }
                  }
                }
              },
              '400': { '$ref': '#/components/responses/BadRequest' },
              '401': { '$ref': '#/components/responses/Unauthorized' },
              '404': { '$ref': '#/components/responses/NotFound' }
            }
          }
        },
        '/api/playbooks/{id}/unshare': {
          delete: {
            tags: ['Playbooks'],
            summary: 'Unshare playbook',
            description: 'Remove sharing access for a specific user',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                description: 'Playbook identifier',
                schema: { type: 'string' }
              }
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      sharedWithEmail: {
                        type: 'string',
                        format: 'email',
                        example: 'colleague@example.com',
                        description: 'Email of user to remove access from'
                      }
                    },
                    required: ['sharedWithEmail']
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Playbook unshared successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: { type: 'string', example: 'Playbook unshared successfully' }
                      }
                    }
                  }
                }
              },
              '400': { '$ref': '#/components/responses/BadRequest' },
              '401': { '$ref': '#/components/responses/Unauthorized' },
              '404': { '$ref': '#/components/responses/NotFound' }
            }
          }
        },
        '/api/subscriptions': {
          get: {
            tags: ['Subscriptions'],
            summary: 'List user subscriptions',
            description: 'Get all subscriptions for the authenticated user',
            security: [{ bearerAuth: [] }],
            responses: {
              '200': {
                description: 'Subscriptions retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { '$ref': '#/components/schemas/Subscription' }
                        }
                      }
                    }
                  }
                }
              },
              '401': { '$ref': '#/components/responses/Unauthorized' }
            }
          },
          post: {
            tags: ['Subscriptions'],
            summary: 'Create a new subscription',
            description: 'Get Stripe payment link for subscription. Defaults to professional plan with monthly billing if no parameters provided.',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: false,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      subscriptionType: {
                        type: 'string',
                        enum: ['basic', 'professional', 'enterprise'],
                        example: 'professional',
                        description: 'Type of subscription plan (default: professional)'
                      },
                      billingPeriod: {
                        type: 'string',
                        enum: ['monthly', 'yearly', 'quarterly'],
                        example: 'monthly',
                        description: 'Billing period for the subscription (default: monthly)'
                      }
                    }
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Payment link generated successfully. Prices are managed in Stripe dashboard.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        url: {
                          type: 'string',
                          format: 'uri',
                          example: 'https://buy.stripe.com/9B6eVd1dM1Ekceu5zB4Rq00',
                          description: 'Stripe payment link URL to redirect user for payment'
                        },
                        subscriptionType: {
                          type: 'string',
                          example: 'professional',
                          description: 'Selected subscription type'
                        },
                        billingPeriod: {
                          type: 'string',
                          example: 'monthly',
                          description: 'Selected billing period'
                        }
                      }
                    }
                  }
                }
              },
              '400': { '$ref': '#/components/responses/BadRequest' },
              '401': { '$ref': '#/components/responses/Unauthorized' }
            }
          }
        },
        '/api/subscriptions/{id}': {
          get: {
            tags: ['Subscriptions'],
            summary: 'Get subscription details',
            description: 'Get details of a specific subscription',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                description: 'Subscription ID',
                schema: { type: 'string', example: 'uuid-subscription-id-12345' }
              }
            ],
            responses: {
              '200': {
                description: 'Subscription retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: { '$ref': '#/components/schemas/Subscription' }
                      }
                    }
                  }
                }
              },
              '401': { '$ref': '#/components/responses/Unauthorized' },
              '404': { '$ref': '#/components/responses/NotFound' }
            }
          }
        },
        '/api/subscriptions/{id}/cancel': {
          post: {
            tags: ['Subscriptions'],
            summary: 'Cancel a subscription',
            description: 'Cancel an active subscription',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                description: 'Subscription ID',
                schema: { type: 'string', example: 'uuid-subscription-id-12345' }
              }
            ],
            requestBody: {
              required: false,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      reason: {
                        type: 'string',
                        example: 'No longer needed',
                        description: 'Reason for cancellation'
                      }
                    }
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Subscription cancelled successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: { '$ref': '#/components/schemas/Subscription' }
                      }
                    }
                  }
                }
              },
              '400': { '$ref': '#/components/responses/BadRequest' },
              '401': { '$ref': '#/components/responses/Unauthorized' },
              '404': { '$ref': '#/components/responses/NotFound' }
            }
          }
        },
        '/api/subscriptions/webhook': {
          post: {
            tags: ['Subscriptions'],
            summary: 'Stripe webhook handler',
            description: 'Handle Stripe webhook events for subscription updates. This endpoint is called by Stripe and does not require JWT authentication. Instead, it uses Stripe signature verification.',
            parameters: [
              {
                name: 'stripe-signature',
                in: 'header',
                required: true,
                description: 'Stripe signature for webhook verification',
                schema: { type: 'string' }
              }
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    description: 'Stripe webhook event payload',
                    properties: {
                      type: {
                        type: 'string',
                        example: 'checkout.session.completed',
                        description: 'Stripe event type'
                      },
                      data: {
                        type: 'object',
                        description: 'Event data payload'
                      }
                    }
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Webhook processed successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        received: { type: 'boolean', example: true }
                      }
                    }
                  }
                }
              },
              '400': {
                description: 'Invalid webhook signature',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: { type: 'string', example: 'Invalid signature' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
      },
    }

    return c.json(spec)
  })

  // Scalar API Reference UI
  const apiRefConfig = {
    theme: 'kepler',
    spec: {
      url: '/api/docs/openapi.json',
    },
  }
  app.get('/api/docs', apiReference(apiRefConfig as any))

  // Alternative ReDoc documentation
  app.get('/api/docs/redoc', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Office Add-in API - ReDoc</title>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          <redoc spec-url="/api/docs/openapi.json"></redoc>
          <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
        </body>
      </html>
    `)
  })

  // API documentation info endpoint
  app.get('/api/docs/info', (c) => {
    return c.json({
      title: 'Office Add-in API Documentation',
      version: '1.0.0',
      description: 'Comprehensive API documentation for the Office Add-in Backend',
      endpoints: {
        interactive: '/api/docs',
        openapi: '/api/docs/openapi.json',
        redoc: '/api/docs/redoc',
      },
      features: [
        'Interactive API testing with Scalar UI',
        'Type-safe schema validation with Zod',
        'JWT authentication support',
        'Static OpenAPI 3.1 specification',
      ],
    })
  })
}