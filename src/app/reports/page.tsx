'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dealbrief/ui'
import { Button } from '@dealbrief/ui'
import { FileText, Download, Calendar, Tag, Search, Eye } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { MainNav } from '@/components/layout/main-nav'

interface Report {
  id: string
  scan_id: string
  company_name: string
  domain: string
  tags: string[]
  generated_at: string
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      console.log('🔍 Fetching reports from database...')
      const response = await fetch('/api/reports')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('✅ Fetched', data.length, 'reports')
      setReports(data)
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const allTags = Array.from(
    new Set(reports.flatMap(r => r.tags || []))
  )

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.domain.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTag = !selectedTag || report.tags?.includes(selectedTag)
    
    return matchesSearch && matchesTag
  })

  const handleViewReport = async (report: Report) => {
    // Open report in new tab
    const url = `/api/scans/${report.scan_id}/report/view`
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="container mx-auto py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <FileText className="h-12 w-12 animate-pulse mx-auto mb-4" />
              <p className="text-muted-foreground">Loading reports...</p>
            </div>
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
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Security Reports</h1>
            <p className="text-muted-foreground">
              Generated security assessment reports
            </p>
          </div>

          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            {allTags.length > 0 && (
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <select
                  value={selectedTag || ''}
                  onChange={(e) => setSelectedTag(e.target.value || null)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Generated Reports</CardTitle>
              <CardDescription>
                {filteredReports.length} reports found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredReports.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No reports found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center space-x-4">
                        <FileText className="h-10 w-10 text-muted-foreground" />
                        <div>
                          <h3 className="text-sm font-medium">
                            {report.company_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {report.domain}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <p className="text-xs text-muted-foreground flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(report.generated_at), 'MMM d, yyyy')}
                            </p>
                            {report.tags && report.tags.length > 0 && (
                              <div className="flex space-x-1">
                                {report.tags.map(tag => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReport(report)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Report
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