import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/db'

export async function GET() {
  const startTime = Date.now()
  
  try {
    console.log('🔍 [REPORTS] Starting reports fetch operation...')
    
    const queryStart = Date.now()
    const { data: reports, error } = await supabaseServer
      .from('security_reports')
      .select(`
        id,
        scan_id,
        company_name,
        tags,
        generated_at
      `)
      .order('generated_at', { ascending: false })
      .limit(100)
    
    const queryTime = Date.now() - queryStart
    console.log(`📊 [REPORTS] Supabase query completed in ${queryTime}ms`)
    
    if (error) {
      console.error('❌ [REPORTS] Supabase query error:', error)
      throw error
    }
    
    console.log(`✅ [REPORTS] Found ${reports?.length || 0} reports`)
    
    if (!reports || reports.length === 0) {
      console.log('⚠️ [REPORTS] No reports found in database')
      return NextResponse.json([])
    }
    
    // Parse tags from JSON if they're stored as strings
    const processingStart = Date.now()
    const processedReports = reports?.map(row => ({
      ...row,
      domain: 'N/A', // Add default domain since column doesn't exist
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || [])
    })) || []
    
    const processingTime = Date.now() - processingStart
    console.log(`📊 [REPORTS] Tag processing completed in ${processingTime}ms`)
    
    // Log some statistics
    const companyCounts = processedReports.reduce((acc, report) => {
      acc[report.company_name] = (acc[report.company_name] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const totalTime = Date.now() - startTime
    console.log(`✅ [REPORTS] Operation completed in ${totalTime}ms`)
    console.log(`📊 [REPORTS] Company distribution:`, Object.keys(companyCounts).length, 'unique companies')
    console.log(`📊 [REPORTS] Date range: ${reports[reports.length - 1]?.generated_at} to ${reports[0]?.generated_at}`)
    
    return NextResponse.json(processedReports)
  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`❌ [REPORTS] Operation failed after ${totalTime}ms:`, error)
    console.error('❌ [REPORTS] Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    })
    
    return NextResponse.json({ 
      error: 'Failed to fetch reports',
      details: error?.message || 'Unknown error',
      code: error?.code 
    }, { status: 500 })
  }
}