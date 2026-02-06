import { describe, it, expect, beforeAll } from 'vitest'
import { getTestApp } from '../helpers/test-app'
import { createTestUser, getAuthHeadersFromUser } from '../helpers/auth'
import { createTestPlaybookData } from '../helpers/fixtures'
import type { TestUser } from '../helpers/auth'
import { testDb } from '../setup'
import { playbooks } from '@/db/schema/index'

describe('Playbooks API', () => {
  let testUser: TestUser
  const app = getTestApp()

  beforeAll(async () => {
    testUser = await createTestUser()
  })

  describe('GET /api/playbooks', () => {
    it('should list playbooks for authenticated user', async () => {
      // Create a test playbook first
      const playbookData = createTestPlaybookData({ userId: testUser.id })
      await testDb.insert(playbooks).values(playbookData)

      const res = await app.request('/api/playbooks?page=1&limit=10', {
        method: 'GET',
        headers: getAuthHeadersFromUser(testUser),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('data')
      expect(data).toHaveProperty('pagination')
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.pagination).toHaveProperty('page')
      expect(data.pagination).toHaveProperty('limit')
      expect(data.pagination).toHaveProperty('hasMore')
    })

    it('should require authentication', async () => {
      const res = await app.request('/api/playbooks', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      expect(res.status).toBe(401)
    })

    it('should support pagination', async () => {
      const res = await app.request('/api/playbooks?page=2&limit=5', {
        method: 'GET',
        headers: getAuthHeadersFromUser(testUser),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(5)
    })
  })

  describe('GET /api/playbooks/:id', () => {
    it('should get a playbook by id', async () => {
      const playbookData = createTestPlaybookData({ userId: testUser.id })
      const [created] = await testDb.insert(playbooks).values(playbookData).returning()

      const res = await app.request(`/api/playbooks/${created.id}`, {
        method: 'GET',
        headers: getAuthHeadersFromUser(testUser),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('data')
      expect(data.data.id).toBe(created.id)
      expect(data.data.playbookName).toBe(playbookData.playbookName)
    })

    it('should return 404 for non-existent playbook', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const res = await app.request(`/api/playbooks/${fakeId}`, {
        method: 'GET',
        headers: getAuthHeadersFromUser(testUser),
      })

      expect(res.status).toBe(404)
    })

    it('should not return playbooks from other users', async () => {
      const otherUser = await createTestUser()
      const playbookData = createTestPlaybookData({ userId: otherUser.id })
      const [created] = await testDb.insert(playbooks).values(playbookData).returning()

      const res = await app.request(`/api/playbooks/${created.id}`, {
        method: 'GET',
        headers: getAuthHeadersFromUser(testUser),
      })

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/playbooks', () => {
    it('should create a new playbook', async () => {
      const playbookData = createTestPlaybookData({ userId: testUser.id })

      const res = await app.request('/api/playbooks', {
        method: 'POST',
        headers: getAuthHeadersFromUser(testUser),
        body: JSON.stringify(playbookData),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('data')
      expect(data.data.playbookName).toBe(playbookData.playbookName)
      expect(data.data.userId).toBe(testUser.id)
    })

    it('should reject creation without playbookName', async () => {
      const playbookData = createTestPlaybookData({ userId: testUser.id })
      delete (playbookData as any).playbookName

      const res = await app.request('/api/playbooks', {
        method: 'POST',
        headers: getAuthHeadersFromUser(testUser),
        body: JSON.stringify(playbookData),
      })

      expect(res.status).toBe(400)
    })

    it('should require authentication', async () => {
      const playbookData = createTestPlaybookData({ userId: testUser.id })

      const res = await app.request('/api/playbooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(playbookData),
      })

      expect(res.status).toBe(401)
    })
  })

  describe('PUT /api/playbooks/:id', () => {
    it('should update an existing playbook', async () => {
      const playbookData = createTestPlaybookData({ userId: testUser.id })
      const [created] = await testDb.insert(playbooks).values(playbookData).returning()

      const updates = {
        playbookName: 'Updated Playbook Name',
        description: 'Updated description',
      }

      const res = await app.request(`/api/playbooks/${created.id}`, {
        method: 'PUT',
        headers: getAuthHeadersFromUser(testUser),
        body: JSON.stringify(updates),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data.playbookName).toBe(updates.playbookName)
      expect(data.data.description).toBe(updates.description)
    })

    it('should return 404 for non-existent playbook', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const res = await app.request(`/api/playbooks/${fakeId}`, {
        method: 'PUT',
        headers: getAuthHeadersFromUser(testUser),
        body: JSON.stringify({ playbookName: 'Updated' }),
      })

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/playbooks/:id', () => {
    it('should delete an existing playbook', async () => {
      const playbookData = createTestPlaybookData({ userId: testUser.id })
      const [created] = await testDb.insert(playbooks).values(playbookData).returning()

      const res = await app.request(`/api/playbooks/${created.id}`, {
        method: 'DELETE',
        headers: getAuthHeadersFromUser(testUser),
      })

      expect(res.status).toBe(200)

      // Verify it's deleted (should return 404)
      const getRes = await app.request(`/api/playbooks/${created.id}`, {
        method: 'GET',
        headers: getAuthHeadersFromUser(testUser),
      })
      expect(getRes.status).toBe(404)
    })

    it('should return 404 for non-existent playbook', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const res = await app.request(`/api/playbooks/${fakeId}`, {
        method: 'DELETE',
        headers: getAuthHeadersFromUser(testUser),
      })

      expect(res.status).toBe(404)
    })
  })
})

