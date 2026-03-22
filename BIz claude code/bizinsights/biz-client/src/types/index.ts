// User types
export interface User {
  id: string;
  name: string | null;
  email: string;
  image?: string;
}

// Organization types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: string;
  billingEmail?: string;
  createdAt: string;
  updatedAt: string;
  members: OrganizationMember[];
  integrations?: Integration[];
  _count?: {
    integrations: number;
    insights: number;
    reports: number;
    dataPoints: number;
  };
}

export interface OrganizationMember {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user: User;
  createdAt: string;
}

// Integration types
export type IntegrationPlatform =
  | 'SHOPIFY'
  | 'STRIPE'
  | 'GOOGLE_ANALYTICS'
  | 'FACEBOOK_ADS'
  | 'WOOCOMMERCE';

export type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING';

export interface Integration {
  id: string;
  platform: IntegrationPlatform;
  status: IntegrationStatus;
  lastSyncAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Dashboard types
export interface DashboardMetrics {
  revenue: number;
  orders: number;
  customers: number;
  conversionRate: number;
}

export interface ChartDataPoint {
  date: string;
  revenue?: number;
  orders?: number;
  customers?: number;
  value?: number;
}

export interface DashboardHealthMetrics {
  overallHealthScore: number;
  revenuePerCustomer: number;
  growthMomentum: number;
}

export interface DashboardData {
  metrics: DashboardMetrics & {
    revenueGrowth?: number;
    ordersGrowth?: number;
    customersGrowth?: number;
  };
  chartData: {
    revenue: ChartDataPoint[];
    orders: ChartDataPoint[];
    customers: ChartDataPoint[];
    traffic: ChartDataPoint[];
  };
  insights: Insight[];
  integrations: Integration[];
  hasActiveIntegrations: boolean;
  period: string;
  healthMetrics?: DashboardHealthMetrics;
}

// Analytics types
export interface AnalyticsData {
  totalRevenue: number;
  revenueByPeriod: Array<{ date: string; revenue: number; orders: number }>;
  revenueGrowth: number;
  totalOrders: number;
  averageOrderValue: number;
  ordersGrowth: number;
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  customerAcquisitionCost: number;
  customerLifetimeValue: number;
  customerGrowth: number;
  totalProducts: number;
  topProducts: Array<{ name: string; revenue: number; quantity: number }>;
  conversionRate: number;
  churnRate: number;
  returnOnAdSpend: number;
  revenueByCountry: Array<{ country: string; revenue: number }>;
  revenueByCurrency: Array<{ currency: string; amount: number; converted: number }>;
}

// Insight types
export type InsightType = 'TREND' | 'ANOMALY' | 'RECOMMENDATION' | 'ALERT';

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  impactScore: number;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Alert types
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';

export interface Alert {
  id: string;
  type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  metadata?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  dismissedAt?: string;
  createdAt: string;
}

// Report types
export type ReportFormat = 'PDF' | 'EXCEL' | 'CSV';
export type ReportType = 'WEEKLY' | 'MONTHLY' | 'CUSTOMER' | 'REVENUE';

export interface Report {
  id: string;
  type: ReportType;
  title: string;
  format: ReportFormat;
  content?: string;
  pdfUrl?: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  expiresAt?: string;
}

export interface ScheduledReport {
  id: string;
  reportType: ReportType;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  format: ReportFormat;
  recipients: string[];
  isActive: boolean;
  nextRunDate: string;
  lastRunDate?: string;
  title: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// Auth types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

// Currency types
export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'AUD' | 'CAD';

export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
}
