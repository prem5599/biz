'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  Brain, 
  Building2, 
  Users, 
  AlertTriangle,
  TrendingUp,
  Target,
  Zap
} from 'lucide-react'

interface InsightsSummaryProps {
  summary: string
  metadata: {
    totalInsights?: number
    highImpactInsights?: number
    forecastingEnabled?: boolean
    generatedAt?: string
    type?: string
  } | null
  businessProfile?: {
    industry?: string
    businessType?: string
    size?: string
  } | null
  criticalCount: number
}

export function InsightsSummary({ summary, metadata, businessProfile, criticalCount }: InsightsSummaryProps) {
  const getBusinessIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'e-commerce':
      case 'retail':
        return <Building2 className="h-4 w-4" />
      case 'service':
        return <Users className="h-4 w-4" />
      default:
        return <BarChart3 className="h-4 w-4" />
    }
  }

  const getBusinessBadgeColor = (size?: string) => {
    switch (size?.toLowerCase()) {
      case 'small':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'medium':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'large':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-blue-600" />
          Executive Summary
          {criticalCount > 0 && (
            <Badge variant="destructive" className="ml-2 animate-pulse">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {criticalCount} Critical
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Text */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
          <p className="text-sm leading-relaxed text-gray-700">
            {summary}
          </p>
        </div>

        {/* Business Profile */}
        {businessProfile && (businessProfile.industry || businessProfile.businessType || businessProfile.size) && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Business Profile:</span>
            {businessProfile.businessType && (
              <Badge variant="outline" className="flex items-center gap-1">
                {getBusinessIcon(businessProfile.businessType)}
                {businessProfile.businessType}
              </Badge>
            )}
            {businessProfile.industry && (
              <Badge variant="outline">
                {businessProfile.industry}
              </Badge>
            )}
            {businessProfile.size && (
              <Badge variant="outline" className={getBusinessBadgeColor(businessProfile.size)}>
                {businessProfile.size} Business
              </Badge>
            )}
          </div>
        )}

        {/* Metadata Stats */}
        {metadata && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-bold text-blue-600">
                <BarChart3 className="h-4 w-4" />
                {metadata.totalInsights || 0}
              </div>
              <div className="text-xs text-gray-600">Total Insights</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-bold text-orange-600">
                <TrendingUp className="h-4 w-4" />
                {metadata.highImpactInsights || 0}
              </div>
              <div className="text-xs text-gray-600">High Impact</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-bold text-red-600">
                <AlertTriangle className="h-4 w-4" />
                {criticalCount}
              </div>
              <div className="text-xs text-gray-600">Critical Items</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-bold text-green-600">
                {metadata.forecastingEnabled ? (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>On</span>
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4" />
                    <span>Off</span>
                  </>
                )}
              </div>
              <div className="text-xs text-gray-600">AI Forecasting</div>
            </div>
          </div>
        )}

        {/* Key Features */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
            <Brain className="h-3 w-3 mr-1" />
            AI-Powered Analysis
          </Badge>
          <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
            <TrendingUp className="h-3 w-3 mr-1" />
            Trend Detection
          </Badge>
          <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Anomaly Alerts
          </Badge>
          <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
            <Target className="h-3 w-3 mr-1" />
            Action Recommendations
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}