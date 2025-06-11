import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
    const { data: status, error } = await db
      .from('scan_status')
      .select('*')
      .eq('scan_id', scanId)
      .single()
    
    const statusTime = Date.now() - statusStart
    console.log(`📊 [SCAN-STATUS] Supabase query completed in ${statusTime}ms`)
    
    if (error) {
      // Handle "not found" error (PGRST116)
      if (error.code === 'PGRST116') {
        console.log(`⚠️ [SCAN-STATUS] No record found in Supabase for scan ${scanId}`)
        return NextResponse.json({ 
          error: 'Scan not found',
          message: `No scan found with ID: ${scanId}`
        }, { status: 404 })
      }
      
      // Handle other database errors
      console.error('❌ [SCAN-STATUS] Supabase query error:', error)
      throw error
    }
    
    if (!status) {
      console.log(`⚠️ [SCAN-STATUS] No scan status found for scan ${scanId}`)
      return NextResponse.json({ 
        error: 'Scan not found',
        message: `No scan found with ID: ${scanId}`
      }, { status: 404 })
    }
    
    console.log(`✅ [SCAN-STATUS] Found scan status for ${scanId}:`, {
      id: status.scan_id,
      companyName: status.company_name,
      status: status.status,
      progress: status.progress,
      currentModule: status.current_module,
      totalModules: status.total_modules,
      createdAt: status.created_at,
      updatedAt: status.updated_at,
      errorMessage: status.error_message
    })
    
    const totalTime = Date.now() - startTime
    console.log(`✅ [SCAN-STATUS] Operation completed in ${totalTime}ms`)
    
    return NextResponse.json({
      id: status.scan_id,
      companyName: status.company_name,
      status: status.status,
      progress: status.progress,
      currentModule: status.current_module,
      totalModules: status.total_modules,
      createdAt: status.created_at,
      updatedAt: status.updated_at,
      errorMessage: status.error_message
    })
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