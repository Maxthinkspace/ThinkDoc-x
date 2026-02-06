import { describe, it, expect, beforeAll } from 'vitest'
import { getTestApp } from '../helpers/test-app'
import { createTestUser, getAuthHeadersFromUser } from '../helpers/auth'
import type { TestUser } from '../helpers/auth'

describe('Auth API', () => {
  let testUser: TestUser
  const app = getTestApp()

  beforeAll(async () => {
    // Create a test user for authenticated requests
    testUser = await createTestUser()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const email = `test-register-${Date.now()}@example.com`
      const password = 'TestPassword123!'
      const name = 'Test User'

      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data).toHaveProperty('user')
      expect(data).toHaveProperty('token')
      expect(data.user.email).toBe(email)
      expect(data.user.name).toBe(name)
      expect(typeof data.token).toBe('string')
    })

    it('should reject registration with missing email', async () => {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: 'TestPassword123!' }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data).toHaveProperty('error')
    })

    it('should reject registration with missing password', async () => {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data).toHaveProperty('error')
    })

    it('should reject registration with duplicate email', async () => {
      const email = `test-duplicate-${Date.now()}@example.com`
      const password = 'TestPassword123!'

      // First registration
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      // Second registration with same email
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data).toHaveProperty('error')
      expect(data.error.message).toContain('already exists')
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const email = `test-login-${Date.now()}@example.com`
      const password = 'TestPassword123!'

      // Register first
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      // Login
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('user')
      expect(data).toHaveProperty('token')
      expect(data.user.email).toBe(email)
      expect(typeof data.token).toBe('string')
    })

    it('should reject login with invalid email', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        }),
      })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data).toHaveProperty('error')
    })

    it('should reject login with invalid password', async () => {
      const email = `test-login-invalid-${Date.now()}@example.com`
      const password = 'TestPassword123!'

      // Register first
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      // Login with wrong password
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: 'WrongPassword123!',
        }),
      })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data).toHaveProperty('error')
    })

    it('should reject login with missing credentials', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data).toHaveProperty('error')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const res = await app.request('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeadersFromUser(testUser),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('message')
    })

    it('should logout successfully without token', async () => {
      const res = await app.request('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('message')
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return user info with valid token', async () => {
      const res = await app.request('/api/auth/me', {
        method: 'GET',
        headers: getAuthHeadersFromUser(testUser),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('user')
      expect(data.user.id).toBe(testUser.id)
      expect(data.user.email).toBe(testUser.email)
    })

    it('should reject request without token', async () => {
      const res = await app.request('/api/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data).toHaveProperty('error')
    })

    it('should reject request with invalid token', async () => {
      const res = await app.request('/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer invalid-token',
          'Content-Type': 'application/json',
        },
      })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data).toHaveProperty('error')
    })
  })
})

