import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Route imports
import authRoutes from './routes/auth.routes';
import organizationRoutes from './routes/organization.routes';
import dashboardRoutes from './routes/dashboard.routes';
import integrationRoutes from './routes/integration.routes';
import analyticsRoutes from './routes/analytics.routes';
import reportsRoutes from './routes/reports.routes';
import alertsRoutes from './routes/alerts.routes';
import insightsRoutes from './routes/insights.routes';
import userRoutes from './routes/user.routes';
import billingRoutes from './routes/billing.routes';
import teamRoutes from './routes/team.routes';
import currencyRoutes from './routes/currency.routes';

// Middleware imports
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/organization/team', teamRoutes);
app.use('/api/currency', currencyRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'BizInsights API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      organizations: '/api/organizations',
      dashboard: '/api/dashboard',
      integrations: '/api/integrations',
      analytics: '/api/analytics',
      reports: '/api/reports',
      alerts: '/api/alerts',
      insights: '/api/insights',
      user: '/api/user',
      billing: '/api/billing',
      currency: '/api/currency',
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║       BizInsights API Server              ║
  ╠═══════════════════════════════════════════╣
  ║  🚀 Server running on port ${PORT}           ║
  ║  📍 http://localhost:${PORT}                 ║
  ║  🏠 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}  ║
  ╚═══════════════════════════════════════════╝
  `);
});

export default app;
