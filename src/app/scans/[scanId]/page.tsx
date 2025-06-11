'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, AlertTriangle, CheckCircle, Clock, RefreshCw, ArrowLeft, Activity, Database } from 'lucide-react'
import { api, type ScanDetails, type Artifact } from '@/lib/api'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MainNav } from '@/components/layout/main-nav'

export default function ScanDetailPage() {
  const params = useParams()
  const scanId = params.scanId as string
  
  const [scan, setScan] = useState<ScanDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadedArtifacts, setLoadedArtifacts] = useState<Artifact[]>([])
  const [artifactsLoading, setArtifactsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchScanDetails = async () => {
    try {
      const data = await api.getScanDetails(scanId)
      setScan(data)
    } catch (error) {
      console.error('Failed to fetch scan details:', error)
      setError('Failed to load scan details')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadArtifacts = async () => {
    setArtifactsLoading(true)
    try {
      const artifacts = await api.getScanArtifacts(scanId)
      setLoadedArtifacts(artifacts)
    } catch (error) {
      console.error('Failed to load artifacts:', error)
      alert('Failed to load artifacts. Please try again.')
    } finally {
      setArtifactsLoading(false)
    }
  }

  useEffect(() => {
    if (scanId) {
      fetchScanDetails()
    }
  }, [scanId])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'LOW':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="container mx-auto py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Shield className="h-8 w-8 animate-pulse" />
          </div>
        </main>
      </div>
    )
  }

  if (error || !scan) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="container mx-auto py-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Scan</h2>
            <p className="text-muted-foreground mb-4">
              {error || 'Scan not found'}
            </p>
            <Link href="/scans">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Scans
              </Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="container mx-auto py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/scans">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{scan.companyName}</h1>
                <p className="text-muted-foreground">{scan.domain}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(scan.status)}
              <span className="text-sm capitalize">
                {scan.status === 'done' ? 'completed' : scan.status}
              </span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Findings</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{scan.totalFindings}</div>
                <p className="text-xs text-muted-foreground">
                  Max severity: {scan.maxSeverity}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Artifacts</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{scan.totalArtifacts || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Raw scan data
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Scan Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDistanceToNow(new Date(scan.createdAt))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {scan.completedAt ? 'Completed' : 'Started'} {formatDistanceToNow(new Date(scan.completedAt || scan.createdAt), { addSuffix: true })}
                </p>
              </CardContent>
            </Card>
          </div>

          {['queued', 'running', 'processing'].includes(scan.status) && (
            <Card>
              <CardHeader>
                <CardTitle>Scan Progress</CardTitle>
                <CardDescription>
                  Current status and progress information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>{scan.currentModule || 'Initializing...'}</span>
                    <span>{scan.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${scan.progress || 0}%` }}
                    />
                  </div>
                  {scan.errorMessage && (
                    <div className="text-sm text-destructive">
                      Error: {scan.errorMessage}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Security Findings</CardTitle>
              <CardDescription>
                {scan.findings.length} findings discovered during the scan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scan.findings.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <h3 className="text-lg font-semibold mb-2">No Security Issues Found</h3>
                  <p className="text-muted-foreground">
                    This scan completed without identifying any security vulnerabilities.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scan.findings.map((finding) => (
                    <div key={finding.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={getSeverityColor(finding.severity)}>
                              {finding.severity}
                            </Badge>
                            <span className="text-sm font-medium">{finding.type}</span>
                          </div>
                          <h4 className="font-medium mb-2">{finding.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {finding.description}
                          </p>
                          {finding.recommendation && (
                            <div className="text-sm">
                              <strong>Recommendation:</strong> {finding.recommendation}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Artifacts</CardTitle>
              <CardDescription>
                Raw data collected during the scan ({scan.totalArtifacts || 0} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadedArtifacts.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Artifacts Not Loaded</h3>
                  <p className="text-muted-foreground mb-4">
                    Click the button below to load the raw scan artifacts
                  </p>
                  <Button 
                    onClick={handleLoadArtifacts}
                    disabled={artifactsLoading}
                  >
                    {artifactsLoading ? 'Loading...' : 'Load Artifacts'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Showing {loadedArtifacts.length} artifacts
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleLoadArtifacts}
                      disabled={artifactsLoading}
                    >
                      {artifactsLoading ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {loadedArtifacts.map((artifact) => (
                      <div key={artifact.id} className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{artifact.type}</span>
                          <Badge className={getSeverityColor(artifact.severity)}>
                            {artifact.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {artifact.valText}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}