import axios, { AxiosError, AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear auth data and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getMe: () => api.get('/auth/me'),
};

// Organizations API
export const organizationsApi = {
  getAll: () => api.get('/organizations'),

  getById: (id: string) => api.get(`/organizations/${id}`),

  create: (data: { name: string; slug: string }) =>
    api.post('/organizations', data),

  update: (id: string, data: { name?: string; billingEmail?: string }) =>
    api.put(`/organizations/${id}`, data),

  delete: (id: string) => api.delete(`/organizations/${id}`),

  getSettings: (id: string) => api.get(`/organizations/${id}/settings`),

  updateSettings: (id: string, settings: any) =>
    api.put(`/organizations/${id}/settings`, settings),
};

// Dashboard API
export const dashboardApi = {
  getData: (organizationId: string, period: string = '30d') =>
    api.get(`/dashboard/${organizationId}`, { params: { period } }),
};

// Analytics API
export const analyticsApi = {
  getData: (params: {
    organizationId: string;
    period?: string;
    currency?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/analytics', { params }),

  getCustomerAnalytics: (organizationId: string) =>
    api.get(`/organizations/${organizationId}/analytics`, { params: { type: 'customers' } }),

  getProductAnalytics: (organizationId: string) =>
    api.get(`/organizations/${organizationId}/analytics`, { params: { type: 'products' } }),

  getForecastAnalytics: (organizationId: string) =>
    api.get(`/organizations/${organizationId}/analytics`, { params: { type: 'forecast' } }),
};

// Integrations API
export const integrationsApi = {
  getAvailable: () => api.get('/integrations/available'),

  getConnected: (organizationId: string) =>
    api.get(`/integrations`, { params: { organizationId } }),

  connect: (platform: string, organizationId: string, data?: any) =>
    api.post(`/integrations/${platform}/connect`, { organizationId, ...data }),

  disconnect: (platform: string, organizationId: string) =>
    api.post(`/integrations/${platform}/disconnect`, { organizationId }),

  sync: (platform: string, organizationId: string) =>
    api.post(`/integrations/${platform}/sync`, { organizationId }),

  getOAuthUrl: (platform: string, organizationId: string) =>
    api.get(`/integrations/${platform}/oauth/authorize`, { params: { organizationId } }),

  handleOAuthCallback: (platform: string, code: string, organizationId: string) =>
    api.post(`/integrations/${platform}/oauth/callback`, { code, organizationId }),
};

// Insights API
export const insightsApi = {
  getAll: (organizationId: string) =>
    api.get(`/organizations/${organizationId}/insights`),

  generate: (organizationId: string, options?: {
    timeframe?: string
    metrics?: string[]
    includeForecasts?: boolean
    maxInsights?: number
    includeRecommendations?: boolean
    minConfidence?: number
  }) =>
    api.post(`/organizations/${organizationId}/insights/generate`, options || {}),

  getExisting: (organizationId: string) =>
    api.get(`/organizations/${organizationId}/insights/generate`),

  getTrending: (organizationId: string) =>
    api.get(`/organizations/${organizationId}/insights/trending`),

  getDataQuality: (organizationId: string) =>
    api.get(`/organizations/${organizationId}/insights/data-quality`),

  getAlerts: (organizationId: string) =>
    api.get(`/organizations/${organizationId}/insights/alerts`),

  submitFeedback: (insightId: string, organizationId: string, data: {
    acknowledged?: boolean
    feedback?: string
    helpful?: boolean
    comment?: string
  }) =>
    api.post('/insights/feedback', { insightId, organizationId, ...data }),
};

// Reports API
export const reportsApi = {
  getAll: (organizationId: string, limit?: number) =>
    api.get('/reports', { params: { organizationId, limit } }),

  getById: (id: string, format?: string) =>
    api.get(`/reports/${id}`, { params: { format }, responseType: 'blob' }),

  generate: (data: {
    organizationId: string;
    reportType: string;
    period: string;
    currency: string;
    format: string;
  }) => api.post('/reports/generate', data, { responseType: 'blob' }),

  delete: (id: string) => api.delete(`/reports/${id}`),

  cleanup: () => api.post('/reports/cleanup'),

  // Scheduled reports
  getScheduled: (organizationId: string) =>
    api.get('/reports/schedule', { params: { organizationId } }),

  createSchedule: (data: {
    organizationId: string;
    reportType: string;
    frequency: string;
    format: string;
    recipients: string[];
    title: string;
  }) => api.post('/reports/schedule', data),

  updateSchedule: (id: string, data: any) =>
    api.put(`/reports/schedule/${id}`, data),

  deleteSchedule: (id: string) => api.delete(`/reports/schedule/${id}`),
};

// Alerts API
export const alertsApi = {
  getAll: (organizationId: string, status?: string) =>
    api.get('/alerts', { params: { organizationId, status } }),

  acknowledge: (id: string) => api.post(`/alerts/${id}/acknowledge`),

  resolve: (id: string) => api.post(`/alerts/${id}/resolve`),

  dismiss: (id: string) => api.post(`/alerts/${id}/dismiss`),

  // Alert rules
  getRules: (organizationId: string) =>
    api.get('/alerts/rules', { params: { organizationId } }),

  createRule: (data: any) => api.post('/alerts/rules', data),

  updateRule: (id: string, data: any) => api.put(`/alerts/rules/${id}`, data),

  deleteRule: (id: string) => api.delete(`/alerts/rules/${id}`),
};

// User API
export const userApi = {
  getSettings: () => api.get('/user/settings'),

  updateSettings: (settings: any) => api.put('/user/settings', settings),

  updateProfile: (data: { name?: string; email?: string }) =>
    api.put('/user/profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/user/change-password', data),
};

// Team API
export const teamApi = {
  getMembers: (organizationId: string) =>
    api.get(`/organizations/${organizationId}/members`),

  inviteMember: (organizationId: string, data: { email: string; role: string }) =>
    api.post('/organization/team', { organizationId, ...data }),

  updateMemberRole: (organizationId: string, memberId: string, role: string) =>
    api.put(`/organization/team/${memberId}`, { organizationId, role }),

  removeMember: (organizationId: string, memberId: string) =>
    api.delete(`/organization/team/${memberId}`, { params: { organizationId } }),

  getPendingInvitations: (organizationId: string) =>
    api.get('/organization/team/invitations', { params: { organizationId } }),

  cancelInvitation: (invitationId: string) =>
    api.delete(`/organization/team/invitations/${invitationId}`),
};

// Billing API
export const billingApi = {
  createCheckout: (organizationId: string, plan: string) =>
    api.post('/billing/create-checkout', { organizationId, plan }),

  getSubscription: (organizationId: string) =>
    api.get('/billing/subscription', { params: { organizationId } }),

  cancelSubscription: (organizationId: string) =>
    api.post('/billing/cancel', { organizationId }),
};

// Currency API
export const currencyApi = {
  getRates: () => api.get('/currency/rates'),

  convert: (amount: number, from: string, to: string) =>
    api.post('/currency/convert', { amount, from, to }),
};

export default api;
