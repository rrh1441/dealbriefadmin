import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  const startTime = Date.now()
  const { scanId } = params
  
  try {
    console.log(`🔍 [ARTIFACTS] Proxying artifacts request for scan ${scanId}`)
    
    // Proxy request to backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/scan/${scanId}/artifacts`
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!backendResponse.ok) {
      console.error(`❌ [ARTIFACTS] Backend API failed with status: ${backendResponse.status}`)
      return NextResponse.json(
        { error: `Backend API failed with status: ${backendResponse.status}` },
        { status: backendResponse.status }
      )
    }
    
    const artifacts = await backendResponse.json()
    
    const totalTime = Date.now() - startTime
    console.log(`✅ [ARTIFACTS] Proxy completed in ${totalTime}ms - returning ${artifacts?.length || 0} artifacts`)
    
    return NextResponse.json(artifacts)
  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`❌ [ARTIFACTS] Proxy failed after ${totalTime}ms:`, error)
    
    return NextResponse.json(
      { error: 'Failed to fetch artifacts' },
      { status: 500 }
    )
  }
} 