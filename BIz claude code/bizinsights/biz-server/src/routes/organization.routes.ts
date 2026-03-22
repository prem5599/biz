import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const router = Router();

const createOrgSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1)
});

// Get all organizations for user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const organizations = await prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId: req.user!.id
          }
        },
        isDeleted: false
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        },
        _count: {
          select: {
            integrations: true,
            insights: true
          }
        }
      }
    });

    res.json({ success: true, data: organizations });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Create organization
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, slug } = createOrgSchema.parse(req.body);

    const existingOrg = await prisma.organization.findUnique({
      where: { slug }
    });

    if (existingOrg) {
      return res.status(400).json({ error: 'Organization slug already exists' });
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        members: {
          create: {
            userId: req.user!.id,
            role: 'OWNER'
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        }
      }
    });

    res.json({ success: true, data: organization });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Get organization by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const organization = await prisma.organization.findFirst({
      where: {
        id: req.params.id,
        members: {
          some: {
            userId: req.user!.id
          }
        },
        isDeleted: false
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        },
        integrations: {
          select: {
            id: true,
            platform: true,
            status: true,
            lastSyncAt: true
          }
        },
        _count: {
          select: {
            insights: true,
            reports: true,
            dataPoints: true
          }
        }
      }
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ success: true, data: organization });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Get organization members (dedicated endpoint)
router.get('/:id/members', authenticate, async (req: AuthRequest, res) => {
  try {
    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId: req.params.id,
        organization: { members: { some: { userId: req.user!.id } }, isDeleted: false }
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } }
      }
    });

    res.json({ success: true, data: members });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch members' });
  }
});

// Get org-scoped analytics (type: customers | products | forecast)
router.get('/:id/analytics', authenticate, async (req: AuthRequest, res) => {
  try {
    const { type } = req.query;
    const organizationId = req.params.id;

    // Verify membership
    const membership = await prisma.organizationMember.findFirst({
      where: { organizationId, userId: req.user!.id }
    });
    if (!membership) return res.status(403).json({ success: false, error: 'Access denied' });

    if (type === 'customers') {
      const customerData = await prisma.customerData.findMany({
        where: { organizationId },
        orderBy: { totalSpent: 'desc' },
        take: 100,
      });
      const totalCustomers = customerData.length;
      const totalSpent = customerData.reduce((s, c) => s + (c.totalSpent || 0), 0);
      return res.json({ success: true, data: { totalCustomers, totalSpent, averageValue: totalCustomers > 0 ? totalSpent / totalCustomers : 0, customers: customerData } });
    }

    if (type === 'products') {
      const products = await prisma.productData.findMany({
        where: { organizationId },
        orderBy: { revenue: 'desc' },
      });
      const totalRevenue = products.reduce((s, p) => s + (p.revenue || 0), 0);
      const totalQuantity = products.reduce((s, p) => s + (p.quantity || 0), 0);
      return res.json({ success: true, data: { totalProducts: products.length, totalRevenue, totalQuantity, products } });
    }

    if (type === 'forecast') {
      // Simple forecast: project next 30 days from last 30 days revenue trend
      const dataPoints = await prisma.dataPoint.findMany({
        where: { organizationId, metricType: 'revenue', dateRecorded: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } },
        orderBy: { dateRecorded: 'asc' },
      });
      const last30 = dataPoints.filter(d => d.dateRecorded && d.dateRecorded >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      const prev30 = dataPoints.filter(d => d.dateRecorded && d.dateRecorded < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      const currentRevenue = last30.reduce((s, d) => s + Number(d.value || 0), 0);
      const previousRevenue = prev30.reduce((s, d) => s + Number(d.value || 0), 0);
      const growthRate = previousRevenue > 0 ? (currentRevenue - previousRevenue) / previousRevenue : 0;
      const forecastedRevenue = currentRevenue * (1 + growthRate);
      return res.json({ success: true, data: { currentRevenue, previousRevenue, growthRate, forecastedRevenue, confidence: Math.max(0, 1 - Math.abs(growthRate)) * 100 } });
    }

    return res.status(400).json({ success: false, error: 'Invalid analytics type. Use: customers, products, or forecast' });
  } catch (error) {
    console.error('Error fetching org analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// Get org-scoped insights
router.get('/:id/insights', authenticate, async (req: AuthRequest, res) => {
  try {
    const { type, isRead } = req.query;
    const organizationId = req.params.id;

    const membership = await prisma.organizationMember.findFirst({ where: { organizationId, userId: req.user!.id } });
    if (!membership) return res.status(403).json({ success: false, error: 'Access denied' });

    const where: any = { organizationId };
    if (type) where.type = type as string;
    if (isRead !== undefined) where.isRead = isRead === 'true';

    const insights = await prisma.insight.findMany({ where, orderBy: [{ impactScore: 'desc' }, { createdAt: 'desc' }] });
    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch insights' });
  }
});

// Generate org-scoped insights
router.post('/:id/insights/generate', authenticate, async (req: AuthRequest, res) => {
  try {
    const organizationId = req.params.id;

    const membership = await prisma.organizationMember.findFirst({ where: { organizationId, userId: req.user!.id } });
    if (!membership) return res.status(403).json({ success: false, error: 'Access denied' });

    const dataPoints = await prisma.dataPoint.findMany({
      where: { organizationId, date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      orderBy: { date: 'desc' },
    });

    const insights: any[] = [];
    const totalRevenue = dataPoints.reduce((s, d) => s + (d.revenue || 0), 0);
    const totalOrders = dataPoints.reduce((s, d) => s + (d.orders || 0), 0);

    if (totalRevenue > 0) {
      const recentRevenue = dataPoints.slice(0, 7).reduce((s, d) => s + (d.revenue || 0), 0);
      const olderRevenue = dataPoints.slice(7, 14).reduce((s, d) => s + (d.revenue || 0), 0);
      if (olderRevenue > 0) {
        const growthRate = ((recentRevenue - olderRevenue) / olderRevenue) * 100;
        insights.push({ id: `trend-revenue-${Date.now()}`, organizationId, type: 'TREND', title: growthRate >= 0 ? 'Revenue Growing' : 'Revenue Declining', description: growthRate >= 0 ? `Revenue increased by ${growthRate.toFixed(1)}% vs. previous week.` : `Revenue decreased by ${Math.abs(growthRate).toFixed(1)}% vs. previous week.`, impactScore: Math.min(Math.abs(growthRate), 100), isRead: false, metadata: JSON.stringify({ growthRate, period: '7d' }) });
      }
    }

    if (totalOrders > 0) {
      const aov = totalRevenue / totalOrders;
      insights.push({ id: `recommendation-aov-${Date.now()}`, organizationId, type: 'RECOMMENDATION', title: 'Average Order Value Opportunity', description: `Current AOV is $${aov.toFixed(2)}. Consider bundling or upsells to increase it.`, impactScore: 50, isRead: false, metadata: JSON.stringify({ aov }) });
    }

    if (insights.length === 0) {
      insights.push({ id: `alert-nodata-${Date.now()}`, organizationId, type: 'ALERT', title: 'No Recent Data', description: 'No data synced in the last 30 days. Connect and sync your integrations.', impactScore: 80, isRead: false, metadata: '{}' });
    }

    for (const insight of insights) {
      await prisma.insight.upsert({ where: { id: insight.id }, create: insight, update: insight });
    }

    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ success: false, error: 'Failed to generate insights' });
  }
});

// Get data quality assessment for an organization
router.get('/:id/insights/data-quality', authenticate, async (req: AuthRequest, res) => {
  try {
    const organizationId = req.params.id;

    const membership = await prisma.organizationMember.findFirst({ where: { organizationId, userId: req.user!.id } });
    if (!membership) return res.status(403).json({ success: false, error: 'Access denied' });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const dataPoints = await prisma.dataPoint.findMany({
      where: { organizationId },
      orderBy: { dateRecorded: 'desc' },
    });

    const metricTypes = ['revenue', 'orders', 'customers', 'sessions'];
    const metrics = metricTypes.map((metricType) => {
      const points = dataPoints.filter((dp) => dp.metricType === metricType || dp.metricType === `${metricType}_total`);
      const recordCount = points.length;
      const recentPoints = points.filter((dp) => new Date(dp.dateRecorded) >= thirtyDaysAgo);
      const lastUpdated = points[0]?.dateRecorded?.toISOString() || new Date().toISOString();

      let quality = 0;
      if (recordCount >= 100) quality = 90;
      else if (recordCount >= 50) quality = 80;
      else if (recordCount >= 20) quality = 70;
      else if (recordCount >= 5) quality = 60;
      else if (recordCount > 0) quality = 40;

      // Boost quality if records are recent
      if (recentPoints.length > 0) quality = Math.min(quality + 5, 100);

      const status: 'good' | 'warning' | 'poor' = quality >= 80 ? 'good' : quality >= 60 ? 'warning' : 'poor';

      const issues: string[] = [];
      if (recordCount === 0) issues.push('No data available');
      else if (recentPoints.length === 0) issues.push('No recent updates in 30 days');
      if (quality < 70) issues.push('Insufficient data coverage');

      return { metric: metricType, quality, status, lastUpdated, recordCount, issues };
    });

    const overallScore = metrics.reduce((sum, m) => sum + m.quality, 0) / metrics.length;

    const recommendations: string[] = [];
    const warningMetrics = metrics.filter((m) => m.status === 'warning');
    const poorMetrics = metrics.filter((m) => m.status === 'poor');

    if (poorMetrics.some((m) => m.metric === 'customers')) recommendations.push('Review customer data for duplicates and merge records where appropriate');
    if (poorMetrics.some((m) => m.metric === 'customers') || warningMetrics.some((m) => m.metric === 'customers')) recommendations.push('Implement validation for email addresses during customer registration');
    if (poorMetrics.some((m) => m.metric === 'sessions') || warningMetrics.some((m) => m.metric === 'sessions')) recommendations.push('Investigate session tracking implementation for completeness');

    res.json({
      success: true,
      data: {
        overallScore: Math.round(overallScore),
        metrics,
        recommendations,
        lastAssessment: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error assessing data quality:', error);
    res.status(500).json({ success: false, error: 'Failed to assess data quality' });
  }
});

// Get real-time alerts for an organization
router.get('/:id/insights/alerts', authenticate, async (req: AuthRequest, res) => {
  try {
    const organizationId = req.params.id;

    const membership = await prisma.organizationMember.findFirst({ where: { organizationId, userId: req.user!.id } });
    if (!membership) return res.status(403).json({ success: false, error: 'Access denied' });

    const alertInsights = await prisma.insight.findMany({
      where: { organizationId, type: 'ALERT' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const alerts = alertInsights.map((insight) => {
      let meta: any = {};
      try { meta = typeof insight.metadata === 'string' ? JSON.parse(insight.metadata) : insight.metadata || {}; } catch {}
      return {
        id: insight.id,
        type: insight.impactScore >= 80 ? 'critical' : insight.impactScore >= 60 ? 'high' : insight.impactScore >= 40 ? 'medium' : 'low',
        severity: insight.impactScore >= 80 ? 'critical' : insight.impactScore >= 60 ? 'high' : insight.impactScore >= 40 ? 'medium' : 'low',
        title: insight.title,
        description: insight.description,
        metric: meta.metric || 'general',
        value: meta.value || 0,
        threshold: meta.threshold,
        trend: meta.trend,
        createdAt: insight.createdAt.toISOString(),
        acknowledged: insight.isRead,
      };
    });

    const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
    const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;
    const last24hCount = alertInsights.filter((a) => new Date(a.createdAt) >= last24h).length;

    res.json({
      success: true,
      data: {
        alerts,
        summary: {
          total: alerts.length,
          critical: criticalCount,
          unacknowledged: unacknowledgedCount,
          last24h: last24hCount,
        },
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
  }
});

// Get org-scoped trending insights
router.get('/:id/insights/trending', authenticate, async (req: AuthRequest, res) => {
  try {
    const organizationId = req.params.id;

    const membership = await prisma.organizationMember.findFirst({ where: { organizationId, userId: req.user!.id } });
    if (!membership) return res.status(403).json({ success: false, error: 'Access denied' });

    const insights = await prisma.insight.findMany({
      where: { organizationId, type: 'TREND', isRead: false },
      orderBy: { impactScore: 'desc' },
      take: 5,
    });

    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('Error fetching trending insights:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trending insights' });
  }
});

// Get Google Analytics data for an organization
router.get('/:id/analytics/google', authenticate, async (req: AuthRequest, res) => {
  try {
    const organization = await prisma.organization.findFirst({
      where: {
        id: req.params.id,
        members: { some: { userId: req.user!.id } },
        isDeleted: false
      }
    });

    if (!organization) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    // Fetch the latest GA snapshot from DataPoints
    const snapshot = await prisma.dataPoint.findFirst({
      where: {
        organizationId: req.params.id,
        metricType: 'ga_snapshot'
      },
      orderBy: { dateRecorded: 'desc' }
    });

    if (!snapshot) {
      return res.json({ success: false, error: 'No Google Analytics data found. Please sync your integration.' });
    }

    let data: any = {};
    try {
      data = snapshot.metadata ? JSON.parse(snapshot.metadata as string) : {};
    } catch {
      data = {};
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching Google Analytics data:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics data' });
  }
});

export default router;
