"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PremiumPieChart, PremiumBarChart } from '@/components/charts'
import { Badge } from '@/components/ui/badge'
import { Globe, TrendingUp, Users, Eye, ExternalLink } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

interface PremiumTrafficChartProps {
  data?: Array<{
    source: string
    visitors: number
    color?: string
    sessions?: number
    bounceRate?: number
    conversionRate?: number
  }>
  isLoading?: boolean
}

export function PremiumTrafficChart({ data = [], isLoading = false }: PremiumTrafficChartProps) {
  if (isLoading) {
    return (
      <Card className="premium-chart-card">
        <CardHeader>
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-200 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    )
  }

  // Calculate totals and insights
  const totalVisitors = data.reduce((sum, item) => sum + item.visitors, 0)
  const totalSessions = data.reduce((sum, item) => sum + (item.sessions || item.visitors), 0)
  
  // Find top performing source
  const topSource = data.reduce((max, item) => 
    item.visitors > max.visitors ? item : max, 
    data[0] || { source: '', visitors: 0 }
  )

  // Prepare data for charts
  const pieChartData = data.map(item => ({
    name: item.source,
    value: item.visitors,
    color: item.color
  }))

  const barChartData = data.map(item => ({
    name: item.source,
    value: item.visitors,
    color: item.color
  }))

  // Define default colors if not provided
  const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  const formatPercentage = (value: number, total: number) => {
    return total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0%'
  }

  const getSourceIcon = (source: string) => {
    const lowerSource = source.toLowerCase()
    if (lowerSource.includes('google') || lowerSource.includes('search')) {
      return <Globe className="h-4 w-4" />
    }
    if (lowerSource.includes('direct')) {
      return <ExternalLink className="h-4 w-4" />
    }
    if (lowerSource.includes('social') || lowerSource.includes('facebook') || lowerSource.includes('twitter')) {
      return <Users className="h-4 w-4" />
    }
    return <Eye className="h-4 w-4" />
  }

  return (
    <TooltipProvider>
      <Card className="premium-chart-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                Traffic Sources
              </CardTitle>
              <p className="text-sm text-gray-600">
                Understanding where your visitors come from
              </p>
            </div>
            
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {totalVisitors.toLocaleString()} total
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {data.length === 0 ? (
            <div className="h-80 flex flex-col items-center justify-center text-center">
              <Globe className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Traffic Data</h3>
              <p className="text-gray-600 mb-4">
                Connect Google Analytics to see where your visitors come from
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Eye className="h-4 w-4" />
                Visitor sources will appear here once connected
              </div>
            </div>
          ) : (
            <>
              {/* Top Sources Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Top Source</span>
                  </div>
                  <div className="text-xl font-bold text-blue-900">
                    {topSource.source}
                  </div>
                  <div className="text-sm text-blue-600">
                    {topSource.visitors.toLocaleString()} visitors ({formatPercentage(topSource.visitors, totalVisitors)})
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Total Visitors</span>
                  </div>
                  <div className="text-xl font-bold text-green-900">
                    {totalVisitors.toLocaleString()}
                  </div>
                  <div className="text-sm text-green-600">
                    Across {data.length} sources
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">Sessions</span>
                  </div>
                  <div className="text-xl font-bold text-purple-900">
                    {totalSessions.toLocaleString()}
                  </div>
                  <div className="text-sm text-purple-600">
                    Total user sessions
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Traffic Distribution</h4>
                  <PremiumPieChart
                    title=""
                    data={pieChartData}
                    height={280}
                    colors={defaultColors}
                    className="border-0 shadow-none bg-transparent"
                  />
                </div>

                {/* Bar Chart */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Source Comparison</h4>
                  <PremiumBarChart
                    title=""
                    data={barChartData}
                    height={280}
                    colors={defaultColors}
                    className="border-0 shadow-none bg-transparent"
                  />
                </div>
              </div>

              {/* Detailed Source Table */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-600" />
                  Source Details
                </h4>
                <div className="space-y-3">
                  {data.map((source, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: source.color || defaultColors[index % defaultColors.length] }}
                        />
                        <div className="flex items-center gap-2">
                          {getSourceIcon(source.source)}
                          <span className="font-medium text-gray-900">{source.source}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">
                            {source.visitors.toLocaleString()}
                          </div>
                          <div className="text-gray-500">visitors</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="font-semibold text-blue-600">
                            {formatPercentage(source.visitors, totalVisitors)}
                          </div>
                          <div className="text-gray-500">share</div>
                        </div>
                        
                        {source.conversionRate !== undefined && (
                          <div className="text-center">
                            <div className={`font-semibold ${
                              source.conversionRate > 2 ? 'text-green-600' : 'text-orange-600'
                            }`}>
                              {source.conversionRate.toFixed(1)}%
                            </div>
                            <div className="text-gray-500">conversion</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Traffic Insights */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Traffic Insights
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Most Effective Source:</span>
                      <span className="font-medium text-blue-900">{topSource.source}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Source Diversity:</span>
                      <span className="font-medium text-blue-900">{data.length} channels</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Top Source Share:</span>
                      <span className="font-medium text-blue-900">
                        {formatPercentage(topSource.visitors, totalVisitors)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Sessions per Visitor:</span>
                      <span className="font-medium text-blue-900">
                        {(totalSessions / totalVisitors).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}