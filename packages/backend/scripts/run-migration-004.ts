#!/usr/bin/env tsx
/**
 * Run migration 004_add_vault_ui_enhancements.sql
 * 
 * Usage: tsx scripts/run-migration-004.ts
 */

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { env } from '../src/config/env';
import { logger } from '../src/config/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const client = postgres(env.DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    logger.info('Running migration 004_add_vault_ui_enhancements.sql...');
    
    const migrationPath = join(__dirname, '../migrations/004_add_vault_ui_enhancements.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Execute the entire migration as one transaction
    await client.unsafe(migrationSQL);
    logger.info('✅ Migration SQL executed successfully');
    
    logger.info('✅ Migration 004 completed successfully');
  } catch (error) {
    logger.error({ error }, '❌ Migration 004 failed');
    throw error;
  } finally {
    await client.end();
  }
}

runMigration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

