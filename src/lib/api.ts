const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealbrief-scanner.fly.dev'

export interface Scan {
  scanId: string
  companyName: string
  domain: string
  status: 'queued' | 'processing' | 'done' | 'failed'
  createdAt: string
  completedAt?: string
  totalFindings?: number
  maxSeverity?: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
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
    // For now, fetch from the database directly via API route
    const response = await fetch('/api/scans')
    if (!response.ok) throw new Error('Failed to fetch scans')
    return response.json()
  },

  async getScanDetails(scanId: string): Promise<ScanDetails> {
    const response = await fetch(`/api/scans/${scanId}`)
    if (!response.ok) throw new Error('Failed to fetch scan details')
    return response.json()
  },

  async createScan(companyName: string, domain: string): Promise<{ scanId: string }> {
    const response = await fetch('/api/scans/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName, domain }),
    })
    if (!response.ok) throw new Error('Failed to create scan')
    return response.json()
  },

  async getScanStatus(scanId: string): Promise<{ state: string; message: string }> {
    const response = await fetch(`${API_URL}/scan/${scanId}/status`)
    if (!response.ok) throw new Error('Failed to fetch scan status')
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
    const response = await fetch(`/api/scans/${scanId}/rerun`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to rerun scan')
    return response.json()
  },
}