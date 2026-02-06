import { nanoid } from 'nanoid'
import type { NewPlaybook } from '@/db/schema/index'

/**
 * Sample playbook data for testing
 */
export function createTestPlaybookData(overrides?: Partial<NewPlaybook>): NewPlaybook {
  return {
    userId: overrides?.userId || '',
    playbookName: overrides?.playbookName || `Test Playbook ${nanoid(8)}`,
    description: overrides?.description || 'Test description',
    playbookType: overrides?.playbookType || 'review',
    userPosition: overrides?.userPosition || 'Neutral',
    jurisdiction: overrides?.jurisdiction || 'Singapore',
    tags: overrides?.tags || 'test,example',
    rules: overrides?.rules || {
      instructionRequestRules: [],
      alwaysAppliedRules: [],
      conditionalRules: [],
    },
    metadata: overrides?.metadata || {},
    isActive: overrides?.isActive ?? true,
  }
}

/**
 * Sample document data for testing
 */
export function createTestDocumentData(userId: string, overrides?: any) {
  return {
    userId,
    title: overrides?.title || `Test Document ${nanoid(8)}`,
    content: overrides?.content || 'Test document content',
    metadata: overrides?.metadata || {},
    isActive: overrides?.isActive ?? true,
  }
}

