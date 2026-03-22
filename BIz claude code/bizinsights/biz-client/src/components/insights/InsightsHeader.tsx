'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  RefreshCw, 
  Clock, 
  TrendingUp, 
  Sparkles,
  Settings
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface InsightsHeaderProps {
  onGenerate: (options?: {
    timeframe?: string
    metrics?: string[]
    includeForecasts?: boolean
    maxInsights?: number
  }) => void
  isLoading: boolean
  lastGenerated: Date | null
  totalInsights: number
  highImpactCount: number
}

export function InsightsHeader({ 
  onGenerate, 
  isLoading, 
  lastGenerated, 
  totalInsights, 
  highImpactCount 
}: InsightsHeaderProps) {
  const [showOptions, setShowOptions] = useState(false)

  const handleQuickGenerate = (preset: string) => {
    switch (preset) {
      case 'quick':
        onGenerate({ timeframe: '7d', maxInsights: 8 })
        break
      case 'comprehensive':
        onGenerate({ timeframe: '30d', maxInsights: 20, includeForecasts: true })
        break
      case 'trends':
        onGenerate({ timeframe: '30d', metrics: ['revenue', 'orders'], maxInsights: 10 })
        break
      default:
        onGenerate()
    }
    setShowOptions(false)
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                  AI Business Insights
                  <Sparkles className="h-5 w-5 text-blue-600" />
                </CardTitle>
                <p className="text-blue-700 mt-1">
                  Advanced analytics and recommendations powered by artificial intelligence
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOptions(!showOptions)}
                className="hidden md:flex"
              >
                <Settings className="h-4 w-4 mr-2" />
                Options
              </Button>
              
              <Button
                onClick={() => handleQuickGenerate('quick')}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Generate Insights
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Quick Stats */}
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">{totalInsights}</div>
                <div className="text-xs text-blue-600">Total Insights</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{highImpactCount}</div>
                <div className="text-xs text-orange-600">High Impact</div>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
            </div>

            {/* Last Generated */}
            {lastGenerated && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Clock className="h-4 w-4" />
                <span>
                  Last updated {formatDistanceToNow(lastGenerated, { addSuffix: true })}
                </span>
              </div>
            )}

            {/* Features */}
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Trend Analysis
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Forecasting
              </Badge>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                Anomaly Detection
              </Badge>
            </div>
          </div>

          {/* Generation Options */}
          {showOptions && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickGenerate('quick')}
                  disabled={isLoading}
                  className="text-blue-700 border-blue-300 hover:bg-blue-50"
                >
                  Quick Analysis (7 days)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickGenerate('comprehensive')}
                  disabled={isLoading}
                  className="text-blue-700 border-blue-300 hover:bg-blue-50"
                >
                  Comprehensive (30 days)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickGenerate('trends')}
                  disabled={isLoading}
                  className="text-blue-700 border-blue-300 hover:bg-blue-50"
                >
                  Trends Only
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}