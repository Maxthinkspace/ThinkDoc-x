#!/usr/bin/env tsx
import { db, testDatabaseConnection, closeDatabaseConnection } from '@/config/database'
import { users, sessions, documents, comments, highlights, apiKeys } from '@/db/schema/index'
import { logger } from '@/config/logger'

async function reset() {
  try {
    logger.info('🔄 Starting database reset...')
    
    // Test connection
    const connected = await testDatabaseConnection()
    if (!connected) {
      throw new Error('Database connection failed')
    }
    
    // Delete all data in correct order (respecting foreign keys)
    await db.delete(apiKeys)
    logger.info('Deleted all API keys')
    
    await db.delete(highlights)
    logger.info('Deleted all highlights')
    
    await db.delete(comments)
    logger.info('Deleted all comments')
    
    await db.delete(documents)
    logger.info('Deleted all documents')
    
    await db.delete(sessions)
    logger.info('Deleted all sessions')
    
    await db.delete(users)
    logger.info('Deleted all users')
    
    logger.info('✅ Database reset completed successfully')
    
  } catch (error) {
    logger.error({ error }, '❌ Database reset failed')
    throw error
  } finally {
    await closeDatabaseConnection()
  }
}

// Run if called directly
reset().catch((error) => {
  console.error('Reset script failed:', error)
  process.exit(1)
})