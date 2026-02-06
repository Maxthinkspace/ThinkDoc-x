import { db } from '@/config/database'
import {
  clauses,
  clauseVersions,
  projects,
  projectFiles,
  playbooksNew,
  playbookVersions,
  playbookRules,
} from '@/db/schema/library'
import { vaultClauses, vaultProjects, vaultFiles } from '@/db/schema/vault'
import { playbooks } from '@/db/schema/tables'
import { eq } from 'drizzle-orm'
import { logger } from '@/config/logger'

/**
 * Migration script to move data from old vault/playbook tables to new unified library structure
 * 
 * Run this script after the database migration has been applied:
 * npx tsx src/scripts/migrate-library.ts
 */

async function migrateVaultClauses() {
  logger.info('Starting vault_clauses migration...')

  const allVaultClauses = await db.select().from(vaultClauses)

  for (const vaultClause of allVaultClauses) {
    try {
      // Create clause
      const [clause] = await db
        .insert(clauses)
        .values({
          id: vaultClause.id,
          userId: vaultClause.userId,
          name: vaultClause.name,
          description: vaultClause.description,
          jurisdiction: vaultClause.jurisdiction || null,
          language: vaultClause.language || 'en',
          sourceType: 'imported',
          visibility: 'private',
          isActive: true,
          createdAt: vaultClause.createdAt,
          updatedAt: vaultClause.updatedAt,
        })
        .returning()

      // Create initial version
      const [version] = await db
        .insert(clauseVersions)
        .values({
          clauseId: clause.id,
          versionNumber: 1,
          text: vaultClause.text,
          changeType: 'created',
          changeDescription: 'Migrated from vault_clauses',
        })
        .returning()

      // Update clause with current version
      await db
        .update(clauses)
        .set({ currentVersionId: version.id })
        .where(eq(clauses.id, clause.id))

      logger.info({ clauseId: clause.id, name: clause.name }, 'Migrated vault clause')
    } catch (error) {
      logger.error({ error, clauseId: vaultClause.id }, 'Failed to migrate vault clause')
    }
  }

  logger.info(`Migrated ${allVaultClauses.length} vault clauses`)
}

async function migrateVaultProjects() {
  logger.info('Starting vault_projects migration...')

  const allVaultProjects = await db.select().from(vaultProjects)

  for (const vaultProject of allVaultProjects) {
    try {
      // Create project
      const [project] = await db
        .insert(projects)
        .values({
          id: vaultProject.id,
          userId: vaultProject.userId,
          name: vaultProject.name,
          description: vaultProject.description,
          projectType: 'matter',
          status: 'active',
          visibility: 'private',
          itemCount: vaultProject.fileCount,
          isActive: true,
          createdAt: vaultProject.createdAt,
          updatedAt: vaultProject.updatedAt,
        })
        .returning()

      // Migrate files
      const projectFilesList = await db
        .select()
        .from(vaultFiles)
        .where(eq(vaultFiles.projectId, vaultProject.id))

      for (const vaultFile of projectFilesList) {
        await db.insert(projectFiles).values({
          id: vaultFile.id,
          projectId: project.id,
          name: vaultFile.name,
          storagePath: vaultFile.storagePath,
          mimeType: vaultFile.mimeType,
          sizeBytes: vaultFile.sizeBytes,
          extractedText: vaultFile.extractedText,
          parsedStructure: vaultFile.parsedStructure,
          createdAt: vaultFile.createdAt,
        })
      }

      logger.info({ projectId: project.id, name: project.name }, 'Migrated vault project')
    } catch (error) {
      logger.error({ error, projectId: vaultProject.id }, 'Failed to migrate vault project')
    }
  }

  logger.info(`Migrated ${allVaultProjects.length} vault projects`)
}

async function migratePlaybooks() {
  logger.info('Starting playbooks migration...')

  const allPlaybooks = await db
    .select()
    .from(playbooks)
    .where(eq(playbooks.isActive, true))

  for (const playbook of allPlaybooks) {
    try {
      // Create new playbook
      const [newPlaybook] = await db
        .insert(playbooksNew)
        .values({
          id: playbook.id,
          userId: playbook.userId,
          name: playbook.playbookName,
          description: playbook.description,
          playbookType: playbook.playbookType,
          userPosition: playbook.userPosition,
          jurisdiction: playbook.jurisdiction,
          visibility: 'private',
          isActive: true,
          createdAt: playbook.createdAt,
          updatedAt: playbook.updatedAt,
        })
        .returning()

      // Extract rules from JSONB
      const rulesJson = playbook.rules as {
        instructionRequestRules?: Array<{
          id?: string
          rule_number?: string
          brief_name?: string
          instruction?: string
        }>
        alwaysAppliedRules?: Array<{
          id?: string
          rule_number?: string
          brief_name?: string
          instruction?: string
          example_language?: string
        }>
        conditionalRules?: Array<{
          id?: string
          rule_number?: string
          brief_name?: string
          instruction?: string
          example_language?: string
        }>
      }

      const allRules: Array<{
        ruleNumber: string
        ruleType: 'instruction_request' | 'amendment_always' | 'amendment_conditional'
        briefName: string
        instruction: string
        exampleLanguage?: string
        sortOrder: number
      }> = []

      let sortOrder = 0

      // Process instruction request rules
      if (rulesJson.instructionRequestRules) {
        for (const rule of rulesJson.instructionRequestRules) {
          allRules.push({
            ruleNumber: rule.rule_number || `IR${sortOrder + 1}`,
            ruleType: 'instruction_request',
            briefName: rule.brief_name || '',
            instruction: rule.instruction || '',
            sortOrder: sortOrder++,
          })
        }
      }

      // Process always applied rules
      if (rulesJson.alwaysAppliedRules) {
        for (const rule of rulesJson.alwaysAppliedRules) {
          allRules.push({
            ruleNumber: rule.rule_number || `CA${sortOrder + 1}`,
            ruleType: 'amendment_always',
            briefName: rule.brief_name || '',
            instruction: rule.instruction || '',
            exampleLanguage: rule.example_language,
            sortOrder: sortOrder++,
          })
        }
      }

      // Process conditional rules
      if (rulesJson.conditionalRules) {
        for (const rule of rulesJson.conditionalRules) {
          allRules.push({
            ruleNumber: rule.rule_number || `CC${sortOrder + 1}`,
            ruleType: 'amendment_conditional',
            briefName: rule.brief_name || '',
            instruction: rule.instruction || '',
            exampleLanguage: rule.example_language,
            sortOrder: sortOrder++,
          })
        }
      }

      // Create version with rules snapshot
      const [version] = await db
        .insert(playbookVersions)
        .values({
          playbookId: newPlaybook.id,
          versionNumber: 1,
          rulesSnapshot: allRules as unknown as typeof playbookVersions.$inferInsert.rulesSnapshot,
          changeType: 'created',
          changeDescription: 'Migrated from playbooks table',
        })
        .returning()

      // Update playbook with current version
      await db
        .update(playbooksNew)
        .set({
          currentVersionId: version.id,
          ruleCount: allRules.length,
        })
        .where(eq(playbooksNew.id, newPlaybook.id))

      // Create normalized rules
      if (allRules.length > 0) {
        await db.insert(playbookRules).values(
          allRules.map((rule) => ({
            playbookId: newPlaybook.id,
            ruleNumber: rule.ruleNumber,
            ruleType: rule.ruleType,
            briefName: rule.briefName,
            instruction: rule.instruction,
            exampleLanguage: rule.exampleLanguage,
            sortOrder: rule.sortOrder,
            isActive: true,
          }))
        )
      }

      logger.info({ playbookId: newPlaybook.id, name: newPlaybook.name, ruleCount: allRules.length }, 'Migrated playbook')
    } catch (error) {
      logger.error({ error, playbookId: playbook.id }, 'Failed to migrate playbook')
    }
  }

  logger.info(`Migrated ${allPlaybooks.length} playbooks`)
}

async function main() {
  try {
    logger.info('Starting library migration...')

    await migrateVaultClauses()
    await migrateVaultProjects()
    await migratePlaybooks()

    logger.info('Library migration completed successfully')
    process.exit(0)
  } catch (error) {
    logger.error({ error }, 'Library migration failed')
    process.exit(1)
  }
}

// Run migration if executed directly
if (require.main === module) {
  main()
}

export { migrateVaultClauses, migrateVaultProjects, migratePlaybooks }

