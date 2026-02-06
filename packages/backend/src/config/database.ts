import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from './env'
import { logger } from './logger'
import * as schema from '@/db/schema/index'

// Debug: Print database connection info (hide password)
const dbUrl = new URL(env.DATABASE_URL)
logger.info({
  host: dbUrl.hostname,
  port: dbUrl.port,
  database: dbUrl.pathname.slice(1),
  username: dbUrl.username,
  passwordLength: dbUrl.password.length,
}, '🔍 Attempting database connection')

// Create postgres connection with SSL for Azure PostgreSQL
const queryClient = postgres(env.DATABASE_URL, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// Create drizzle instance
export const db = drizzle(queryClient, { 
  schema,
  logger: env.NODE_ENV === 'development' ? {
    logQuery: (query, params) => {
      logger.debug({ query, params }, 'Database query')
    }
  } : false,
})

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await queryClient`SELECT 1`
    logger.info('✅ Database connection successful')
    return true
  } catch (error) {
    logger.error({ error }, '❌ Database connection failed')
    return false
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await queryClient.end()
    logger.info('Database connection closed')
  } catch (error) {
    logger.error({ error }, 'Error closing database connection')
  }
}

export type Database = typeof db