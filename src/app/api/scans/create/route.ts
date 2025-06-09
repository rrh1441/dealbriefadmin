import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/db'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { companyName, domain } = await request.json()
    
    console.log(`🔍 [SCAN-CREATE] Starting scan creation for: ${companyName} (${domain})`)
    
    // Call Fly.io to start the scan
    const flyApiStart = Date.now()
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName, domain }),
    })
    
    const flyApiTime = Date.now() - flyApiStart
    console.log(`📡 [SCAN-CREATE] Fly.io API call completed in ${flyApiTime}ms with status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [SCAN-CREATE] Fly.io API error: ${response.status} ${response.statusText}`)
      console.error(`❌ [SCAN-CREATE] Error response:`, errorText)
      throw new Error(`Failed to create scan: ${response.statusText}`)
    }
    
    const result = await response.json()
    const scanId = result.scanId
    
    console.log(`✅ [SCAN-CREATE] Scan created on Fly.io with ID: ${scanId}`)
    
    // Store initial scan status in Supabase
    const dbStoreStart = Date.now()
    const { data: scanStatus, error: statusError } = await supabaseServer
      .from('scan_status')
      .insert({
        scan_id: scanId,
        company_name: companyName,
        domain: domain,
        status: 'queued',
        progress: 0,
        current_module: null,
        total_modules: 10, // Based on SECURITY_MODULES length
        started_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        error_message: null
      })
      .select()
      .single()
    
    const dbStoreTime = Date.now() - dbStoreStart
    console.log(`💾 [SCAN-CREATE] Status stored in Supabase in ${dbStoreTime}ms`)
    
    if (statusError) {
      console.error(`⚠️ [SCAN-CREATE] Failed to store status in Supabase:`, statusError)
      // Don't fail the request if status storage fails, just log it
    }
    
    const totalTime = Date.now() - startTime
    console.log(`✅ [SCAN-CREATE] Operation completed in ${totalTime}ms`)
    console.log(`📊 [SCAN-CREATE] Performance: Fly.io=${flyApiTime}ms, DB=${dbStoreTime}ms`)
    
    return NextResponse.json({
      ...result,
      statusStored: !statusError
    })
  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`❌ [SCAN-CREATE] Operation failed after ${totalTime}ms:`, error)
    console.error('❌ [SCAN-CREATE] Error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack?.split('\n').slice(0, 3)
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to create scan',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}