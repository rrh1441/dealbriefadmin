import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export async function GET() {
  try {
    console.log('🔍 Fetching reports from database...')
    
    const pool = getPool()
    
    const query = `
      SELECT 
        id,
        scan_id,
        company_name,
        domain,
        tags,
        generated_at
      FROM security_reports
      ORDER BY generated_at DESC
      LIMIT 100
    `
    
    console.log('📊 Executing reports query...')
    const result = await pool.query(query)
    console.log('✅ Found', result.rows.length, 'reports')
    
    // Parse tags from JSON string
    const reports = result.rows.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : []
    }))
    
    return NextResponse.json(reports)
  } catch (error: any) {
    console.error('❌ Database error in reports:', error)
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    })
    
    return NextResponse.json({ 
      error: 'Failed to fetch reports',
      details: error?.message || 'Unknown error',
      code: error?.code 
    }, { status: 500 })
  }
}