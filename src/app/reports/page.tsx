'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { MainNav } from '@/components/layout/main-nav'

interface Report {
  id: string
  scanId: string
  companyName: string
  domain: string
  createdAt: string
  totalFindings: number
  maxSeverity: string
  report_url?: string
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports')
      if (!response.ok) throw new Error('Failed to fetch reports')
      const data = await response.json()
      setReports(data)
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-destructive" />
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'MEDIUM':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'LOW':
        return <AlertTriangle className="h-4 w-4 text-blue-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  const handleViewReport = (report: Report) => {
    if (report.report_url) {
      // Open report URL in new tab
      window.open(report.report_url, '_blank', 'noopener,noreferrer')
    } else {
      alert('Report URL not available')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="container mx-auto py-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Security Reports</h1>
            <p className="text-muted-foreground">
              View generated security reports from completed scans
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Reports</CardTitle>
              <CardDescription>
                {reports.length} reports available
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <FileText className="h-8 w-8 animate-pulse" />
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No reports found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center space-x-4">
                        <FileText className="h-10 w-10 text-muted-foreground" />
                        <div>
                          <h3 className="text-sm font-medium">
                            {report.companyName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {report.domain}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getSeverityIcon(report.maxSeverity)}
                          <span className="text-sm capitalize">
                            {report.maxSeverity.toLowerCase()}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {report.totalFindings} findings
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewReport(report)}
                          disabled={!report.report_url}
                          className="flex items-center gap-2"
                        >
                          {report.report_url ? (
                            <>
                              <ExternalLink className="h-3 w-3" />
                              View Report
                            </>
                          ) : (
                            'No Report Available'
                          )}
                        </Button>
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