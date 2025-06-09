import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/db'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> }
) {
  const startTime = Date.now()
  const params = await context.params
  const { scanId } = params
  
  try {
    console.log(`🔍 [SCAN-STATUS] Fetching status for scan: ${scanId}`)
    
    // First, get current status from Supabase
    const dbStart = Date.now()
    const { data: currentStatus, error: dbError } = await supabaseServer
      .from('scan_status')
      .select('*')
      .eq('scan_id', scanId)
      .single()
    
    const dbTime = Date.now() - dbStart
    console.log(`📊 [SCAN-STATUS] Supabase lookup completed in ${dbTime}ms`)
    
    if (dbError && dbError.code !== 'PGRST116') { // PGRST116 = not found
      console.error(`❌ [SCAN-STATUS] Supabase error:`, dbError)
      throw dbError
    }
    
    // If scan is already completed, return cached status
    if (currentStatus && ['completed', 'failed'].includes(currentStatus.status)) {
      console.log(`✅ [SCAN-STATUS] Returning cached status: ${currentStatus.status}`)
      return NextResponse.json(currentStatus)
    }
    
    // Poll Fly.io for current status
    const flyApiStart = Date.now()
    const flyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scan/${scanId}/status`)
    const flyApiTime = Date.now() - flyApiStart
    
    console.log(`📡 [SCAN-STATUS] Fly.io API call completed in ${flyApiTime}ms with status: ${flyResponse.status}`)
    
    if (!flyResponse.ok) {
      console.warn(`⚠️ [SCAN-STATUS] Fly.io API error: ${flyResponse.status}`)
      // If Fly.io is unreachable but we have cached status, return it
      if (currentStatus) {
        return NextResponse.json(currentStatus)
      }
      throw new Error(`Fly.io API returned ${flyResponse.status}`)
    }
    
    const flyStatus = await flyResponse.json()
    console.log(`📊 [SCAN-STATUS] Fly.io status:`, flyStatus)
    
    // Map Fly.io status to our format
    const mappedStatus = mapFlyStatusToOurs(flyStatus)
    
    // Update status in Supabase
    const updateStart = Date.now()
    const { data: updatedStatus, error: updateError } = await supabaseServer
      .from('scan_status')
      .upsert({
        scan_id: scanId,
        company_name: currentStatus?.company_name || 'Unknown',
        domain: currentStatus?.domain || 'Unknown',
        status: mappedStatus.status,
        progress: mappedStatus.progress,
        current_module: mappedStatus.current_module,
        total_modules: currentStatus?.total_modules || 10,
        started_at: currentStatus?.started_at || new Date().toISOString(),
        last_updated: new Date().toISOString(),
        error_message: mappedStatus.error_message,
        completed_at: mappedStatus.status === 'completed' ? new Date().toISOString() : null
      }, {
        onConflict: 'scan_id'
      })
      .select()
      .single()
    
    const updateTime = Date.now() - updateStart
    console.log(`💾 [SCAN-STATUS] Status updated in Supabase in ${updateTime}ms`)
    
    if (updateError) {
      console.error(`❌ [SCAN-STATUS] Failed to update status:`, updateError)
      // Return Fly.io status even if DB update fails
      return NextResponse.json(mappedStatus)
    }
    
    const totalTime = Date.now() - startTime
    console.log(`✅ [SCAN-STATUS] Operation completed in ${totalTime}ms`)
    console.log(`📊 [SCAN-STATUS] Performance: DB=${dbTime}ms, Fly.io=${flyApiTime}ms, Update=${updateTime}ms`)
    
    return NextResponse.json(updatedStatus)
  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`❌ [SCAN-STATUS] Operation failed after ${totalTime}ms:`, error)
    
    return NextResponse.json({
      error: 'Failed to fetch scan status',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}

function mapFlyStatusToOurs(flyStatus: any) {
  // Map Fly.io status format to our Supabase format
  const statusMap: Record<string, string> = {
    'queued': 'queued',
    'running': 'running',
    'processing': 'running',
    'completed': 'completed',
    'done': 'completed',
    'failed': 'failed',
    'error': 'failed'
  }
  
  const status = statusMap[flyStatus.state?.toLowerCase()] || 'running'
  
  return {
    status,
    progress: flyStatus.progress || 0,
    current_module: flyStatus.current_module || flyStatus.currentStep || null,
    error_message: status === 'failed' ? flyStatus.message || flyStatus.error : null
  }
} 