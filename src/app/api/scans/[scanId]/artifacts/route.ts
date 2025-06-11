import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  const startTime = Date.now()
  const { scanId } = params
  
  try {
    console.log(`🔍 [SCAN-ARTIFACTS] Starting artifact fetch for scan ${scanId}...`)
    
    const backendUrl = process.env.NEXT_PUBLIC_API_URL
    if (!backendUrl) {
      throw new Error('NEXT_PUBLIC_API_URL environment variable is not set')
    }
    
    const artifactEndpoint = `${backendUrl}/scan/${scanId}/artifacts`
    console.log(`📡 [SCAN-ARTIFACTS] Calling backend endpoint: ${artifactEndpoint}`)
    
    const backendStart = Date.now()
    const response = await fetch(artifactEndpoint)
    const backendTime = Date.now() - backendStart
    
    console.log(`📊 [SCAN-ARTIFACTS] Backend call completed in ${backendTime}ms with status: ${response.status}`)
    
    if (!response.ok) {
      console.error(`❌ [SCAN-ARTIFACTS] Backend API error: ${response.status} ${response.statusText}`)
      
      // Try to get error details from response
      let errorDetails = 'Unknown error'
      try {
        const errorData = await response.text()
        errorDetails = errorData
      } catch (parseError) {
        console.warn('⚠️ [SCAN-ARTIFACTS] Could not parse error response')
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch artifacts from backend',
        details: errorDetails,
        status: response.status
      }, { status: response.status })
    }
    
    const artifacts = await response.json()
    console.log(`✅ [SCAN-ARTIFACTS] Successfully fetched ${artifacts?.length || 0} artifacts`)
    
    const totalTime = Date.now() - startTime
    console.log(`✅ [SCAN-ARTIFACTS] Operation completed in ${totalTime}ms`)
    
    return NextResponse.json(artifacts)
  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`❌ [SCAN-ARTIFACTS] Operation failed after ${totalTime}ms:`, error)
    console.error('❌ [SCAN-ARTIFACTS] Error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    })
    
    return NextResponse.json({ 
      error: 'Failed to fetch scan artifacts',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
} 