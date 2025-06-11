import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  const startTime = Date.now()
  const { scanId } = params
  
  try {
    console.log(`🔍 [SCAN-STATUS] Starting status fetch for scan ${scanId}...`)
    
    // Query Supabase scan_status table only
    const statusStart = Date.now()
    const { data: scanStatus, error: dbError } = await supabaseServer
      .from('scan_status')
      .select('*')
      .eq('scan_id', scanId)
      .single()
    
    const statusTime = Date.now() - statusStart
    console.log(`📊 [SCAN-STATUS] Supabase query completed in ${statusTime}ms`)
    
    if (dbError) {
      // Handle "not found" error (PGRST116)
      if (dbError.code === 'PGRST116') {
        console.log(`⚠️ [SCAN-STATUS] No record found in Supabase for scan ${scanId}`)
        return NextResponse.json({ 
          error: 'Scan not found',
          message: `No scan found with ID: ${scanId}`
        }, { status: 404 })
      }
      
      // Handle other database errors
      console.error('❌ [SCAN-STATUS] Supabase query error:', dbError)
      throw dbError
    }
    
    if (!scanStatus) {
      console.log(`⚠️ [SCAN-STATUS] No scan status found for scan ${scanId}`)
      return NextResponse.json({ 
        error: 'Scan not found',
        message: `No scan found with ID: ${scanId}`
      }, { status: 404 })
    }
    
    console.log(`✅ [SCAN-STATUS] Found scan status for ${scanId}:`, {
      status: scanStatus.status,
      progress: scanStatus.progress,
      currentModule: scanStatus.current_module,
      totalArtifacts: scanStatus.total_artifacts_count
    })
    
    const totalTime = Date.now() - startTime
    console.log(`✅ [SCAN-STATUS] Operation completed in ${totalTime}ms`)
    
    return NextResponse.json(scanStatus)
  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`❌ [SCAN-STATUS] Operation failed after ${totalTime}ms:`, error)
    console.error('❌ [SCAN-STATUS] Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    })
    
    return NextResponse.json({ 
      error: 'Failed to fetch scan status',
      details: error?.message || 'Unknown error',
      code: error?.code 
    }, { status: 500 })
  }
} 