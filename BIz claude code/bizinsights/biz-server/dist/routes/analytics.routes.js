"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Get analytics data
router.get('/', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { organizationId, period, currency, startDate, endDate } = req.query;
        if (!organizationId) {
            return res.status(400).json({ success: false, error: 'Organization ID required' });
        }
        // Calculate date range based on period
        const now = new Date();
        let fromDate;
        switch (period) {
            case 'today':
                fromDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'quarter':
                fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            case 'custom':
                fromDate = startDate ? new Date(startDate) : undefined;
                break;
            default:
                fromDate = undefined; // All time
        }
        const toDate = endDate ? new Date(endDate) : new Date();
        // Get data points
        const whereClause = {
            organizationId: organizationId,
        };
        if (fromDate) {
            whereClause.date = {
                gte: fromDate,
                lte: toDate,
            };
        }
        const dataPoints = await prisma_1.prisma.dataPoint.findMany({
            where: whereClause,
            orderBy: { date: 'asc' },
        });
        // Aggregate data
        const totalRevenue = dataPoints.reduce((sum, dp) => sum + (dp.revenue || 0), 0);
        const totalOrders = dataPoints.reduce((sum, dp) => sum + (dp.orders || 0), 0);
        const totalCustomers = dataPoints.reduce((sum, dp) => sum + (dp.newCustomers || 0), 0);
        // Get previous period for comparison
        const periodLength = fromDate ? toDate.getTime() - fromDate.getTime() : 30 * 24 * 60 * 60 * 1000;
        const previousFromDate = fromDate ? new Date(fromDate.getTime() - periodLength) : undefined;
        const previousToDate = fromDate ? new Date(fromDate.getTime()) : undefined;
        let revenueGrowth = 0;
        let customerGrowth = 0;
        if (previousFromDate && previousToDate) {
            const previousDataPoints = await prisma_1.prisma.dataPoint.findMany({
                where: {
                    organizationId: organizationId,
                    date: {
                        gte: previousFromDate,
                        lt: previousToDate,
                    },
                },
            });
            const previousRevenue = previousDataPoints.reduce((sum, dp) => sum + (dp.revenue || 0), 0);
            const previousCustomers = previousDataPoints.reduce((sum, dp) => sum + (dp.newCustomers || 0), 0);
            if (previousRevenue > 0) {
                revenueGrowth = ((totalRevenue - previousRevenue) / previousRevenue) * 100;
            }
            if (previousCustomers > 0) {
                customerGrowth = ((totalCustomers - previousCustomers) / previousCustomers) * 100;
            }
        }
        // Get top products
        const topProducts = await prisma_1.prisma.productData.findMany({
            where: {
                organizationId: organizationId,
            },
            orderBy: { revenue: 'desc' },
            take: 10,
        });
        // Revenue by period
        const revenueByPeriod = dataPoints.map((dp) => ({
            date: dp.date.toISOString().split('T')[0],
            revenue: dp.revenue || 0,
            orders: dp.orders || 0,
        }));
        const analyticsData = {
            totalRevenue,
            revenueByPeriod,
            revenueGrowth,
            totalOrders,
            averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
            ordersGrowth: 0,
            totalCustomers,
            newCustomers: totalCustomers,
            returningCustomers: 0,
            customerAcquisitionCost: 0,
            customerLifetimeValue: 0,
            customerGrowth,
            totalProducts: topProducts.length,
            topProducts: topProducts.map((p) => ({
                name: p.name,
                revenue: p.revenue || 0,
                quantity: p.quantity || 0,
            })),
            conversionRate: 0,
            churnRate: 0,
            returnOnAdSpend: 0,
            revenueByCountry: [],
            revenueByCurrency: [],
        };
        res.json({ success: true, data: analyticsData });
    }
    catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
});
// Get customer analytics
router.get('/customers', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { organizationId } = req.query;
        if (!organizationId) {
            return res.status(400).json({ success: false, error: 'Organization ID required' });
        }
        const customerData = await prisma_1.prisma.customerData.findMany({
            where: { organizationId: organizationId },
            orderBy: { totalSpent: 'desc' },
            take: 100,
        });
        const totalCustomers = customerData.length;
        const totalSpent = customerData.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
        const averageValue = totalCustomers > 0 ? totalSpent / totalCustomers : 0;
        res.json({
            success: true,
            data: {
                totalCustomers,
                totalSpent,
                averageValue,
                customers: customerData,
            },
        });
    }
    catch (error) {
        console.error('Error fetching customer analytics:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch customer analytics' });
    }
});
// Get product analytics
router.get('/products', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { organizationId } = req.query;
        if (!organizationId) {
            return res.status(400).json({ success: false, error: 'Organization ID required' });
        }
        const products = await prisma_1.prisma.productData.findMany({
            where: { organizationId: organizationId },
            orderBy: { revenue: 'desc' },
        });
        const totalRevenue = products.reduce((sum, p) => sum + (p.revenue || 0), 0);
        const totalQuantity = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
        res.json({
            success: true,
            data: {
                totalProducts: products.length,
                totalRevenue,
                totalQuantity,
                products,
            },
        });
    }
    catch (error) {
        console.error('Error fetching product analytics:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch product analytics' });
    }
});
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map