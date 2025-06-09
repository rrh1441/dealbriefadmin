import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/db'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> }
) {
  const startTime = Date.now()
  
  try {
    const { tags = [] } = await request.json()
    const params = await context.params
    const { scanId } = params
    
    console.log(`🔍 [REPORT-GEN] Starting report generation for scan: ${scanId}`)
    console.log(`📋 [REPORT-GEN] Tags provided:`, tags)
    console.log(`🔍 [REPORT-GEN] Request URL: ${request.url}`)
    
    // Call the main API to generate the report
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dealbrief-scanner.fly.dev'
    const reportApiUrl = `${apiUrl}/scan/${scanId}/report`
    console.log(`📡 [REPORT-GEN] Calling external report API: ${reportApiUrl}`)
    
    const reportApiStart = Date.now()
    const reportResponse = await fetch(reportApiUrl)
    const reportApiTime = Date.now() - reportApiStart
    
    console.log(`📡 [REPORT-GEN] External API call completed in ${reportApiTime}ms with status: ${reportResponse.status}`)
    
    if (!reportResponse.ok) {
      const errorText = await reportResponse.text()
      console.error(`❌ [REPORT-GEN] External API error: ${reportResponse.status} ${reportResponse.statusText}`)
      console.error(`❌ [REPORT-GEN] Error response body:`, errorText)
      throw new Error(`Report API returned ${reportResponse.status}: ${reportResponse.statusText}`)
    }
    
    const reportData = await reportResponse.json()
    console.log(`✅ [REPORT-GEN] Report generated successfully`)
    console.log(`📊 [REPORT-GEN] Report data keys:`, Object.keys(reportData))
    console.log(`📊 [REPORT-GEN] Report content length: ${reportData.report?.length || 0} chars`)
    console.log(`📊 [REPORT-GEN] Summary length: ${reportData.summary?.length || 0} chars`)
    
    // Get scan details to populate company info
    const scanLookupStart = Date.now()
    const { data: artifacts, error: artifactsError } = await supabaseServer
      .from('artifacts')
      .select('meta, src_url')
      .eq('meta->>scan_id', scanId)
      .limit(1)
    
    const scanLookupTime = Date.now() - scanLookupStart
    console.log(`📊 [REPORT-GEN] Scan lookup completed in ${scanLookupTime}ms`)
    
    if (artifactsError) {
      console.error(`❌ [REPORT-GEN] Scan lookup error for ${scanId}:`, artifactsError)
      throw artifactsError
    }
    
    if (!artifacts || artifacts.length === 0) {
      console.error(`❌ [REPORT-GEN] Scan not found in database: ${scanId}`)
      throw new Error('Scan not found')
    }
    
    const artifact = artifacts[0]
    const meta = artifact.meta as any
    const companyName = meta?.company || 'Unknown'
    const domain = meta?.domain || artifact.src_url || 'Unknown'
    
    console.log(`📊 [REPORT-GEN] Scan details - Company: ${companyName}, Domain: ${domain}`)
    
    // Store report in database using upsert (without domain field)
    const dbStoreStart = Date.now()
    const reportRecord = {
      scan_id: scanId,
      company_name: companyName,
      report_content: reportData.report || '',
      executive_summary: reportData.summary || '',
      tags: JSON.stringify(tags),
      generated_at: new Date().toISOString()
    }
    
    console.log(`💾 [REPORT-GEN] Storing report in database...`)
    console.log(`💾 [REPORT-GEN] Report record summary:`, {
      scan_id: reportRecord.scan_id,
      company_name: reportRecord.company_name,
      content_length: reportRecord.report_content.length,
      summary_length: reportRecord.executive_summary.length,
      tags_count: tags.length
    })
    
    const { data: storedReport, error: reportError } = await supabaseServer
      .from('security_reports')
      .upsert(reportRecord, {
        onConflict: 'scan_id'
      })
      .select('id, generated_at')
      .single()
    
    const dbStoreTime = Date.now() - dbStoreStart
    console.log(`💾 [REPORT-GEN] Database storage completed in ${dbStoreTime}ms`)
    
    if (reportError) {
      console.error(`❌ [REPORT-GEN] Database storage error:`, reportError)
      throw reportError
    }
    
    console.log(`✅ [REPORT-GEN] Report stored with ID: ${storedReport?.id}`)
    
    const totalTime = Date.now() - startTime
    const response = { 
      reportId: storedReport?.id,
      reportUrl: `/api/scans/${scanId}/report/view`,
      report: reportData.report,
      summary: reportData.summary,
      generatedAt: storedReport?.generated_at
    }
    
    console.log(`✅ [REPORT-GEN] Operation completed in ${totalTime}ms`)
    console.log(`✅ [REPORT-GEN] Performance breakdown: API=${reportApiTime}ms, Lookup=${scanLookupTime}ms, Store=${dbStoreTime}ms`)
    
    return NextResponse.json(response)
  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`❌ [REPORT-GEN] Operation failed after ${totalTime}ms:`, error)
    console.error('❌ [REPORT-GEN] Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack?.split('\n').slice(0, 5) // First 5 lines of stack trace
    })
    
    return NextResponse.json({
      error: 'Failed to generate report',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}