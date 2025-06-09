import { Pool } from 'pg'

let pool: Pool | null = null

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  }
  return pool
}

export const SECURITY_MODULES = [
  'spiderfoot',
  'dnsTwist',
  'crmExposure',
  'fileHunt',
  'shodan',
  'dbPortScan',
  'endpointDiscovery',
  'tlsScan',
  'nuclei',
  'zapRateIp',
  'zapRateToken',
  'spfDmarc',
  'trufflehog',
] as const

export type SecurityModule = typeof SECURITY_MODULES[number]