import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { companyName, domain } = await request.json()
    
    console.log(`🔍 [SCAN-CREATE] Starting scan creation for: ${companyName} (${domain})`)
    
    // First, create scan on the backend
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ companyName, domain }),
    })
    
    if (!backendResponse.ok) {
      throw new Error(`Backend API failed with status: ${backendResponse.status}`)
    }
    
    const result = await backendResponse.json()
    
    // Strict validation check
    if (!result || !result.scanId) {
      const errorMsg = `Backend scan creation failed: Invalid or missing scanId. Result: ${JSON.stringify(result)}`
      console.error(`❌ [SCAN-CREATE] ${errorMsg}`)
      throw new Error(errorMsg)
    }
    
    console.log(`✅ [SCAN-CREATE] Scan created on backend with ID: ${result.scanId}`)
    
    // Create scan status record in Supabase
    const { data: scanStatus, error } = await db
      .from('scan_status')
      .insert({
        scan_id: result.scanId,
        company_name: companyName,
        domain: domain,
        status: 'queued',
        progress: 0,
        current_module: 'Initializing',
        total_modules: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('scan_id')
      .single()

    if (error) {
      console.error(`❌ [SCAN-CREATE] Supabase insert failed:`, error)
      throw error
    }

    console.log(`✅ [SCAN-CREATE] Scan status record created in Supabase`)
    
    const totalTime = Date.now() - startTime
    console.log(`✅ [SCAN-CREATE] Operation completed in ${totalTime}ms`)
    
    return NextResponse.json({
      id: result.scanId,
      companyName,
      domain,
      status: 'queued',
      progress: 0,
      currentModule: 'Initializing',
      totalModules: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      findings: []
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
      { error: 'Failed to create scan' },
      { status: 500 }
    )
  }
}