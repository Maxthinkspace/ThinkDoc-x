import { describe, it, expect, beforeAll } from 'vitest'
import { getTestApp } from '../helpers/test-app'
import { createTestUser, getAuthHeadersFromUser } from '../helpers/auth'
import type { TestUser } from '../helpers/auth'

describe('Contract Review API', () => {
  let testUser: TestUser
  const app = getTestApp()

  beforeAll(async () => {
    testUser = await createTestUser()
  })

  describe('POST /api/contract-review/contract-amendments', () => {
    it('should require authentication', async () => {
      const res = await app.request('/api/contract-review/contract-amendments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          structure: [],
          rules: [],
        }),
      })

      expect(res.status).toBe(401)
    })

    it('should validate request body', async () => {
      const res = await app.request('/api/contract-review/contract-amendments', {
        method: 'POST',
        headers: getAuthHeadersFromUser(testUser),
        body: JSON.stringify({}),
      })

      // Should return 400 for validation error or 402 for subscription required
      expect([400, 402]).toContain(res.status)
    })
  })

  describe('POST /api/contract-review/explain-unapplied-rule', () => {
    it('should require authentication', async () => {
      const res = await app.request('/api/contract-review/explain-unapplied-rule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sectionText: 'Test section',
          rule: { id: '1', content: 'Test rule' },
        }),
      })

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/contract-review/handle-missing-language', () => {
    it('should require authentication', async () => {
      const res = await app.request('/api/contract-review/handle-missing-language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rule: 'Test rule',
          exampleLanguage: 'Test language',
          documentOutline: [],
          fullDocumentText: 'Test text',
        }),
      })

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/contract-review/jobs/:jobId', () => {
    it('should require authentication', async () => {
      const res = await app.request('/api/contract-review/jobs/test-job-id', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      expect(res.status).toBe(401)
    })
  })
})

