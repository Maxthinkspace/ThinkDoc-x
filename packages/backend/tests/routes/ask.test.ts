import { describe, it, expect, beforeAll } from 'vitest'
import { getTestApp } from '../helpers/test-app'
import { createTestUser, getAuthHeadersFromUser } from '../helpers/auth'
import type { TestUser } from '../helpers/auth'

describe('Ask API', () => {
  let testUser: TestUser
  const app = getTestApp()

  beforeAll(async () => {
    testUser = await createTestUser()
  })

  describe('POST /api/ask/stream', () => {
    it('should require authentication', async () => {
      const res = await app.request('/api/ask/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: 'Test question',
          sourceConfig: {
            includeDocument: false,
            enableWebSearch: false,
          },
        }),
      })

      expect(res.status).toBe(401)
    })

    it('should validate request body', async () => {
      const res = await app.request('/api/ask/stream', {
        method: 'POST',
        headers: getAuthHeadersFromUser(testUser),
        body: JSON.stringify({}),
      })

      // Should return 400 for validation error or 402 for subscription required
      expect([400, 402]).toContain(res.status)
    })
  })
})

