import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server-side client with service role key for API routes
export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey)

// Client-side client with anon key for browser usage
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

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