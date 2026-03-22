"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// Route imports
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const organization_routes_1 = __importDefault(require("./routes/organization.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const integration_routes_1 = __importDefault(require("./routes/integration.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const reports_routes_1 = __importDefault(require("./routes/reports.routes"));
const alerts_routes_1 = __importDefault(require("./routes/alerts.routes"));
const insights_routes_1 = __importDefault(require("./routes/insights.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const billing_routes_1 = __importDefault(require("./routes/billing.routes"));
// Middleware imports
const error_middleware_1 = require("./middleware/error.middleware");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/organizations', organization_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
app.use('/api/integrations', integration_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/reports', reports_routes_1.default);
app.use('/api/alerts', alerts_routes_1.default);
app.use('/api/insights', insights_routes_1.default);
app.use('/api/user', user_routes_1.default);
app.use('/api/billing', billing_routes_1.default);
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
        }
    });
});
// Error handling middleware
app.use(error_middleware_1.errorHandler);
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
exports.default = app;
//# sourceMappingURL=index.js.map