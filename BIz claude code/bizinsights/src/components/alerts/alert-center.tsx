"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { AlertCard } from './alert-card'
import { Alert, AlertType, AlertSeverity, AlertStatus } from '@/types/alerts'
import {
  Bell,
  AlertTriangle,
  Filter,
  Search,
  CheckCircle,
  Package,
  TrendingDown,
  Wifi,
  Users,
  DollarSign,
  Shield,
  Settings,
  RefreshCw
} from 'lucide-react'

interface AlertCenterProps {
  alerts: Alert[]
  onAcknowledge?: (alertId: string) => void
  onResolve?: (alertId: string) => void
  onDismiss?: (alertId: string) => void
  onRefresh?: () => void
}

export function AlertCenter({
  alerts,
  onAcknowledge,
  onResolve,
  onDismiss,
  onRefresh
}: AlertCenterProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<AlertType | 'all'>('all')
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<AlertStatus | 'all'>('all')

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === 'all' || alert.type === selectedType
    const matchesSeverity = selectedSeverity === 'all' || alert.severity === selectedSeverity
    const matchesStatus = selectedStatus === 'all' || alert.status === selectedStatus
    
    return matchesSearch && matchesType && matchesSeverity && matchesStatus
  })

  // Group alerts by status
  const activeAlerts = filteredAlerts.filter(alert => alert.status === 'active')
  const acknowledgedAlerts = filteredAlerts.filter(alert => alert.status === 'acknowledged')
  const resolvedAlerts = filteredAlerts.filter(alert => alert.status === 'resolved')
  const criticalAlerts = filteredAlerts.filter(alert => alert.severity === 'critical' && alert.status === 'active')

  // Alert statistics
  const alertStats = {
    total: alerts.length,
    active: alerts.filter(a => a.status === 'active').length,
    critical: alerts.filter(a => a.severity === 'critical' && a.status === 'active').length,
    byType: alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  const getTypeIcon = (type: AlertType) => {
    const icons = {
      inventory: Package,
      performance: TrendingDown,
      integration: Wifi,
      customer: Users,
      financial: DollarSign,
      security: Shield,
      system: Settings
    }
    return icons[type]
  }

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Alerts</p>
                <p className="text-2xl font-bold">{alertStats.total}</p>
              </div>
              <Bell className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-orange-600">{alertStats.active}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="text-2xl font-bold text-red-600">{alertStats.critical}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {alerts.filter(a => 
                    a.status === 'resolved' && 
                    a.resolvedAt && 
                    new Date(a.resolvedAt).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Critical Alerts Require Immediate Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalAlerts.slice(0, 3).map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={onAcknowledge}
                  onResolve={onResolve}
                  onDismiss={onDismiss}
                  compact
                />
              ))}
              {criticalAlerts.length > 3 && (
                <p className="text-sm text-red-700">
                  And {criticalAlerts.length - 3} more critical alerts...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Alert Management
            </CardTitle>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as AlertType | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="integration">Integration</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSeverity} onValueChange={(value) => setSelectedSeverity(value as AlertSeverity | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as AlertStatus | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center">
              <Badge variant="outline" className="ml-auto">
                {filteredAlerts.length} results
              </Badge>
            </div>
          </div>

          {/* Alert Tabs */}
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="active" className="flex items-center gap-2">
                Active
                <Badge variant="destructive" className="text-xs">
                  {activeAlerts.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="acknowledged" className="flex items-center gap-2">
                Acknowledged
                <Badge variant="secondary" className="text-xs">
                  {acknowledgedAlerts.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="resolved" className="flex items-center gap-2">
                Resolved
                <Badge variant="outline" className="text-xs">
                  {resolvedAlerts.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-2">
                All
                <Badge variant="outline" className="text-xs">
                  {filteredAlerts.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4 mt-6">
              {activeAlerts.length > 0 ? (
                activeAlerts.map(alert => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={onAcknowledge}
                    onResolve={onResolve}
                    onDismiss={onDismiss}
                  />
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900">No Active Alerts</p>
                  <p className="text-gray-500">All systems are running smoothly!</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="acknowledged" className="space-y-4 mt-6">
              {acknowledgedAlerts.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onResolve={onResolve}
                  onDismiss={onDismiss}
                />
              ))}
            </TabsContent>

            <TabsContent value="resolved" className="space-y-4 mt-6">
              {resolvedAlerts.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onDismiss={onDismiss}
                />
              ))}
            </TabsContent>

            <TabsContent value="all" className="space-y-4 mt-6">
              {filteredAlerts.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={onAcknowledge}
                  onResolve={onResolve}
                  onDismiss={onDismiss}
                />
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}