import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> }
) {
  try {
    const { tags = [] } = await request.json()
    const params = await context.params
    const { scanId } = params
    
    console.log('🔍 Generating report for scan:', scanId)
    console.log('📋 Tags:', tags)
    
    const pool = getPool()
    
    // Call the main API to generate the report
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dealbrief-scanner.fly.dev'
    console.log('📡 Calling report API:', `${apiUrl}/scan/${scanId}/report`)
    
    const reportResponse = await fetch(`${apiUrl}/scan/${scanId}/report`)
    
    if (!reportResponse.ok) {
      throw new Error(`Report API returned ${reportResponse.status}: ${reportResponse.statusText}`)
    }
    
    const reportData = await reportResponse.json()
    console.log('✅ Report generated successfully')
    
    // Get scan details to populate company/domain info
    const scanQuery = `
      SELECT 
        meta->>'scan_id' as scan_id,
        meta->>'company' as company_name,
        MIN(CASE WHEN meta->>'domain' IS NOT NULL THEN meta->>'domain' ELSE src_url END) as domain
      FROM artifacts
      WHERE meta->>'scan_id' = $1
      GROUP BY meta->>'scan_id', meta->>'company'
      LIMIT 1
    `
    
    const scanResult = await pool.query(scanQuery, [scanId])
    
    if (scanResult.rows.length === 0) {
      throw new Error('Scan not found')
    }
    
    const scan = scanResult.rows[0]
    
    // Store report in database
    const insertReportQuery = `
      INSERT INTO security_reports (
        scan_id, 
        company_name, 
        domain, 
        report_content, 
        executive_summary, 
        tags, 
        generated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (scan_id) 
      DO UPDATE SET 
        report_content = EXCLUDED.report_content,
        executive_summary = EXCLUDED.executive_summary,
        tags = EXCLUDED.tags,
        generated_at = EXCLUDED.generated_at
      RETURNING id, generated_at
    `
    
    console.log('💾 Storing report in database...')
    const reportInsertResult = await pool.query(insertReportQuery, [
      scanId,
      scan.company_name,
      scan.domain,
      reportData.report || '',
      reportData.summary || '',
      JSON.stringify(tags),
    ])
    
    const reportRecord = reportInsertResult.rows[0]
    console.log('✅ Report stored with ID:', reportRecord.id)
    
    return NextResponse.json({ 
      reportId: reportRecord.id,
      reportUrl: `/api/scans/${scanId}/report/view`,
      report: reportData.report,
      summary: reportData.summary,
      generatedAt: reportRecord.generated_at
    })
  } catch (error: any) {
    console.error('❌ Failed to generate report:', error)
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    })
    
    return NextResponse.json({
      error: 'Failed to generate report',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}