'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Plus, Search, Filter, AlertTriangle, CheckCircle, Clock, RefreshCw, Activity } from 'lucide-react'
import { api, type Scan } from '@/lib/api'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MainNav } from '@/components/layout/main-nav'

export default function ScansPage() {
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewScanForm, setShowNewScanForm] = useState(false)
  const [newScan, setNewScan] = useState({ companyName: '', domain: '' })
  const [creating, setCreating] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const pollersRef = useRef<Map<string, () => void>>(new Map())

  const fetchScans = async () => {
    try {
      const data = await api.getScans()
      setScans(data)
      
      // Set up polling for active scans
      setupPollingForActiveScans(data)
    } catch (error) {
      console.error('Failed to fetch scans:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupPollingForActiveScans = (scanList: Scan[]) => {
    // Clean up existing pollers
    pollersRef.current.forEach(cleanup => cleanup())
    pollersRef.current.clear()

    // Set up polling for scans that are still running
    scanList.forEach(scan => {
      if (['queued', 'running', 'processing'].includes(scan.status)) {
        const cleanup = api.pollScanStatus(scan.id, (status) => {
          setScans(prevScans => 
            prevScans.map(s => 
              s.id === scan.id 
                ? {
                    ...s,
                    status: status.status as any,
                    progress: status.progress,
                    currentModule: status.current_module,
                    errorMessage: status.error_message,
                    lastUpdated: status.last_updated
                  }
                : s
            )
          )
        }, 5000) // Poll every 5 seconds

        pollersRef.current.set(scan.id, cleanup)
      }
    })
  }

  useEffect(() => {
    fetchScans()
    
    // Refresh all scans every 2 minutes
    const interval = setInterval(fetchScans, 120000)
    
    return () => {
      clearInterval(interval)
      // Clean up all pollers
      pollersRef.current.forEach(cleanup => cleanup())
      pollersRef.current.clear()
    }
  }, [])

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowConfirmModal(true)
  }

  const handleCreateScan = async () => {
    setCreating(true)
    setShowConfirmModal(false)
    
    try {
      const result = await api.createScan(newScan.companyName, newScan.domain)
      setShowNewScanForm(false)
      setNewScan({ companyName: '', domain: '' })
      
      // Show success message
      alert(`Scan created successfully! Scan ID: ${result.id}`)
      
      // Refresh scans list immediately
      fetchScans()
    } catch (error) {
      console.error('Failed to create scan:', error)
      alert('Failed to create scan. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const filteredScans = scans.filter(scan => 
    (scan.companyName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (scan.domain?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  )

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-destructive" />
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'MEDIUM':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
      case 'processing':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-destructive" />
      case 'completed':
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'processing':
        return 'text-blue-600'
      case 'queued':
        return 'text-yellow-600'
      case 'failed':
        return 'text-red-600'
      case 'completed':
      case 'done':
        return 'text-green-600'
      default:
        return 'text-muted-foreground'
    }
  }

  const renderProgressBar = (scan: Scan) => {
    if (!['queued', 'running', 'processing'].includes(scan.status)) {
      return null
    }

    const progress = scan.progress || 0
    
    return (
      <div className="w-full mt-2">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{scan.currentModule || 'Initializing...'}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="container mx-auto py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Security Scans</h1>
              <p className="text-muted-foreground">
                View and manage all security scans
              </p>
            </div>
            <Button onClick={() => setShowNewScanForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Scan
            </Button>
          </div>

          {showNewScanForm && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Scan</CardTitle>
                <CardDescription>
                  Enter the company details to start a security scan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="companyName" className="block text-sm font-medium mb-1">
                      Company Name
                    </label>
                    <input
                      id="companyName"
                      type="text"
                      required
                      value={newScan.companyName}
                      onChange={(e) => setNewScan({ ...newScan, companyName: e.target.value })}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Acme Corp"
                    />
                  </div>
                  <div>
                    <label htmlFor="domain" className="block text-sm font-medium mb-1">
                      Domain
                    </label>
                    <input
                      id="domain"
                      type="text"
                      required
                      value={newScan.domain}
                      onChange={(e) => setNewScan({ ...newScan, domain: e.target.value })}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="example.com"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button type="submit" disabled={creating}>
                      {creating ? 'Creating...' : 'Start Scan'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewScanForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {showConfirmModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md mx-4">
                <CardHeader>
                  <CardTitle>Confirm Scan Creation</CardTitle>
                  <CardDescription>
                    Please verify the details before starting the scan. Once started, the scan cannot be stopped.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Company Name:
                    </label>
                    <p className="text-sm font-medium">{newScan.companyName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Domain:
                    </label>
                    <p className="text-sm font-medium">{newScan.domain}</p>
                  </div>
                  <div className="flex space-x-2 pt-4">
                    <Button 
                      onClick={handleCreateScan} 
                      disabled={creating}
                      className="flex-1"
                    >
                      {creating ? 'Creating...' : 'Start Scan'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowConfirmModal(false)}
                      disabled={creating}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by company or domain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchScans}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Scans</CardTitle>
              <CardDescription>
                {filteredScans.length} scans found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Shield className="h-8 w-8 animate-pulse" />
                </div>
              ) : filteredScans.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No scans found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredScans.map((scan) => (
                    <div
                      key={scan.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <Shield className="h-10 w-10 text-muted-foreground" />
                        <div className="flex-1">
                          <h3 className="text-sm font-medium">
                            {scan.companyName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {scan.domain}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true })}
                          </p>
                          {renderProgressBar(scan)}
                          {scan.errorMessage && (
                            <p className="text-xs text-destructive mt-1">
                              Error: {scan.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(scan.status)}
                          <span className={`text-sm capitalize ${getStatusColor(scan.status)}`}>
                            {scan.status === 'done' ? 'completed' : scan.status}
                          </span>
                        </div>
                        {scan.status === 'done' && getSeverityIcon(scan.maxSeverity)}
                        {scan.totalFindings !== undefined && (
                          <div className="text-sm text-muted-foreground">
                            {scan.totalFindings} findings
                          </div>
                        )}
                        <Link href={`/scans/${scan.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}