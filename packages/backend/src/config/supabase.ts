import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Supabase project configuration
export const SUPABASE_CONFIG = {
  projectRef: 'poicimlmzscbhrreycce',
  url: process.env.SUPABASE_URL || 'https://poicimlmzscbhrreycce.supabase.co',
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
}

// Create Supabase client for authenticated users (uses RLS)
let supabaseClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!SUPABASE_CONFIG.anonKey) {
      throw new Error('SUPABASE_ANON_KEY environment variable is required')
    }
    supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
  }
  return supabaseClient
}

// Create Supabase admin client (bypasses RLS - use with caution)
let supabaseAdminClient: SupabaseClient | null = null

export function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseAdminClient) {
    if (!SUPABASE_CONFIG.serviceKey) {
      throw new Error('SUPABASE_SERVICE_KEY environment variable is required')
    }
    supabaseAdminClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return supabaseAdminClient
}

// Helper to get authenticated client for a specific user
export function getSupabaseClientForUser(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

// Storage bucket names
export const STORAGE_BUCKETS = {
  VAULT_FILES: 'vault-files',
  PROJECT_FILES: 'project-files',
  DOCUMENT_VERSIONS: 'document-versions',
} as const

// Helper to get storage URL for a file
export function getStorageUrl(bucket: string, path: string): string {
  return `${SUPABASE_CONFIG.url}/storage/v1/object/public/${bucket}/${path}`
}

// Helper to get signed URL for private files
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const client = getSupabaseAdminClient()
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)
  
  if (error) {
    console.error('Error creating signed URL:', error)
    return null
  }
  
  return data.signedUrl
}

// Database connection string for Drizzle (if needed alongside Supabase client)
export function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }
  
  const password = process.env.SUPABASE_DB_PASSWORD || ''
  return `postgresql://postgres:${password}@db.${SUPABASE_CONFIG.projectRef}.supabase.co:5432/postgres`
}

export default {
  config: SUPABASE_CONFIG,
  getClient: getSupabaseClient,
  getAdminClient: getSupabaseAdminClient,
  getClientForUser: getSupabaseClientForUser,
  storageBuckets: STORAGE_BUCKETS,
  getStorageUrl,
  getSignedUrl,
  getDatabaseUrl,
}
