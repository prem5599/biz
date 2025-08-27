'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle2, 
  RefreshCw, 
  Shield, 
  Zap, 
  Users, 
  TrendingUp, 
  AlertCircle,
  ExternalLink,
  ArrowRight,
  Lock
} from 'lucide-react'

interface OAuthConnectCardProps {
  integration: {
    id: string
    name: string
    description: string
    icon: React.ComponentType<any>
    color: string
    bgColor: string
    features: string[]
    popular?: boolean
    recommended?: boolean
    permissions: string[]
    dataTypes: string[]
  }
  isConnected: boolean
  isConnecting: boolean
  connectionStatus?: 'healthy' | 'error' | 'syncing'
  lastSyncAt?: string
  onConnect: () => void
  onSync: () => void
  onDisconnect: () => void
}

export function OAuthConnectCard({ 
  integration, 
  isConnected, 
  isConnecting, 
  connectionStatus,
  lastSyncAt,
  onConnect, 
  onSync, 
  onDisconnect 
}: OAuthConnectCardProps) {
  const [showPermissions, setShowPermissions] = useState(false)
  const Icon = integration.icon

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
    <Card className={`relative transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${isConnected ? 'ring-2 ring-green-100 bg-green-50/30' : 'hover:ring-2 hover:ring-blue-100'}`}>
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

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${integration.bgColor} ring-1 ring-black/5 shadow-sm`}>
              <Icon className={`w-8 h-8 ${integration.color}`} />
            </div>
            <div>
              <CardTitle className="text-xl mb-1">{integration.name}</CardTitle>
              <div className="flex items-center gap-2 mb-2">
                {getStatusBadge()}
                <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50">
                  <Zap className="w-3 h-3 mr-1" />
                  One-Click
                </Badge>
                <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                  <Shield className="w-3 h-3 mr-1" />
                  Secure
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <CardDescription className="text-sm leading-relaxed mt-2">
          {integration.description}
        </CardDescription>

        {isConnected && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-green-800 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Successfully Connected
              </span>
              <span className="text-green-700">{formatLastSync()}</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-green-600">
                <span>Data sync status</span>
                <span>Active</span>
              </div>
              <Progress value={100} className="h-2 bg-green-100" />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* Data Preview */}
        <div className="mb-4">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            What data you'll get:
          </h4>
          <div className="grid gap-2">
            {integration.dataTypes.slice(0, 4).map((dataType, index) => (
              <div key={index} className="flex items-center gap-3 text-sm text-muted-foreground bg-gray-50 rounded-lg p-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{dataType}</span>
              </div>
            ))}
            {integration.dataTypes.length > 4 && (
              <div className="text-xs text-muted-foreground text-center py-1">
                +{integration.dataTypes.length - 4} more data types
              </div>
            )}
          </div>
        </div>

        {/* Permissions Preview */}
        {showPermissions && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-sm mb-2 text-blue-900 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Permissions we'll request:
            </h4>
            <div className="space-y-1">
              {integration.permissions.map((permission, index) => (
                <div key={index} className="flex items-center gap-2 text-xs text-blue-700">
                  <Lock className="w-3 h-3" />
                  <span>{permission}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-blue-600">
              💡 We only read data - never modify your account
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isConnected ? (
            <>
              <Button
                onClick={onConnect}
                disabled={isConnecting}
                className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all"
                size="lg"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Login to Connect
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
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
                variant="destructive"
                onClick={onDisconnect}
                disabled={isConnecting}
                className="px-4"
              >
                Disconnect
              </Button>
            </>
          )}
        </div>

        {/* Show Permissions Toggle */}
        {!isConnected && (
          <div className="mt-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPermissions(!showPermissions)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {showPermissions ? 'Hide' : 'Show'} permissions & security info
            </Button>
          </div>
        )}

        {/* Trust Indicators */}
        {!isConnected && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-gray-50 rounded-lg">
              <Shield className="w-4 h-4 text-green-600 mx-auto mb-1" />
              <div className="text-xs text-gray-600">Secure OAuth</div>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <Zap className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <div className="text-xs text-gray-600">One Click</div>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-purple-600 mx-auto mb-1" />
              <div className="text-xs text-gray-600">Auto Sync</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}