'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, RefreshCw, ExternalLink, Zap, Clock, Users, TrendingUp, AlertCircle } from 'lucide-react'

interface QuickConnectCardProps {
  integration: {
    id: string
    name: string
    description: string
    icon: React.ComponentType<any>
    color: string
    bgColor: string
    features: string[]
    difficulty: 'easy' | 'medium' | 'advanced'
    estimatedTime: string
    popular?: boolean
    recommended?: boolean
  }
  isConnected: boolean
  isConnecting: boolean
  connectionStatus?: 'healthy' | 'error' | 'syncing'
  lastSyncAt?: string
  onConnect: () => void
  onSync: () => void
  onDisconnect: () => void
}

export function QuickConnectCard({ 
  integration, 
  isConnected, 
  isConnecting, 
  connectionStatus,
  lastSyncAt,
  onConnect, 
  onSync, 
  onDisconnect 
}: QuickConnectCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const Icon = integration.icon

  const getDifficultyColor = () => {
    switch (integration.difficulty) {
      case 'easy': return 'text-green-600 bg-green-50 border-green-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'advanced': return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  const getStatusBadge = () => {
    if (isConnecting) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Connecting...
        </Badge>
      )
    }

    if (!isConnected) {
      return null
    }

    switch (connectionStatus) {
      case 'healthy':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        )
      case 'syncing':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Syncing
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        )
    }
  }

  const formatLastSync = () => {
    if (!lastSyncAt) return 'Never synced'
    
    const date = new Date(lastSyncAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <Card className={`relative transition-all duration-200 hover:shadow-md ${isConnected ? 'ring-2 ring-green-100' : ''}`}>
      {integration.popular && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-blue-600 text-white px-2 py-1 text-xs">
            <Users className="w-3 h-3 mr-1" />
            Popular
          </Badge>
        </div>
      )}
      
      {integration.recommended && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-purple-600 text-white px-2 py-1 text-xs">
            <TrendingUp className="w-3 h-3 mr-1" />
            Recommended
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${integration.bgColor} ring-1 ring-black/5`}>
              <Icon className={`w-6 h-6 ${integration.color}`} />
            </div>
            <div>
              <CardTitle className="text-lg">{integration.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge()}
                <Badge variant="outline" className={`text-xs border ${getDifficultyColor()}`}>
                  <Zap className="w-3 h-3 mr-1" />
                  {integration.difficulty === 'easy' ? 'Easy' : integration.difficulty === 'medium' ? 'Medium' : 'Advanced'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {integration.estimatedTime}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <CardDescription className="text-sm leading-relaxed mt-2">
          {integration.description}
        </CardDescription>

        {isConnected && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-800 font-medium">Last sync:</span>
              <span className="text-green-700">{formatLastSync()}</span>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-green-600 mb-1">
                <span>Data sync progress</span>
                <span>100%</span>
              </div>
              <Progress value={100} className="h-2 bg-green-100" />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {showDetails && (
          <div className="mb-4">
            <h4 className="font-medium text-sm mb-2">What you'll get:</h4>
            <div className="grid gap-2">
              {integration.features.slice(0, 4).map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
              {integration.features.length > 4 && (
                <div className="text-xs text-muted-foreground">
                  +{integration.features.length - 4} more features
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!isConnected ? (
            <>
              <Button
                onClick={onConnect}
                disabled={isConnecting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isConnecting && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                <Zap className="mr-2 h-4 w-4" />
                Quick Connect
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={() => setShowDetails(!showDetails)}
                className="px-3"
              >
                {showDetails ? 'Less' : 'More'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onSync}
                disabled={isConnecting || connectionStatus === 'syncing'}
                className="flex-1"
              >
                {(isConnecting || connectionStatus === 'syncing') && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Now
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDetails(!showDetails)}
                className="px-3"
              >
                {showDetails ? 'Less' : 'More'}
              </Button>
              <Button
                variant="destructive"
                onClick={onDisconnect}
                disabled={isConnecting}
                className="px-3"
              >
                Disconnect
              </Button>
            </>
          )}
        </div>

        {integration.difficulty === 'easy' && !isConnected && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Super Easy Setup!</p>
                <p className="text-blue-700">Just 2 steps - we'll guide you through everything.</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}