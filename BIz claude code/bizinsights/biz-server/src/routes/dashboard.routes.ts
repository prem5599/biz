import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

// Get dashboard data
router.get('/:organizationId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { organizationId } = req.params;
    const period = req.query.period as string || 'all';

    // Verify user has access to organization
    const membershipCheck = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: req.user!.id
      }
    });

    if (!membershipCheck) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build where clause
    const whereClause: any = { organizationId };
    
    if (period !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      whereClause.dateRecorded = { gte: startDate };
    }

    const [dataPoints, insights, integrations] = await Promise.all([
      prisma.dataPoint.findMany({
        where: whereClause,
        orderBy: {
          dateRecorded: 'asc'
        }
      }),
      prisma.insight.findMany({
        where: {
          organizationId
        },
        orderBy: {
          impactScore: 'desc'
        },
        take: 10
      }),
      prisma.integration.findMany({
        where: {
          organizationId
        },
        select: {
          id: true,
          platform: true,
          status: true,
          lastSyncAt: true
        }
      })
    ]);

    const activeIntegrations = integrations.filter(i => i.status === 'CONNECTED');

    const metrics = activeIntegrations.length > 0 ? calculateMetrics(dataPoints) : {
      revenue: 0,
      orders: 0,
      customers: 0,
      conversionRate: 0
    };

    const chartData = activeIntegrations.length > 0 ? prepareChartData(dataPoints) : {
      revenue: [],
      orders: [],
      customers: [],
      traffic: []
    };

    // Compute growth rates by comparing to the previous equivalent period
    const periodMs = period !== 'all'
      ? (whereClause.dateRecorded?.gte ? Date.now() - new Date(whereClause.dateRecorded.gte).getTime() : 30 * 24 * 60 * 60 * 1000)
      : 30 * 24 * 60 * 60 * 1000;

    let revenueGrowth = 0;
    let ordersGrowth = 0;
    let customersGrowth = 0;

    if (period !== 'all' && whereClause.dateRecorded?.gte) {
      const prevEnd = new Date(whereClause.dateRecorded.gte);
      const prevStart = new Date(prevEnd.getTime() - periodMs);

      const prevDataPoints = await prisma.dataPoint.findMany({
        where: {
          organizationId,
          dateRecorded: { gte: prevStart, lt: prevEnd },
        },
      });

      const prevMetrics = calculateMetrics(prevDataPoints);

      if (prevMetrics.revenue > 0) {
        revenueGrowth = ((metrics.revenue - prevMetrics.revenue) / prevMetrics.revenue) * 100;
      }
      if (prevMetrics.orders > 0) {
        ordersGrowth = ((metrics.orders - prevMetrics.orders) / prevMetrics.orders) * 100;
      }
      if (prevMetrics.customers > 0) {
        customersGrowth = ((metrics.customers - prevMetrics.customers) / prevMetrics.customers) * 100;
      }
    }

    // Business health metrics (computed server-side)
    const safeRevenue = isNaN(metrics.revenue) ? 0 : metrics.revenue;
    const safeCustomers = isNaN(metrics.customers) ? 0 : metrics.customers;
    const safeConversion = isNaN(metrics.conversionRate) ? 0 : metrics.conversionRate;

    const rawHealthScore = (safeConversion * 10 + revenueGrowth + customersGrowth) / 3;
    const rawMomentum = (revenueGrowth + ordersGrowth + customersGrowth) / 3;

    const healthMetrics = {
      overallHealthScore: isNaN(rawHealthScore) ? 0 : Math.round(rawHealthScore),
      revenuePerCustomer: safeCustomers > 0
        ? parseFloat((safeRevenue / safeCustomers).toFixed(2))
        : 0,
      growthMomentum: isNaN(rawMomentum) ? 0 : parseFloat(rawMomentum.toFixed(1)),
    };

    res.json({
      success: true,
      data: {
        metrics: {
          ...metrics,
          revenueGrowth,
          ordersGrowth,
          customersGrowth,
        },
        chartData,
        insights: activeIntegrations.length > 0 ? insights : [],
        integrations,
        hasActiveIntegrations: activeIntegrations.length > 0,
        period,
        healthMetrics,
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

function calculateMetrics(dataPoints: any[]) {
  const metrics = {
    revenue: 0,
    orders: 0,
    customers: 0,
    conversionRate: 0
  };

  const revenuePoints = dataPoints.filter(dp => dp.metricType === 'revenue');
  const orderPoints = dataPoints.filter(dp => dp.metricType === 'orders' || dp.metricType === 'orders_total');
  const customerPoints = dataPoints.filter(dp => dp.metricType === 'customers' || dp.metricType === 'customers_total');
  const conversionPoints = dataPoints.filter(dp => dp.metricType === 'conversion_rate');

  if (revenuePoints.length > 0) {
    const latestRevenuePoint = revenuePoints.sort((a, b) => 
      new Date(b.dateRecorded).getTime() - new Date(a.dateRecorded).getTime()
    )[0];
    metrics.revenue = Number(latestRevenuePoint.value) || 0;
  }

  if (orderPoints.length > 0) {
    const latestOrderPoint = orderPoints[orderPoints.length - 1];
    metrics.orders = Math.floor(Number(latestOrderPoint.value)) || 0;
  }

  if (customerPoints.length > 0) {
    const latestCustomerPoint = customerPoints[customerPoints.length - 1];
    metrics.customers = Number(latestCustomerPoint.value) || 0;
  }

  if (conversionPoints.length > 0) {
    const lastConversionValue = conversionPoints[conversionPoints.length - 1]?.value;
    metrics.conversionRate = Number(lastConversionValue) || 0;
  }

  return metrics;
}

function prepareChartData(dataPoints: any[]) {
  const dataByDate = new Map();
  
  dataPoints.forEach(dp => {
    const date = new Date(dp.dateRecorded).toISOString().split('T')[0];
    
    if (!dataByDate.has(date)) {
      dataByDate.set(date, { date, revenue: 0, orders: 0, customers: 0 });
    }
    
    const dayData = dataByDate.get(date);
    
    if (dp.metricType === 'revenue') {
      dayData.revenue += Number(dp.value) || 0;
    } else if (dp.metricType === 'orders') {
      dayData.orders = Math.floor(Number(dp.value)) || 0;
    } else if (dp.metricType === 'customers') {
      dayData.customers = Math.floor(Number(dp.value)) || 0;
    }
  });
  
  const chartData = Array.from(dataByDate.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return {
    revenue: chartData,
    orders: chartData,
    customers: chartData,
    traffic: []
  };
}

export default router;
