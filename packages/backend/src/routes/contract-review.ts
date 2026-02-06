import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import {
  reviewWithPlaybooksRequestSchema,
  explainUnappliedRuleRequestSchema,
  handleMissingLanguageRequestSchema,
  rerunAmendmentsRequestSchema,
  rerunInstructionRequestsRequestSchema,
} from '@/schemas/contract-review'
import { logger } from '@/config/logger'
import { contractReviewController } from '@/controllers/contract-review'
import { authMiddleware } from '@/middleware/auth'
import { subscriptionMiddleware } from '@/middleware/subscription'
import { getJobStatus } from '@/controllers/jobController'
import { z } from 'zod'

const contractReviewRoutes = new Hono()

contractReviewRoutes.use(authMiddleware())
contractReviewRoutes.use(subscriptionMiddleware())

contractReviewRoutes.post(
  '/contract-amendments',
  zValidator('json', z.object({
    structure: z.array(z.any()),
    rules: z.array(z.any())
  })),
  contractReviewController.reviewWithPlaybooks
)

contractReviewRoutes.post(
  '/explain-unapplied-rule',
  zValidator('json', explainUnappliedRuleRequestSchema),
  contractReviewController.explainUnappliedRule
)

contractReviewRoutes.post(
  '/handle-missing-language',
  zValidator('json', handleMissingLanguageRequestSchema),
  contractReviewController.handleMissingLanguage
)

contractReviewRoutes.get('/jobs/:jobId', getJobStatus)

contractReviewRoutes.post(
  '/rerun-amendments',
  zValidator('json', rerunAmendmentsRequestSchema),
  contractReviewController.rerunAmendmentsEndpoint
)

contractReviewRoutes.post(
  '/rerun-instruction-requests',
  zValidator('json', rerunInstructionRequestsRequestSchema),
  contractReviewController.rerunInstructionRequestsEndpoint
)

export { contractReviewRoutes }