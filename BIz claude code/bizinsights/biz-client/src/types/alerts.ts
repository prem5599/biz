export type AlertType = 
  | 'INVENTORY'
  | 'PERFORMANCE' 
  | 'INTEGRATION'
  | 'CUSTOMER'
  | 'FINANCIAL'
  | 'SECURITY'
  | 'SYSTEM'

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED'

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  status: AlertStatus
  title: string
  description: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  acknowledgedAt?: Date
  resolvedAt?: Date
  actionUrl?: string
  actionLabel?: string
  organizationId: string
  userId?: string
}

export interface InventoryAlert extends Alert {
  type: 'INVENTORY'
  metadata: {
    productId: string
    productName: string
    currentStock: number
    threshold: number
    platform: 'shopify' | 'woocommerce'
    sku?: string
  }
}

export interface PerformanceAlert extends Alert {
  type: 'PERFORMANCE'
  metadata: {
    metricName: string
    currentValue: number
    previousValue?: number
    threshold: number
    period: string
    changePercent?: number
  }
}

export interface IntegrationAlert extends Alert {
  type: 'INTEGRATION'
  metadata: {
    platform: string
    integrationId: string
    errorCode?: string
    lastSuccessfulSync?: Date
    retryCount?: number
  }
}

export interface CustomerAlert extends Alert {
  type: 'CUSTOMER'
  metadata: {
    customerId?: string
    customerEmail?: string
    metric: string
    value: number
    riskLevel?: 'low' | 'medium' | 'high'
  }
}

export interface AlertSummary {
  total: number
  active: number
  byType: Record<AlertType, number>
  bySeverity: Record<AlertSeverity, number>
  critical: Alert[]
}