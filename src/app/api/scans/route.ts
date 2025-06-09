import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export async function GET() {
  try {
    console.log('🔍 Attempting to connect to database...')
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set')
    console.log('NODE_ENV:', process.env.NODE_ENV)
    
    const pool = getPool()
    
    const query = `
      WITH scan_summary AS (
        SELECT 
          meta->>'scan_id' as scan_id,
          meta->>'company' as company_name,
          MIN(CASE WHEN meta->>'domain' IS NOT NULL THEN meta->>'domain' ELSE src_url END) as domain,
          MIN(created_at) as created_at,
          MAX(created_at) as completed_at,
          COUNT(*) as total_findings,
          MAX(severity) as max_severity
        FROM artifacts
        WHERE meta->>'scan_id' IS NOT NULL
        GROUP BY meta->>'scan_id', meta->>'company'
      )
      SELECT 
        scan_id as "scanId",
        company_name as "companyName",
        domain,
        'done' as status,
        created_at as "createdAt",
        completed_at as "completedAt",
        total_findings as "totalFindings",
        max_severity as "maxSeverity"
      FROM scan_summary
      ORDER BY created_at DESC
      LIMIT 100
    `
    
    console.log('📊 Executing query...')
    const result = await pool.query(query)
    console.log('✅ Query successful, found', result.rows.length, 'scans')
    
    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('❌ Database error:', error)
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    })
    
    return NextResponse.json({ 
      error: 'Database connection failed',
      details: error?.message || 'Unknown error',
      code: error?.code 
    }, { status: 500 })
  }
}