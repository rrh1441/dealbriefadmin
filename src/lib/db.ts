import { createClient } from '@supabase/supabase-js'

// During build time, environment variables might not be available
// We'll create a mock client that returns empty data instead of throwing errors
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let db: any

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase environment variables not found. Using mock client for build.')
  
  // Mock client for build time
  db = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: { code: 'BUILD_TIME_MOCK' } }),
          order: () => Promise.resolve({ data: [], error: null })
        }),
        order: () => Promise.resolve({ data: [], error: null })
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { scan_id: 'mock-id' }, error: null })
        })
      })
    })
  }
} else {
  db = createClient(supabaseUrl, supabaseKey)
}

export { db }

// Security modules configuration (kept for UI logic)
export const SECURITY_MODULES = [
  'spiderfoot',
  'dns_twist',
  'document_exposure',
  'shodan',
  'db_port_scan',
  'endpoint_discovery',
  'tls_scan',
  'nuclei',
  'rate_limit_scan',
  'spf_dmarc',
  'trufflehog'
] as const

export type SecurityModule = typeof SECURITY_MODULES[number]