'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AdvancedMetricCard } from './advanced-metric-card'
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Target,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from 'recharts'

interface ForecastData {
  period: string
  actualRevenue?: number
  forecastRevenue: number
  lowerBound: number
  upperBound: number
  confidence: number
}

interface RevenueForecastingData {
  currentMonthRevenue: number
  projectedMonthRevenue: number
  quarterlyForecast: number
  yearlyForecast: number
  growthRate: number
  seasonalityFactor: number
  confidenceScore: number
  forecastData: ForecastData[]
  trends: {
    trend: 'growing' | 'declining' | 'stable'
    velocity: number
    acceleration: number
  }
  targets: {
    monthly: number
    quarterly: number
    yearly: number
  }
  riskFactors: Array<{
    risk: string
    impact: 'high' | 'medium' | 'low'
    probability: number
  }>
}

interface RevenueForecastingWidgetProps {
  data: RevenueForecastingData
  currency: string
  isLoading?: boolean
}

export function RevenueForecastingWidget({ data, currency, isLoading }: RevenueForecastingWidgetProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      notation: value >= 1000000 ? 'compact' : 'standard'
    }).format(value)
  }

  const getGrowthStatus = (rate: number) => {
    if (rate >= 20) return 'good'
    if (rate >= 10) return 'warning'
    return 'danger'
  }

  const getConfidenceStatus = (score: number) => {
    if (score >= 80) return 'good'
    if (score >= 60) return 'warning'
    return 'danger'
  }

  const getTrendIcon = () => {
    switch (data.trends.trend) {
      case 'growing':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'declining':
        return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
      default:
        return <TrendingUp className="h-4 w-4 text-gray-600" />
    }
  }

  const monthlyTargetProgress = (data.currentMonthRevenue / data.targets.monthly) * 100
  const quarterlyTargetProgress = (data.quarterlyForecast / data.targets.quarterly) * 100
  const yearlyTargetProgress = (data.yearlyForecast / data.targets.yearly) * 100

  return (
    <div className="space-y-6">
      {/* Forecast Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AdvancedMetricCard
          title="Current Month Projection"
          value={formatCurrency(data.projectedMonthRevenue)}
          subtitle="Based on current trends"
          icon={<DollarSign className="h-4 w-4" />}
          status={data.currentMonthRevenue >= data.targets.monthly * 0.8 ? 'good' : 'warning'}
          insights={[
            `Current: ${formatCurrency(data.currentMonthRevenue)}`,
            `${monthlyTargetProgress.toFixed(0)}% of monthly target`
          ]}
        />

        <AdvancedMetricCard
          title="Growth Rate"
          value={`${data.growthRate > 0 ? '+' : ''}${data.growthRate.toFixed(1)}%`}
          subtitle="Month-over-month growth"
          icon={getTrendIcon()}
          status={getGrowthStatus(data.growthRate)}
          trend={data.growthRate > 0 ? 'up' : data.growthRate < 0 ? 'down' : 'stable'}
          trendPercentage={Math.abs(data.growthRate)}
          insights={[
            `Velocity: ${data.trends.velocity.toFixed(1)}%`,
            `Acceleration: ${data.trends.acceleration.toFixed(1)}%`
          ]}
        />

        <AdvancedMetricCard
          title="Forecast Confidence"
          value={`${data.confidenceScore.toFixed(0)}%`}
          subtitle="Prediction accuracy score"
          icon={<Target className="h-4 w-4" />}
          status={getConfidenceStatus(data.confidenceScore)}
          benchmark={{
            value: "85%",
            label: "Target Confidence"
          }}
          insights={[
            "Based on historical accuracy",
            "Higher = more reliable forecast"
          ]}
        />

        <AdvancedMetricCard
          title="Seasonality Impact"
          value={`${data.seasonalityFactor > 0 ? '+' : ''}${data.seasonalityFactor.toFixed(1)}%`}
          subtitle="Current seasonal effect"
          icon={<Calendar className="h-4 w-4" />}
          status={Math.abs(data.seasonalityFactor) < 10 ? 'good' : 'warning'}
          insights={[
            data.seasonalityFactor > 0 ? "Peak season boost" : "Off-season impact",
            "Factor included in forecasts"
          ]}
        />
      </div>

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Revenue Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="period" 
                  stroke="#666"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'actualRevenue' ? 'Actual' :
                    name === 'forecastRevenue' ? 'Forecast' :
                    name === 'upperBound' ? 'Upper Bound' : 'Lower Bound'
                  ]}
                  labelStyle={{ color: '#666' }}
                />
                <Legend />
                
                {/* Confidence interval */}
                <Area
                  dataKey="upperBound"
                  stackId="bounds"
                  stroke="none"
                  fill="#bfdbfe"
                  fillOpacity={0.3}
                />
                <Area
                  dataKey="lowerBound"
                  stackId="bounds"
                  stroke="none"
                  fill="#ffffff"
                  fillOpacity={1}
                />
                
                {/* Actual revenue line */}
                <Line
                  type="monotone"
                  dataKey="actualRevenue"
                  stroke="#059669"
                  strokeWidth={3}
                  dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
                />
                
                {/* Forecast line */}
                <Line
                  type="monotone"
                  dataKey="forecastRevenue"
                  stroke="#2563eb"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Target Progress and Risk Assessment */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              Target Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Monthly Target</span>
                <span className="text-sm text-gray-600">
                  {formatCurrency(data.currentMonthRevenue)} / {formatCurrency(data.targets.monthly)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    monthlyTargetProgress >= 100 ? 'bg-green-500' :
                    monthlyTargetProgress >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(monthlyTargetProgress, 100)}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                {monthlyTargetProgress >= 80 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm text-gray-600">
                  {monthlyTargetProgress.toFixed(0)}% complete
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Quarterly Forecast</span>
                <span className="text-sm text-gray-600">
                  {formatCurrency(data.quarterlyForecast)} / {formatCurrency(data.targets.quarterly)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    quarterlyTargetProgress >= 100 ? 'bg-green-500' :
                    quarterlyTargetProgress >= 90 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(quarterlyTargetProgress, 100)}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                {quarterlyTargetProgress >= 90 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm text-gray-600">
                  {quarterlyTargetProgress.toFixed(0)}% of target
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Yearly Projection</span>
                <span className="text-sm text-gray-600">
                  {formatCurrency(data.yearlyForecast)} / {formatCurrency(data.targets.yearly)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    yearlyTargetProgress >= 100 ? 'bg-green-500' :
                    yearlyTargetProgress >= 95 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(yearlyTargetProgress, 100)}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                {yearlyTargetProgress >= 95 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm text-gray-600">
                  {yearlyTargetProgress.toFixed(0)}% of target
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.riskFactors.map((risk, index) => (
                <div key={index} className={`p-3 rounded-lg border ${
                  risk.impact === 'high' 
                    ? 'bg-red-50 border-red-200' 
                    : risk.impact === 'medium'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{risk.risk}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-xs ${
                          risk.impact === 'high' 
                            ? 'bg-red-100 text-red-800' 
                            : risk.impact === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {risk.impact} impact
                        </Badge>
                        <span className="text-xs text-gray-600">
                          {risk.probability}% probability
                        </span>
                      </div>
                    </div>
                    <AlertTriangle className={`h-4 w-4 ${
                      risk.impact === 'high' 
                        ? 'text-red-500' 
                        : risk.impact === 'medium'
                        ? 'text-yellow-500'
                        : 'text-blue-500'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}