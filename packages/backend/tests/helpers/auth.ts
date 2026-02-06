import jwt from 'jsonwebtoken'
import { nanoid } from 'nanoid'
import { env } from '@/config/env'
import { testDb } from '../setup'
import { users, sessions, type NewUser, type NewSession } from '@/db/schema/index'
import bcrypt from 'bcryptjs'
import { createId } from '@paralleldrive/cuid2'

export interface TestUser {
  id: string
  email: string
  name?: string
  password: string
  token: string
}

/**
 * Create a test user with a valid session and JWT token
 */
export async function createTestUser(
  email: string = `test-${nanoid()}@example.com`,
  password: string = 'TestPassword123!',
  name?: string
): Promise<TestUser> {
  // Hash password
  const passwordHash = await bcrypt.hash(password, 12)

  // Create user
  const [user] = await testDb
    .insert(users)
    .values({
      email,
      name,
      passwordHash,
      isActive: true,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
    })

  // Create session
  const sessionToken = nanoid(64)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const [session] = await testDb
    .insert(sessions)
    .values({
      userId: user.id,
      token: sessionToken,
      expiresAt,
    })
    .returning()

  if (!session) {
    throw new Error('Failed to create test session')
  }

  // Generate JWT
  const token = jwt.sign(
    { userId: user.id, sessionId: session.id },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  )

  return {
    id: user.id,
    email: user.email,
    name: user.name || undefined,
    password,
    token,
  }
}

/**
 * Get auth headers for a test user
 */
export function getAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Create auth headers from a test user
 */
export function getAuthHeadersFromUser(user: TestUser): Record<string, string> {
  return getAuthHeaders(user.token)
}

