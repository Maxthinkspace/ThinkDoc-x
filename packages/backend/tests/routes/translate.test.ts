import { describe, it, expect, beforeAll } from 'vitest'
import { getTestApp } from '../helpers/test-app'
import { createTestUser, getAuthHeadersFromUser } from '../helpers/auth'
import type { TestUser } from '../helpers/auth'

describe('Translate API', () => {
  let testUser: TestUser
  const app = getTestApp()

  beforeAll(async () => {
    testUser = await createTestUser()
  })

  describe('POST /api/translate', () => {
    it('should require authentication', async () => {
      const res = await app.request('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Hello',
          sourceLanguage: 'en',
          targetLanguage: 'es',
        }),
      })

      expect(res.status).toBe(401)
    })

    it('should validate request body', async () => {
      const res = await app.request('/api/translate', {
        method: 'POST',
        headers: getAuthHeadersFromUser(testUser),
        body: JSON.stringify({}),
      })

      // Should return 400 for validation error or 402 for subscription required
      expect([400, 402]).toContain(res.status)
    })
  })
})

