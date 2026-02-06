import { z } from 'zod'
import { createRoute } from '@hono/zod-openapi'
import { commonResponses, dataResponse } from '@/lib/openapi'

// Enhanced authentication schemas with OpenAPI metadata
export const registerSchema = z
  .object({
    email: z
      .string()
      .email()
      .openapi({
        description: 'User email address',
        example: 'user@example.com',
      }),
    password: z
      .string()
      .min(8)
      .openapi({
        description: 'User password (minimum 8 characters)',
        example: 'securePassword123',
        minLength: 8,
      }),
    name: z
      .string()
      .optional()
      .openapi({
        description: 'Optional user display name',
        example: 'John Doe',
      }),
  })
  .openapi({
    title: 'User Registration',
    description: 'User registration data',
  })

export const loginSchema = z
  .object({
    email: z
      .string()
      .email()
      .openapi({
        description: 'User email address',
        example: 'user@example.com',
      }),
    password: z
      .string()
      .min(1)
      .openapi({
        description: 'User password',
        example: 'securePassword123',
      }),
  })
  .openapi({
    title: 'User Login',
    description: 'User login credentials',
  })

// Subscription schema
export const subscriptionSchema = z
  .object({
    id: z.string().openapi({
      description: 'Subscription ID',
      example: 'cuid2_subscription_id',
    }),
    subscriptionType: z.string().openapi({
      description: 'Type of subscription',
      example: 'professional',
    }),
    status: z.string().openapi({
      description: 'Subscription status',
      example: 'active',
    }),
    startDate: z.string().datetime().openapi({
      description: 'Subscription start date',
      example: '2024-01-01T00:00:00.000Z',
    }),
    endDate: z.string().datetime().openapi({
      description: 'Subscription end date',
      example: '2025-01-01T00:00:00.000Z',
    }),
    trialEndDate: z.string().datetime().nullable().openapi({
      description: 'Trial end date',
      example: '2024-02-01T00:00:00.000Z',
    }),
    autoRenew: z.boolean().openapi({
      description: 'Auto-renewal status',
      example: true,
    }),
    currency: z.string().openapi({
      description: 'Currency code',
      example: 'USD',
    }),
    billingPeriod: z.string().openapi({
      description: 'Billing period',
      example: 'monthly',
    }),
  })
  .nullable()
  .openapi({
    title: 'Subscription',
    description: 'User subscription information',
  })

// Response schemas
export const userSchema = z
  .object({
    id: z.string().openapi({
      description: 'Unique user identifier',
      example: 'cuid2_user_id_12345',
    }),
    email: z.string().email().openapi({
      description: 'User email address',
      example: 'user@example.com',
    }),
    name: z.string().nullable().openapi({
      description: 'User display name',
      example: 'John Doe',
    }),
    createdAt: z.string().datetime().openapi({
      description: 'User creation timestamp',
      example: '2024-01-01T00:00:00.000Z',
    }),
    updatedAt: z.string().datetime().openapi({
      description: 'Last update timestamp',
      example: '2024-01-01T00:00:00.000Z',
    }),
    subscription: subscriptionSchema.openapi({
      description: 'User subscription details',
    }),
  })
  .openapi({
    title: 'User',
    description: 'User profile information',
  })

export const authTokenSchema = z
  .object({
    token: z.string().openapi({
      description: 'JWT authentication token',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
    expiresIn: z.string().openapi({
      description: 'Token expiration time',
      example: '7d',
    }),
    user: userSchema,
  })
  .openapi({
    title: 'Authentication Token',
    description: 'Authentication response with JWT token and user information',
  })

// OpenAPI route definitions
export const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  tags: ['Authentication'],
  summary: 'Register a new user',
  description: 'Create a new user account with email and password',
  request: {
    body: {
      content: {
        'application/json': {
          schema: registerSchema,
        },
      },
      description: 'User registration information',
      required: true,
    },
  },
  responses: {
    201: {
      description: 'User successfully registered',
      content: {
        'application/json': {
          schema: dataResponse(authTokenSchema),
        },
      },
    },
    ...commonResponses,
  },
})

export const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Authentication'],
  summary: 'Authenticate user',
  description: 'Login with email and password to receive JWT token',
  request: {
    body: {
      content: {
        'application/json': {
          schema: loginSchema,
        },
      },
      description: 'User login credentials',
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: dataResponse(authTokenSchema),
        },
      },
    },
    ...commonResponses,
  },
})

export const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
  tags: ['Authentication'],
  summary: 'Logout user',
  description: 'Invalidate the current session (client-side token removal)',
  responses: {
    200: {
      description: 'Logout successful',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string().openapi({
              description: 'Logout confirmation message',
              example: 'Logged out successfully',
            }),
          }),
        },
      },
    },
    ...commonResponses,
  },
})

export const meRoute = createRoute({
  method: 'get',
  path: '/me',
  tags: ['Authentication'],
  summary: 'Get current user profile',
  description: 'Retrieve the authenticated user\'s profile information',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'User profile retrieved successfully',
      content: {
        'application/json': {
          schema: dataResponse(userSchema),
        },
      },
    },
    ...commonResponses,
  },
})

export const updateMeSchema = z
  .object({
    name: z.string().optional().openapi({
      description: 'User display name',
      example: 'John Doe',
    }),
    email: z.string().email().optional().openapi({
      description: 'User email address',
      example: 'user@example.com',
    }),
  })
  .openapi({
    title: 'Update Profile',
    description: 'Profile update data',
  })

export const updateMeRoute = createRoute({
  method: 'patch',
  path: '/me',
  tags: ['Authentication'],
  summary: 'Update current user profile',
  description: 'Update the authenticated user\'s profile information (name and/or email)',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: updateMeSchema,
        },
      },
      description: 'Profile update information',
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Profile updated successfully',
      content: {
        'application/json': {
          schema: dataResponse(userSchema),
        },
      },
    },
    ...commonResponses,
  },
})

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1)
      .openapi({
        description: 'Current password for verification',
        example: 'currentPassword123',
      }),
    newPassword: z
      .string()
      .min(8)
      .openapi({
        description: 'New password (minimum 8 characters)',
        example: 'newSecurePassword123',
        minLength: 8,
      }),
  })
  .openapi({
    title: 'Change Password',
    description: 'Password change data',
  })

export const changePasswordRoute = createRoute({
  method: 'post',
  path: '/change-password',
  tags: ['Authentication'],
  summary: 'Change user password',
  description: 'Change the authenticated user\'s password by providing current password and new password',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: changePasswordSchema,
        },
      },
      description: 'Current and new password',
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Password changed successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string().openapi({
              description: 'Success message',
              example: 'Password has been changed successfully',
            }),
          }),
        },
      },
    },
    ...commonResponses,
  },
})