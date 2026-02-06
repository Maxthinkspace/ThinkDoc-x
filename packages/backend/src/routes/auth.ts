import { createOpenAPIApp } from '@/lib/openapi'
import { authController } from '@/controllers/auth'
import { authMiddleware } from '@/middleware/auth'
import {
  registerRoute,
  loginRoute,
  logoutRoute,
  meRoute,
  updateMeRoute,
  changePasswordRoute,
} from '@/schemas/auth'
import {
  forgotPasswordRoute,
  resetPasswordRoute,
  verifyResetTokenRoute,
} from '@/schemas/password-reset'

const auth = createOpenAPIApp()

// Public routes with OpenAPI documentation
auth.openapi(registerRoute, authController.register)
auth.openapi(loginRoute, authController.login)
auth.openapi(logoutRoute, authController.logout)

// Password reset routes (public)
auth.openapi(forgotPasswordRoute, authController.forgotPassword)
auth.openapi(resetPasswordRoute, authController.resetPassword)
auth.openapi(verifyResetTokenRoute, authController.verifyResetToken)

// Protected routes with OpenAPI documentation
auth.use('/me', authMiddleware())
auth.openapi(meRoute, authController.me)
auth.openapi(updateMeRoute, authController.updateMe)

// Change password route (protected)
auth.use('/change-password', authMiddleware())
auth.openapi(changePasswordRoute, authController.changePassword)

export { auth }