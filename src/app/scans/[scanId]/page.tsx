'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, RefreshCw, Download, AlertTriangle, CheckCircle, Clock, ChevronRight, Tag } from 'lucide-react'
import { api, type ScanDetails, type ModuleStatus } from '@/lib/api'
import { formatDistanceToNow, format } from 'date-fns'
import { MainNav } from '@/components/layout/main-nav'

export default function ScanDetailPage() {
  const params = useParams()
  const scanId = params.scanId as string
  const [scan, setScan] = useState<ScanDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedModule, setSelectedModule] = useState<string | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const fetchScanDetails = async () => {
    try {
      const data = await api.getScanDetails(scanId)
      setScan(data)
      if (data.modules.length > 0) {
        setSelectedModule(data.modules[0].name)
      }
    } catch (error) {
      console.error('Failed to fetch scan details:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScanDetails()
  }, [scanId])

  const handleGenerateReport = async () => {
    if (!scan) return
    
    setGeneratingReport(true)
    try {
      const result = await api.generateReport(scan.scanId, tags)
      window.open(result.reportUrl, '_blank')
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setGeneratingReport(false)
    }
  }

  const handleRerunScan = async () => {
    if (!scan) return
    
    try {
      const result = await api.rerunScan(scan.scanId)
      // Navigate to new scan
      window.location.href = `/scans/${result.newScanId}`
    } catch (error) {
      console.error('Failed to rerun scan:', error)
    }
  }

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault()
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const getModuleStatusIcon = (status: ModuleStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-destructive" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    const colors = {
      CRITICAL: 'bg-destructive text-destructive-foreground',
      HIGH: 'bg-orange-500 text-white',
      MEDIUM: 'bg-yellow-500 text-white',
      LOW: 'bg-blue-500 text-white',
      INFO: 'bg-muted text-muted-foreground',
    }
    
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${colors[severity as keyof typeof colors] || colors.INFO}`}>
        {severity}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="container mx-auto py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Shield className="h-12 w-12 animate-pulse mx-auto mb-4" />
              <p className="text-muted-foreground">Loading scan details...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!scan) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="container mx-auto py-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Scan not found</p>
          </div>
        </main>
      </div>
    )
  }

  const selectedModuleData = scan.modules.find(m => m.name === selectedModule)
  const moduleArtifacts = scan.artifacts.filter(a => a.meta?.scan_module === selectedModule)
  const moduleFindings = scan.findings.filter(f => {
    const artifact = scan.artifacts.find(a => a.id === f.artifactId)
    return artifact?.meta?.scan_module === selectedModule
  })

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="container mx-auto py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{scan.companyName}</h1>
              <p className="text-muted-foreground">
                {scan.domain} • Scan ID: {scan.scanId}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={handleRerunScan}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-run Scan
              </Button>
              <Button onClick={handleGenerateReport} disabled={generatingReport}>
                <Download className="mr-2 h-4 w-4" />
                {generatingReport ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{scan.status}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{scan.totalFindings || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Started</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {format(new Date(scan.createdAt), 'MMM d, yyyy HH:mm')}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {scan.completedAt
                    ? formatDistanceToNow(new Date(scan.createdAt), { addSuffix: false })
                    : 'In progress...'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tags Section */}
          <Card>
            <CardHeader>
              <CardTitle>Report Tags</CardTitle>
              <CardDescription>
                Add tags to categorize this scan for the report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddTag} className="flex space-x-2 mb-4">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag..."
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button type="submit" size="sm">
                  <Tag className="mr-2 h-4 w-4" />
                  Add Tag
                </Button>
              </form>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 text-primary/60 hover:text-primary"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Modules Overview */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Security Modules</CardTitle>
                <CardDescription>
                  Module execution status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {scan.modules.map((module) => (
                    <button
                      key={module.name}
                      onClick={() => setSelectedModule(module.name)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        selectedModule === module.name
                          ? 'bg-accent border-accent-foreground/20'
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {getModuleStatusIcon(module.status)}
                        <span className="text-sm font-medium">{module.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          {module.findings} findings
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Module Details */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{selectedModule} Details</CardTitle>
                <CardDescription>
                  {selectedModuleData
                    ? `${moduleFindings.length} findings • ${moduleArtifacts.length} artifacts`
                    : 'Select a module to view details'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedModuleData && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Findings</h4>
                      {moduleFindings.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No findings for this module</p>
                      ) : (
                        <div className="space-y-2">
                          {moduleFindings.slice(0, 5).map((finding) => (
                            <div key={finding.id} className="rounded-lg border p-3">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <p className="text-sm font-medium">{finding.type}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {finding.description}
                                  </p>
                                </div>
                                {getSeverityBadge(finding.severity)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}