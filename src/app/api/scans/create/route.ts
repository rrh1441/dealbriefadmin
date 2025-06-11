import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { companyName, domain } = await request.json()
    
    console.log(`🔍 [SCAN-CREATE] Starting scan creation for: ${companyName} (${domain})`)
    
    // Create scan status record
    const { data: scanStatus, error } = await db
      .from('scan_status')
      .insert({
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

    if (error) throw error

    console.log(`✅ [SCAN-CREATE] Scan created on Fly.io with ID: ${scanStatus.scan_id}`)
    
    const totalTime = Date.now() - startTime
    console.log(`✅ [SCAN-CREATE] Operation completed in ${totalTime}ms`)
    
    return NextResponse.json({
      id: scanStatus.scan_id,
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