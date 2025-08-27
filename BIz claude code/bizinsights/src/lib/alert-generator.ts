import { Alert, InventoryAlert, PerformanceAlert, IntegrationAlert, CustomerAlert } from '@/types/alerts'
import { v4 as uuidv4 } from 'uuid'

export class AlertGenerator {
  static generateInventoryAlerts(
    organizationId: string,
    inventoryData: Array<{
      productId: string
      productName: string
      currentStock: number
      platform: 'shopify' | 'woocommerce'
      sku?: string
    }>
  ): InventoryAlert[] {
    const alerts: InventoryAlert[] = []

    inventoryData.forEach(item => {
      let severity: 'low' | 'medium' | 'high' | 'critical'
      let title: string
      let description: string

      if (item.currentStock === 0) {
        severity = 'critical'
        title = `${item.productName} is out of stock`
        description = `This product has no inventory remaining and needs immediate restocking.`
      } else if (item.currentStock <= 5) {
        severity = 'high'
        title = `${item.productName} is critically low in stock`
        description = `Only ${item.currentStock} units remaining. Consider restocking soon.`
      } else if (item.currentStock <= 15) {
        severity = 'medium'
        title = `${item.productName} is running low`
        description = `${item.currentStock} units remaining. You may want to reorder.`
      } else if (item.currentStock <= 25) {
        severity = 'low'
        title = `${item.productName} inventory notice`
        description = `${item.currentStock} units remaining. Monitor for potential restocking.`
      } else {
        return // No alert needed
      }

      alerts.push({
        id: uuidv4(),
        type: 'inventory',
        severity,
        status: 'active',
        title,
        description,
        metadata: {
          productId: item.productId,
          productName: item.productName,
          currentStock: item.currentStock,
          threshold: item.currentStock <= 5 ? 5 : item.currentStock <= 15 ? 15 : 25,
          platform: item.platform,
          sku: item.sku
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationId,
        actionUrl: `/dashboard/products?filter=${item.productId}`,
        actionLabel: 'View Product'
      })
    })

    return alerts
  }

  static generatePerformanceAlerts(
    organizationId: string,
    performanceData: {
      currentRevenue: number
      previousRevenue: number
      currentOrders: number
      previousOrders: number
      conversionRate: number
      previousConversionRate: number
      period: string
    }
  ): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = []

    // Revenue decline alert
    const revenueChange = ((performanceData.currentRevenue - performanceData.previousRevenue) / performanceData.previousRevenue) * 100
    if (revenueChange < -20) {
      alerts.push({
        id: uuidv4(),
        type: 'performance',
        severity: 'critical',
        status: 'active',
        title: 'Significant Revenue Decline',
        description: `Revenue has dropped by ${Math.abs(revenueChange).toFixed(1)}% compared to the previous ${performanceData.period}.`,
        metadata: {
          metricName: 'revenue',
          currentValue: performanceData.currentRevenue,
          previousValue: performanceData.previousRevenue,
          threshold: -20,
          period: performanceData.period,
          changePercent: revenueChange
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationId,
        actionUrl: '/dashboard/analytics?tab=performance',
        actionLabel: 'View Analytics'
      })
    } else if (revenueChange < -10) {
      alerts.push({
        id: uuidv4(),
        type: 'performance',
        severity: 'high',
        status: 'active',
        title: 'Revenue Decline Alert',
        description: `Revenue has decreased by ${Math.abs(revenueChange).toFixed(1)}% this ${performanceData.period}.`,
        metadata: {
          metricName: 'revenue',
          currentValue: performanceData.currentRevenue,
          previousValue: performanceData.previousRevenue,
          threshold: -10,
          period: performanceData.period,
          changePercent: revenueChange
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationId,
        actionUrl: '/dashboard/analytics?tab=performance',
        actionLabel: 'View Analytics'
      })
    }

    // Order volume alert
    const orderChange = ((performanceData.currentOrders - performanceData.previousOrders) / performanceData.previousOrders) * 100
    if (orderChange < -30) {
      alerts.push({
        id: uuidv4(),
        type: 'performance',
        severity: 'high',
        status: 'active',
        title: 'Order Volume Drop',
        description: `Order count has decreased by ${Math.abs(orderChange).toFixed(1)}% this ${performanceData.period}.`,
        metadata: {
          metricName: 'orders',
          currentValue: performanceData.currentOrders,
          previousValue: performanceData.previousOrders,
          threshold: -30,
          period: performanceData.period,
          changePercent: orderChange
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationId
      })
    }

    // Conversion rate alert
    const conversionChange = ((performanceData.conversionRate - performanceData.previousConversionRate) / performanceData.previousConversionRate) * 100
    if (performanceData.conversionRate < 1.0) {
      alerts.push({
        id: uuidv4(),
        type: 'performance',
        severity: performanceData.conversionRate < 0.5 ? 'critical' : 'high',
        status: 'active',
        title: 'Low Conversion Rate',
        description: `Conversion rate is ${performanceData.conversionRate.toFixed(2)}%, which is below optimal levels.`,
        metadata: {
          metricName: 'conversion_rate',
          currentValue: performanceData.conversionRate,
          previousValue: performanceData.previousConversionRate,
          threshold: 1.0,
          period: performanceData.period,
          changePercent: conversionChange
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationId,
        actionUrl: '/dashboard/analytics?tab=performance',
        actionLabel: 'Analyze Conversion'
      })
    }

    return alerts
  }

  static generateIntegrationAlerts(
    organizationId: string,
    integrations: Array<{
      id: string
      platform: string
      status: string
      lastSyncAt?: Date
      errorCount?: number
    }>
  ): IntegrationAlert[] {
    const alerts: IntegrationAlert[] = []

    integrations.forEach(integration => {
      // Sync failure alerts
      if (integration.status === 'ERROR' || integration.status === 'FAILED') {
        alerts.push({
          id: uuidv4(),
          type: 'integration',
          severity: 'high',
          status: 'active',
          title: `${integration.platform} Integration Failed`,
          description: `The ${integration.platform} integration has failed and needs attention.`,
          metadata: {
            platform: integration.platform,
            integrationId: integration.id,
            errorCode: integration.status,
            lastSuccessfulSync: integration.lastSyncAt,
            retryCount: integration.errorCount || 0
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          organizationId,
          actionUrl: `/dashboard/integrations/${integration.id}`,
          actionLabel: 'Fix Integration'
        })
      }

      // Stale data alerts
      const now = new Date()
      const lastSync = integration.lastSyncAt
      if (lastSync) {
        const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)
        
        if (hoursSinceSync > 48) {
          alerts.push({
            id: uuidv4(),
            type: 'integration',
            severity: hoursSinceSync > 72 ? 'high' : 'medium',
            status: 'active',
            title: `${integration.platform} Data is Stale`,
            description: `Data hasn't been synced for ${Math.round(hoursSinceSync)} hours. Your analytics may be outdated.`,
            metadata: {
              platform: integration.platform,
              integrationId: integration.id,
              lastSuccessfulSync: lastSync
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            organizationId,
            actionUrl: `/dashboard/integrations/${integration.id}`,
            actionLabel: 'Sync Now'
          })
        }
      }
    })

    return alerts
  }

  static generateCustomerAlerts(
    organizationId: string,
    customerData: {
      churnRate: number
      newCustomers: number
      returningCustomers: number
      averageOrderValue: number
      previousAverageOrderValue: number
    }
  ): CustomerAlert[] {
    const alerts: CustomerAlert[] = []

    // High churn rate alert
    if (customerData.churnRate > 15) {
      alerts.push({
        id: uuidv4(),
        type: 'customer',
        severity: customerData.churnRate > 25 ? 'critical' : 'high',
        status: 'active',
        title: 'High Customer Churn Rate',
        description: `Customer churn rate is ${customerData.churnRate.toFixed(1)}%, indicating customers are leaving at a concerning rate.`,
        metadata: {
          metric: 'churn_rate',
          value: customerData.churnRate,
          riskLevel: customerData.churnRate > 25 ? 'high' : 'medium'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationId,
        actionUrl: '/dashboard/analytics?tab=customers',
        actionLabel: 'Analyze Churn'
      })
    }

    // Low new customer acquisition
    if (customerData.newCustomers < 5) {
      alerts.push({
        id: uuidv4(),
        type: 'customer',
        severity: customerData.newCustomers === 0 ? 'high' : 'medium',
        status: 'active',
        title: 'Low New Customer Acquisition',
        description: `Only ${customerData.newCustomers} new customers acquired recently. Consider reviewing marketing strategies.`,
        metadata: {
          metric: 'new_customers',
          value: customerData.newCustomers,
          riskLevel: customerData.newCustomers === 0 ? 'high' : 'low'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationId,
        actionUrl: '/dashboard/analytics?tab=customers',
        actionLabel: 'View Customer Analytics'
      })
    }

    // Declining average order value
    const aovChange = ((customerData.averageOrderValue - customerData.previousAverageOrderValue) / customerData.previousAverageOrderValue) * 100
    if (aovChange < -15) {
      alerts.push({
        id: uuidv4(),
        type: 'customer',
        severity: aovChange < -25 ? 'high' : 'medium',
        status: 'active',
        title: 'Declining Average Order Value',
        description: `Average order value has decreased by ${Math.abs(aovChange).toFixed(1)}%. Consider upselling strategies.`,
        metadata: {
          metric: 'average_order_value',
          value: customerData.averageOrderValue,
          riskLevel: aovChange < -25 ? 'high' : 'medium'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationId,
        actionUrl: '/dashboard/analytics?tab=customers',
        actionLabel: 'Analyze AOV'
      })
    }

    return alerts
  }

  static generateSystemAlerts(organizationId: string): Alert[] {
    const alerts: Alert[] = []
    
    // Example system alerts (these would be based on actual system monitoring)
    const systemChecks = [
      {
        name: 'Database Performance',
        status: 'healthy',
        responseTime: 45
      },
      {
        name: 'API Response Time',
        status: 'degraded',
        responseTime: 2500
      }
    ]

    systemChecks.forEach(check => {
      if (check.status === 'degraded' || check.responseTime > 2000) {
        alerts.push({
          id: uuidv4(),
          type: 'system',
          severity: check.responseTime > 5000 ? 'critical' : 'medium',
          status: 'active',
          title: `${check.name} Performance Issue`,
          description: `${check.name} is experiencing performance issues with response time of ${check.responseTime}ms.`,
          metadata: {
            service: check.name,
            responseTime: check.responseTime,
            threshold: 2000
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          organizationId
        })
      }
    })

    return alerts
  }
}