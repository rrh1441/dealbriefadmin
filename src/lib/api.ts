import { db } from './db'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface Scan {
  id: string
  companyName: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  progress: number
  currentModule: string
  totalModules: number
  createdAt: string
  updatedAt: string
  errorMessage?: string
  findings: Finding[]
}

export interface ScanDetails extends Scan {
  findings: Finding[]
}

export interface ScanStatus {
  scan_id: string
  company_name: string
  domain: string
  status: string
  progress: number
  current_module: string | null
  total_modules: number
  started_at: string
  last_updated: string
  completed_at: string | null
  error_message: string | null
  total_artifacts_count?: number
}

export interface Finding {
  id: string
  type: string
  title: string
  description: string
}

export interface Artifact {
  id: string
  scanId: string
  type: string
  valText: string
  severity: string
  createdAt: string
}

export interface Report {
  id: string
  scanId: string
  companyName: string
  domain: string
  createdAt: string
  totalFindings: number
  maxSeverity: string
  report_url?: string
}

export const api = {
  async getScans(): Promise<Scan[]> {
    const response = await fetch('/api/scans')
    if (!response.ok) {
      throw new Error('Failed to fetch scans')
    }
    return response.json()
  },

  async getScanDetails(scanId: string): Promise<ScanDetails> {
    const response = await fetch(`/api/scans/${scanId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch scan details')
    }
    return response.json()
  },

  async getScanStatus(scanId: string): Promise<ScanStatus> {
    const response = await fetch(`/api/scans/${scanId}/status`)
    if (!response.ok) throw new Error('Failed to fetch scan status')
    return response.json()
  },

  async getScanArtifacts(scanId: string): Promise<Artifact[]> {
    const response = await fetch(`/api/scans/${scanId}/artifacts`)
    if (!response.ok) throw new Error('Failed to fetch scan artifacts')
    return response.json()
  },

  async createScan(companyName: string, domain: string): Promise<Scan> {
    const response = await fetch('/api/scans/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ companyName, domain }),
    })
    if (!response.ok) {
      throw new Error('Failed to create scan')
    }
    return response.json()
  },

  async rerunScan(scanId: string): Promise<void> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scans/${scanId}/rerun`, {
      method: 'POST',
    })
    if (!response.ok) {
      throw new Error('Failed to rerun scan')
    }
  },

  async getReports(): Promise<Report[]> {
    const response = await fetch('/api/reports')
    if (!response.ok) throw new Error('Failed to fetch reports')
    return response.json()
  },

  pollScanStatus(
    scanId: string, 
    onUpdate: (status: ScanStatus) => void, 
    interval: number = 5000
  ): () => void {
    const poll = async () => {
      try {
        const status = await this.getScanStatus(scanId)
        onUpdate(status)
        
        // Stop polling if scan is complete
        if (['completed', 'failed', 'done'].includes(status.status)) {
          clearInterval(intervalId)
        }
      } catch (error) {
        console.error('Failed to poll scan status:', error)
      }
    }

    // Poll immediately, then at intervals
    poll()
    const intervalId = setInterval(poll, interval)

    // Return cleanup function
    return () => clearInterval(intervalId)
  }
}