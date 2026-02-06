import { describe, it, expect, beforeAll } from 'vitest'
import { getTestApp } from '../helpers/test-app'
import { createTestUser, getAuthHeadersFromUser } from '../helpers/auth'
import type { TestUser } from '../helpers/auth'

describe('Vault API', () => {
  let testUser: TestUser
  const app = getTestApp()

  beforeAll(async () => {
    testUser = await createTestUser()
  })

  describe('GET /api/vault/projects', () => {
    it('should require authentication', async () => {
      const res = await app.request('/api/vault/projects', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/vault/projects', () => {
    it('should require authentication', async () => {
      const res = await app.request('/api/vault/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Project',
        }),
      })

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/vault/projects/:projectId', () => {
    it('should require authentication', async () => {
      const res = await app.request('/api/vault/projects/test-id', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      expect(res.status).toBe(401)
    })
  })
})

