"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHeader,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { AlertCard } from './alert-card'
import { Alert } from '@/types/alerts'
import { Bell, Settings, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface NotificationBellProps {
  alerts: Alert[]
  onAcknowledge?: (alertId: string) => void
  onResolve?: (alertId: string) => void
  onDismiss?: (alertId: string) => void
  className?: string
}

export function NotificationBell({
  alerts,
  onAcknowledge,
  onResolve,
  onDismiss,
  className
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Get active alerts
  const activeAlerts = alerts.filter(alert => alert.status === 'active')
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical')
  const recentAlerts = activeAlerts
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const hasNotifications = activeAlerts.length > 0
  const hasCritical = criticalAlerts.length > 0

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative h-9 w-9 p-0",
            hasNotifications && "text-orange-600",
            hasCritical && "text-red-600",
            className
          )}
        >
          <Bell className={cn(
            "h-5 w-5",
            hasNotifications && "animate-pulse"
          )} />
          {hasNotifications && (
            <Badge
              variant={hasCritical ? "destructive" : "secondary"}
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center",
                hasCritical && "animate-bounce"
              )}
            >
              {activeAlerts.length > 9 ? '9+' : activeAlerts.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96 p-0" align="end">
        <DropdownMenuHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {hasNotifications && (
                <Badge variant={hasCritical ? "destructive" : "secondary"}>
                  {activeAlerts.length} active
                </Badge>
              )}
              <Link href="/dashboard/alerts">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </DropdownMenuHeader>

        <DropdownMenuSeparator />

        <div className="max-h-96 overflow-y-auto">
          {!hasNotifications ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No new notifications</p>
              <p className="text-xs text-gray-400 mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {/* Critical alerts first */}
              {criticalAlerts.length > 0 && (
                <>
                  <div className="px-2 py-1">
                    <p className="text-xs font-medium text-red-600 uppercase tracking-wide">
                      Critical ({criticalAlerts.length})
                    </p>
                  </div>
                  {criticalAlerts.slice(0, 2).map(alert => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onAcknowledge={onAcknowledge}
                      onResolve={onResolve}
                      onDismiss={onDismiss}
                      compact
                    />
                  ))}
                  {criticalAlerts.length > 2 && (
                    <div className="px-2 py-1">
                      <p className="text-xs text-red-500">
                        +{criticalAlerts.length - 2} more critical alerts
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Recent non-critical alerts */}
              {recentAlerts.filter(alert => alert.severity !== 'critical').length > 0 && (
                <>
                  {criticalAlerts.length > 0 && <DropdownMenuSeparator />}
                  <div className="px-2 py-1">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Recent
                    </p>
                  </div>
                  {recentAlerts
                    .filter(alert => alert.severity !== 'critical')
                    .slice(0, 3)
                    .map(alert => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onAcknowledge={onAcknowledge}
                        onResolve={onResolve}
                        onDismiss={onDismiss}
                        compact
                      />
                    ))}
                </>
              )}
            </div>
          )}
        </div>

        {hasNotifications && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Link href="/dashboard/alerts">
                <Button variant="outline" className="w-full justify-center" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View All Alerts
                </Button>
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}