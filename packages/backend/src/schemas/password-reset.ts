import { z } from 'zod'
import { createRoute } from '@hono/zod-openapi'
import { commonResponses } from '@/lib/openapi'

// Forgot password request schema
export const forgotPasswordSchema = z
  .object({
    email: z
      .string()
      .email()
      .openapi({
        description: 'User email address',
        example: 'user@example.com',
      }),
  })
  .openapi({
    title: 'Forgot Password Request',
    description: 'Request password reset email',
  })

// Reset password request schema
export const resetPasswordSchema = z
  .object({
    token: z
      .string()
      .min(1)
      .openapi({
        description: 'Password reset token from email',
        example: 'abc123def456...',
      }),
    password: z
      .string()
      .min(8)
      .openapi({
        description: 'New password (minimum 8 characters)',
        example: 'newSecurePassword123',
        minLength: 8,
      }),
  })
  .openapi({
    title: 'Reset Password Request',
    description: 'Reset password with token and new password',
  })

// Success response schema
export const passwordResetSuccessSchema = z
  .object({
    message: z.string().openapi({
      description: 'Success message',
      example: 'Password reset email sent',
    }),
  })
  .openapi({
    title: 'Password Reset Success',
    description: 'Success response for password reset operations',
  })

// Token verification response schema
export const verifyTokenResponseSchema = z
  .object({
    valid: z.boolean().openapi({
      description: 'Whether the token is valid',
      example: true,
    }),
    email: z
      .string()
      .email()
      .optional()
      .openapi({
        description: 'User email (only if token is valid)',
        example: 'user@example.com',
      }),
  })
  .openapi({
    title: 'Token Verification Response',
    description: 'Response for token verification',
  })

// OpenAPI route definitions
export const forgotPasswordRoute = createRoute({
  method: 'post',
  path: '/forgot-password',
  tags: ['Authentication'],
  summary: 'Request password reset',
  description: 'Send password reset email to user',
  request: {
    body: {
      content: {
        'application/json': {
          schema: forgotPasswordSchema,
        },
      },
      description: 'User email address',
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Password reset email sent successfully',
      content: {
        'application/json': {
          schema: passwordResetSuccessSchema,
        },
      },
    },
    ...commonResponses,
  },
})

export const resetPasswordRoute = createRoute({
  method: 'post',
  path: '/reset-password',
  tags: ['Authentication'],
  summary: 'Reset password',
  description: 'Reset user password using token from email',
  request: {
    body: {
      content: {
        'application/json': {
          schema: resetPasswordSchema,
        },
      },
      description: 'Reset token and new password',
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Password reset successfully',
      content: {
        'application/json': {
          schema: passwordResetSuccessSchema,
        },
      },
    },
    ...commonResponses,
  },
})

export const verifyResetTokenRoute = createRoute({
  method: 'get',
  path: '/verify-reset-token/{token}',
  tags: ['Authentication'],
  summary: 'Verify reset token',
  description: 'Check if a password reset token is valid',
  request: {
    params: z.object({
      token: z.string().openapi({
        description: 'Password reset token',
        example: 'abc123def456...',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Token verification result',
      content: {
        'application/json': {
          schema: verifyTokenResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
})


