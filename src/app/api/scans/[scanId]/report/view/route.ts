import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> }
) {
  try {
    const params = await context.params
    const { scanId } = params
    
    console.log('🔍 Retrieving report for scan:', scanId)
    
    const pool = getPool()
    
    const query = `
      SELECT 
        id,
        scan_id,
        company_name,
        domain,
        report_content,
        executive_summary,
        tags,
        generated_at
      FROM security_reports
      WHERE scan_id = $1
      ORDER BY generated_at DESC
      LIMIT 1
    `
    
    const result = await pool.query(query, [scanId])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }
    
    const report = result.rows[0]
    console.log('✅ Found report for:', report.company_name)
    
    // Return as HTML for viewing
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Security Report - ${report.company_name}</title>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              max-width: 1200px; 
              margin: 0 auto; 
              padding: 20px; 
              line-height: 1.6;
            }
            .header { 
              border-bottom: 2px solid #eee; 
              margin-bottom: 30px; 
              padding-bottom: 20px; 
            }
            .tags { 
              margin: 10px 0; 
            }
            .tag { 
              background: #f0f0f0; 
              padding: 4px 8px; 
              border-radius: 4px; 
              margin-right: 8px; 
              font-size: 12px;
            }
            pre { 
              background: #f8f8f8; 
              padding: 15px; 
              border-radius: 5px; 
              overflow-x: auto; 
            }
            h1, h2, h3 { color: #333; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Security Assessment Report</h1>
            <h2>${report.company_name} (${report.domain})</h2>
            <p><strong>Generated:</strong> ${new Date(report.generated_at).toLocaleString()}</p>
            <div class="tags">
              <strong>Tags:</strong>
              ${report.tags ? JSON.parse(report.tags).map((tag: string) => `<span class="tag">${tag}</span>`).join('') : 'None'}
            </div>
          </div>
          
          ${report.executive_summary ? `
            <section>
              <h2>Executive Summary</h2>
              <div>${report.executive_summary}</div>
            </section>
          ` : ''}
          
          <section>
            <h2>Detailed Report</h2>
            <pre>${report.report_content}</pre>
          </section>
        </body>
      </html>
    `
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    })
  } catch (error: any) {
    console.error('❌ Failed to retrieve report:', error)
    
    return NextResponse.json({
      error: 'Failed to retrieve report',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}