'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dealbrief/ui'
import { Button } from '@dealbrief/ui'
import { Shield, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react'
import { api, type Scan } from '@/lib/api'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MainNav } from '@/components/layout/main-nav'

export default function DashboardPage() {
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchScans = async () => {
    try {
      const data = await api.getScans()
      setScans(data)
    } catch (error) {
      console.error('Failed to fetch scans:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchScans()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchScans()
  }

  const stats = {
    totalScans: scans.length,
    criticalFindings: scans.filter(s => s.maxSeverity === 'CRITICAL').length,
    highFindings: scans.filter(s => s.maxSeverity === 'HIGH').length,
    recentScans: scans.filter(s => {
      const date = new Date(s.createdAt)
      const dayAgo = new Date()
      dayAgo.setDate(dayAgo.getDate() - 1)
      return date > dayAgo
    }).length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="container mx-auto py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Shield className="h-12 w-12 animate-pulse mx-auto mb-4" />
              <p className="text-muted-foreground">Loading dashboard...</p>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">
                Monitor your security scans and findings
              </p>
            </div>
            <Button onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalScans}</div>
                <p className="text-xs text-muted-foreground">
                  All time security scans
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.criticalFindings}</div>
                <p className="text-xs text-muted-foreground">
                  Scans with critical findings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Risk</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.highFindings}</div>
                <p className="text-xs text-muted-foreground">
                  Scans with high severity issues
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Scans</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.recentScans}</div>
                <p className="text-xs text-muted-foreground">
                  Scans in the last 24 hours
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Scans</CardTitle>
              <CardDescription>
                Latest security scans performed on portfolio companies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scans.slice(0, 5).map((scan) => (
                  <div key={scan.scanId} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {scan.companyName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {scan.domain} • {formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {scan.maxSeverity === 'CRITICAL' && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                      {scan.maxSeverity === 'HIGH' && (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      )}
                      {scan.status === 'done' && scan.maxSeverity !== 'CRITICAL' && scan.maxSeverity !== 'HIGH' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
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
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
