import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/db'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> }
) {
  const startTime = Date.now()
  
  try {
    const params = await context.params
    const { scanId } = params
    
    console.log(`🔍 [REPORT-VIEW] Starting report retrieval for scan: ${scanId}`)
    console.log(`🔍 [REPORT-VIEW] Request URL: ${request.url}`)
    
    const queryStart = Date.now()
    const { data: reports, error } = await supabaseServer
      .from('security_reports')
      .select(`
        id,
        scan_id,
        company_name,
        report_content,
        executive_summary,
        tags,
        generated_at
      `)
      .eq('scan_id', scanId)
      .order('generated_at', { ascending: false })
      .limit(1)
    
    const queryTime = Date.now() - queryStart
    console.log(`📊 [REPORT-VIEW] Supabase query completed in ${queryTime}ms`)
    
    if (error) {
      console.error(`❌ [REPORT-VIEW] Supabase query error for scan ${scanId}:`, error)
      throw error
    }
    
    if (!reports || reports.length === 0) {
      console.log(`❌ [REPORT-VIEW] Report not found for scan: ${scanId}`)
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }
    
    const report = reports[0]
    console.log(`✅ [REPORT-VIEW] Found report for: ${report.company_name}`)
    console.log(`📊 [REPORT-VIEW] Report stats - Content: ${report.report_content?.length || 0} chars, Summary: ${report.executive_summary?.length || 0} chars`)
    
    // Parse tags if they're stored as JSON string
    const tags = typeof report.tags === 'string' ? JSON.parse(report.tags) : (report.tags || [])
    console.log(`📊 [REPORT-VIEW] Tags: ${Array.isArray(tags) ? tags.length : 0} tags`)
    
    const htmlGenerationStart = Date.now()
    
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
            <h2>${report.company_name}</h2>
            <p><strong>Generated:</strong> ${new Date(report.generated_at).toLocaleString()}</p>
            <div class="tags">
              <strong>Tags:</strong>
              ${Array.isArray(tags) ? tags.map((tag: string) => `<span class="tag">${tag}</span>`).join('') : 'None'}
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
    
    const htmlGenerationTime = Date.now() - htmlGenerationStart
    const totalTime = Date.now() - startTime
    
    console.log(`📊 [REPORT-VIEW] HTML generation completed in ${htmlGenerationTime}ms`)
    console.log(`✅ [REPORT-VIEW] Operation completed in ${totalTime}ms for ${report.company_name}`)
    console.log(`📊 [REPORT-VIEW] Final HTML size: ${html.length} characters`)
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    })
  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`❌ [REPORT-VIEW] Operation failed after ${totalTime}ms:`, error)
    console.error('❌ [REPORT-VIEW] Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    })
    
    return NextResponse.json({
      error: 'Failed to retrieve report',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}