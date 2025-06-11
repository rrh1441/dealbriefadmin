'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'
import { api, type Scan } from '@/lib/api'
import Link from 'next/link'
import { MainNav } from '@/components/layout/main-nav'

export default function HomePage() {
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const data = await api.getScans()
        setScans(data)
      } catch (error) {
        console.error('Failed to fetch scans:', error)
        setError('Failed to load scans')
      } finally {
        setLoading(false)
      }
    }

    fetchScans()
  }, [])

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

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="container mx-auto py-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Scans</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
          </div>
        </main>
      </div>
    )
  }

  const stats = {
    totalScans: scans.length,
    activeScans: scans.filter(s => s.status === 'running' || s.status === 'queued').length,
    completedScans: scans.filter(s => s.status === 'completed').length,
    recentScans: scans.filter(s => {
      const date = new Date(s.createdAt)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays <= 7
    }).length
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="container mx-auto py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Security Dashboard</h1>
              <p className="text-muted-foreground">
                Monitor and manage your security scans
              </p>
            </div>
            <Link href="/scans">
              <Button>
                View All Scans
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
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
                <CardTitle className="text-sm font-medium">Active Scans</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeScans}</div>
                <p className="text-xs text-muted-foreground">
                  Currently running scans
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Scans</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completedScans}</div>
                <p className="text-xs text-muted-foreground">
                  Successfully completed scans
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.recentScans}</div>
                <p className="text-xs text-muted-foreground">
                  Scans in the last 7 days
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Scans</CardTitle>
              <CardDescription>
                Latest security scan results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scans.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Scans Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start your first security scan to see results here.
                  </p>
                  <Link href="/scans">
                    <Button>Start a Scan</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {scans.slice(0, 5).map((scan) => (
                    <div key={scan.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{scan.companyName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(scan.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-medium">{scan.status}</div>
                          <div className="text-sm text-muted-foreground">
                            {scan.findings.length} findings
                          </div>
                        </div>
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
