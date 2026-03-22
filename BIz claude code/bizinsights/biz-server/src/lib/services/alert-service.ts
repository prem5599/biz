import { prisma } from '@/lib/prisma'
import { AlertType, AlertSeverity, AlertStatus } from '@prisma/client'
import { fetchIntegratedProductData } from '@/lib/api-integrations'

export interface CreateAlertInput {
  organizationId: string
  userId?: string
  type: AlertType
  severity: AlertSeverity
  title: string
  description: string
  metadata?: any
  actionUrl?: string
  actionLabel?: string
  expiresAt?: Date
}

export interface AlertFilters {
  organizationId: string
  type?: AlertType
  severity?: AlertSeverity
  status?: AlertStatus
  userId?: string
  limit?: number
  offset?: number
}

export class AlertService {
  static async createAlert(data: CreateAlertInput) {
    try {
      // Check for duplicate alerts (same type, same metadata within 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      
      const existingAlert = await prisma.alert.findFirst({
        where: {
          organizationId: data.organizationId,
          type: data.type,
          title: data.title,
          status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
          createdAt: { gte: oneHourAgo }
        }
      })

      if (existingAlert) {
        // Update existing alert instead of creating duplicate
        return await prisma.alert.update({
          where: { id: existingAlert.id },
          data: {
            description: data.description,
            metadata: data.metadata,
            updatedAt: new Date()
          }
        })
      }

      return await prisma.alert.create({
        data: {
          organizationId: data.organizationId,
          userId: data.userId,
          type: data.type,
          severity: data.severity,
          title: data.title,
          description: data.description,
          metadata: data.metadata,
          actionUrl: data.actionUrl,
          actionLabel: data.actionLabel,
          expiresAt: data.expiresAt
        }
      })
    } catch (error) {
      console.error('Error creating alert:', error)
      throw error
    }
  }

  static async getAlerts(filters: AlertFilters) {
    try {
      const where: any = {
        organizationId: filters.organizationId
      }

      if (filters.type) where.type = filters.type
      if (filters.severity) where.severity = filters.severity
      if (filters.status) where.status = filters.status
      if (filters.userId) where.userId = filters.userId

      // Auto-resolve expired alerts
      await this.resolveExpiredAlerts(filters.organizationId)

      const alerts = await prisma.alert.findMany({
        where,
        include: {
          acknowledger: { select: { id: true, name: true, email: true } },
          resolver: { select: { id: true, name: true, email: true } },
          dismisser: { select: { id: true, name: true, email: true } }
        },
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' }
        ],
        take: filters.limit || 100,
        skip: filters.offset || 0
      })

      return alerts
    } catch (error) {
      console.error('Error fetching alerts:', error)
      throw error
    }
  }

  static async acknowledgeAlert(alertId: string, userId: string) {
    try {
      return await prisma.alert.update({
        where: { id: alertId },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedAt: new Date(),
          acknowledgedBy: userId,
          updatedAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error acknowledging alert:', error)
      throw error
    }
  }

  static async resolveAlert(alertId: string, userId: string) {
    try {
      return await prisma.alert.update({
        where: { id: alertId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolvedBy: userId,
          updatedAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error resolving alert:', error)
      throw error
    }
  }

  static async dismissAlert(alertId: string, userId: string) {
    try {
      return await prisma.alert.update({
        where: { id: alertId },
        data: {
          status: 'DISMISSED',
          dismissedAt: new Date(),
          dismissedBy: userId,
          updatedAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error dismissing alert:', error)
      throw error
    }
  }

  static async getAlertSummary(organizationId: string) {
    try {
      const [totalCount, activeCount, typeBreakdown, severityBreakdown, criticalAlerts] = await Promise.all([
        prisma.alert.count({
          where: { organizationId }
        }),
        prisma.alert.count({
          where: { organizationId, status: 'ACTIVE' }
        }),
        prisma.alert.groupBy({
          by: ['type'],
          where: { organizationId },
          _count: { id: true }
        }),
        prisma.alert.groupBy({
          by: ['severity'],
          where: { organizationId, status: 'ACTIVE' },
          _count: { id: true }
        }),
        prisma.alert.findMany({
          where: {
            organizationId,
            severity: 'CRITICAL',
            status: 'ACTIVE'
          },
          take: 5,
          orderBy: { createdAt: 'desc' }
        })
      ])

      const byType = typeBreakdown.reduce((acc, item) => {
        acc[item.type] = item._count.id
        return acc
      }, {} as Record<string, number>)

      const bySeverity = severityBreakdown.reduce((acc, item) => {
        acc[item.severity] = item._count.id
        return acc
      }, {} as Record<string, number>)

      return {
        total: totalCount,
        active: activeCount,
        byType,
        bySeverity,
        critical: criticalAlerts
      }
    } catch (error) {
      console.error('Error getting alert summary:', error)
      throw error
    }
  }

  static async resolveExpiredAlerts(organizationId: string) {
    try {
      const now = new Date()
      await prisma.alert.updateMany({
        where: {
          organizationId,
          status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
          expiresAt: { lte: now }
        },
        data: {
          status: 'RESOLVED',
          resolvedAt: now,
          updatedAt: now
        }
      })
    } catch (error) {
      console.error('Error resolving expired alerts:', error)
    }
  }

  // Alert Generation Methods
  static async generateInventoryAlerts(organizationId: string) {
    try {
      const inventoryData = await fetchIntegratedProductData(organizationId)
      const alerts = []

      for (const alert of inventoryData.inventoryAlerts) {
        let severity: AlertSeverity
        let title: string
        let description: string

        if (alert.stockLevel === 0) {
          severity = 'CRITICAL'
          title = `${alert.productName} is out of stock`
          description = `This product has no inventory remaining and needs immediate restocking.`
        } else if (alert.stockLevel <= 5) {
          severity = 'HIGH'
          title = `${alert.productName} is critically low in stock`
          description = `Only ${alert.stockLevel} units remaining. Consider restocking soon.`
        } else if (alert.stockLevel <= 15) {
          severity = 'MEDIUM'
          title = `${alert.productName} is running low`
          description = `${alert.stockLevel} units remaining. You may want to reorder.`
        } else {
          continue // Skip if stock is sufficient
        }

        const alertData = await this.createAlert({
          organizationId,
          type: 'INVENTORY',
          severity,
          title,
          description,
          metadata: {
            productId: alert.productId,
            productName: alert.productName,
            currentStock: alert.stockLevel,
            platform: alert.platform
          },
          actionUrl: `/dashboard/products?filter=${alert.productId}`,
          actionLabel: 'View Product',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expire in 24 hours
        })

        alerts.push(alertData)
      }

      return alerts
    } catch (error) {
      console.error('Error generating inventory alerts:', error)
      return []
    }
  }

  static async generatePerformanceAlerts(organizationId: string) {
    try {
      const alerts = []
      const now = new Date()
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const previous30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

      const [currentPeriodData, previousPeriodData] = await Promise.all([
        prisma.dataPoint.findMany({
          where: {
            organizationId,
            dateRecorded: { gte: last30Days }
          }
        }),
        prisma.dataPoint.findMany({
          where: {
            organizationId,
            dateRecorded: { 
              gte: previous30Days,
              lt: last30Days
            }
          }
        })
      ])

      // Calculate metrics
      const currentRevenue = currentPeriodData
        .filter(dp => dp.metricType === 'revenue')
        .reduce((sum, dp) => sum + Number(dp.value), 0)
      
      const previousRevenue = previousPeriodData
        .filter(dp => dp.metricType === 'revenue')
        .reduce((sum, dp) => sum + Number(dp.value), 0)

      const currentOrders = currentPeriodData
        .filter(dp => dp.metricType === 'orders_total')
        .reduce((sum, dp) => sum + Number(dp.value), 0)

      // Revenue decline alert
      if (previousRevenue > 0) {
        const revenueChange = ((currentRevenue - previousRevenue) / previousRevenue) * 100
        
        if (revenueChange < -20) {
          const alertData = await this.createAlert({
            organizationId,
            type: 'PERFORMANCE',
            severity: 'CRITICAL',
            title: 'Significant Revenue Decline',
            description: `Revenue has dropped by ${Math.abs(revenueChange).toFixed(1)}% compared to the previous period.`,
            metadata: {
              metricName: 'revenue',
              currentValue: currentRevenue,
              previousValue: previousRevenue,
              changePercent: revenueChange,
              period: '30_days'
            },
            actionUrl: '/dashboard/analytics?tab=performance',
            actionLabel: 'View Analytics'
          })
          alerts.push(alertData)
        } else if (revenueChange < -10) {
          const alertData = await this.createAlert({
            organizationId,
            type: 'PERFORMANCE',
            severity: 'HIGH',
            title: 'Revenue Decline Alert',
            description: `Revenue has decreased by ${Math.abs(revenueChange).toFixed(1)}% this period.`,
            metadata: {
              metricName: 'revenue',
              currentValue: currentRevenue,
              previousValue: previousRevenue,
              changePercent: revenueChange,
              period: '30_days'
            },
            actionUrl: '/dashboard/analytics?tab=performance',
            actionLabel: 'View Analytics'
          })
          alerts.push(alertData)
        }
      }

      return alerts
    } catch (error) {
      console.error('Error generating performance alerts:', error)
      return []
    }
  }

  static async generateIntegrationAlerts(organizationId: string) {
    try {
      const alerts = []
      const integrations = await prisma.integration.findMany({
        where: { organizationId }
      })

      for (const integration of integrations) {
        // Failed integration alerts
        if (integration.status === 'ERROR') {
          const alertData = await this.createAlert({
            organizationId,
            type: 'INTEGRATION',
            severity: 'HIGH',
            title: `${integration.platform} Integration Failed`,
            description: `The ${integration.platform} integration has failed and needs attention.`,
            metadata: {
              platform: integration.platform,
              integrationId: integration.id,
              status: integration.status
            },
            actionUrl: `/dashboard/integrations/${integration.id}`,
            actionLabel: 'Fix Integration'
          })
          alerts.push(alertData)
        }

        // Stale data alerts
        if (integration.lastSyncAt) {
          const hoursSinceSync = (Date.now() - integration.lastSyncAt.getTime()) / (1000 * 60 * 60)
          
          if (hoursSinceSync > 48) {
            const alertData = await this.createAlert({
              organizationId,
              type: 'INTEGRATION',
              severity: hoursSinceSync > 72 ? 'HIGH' : 'MEDIUM',
              title: `${integration.platform} Data is Stale`,
              description: `Data hasn't been synced for ${Math.round(hoursSinceSync)} hours. Your analytics may be outdated.`,
              metadata: {
                platform: integration.platform,
                integrationId: integration.id,
                hoursSinceSync: Math.round(hoursSinceSync)
              },
              actionUrl: `/dashboard/integrations/${integration.id}`,
              actionLabel: 'Sync Now'
            })
            alerts.push(alertData)
          }
        }
      }

      return alerts
    } catch (error) {
      console.error('Error generating integration alerts:', error)
      return []
    }
  }

  static async processAllAlerts(organizationId: string) {
    try {
      console.log(`Processing alerts for organization: ${organizationId}`)
      
      const [inventoryAlerts, performanceAlerts, integrationAlerts] = await Promise.all([
        this.generateInventoryAlerts(organizationId),
        this.generatePerformanceAlerts(organizationId),
        this.generateIntegrationAlerts(organizationId)
      ])

      const totalGenerated = inventoryAlerts.length + performanceAlerts.length + integrationAlerts.length
      
      console.log(`Generated ${totalGenerated} alerts for organization ${organizationId}`)
      
      return {
        inventory: inventoryAlerts.length,
        performance: performanceAlerts.length,
        integration: integrationAlerts.length,
        total: totalGenerated
      }
    } catch (error) {
      console.error('Error processing alerts:', error)
      throw error
    }
  }
}