'use client'

import { useEffect, useState } from 'react'
import { useCurrentOrganization } from '@/hooks/useOrganization'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Clock, 
  MousePointerClick, 
  ArrowUpRight, 
  RefreshCw,
  Globe,
  Layout,
  TrendingUp 
} from 'lucide-react'
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

export default function GoogleAnalyticsPage() {
  const { organization, isLoading: orgLoading } = useCurrentOrganization()
  
  const { data: analyticsData, isLoading, refetch } = useQuery({
    queryKey: ['google-analytics', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null
      const res = await fetch(`/api/organizations/${organization.id}/analytics/google`)
      const json = await res.json()
      if (json.success) return json.data
      return null
    },
    enabled: !!organization?.id
  })

  // Manual sync trigger
  const [syncing, setSyncing] = useState(false)
  const handleSync = async () => {
    setSyncing(true)
    try {
      await fetch('/api/integrations/google-analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization?.id })
      })
      refetch()
    } catch (e) {
      console.error(e)
    } finally {
      setSyncing(false)
    }
  }

  if (orgLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="text-muted-foreground">Loading Analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!analyticsData) {
    return (
      <DashboardLayout>
        <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center">
          <Globe className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold">No Analytics Data Found</h2>
          <p className="text-muted-foreground max-w-md">
            Connect your Google Analytics account or run a sync to see your data here.
          </p>
          <div className="flex gap-4">
             <Button onClick={handleSync} disabled={syncing}>
               {syncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
               Sync Now
             </Button>
             <Button variant="outline" asChild>
               <a href="/dashboard/integrations">Check Integration</a>
             </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Parse dates for chart
  const trendData = analyticsData.dailyTrend?.map((item: any) => {
    // Format YYYYMMDD to clean date
    const d = item.date
    const dateStr = d.length === 8 
      ? `${d.substring(0,4)}-${d.substring(4,6)}-${d.substring(6,8)}`
      : d
      
    return {
      date: format(new Date(dateStr), 'MMM dd'),
      sessions: item.sessions
    }
  }) || []

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Google Analytics</h1>
            <p className="text-muted-foreground">
              Overview for the last 30 days
            </p>
          </div>
          <Button onClick={handleSync} variant="outline" disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Data
          </Button>
        </div>

        {/* Metrics Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.sessions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Visits to your site
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.users.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Unique visitors
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.bounceRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Single-page sessions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.floor(analyticsData.avgSessionDuration / 60)}m {analyticsData.avgSessionDuration % 60}s
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Time spent per session
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-7">
          {/* Main Chart */}
          <Card className="md:col-span-4">
            <CardHeader>
              <CardTitle>Session Growth</CardTitle>
              <CardDescription>Daily sessions over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      minTickGap={30}
                    />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sessions" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorSessions)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Traffic Sources */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
              <CardDescription>Where your visitors are coming from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData.trafficSources}
                      dataKey="sessions"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {analyticsData.trafficSources.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Pages Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Pages</CardTitle>
            <CardDescription>Most visited pages on your website</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.topPages.map((page: any, i: number) => (
                <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium">{page.page}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Layout className="h-3 w-3" />
                         Page Path
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{page.views.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Views</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
