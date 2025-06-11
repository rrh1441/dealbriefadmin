import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

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