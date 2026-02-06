import { describe, it, expect, beforeAll } from 'vitest'
import { getTestApp } from '../helpers/test-app'
import { createTestUser, getAuthHeadersFromUser } from '../helpers/auth'
import type { TestUser } from '../helpers/auth'

describe('Subscriptions API', () => {
  let testUser: TestUser
  const app = getTestApp()

  beforeAll(async () => {
    testUser = await createTestUser()
  })

  describe('GET /api/subscriptions', () => {
    it('should require authentication', async () => {
      const res = await app.request('/api/subscriptions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/subscriptions', () => {
    it('should require authentication', async () => {
      const res = await app.request('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionType: 'pro',
          billingPeriod: 'monthly',
        }),
      })

      expect(res.status).toBe(401)
    })
  })
})

