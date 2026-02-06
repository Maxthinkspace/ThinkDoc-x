import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { playbooksController } from '@/controllers/playbooks'
import { authMiddleware } from '@/middleware/auth'

const playbooks = new Hono()

// Handle OPTIONS requests without auth (for CORS preflight)
playbooks.options('*', (c) => c.text('', 200))

// Apply auth middleware to all non-OPTIONS routes
playbooks.use('*', async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    return next()
  } else {
    return authMiddleware()(c, next)
  }
})

// Validation schemas
const createPlaybookSchema = z.object({
  playbookName: z.string().min(1),
  description: z.string().optional(),
  playbookType: z.string().optional(),
  userPosition: z.string().optional(),
  jurisdiction: z.string().optional(),
  tags: z.string().optional(),
  rules: z.any(), // Allow any structure for rules
  metadata: z.any().optional(), // Allow any structure for metadata
})

const updatePlaybookSchema = z.object({
  playbookName: z.string().min(1).optional(),
  description: z.string().optional(),
  playbookType: z.string().optional(),
  userPosition: z.string().optional(),
  jurisdiction: z.string().optional(),
  tags: z.string().optional(),
  rules: z.any().optional(), // Allow any structure for rules
  metadata: z.any().optional(), // Allow any structure for metadata
})

const sharePlaybookSchema = z.object({
  sharedWithEmail: z.string().email(),
  shareType: z.enum(['view', 'remix']),
})

const remixPlaybookSchema = z.object({
  playbookName: z.string().min(1),
  description: z.string().optional(),
})

const unsharePlaybookSchema = z.object({
  sharedWithEmail: z.string().email(),
})

const querySchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
})

// Special routes first (must be before /:id routes)
playbooks.get('/shared-with-me', zValidator('query', querySchema), playbooksController.sharedWithMe)

// Basic CRUD operations
playbooks.get('/', zValidator('query', querySchema), playbooksController.list)
playbooks.get('/:id', playbooksController.get)
playbooks.post('/', zValidator('json', createPlaybookSchema), playbooksController.create)
playbooks.put('/:id', zValidator('json', updatePlaybookSchema), playbooksController.update)
playbooks.delete('/:id', playbooksController.delete)

// Sharing functionality
playbooks.post('/:id/share', zValidator('json', sharePlaybookSchema), playbooksController.share)
playbooks.post('/:id/remix', zValidator('json', remixPlaybookSchema), playbooksController.remix)
playbooks.delete('/:id/unshare', zValidator('json', unsharePlaybookSchema), playbooksController.unshare)

export { playbooks }