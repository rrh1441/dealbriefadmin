'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dealbrief/ui'
import { Button } from '@dealbrief/ui'
import { Shield, Plus, Search, Filter, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react'
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

  const fetchScans = async () => {
    try {
      const data = await api.getScans()
      setScans(data)
    } catch (error) {
      console.error('Failed to fetch scans:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScans()
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchScans, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleCreateScan = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    
    try {
      const result = await api.createScan(newScan.companyName, newScan.domain)
      setShowNewScanForm(false)
      setNewScan({ companyName: '', domain: '' })
      
      // Show success message
      alert(`Scan created successfully! Scan ID: ${result.scanId}`)
      
      // Refresh scans list
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
      case 'processing':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'queued':
        return <Clock className="h-4 w-4" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-destructive" />
      default:
        return null
    }
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
                <form onSubmit={handleCreateScan} className="space-y-4">
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
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
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
                      key={scan.scanId}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center space-x-4">
                        <Shield className="h-10 w-10 text-muted-foreground" />
                        <div>
                          <h3 className="text-sm font-medium">
                            {scan.companyName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {scan.domain}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(scan.status)}
                          {scan.status === 'done' && getSeverityIcon(scan.maxSeverity)}
                          <span className="text-sm capitalize">{scan.status}</span>
                        </div>
                        {scan.totalFindings !== undefined && (
                          <div className="text-sm text-muted-foreground">
                            {scan.totalFindings} findings
                          </div>
                        )}
                        <Link href={`/scans/${scan.scanId}`}>
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