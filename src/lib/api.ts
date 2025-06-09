const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealbrief-scanner.fly.dev'

export interface Scan {
  scanId: string
  companyName: string
  domain: string
  status: 'queued' | 'running' | 'processing' | 'done' | 'completed' | 'failed'
  createdAt: string
  completedAt?: string
  totalFindings?: number
  maxSeverity?: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  // Status tracking fields
  progress?: number
  currentModule?: string
  errorMessage?: string
  lastUpdated?: string
}

export interface ScanStatus {
  scan_id: string
  company_name: string
  domain: string
  status: 'queued' | 'running' | 'processing' | 'completed' | 'failed'
  progress: number
  current_module?: string
  total_modules: number
  started_at: string
  last_updated: string
  completed_at?: string
  error_message?: string
}

export interface ScanDetails extends Scan {
  modules: ModuleStatus[]
  findings: Finding[]
  artifacts: Artifact[]
}

export interface ModuleStatus {
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  findings: number
  startedAt?: string
  completedAt?: string
  error?: string
}

export interface Finding {
  id: string
  type: string
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  recommendation: string
  artifactId: string
  createdAt: string
}

export interface Artifact {
  id: string
  type: string
  valText: string
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  srcUrl?: string
  meta?: Record<string, any>
  createdAt: string
}

export const api = {
  async getScans(): Promise<Scan[]> {
    // Fetch from Vercel API routes which use Supabase
    const response = await fetch('/api/scans')
    if (!response.ok) throw new Error('Failed to fetch scans')
    return response.json()
  },

  async getScanDetails(scanId: string): Promise<ScanDetails> {
    const response = await fetch(`/api/scans/${scanId}`)
    if (!response.ok) throw new Error('Failed to fetch scan details')
    return response.json()
  },

  async getScanStatus(scanId: string): Promise<ScanStatus> {
    const response = await fetch(`/api/scans/${scanId}/status`)
    if (!response.ok) throw new Error('Failed to fetch scan status')
    return response.json()
  },

  async createScan(companyName: string, domain: string): Promise<{ scanId: string; statusStored: boolean }> {
    const response = await fetch('/api/scans/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName, domain }),
    })
    if (!response.ok) throw new Error('Failed to create scan')
    return response.json()
  },

  async generateReport(scanId: string, tags: string[] = []): Promise<{ reportUrl: string }> {
    const response = await fetch(`/api/scans/${scanId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    })
    if (!response.ok) throw new Error('Failed to generate report')
    return response.json()
  },

  async rerunScan(scanId: string): Promise<{ newScanId: string }> {
    // Call Fly.io backend directly for rerunning scans
    const response = await fetch(`${API_URL}/scan/${scanId}/rerun`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to rerun scan')
    return response.json()
  },

  // Utility function for polling scan status
  pollScanStatus(scanId: string, onUpdate: (status: ScanStatus) => void, intervalMs: number = 5000): () => void {
    const poll = async () => {
      try {
        const status = await this.getScanStatus(scanId)
        onUpdate(status)
        
        // Stop polling if scan is completed or failed
        if (['completed', 'failed'].includes(status.status)) {
          clearInterval(intervalId)
        }
      } catch (error) {
        console.error('Failed to poll scan status:', error)
      }
    }
    
    // Poll immediately, then at intervals
    poll()
    const intervalId = setInterval(poll, intervalMs)
    
    // Return cleanup function
    return () => clearInterval(intervalId)
  }
}