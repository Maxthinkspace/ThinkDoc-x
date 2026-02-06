import { describe, it, expect, beforeAll } from 'vitest'
import { getTestApp } from '../helpers/test-app'
import { createTestUser, getAuthHeadersFromUser } from '../helpers/auth'
import { createTestDocumentData } from '../helpers/fixtures'
import type { TestUser } from '../helpers/auth'
import { testDb } from '../setup'
import { documents } from '@/db/schema/index'

describe('Documents API', () => {
  let testUser: TestUser
  const app = getTestApp()

  beforeAll(async () => {
    testUser = await createTestUser()
  })

  describe('GET /api/documents', () => {
    it('should list documents for authenticated user', async () => {
      // Create a test document first
      const docData = createTestDocumentData(testUser.id)
      await testDb.insert(documents).values(docData)

      const res = await app.request('/api/documents', {
        method: 'GET',
        headers: getAuthHeadersFromUser(testUser),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('data')
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('should require authentication', async () => {
      const res = await app.request('/api/documents', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/documents/:id', () => {
    it('should get a document by id', async () => {
      const docData = createTestDocumentData(testUser.id)
      const [created] = await testDb.insert(documents).values(docData).returning()

      const res = await app.request(`/api/documents/${created.id}`, {
        method: 'GET',
        headers: getAuthHeadersFromUser(testUser),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('data')
      expect(data.data.id).toBe(created.id)
      expect(data.data.title).toBe(docData.title)
    })

    it('should return 404 for non-existent document', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const res = await app.request(`/api/documents/${fakeId}`, {
        method: 'GET',
        headers: getAuthHeadersFromUser(testUser),
      })

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/documents', () => {
    it('should create a new document', async () => {
      const docData = createTestDocumentData(testUser.id)

      const res = await app.request('/api/documents', {
        method: 'POST',
        headers: getAuthHeadersFromUser(testUser),
        body: JSON.stringify(docData),
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data).toHaveProperty('data')
      expect(data.data.title).toBe(docData.title)
      expect(data.data.userId).toBe(testUser.id)
    })

    it('should require authentication', async () => {
      const docData = createTestDocumentData(testUser.id)

      const res = await app.request('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(docData),
      })

      expect(res.status).toBe(401)
    })
  })

  describe('PUT /api/documents/:id', () => {
    it('should update an existing document', async () => {
      const docData = createTestDocumentData(testUser.id)
      const [created] = await testDb.insert(documents).values(docData).returning()

      const updates = {
        title: 'Updated Document Title',
        content: 'Updated content',
      }

      const res = await app.request(`/api/documents/${created.id}`, {
        method: 'PUT',
        headers: getAuthHeadersFromUser(testUser),
        body: JSON.stringify(updates),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data.title).toBe(updates.title)
      expect(data.data.content).toBe(updates.content)
    })

    it('should return 404 for non-existent document', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const res = await app.request(`/api/documents/${fakeId}`, {
        method: 'PUT',
        headers: getAuthHeadersFromUser(testUser),
        body: JSON.stringify({ title: 'Updated' }),
      })

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/documents/:id', () => {
    it('should delete an existing document', async () => {
      const docData = createTestDocumentData(testUser.id)
      const [created] = await testDb.insert(documents).values(docData).returning()

      const res = await app.request(`/api/documents/${created.id}`, {
        method: 'DELETE',
        headers: getAuthHeadersFromUser(testUser),
      })

      expect(res.status).toBe(200)

      // Verify it's deleted (should return 404)
      const getRes = await app.request(`/api/documents/${created.id}`, {
        method: 'GET',
        headers: getAuthHeadersFromUser(testUser),
      })
      expect(getRes.status).toBe(404)
    })
  })
})

