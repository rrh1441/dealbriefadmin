import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server-side client with service role key for API routes
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey)

// Client-side client with anon key for browser usage
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// Security modules configuration (kept for UI logic)
export const SECURITY_MODULES = [
  'subdomain_enum',
  'port_scan',
  'web_crawl',
  'ssl_scan',
  'dns_enum',
  'whois_lookup',
  'email_enum',
  'social_media_scan',
  'breach_check',
  'reputation_check'
] as const

export type SecurityModule = typeof SECURITY_MODULES[number]