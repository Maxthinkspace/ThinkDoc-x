import { createOpenAPIApp } from '@/lib/openapi'
import { setupTestApp } from './setup-app'

/**
 * Get the test app instance
 * Creates a test-specific app instance with all routes configured
 */
export function getTestApp() {
  return setupTestApp()
}

