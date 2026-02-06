import { beforeAll, afterAll, beforeEach } from 'vitest'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema/index'
import { env } from '@/config/env'

// Use test database URL if provided, otherwise use main DB with test suffix
const testDbUrl = process.env.TEST_DATABASE_URL || env.DATABASE_URL.replace(/\/[^/]+$/, '/test_db')

let queryClient: postgres.Sql
let testDb: ReturnType<typeof drizzle>

beforeAll(async () => {
  // Create test database connection
  queryClient = postgres(testDbUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  })

  testDb = drizzle(queryClient, { schema })

  // Test connection
  await queryClient`SELECT 1`
})

afterAll(async () => {
  // Close database connection
  await queryClient.end()
})

beforeEach(async () => {
  // Clean up test data before each test
  // Note: In a real scenario, you might want to use transactions and rollback
  // For now, we'll rely on test isolation through unique IDs
})

export { testDb, queryClient }

