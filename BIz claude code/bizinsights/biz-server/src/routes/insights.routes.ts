import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get all insights for organization
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, type, isRead } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const where: any = { organizationId: organizationId as string };
    if (type) {
      where.type = type as string;
    }
    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const insights = await prisma.insight.findMany({
      where,
      orderBy: [
        { impactScore: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch insights' });
  }
});

// Generate insights
router.post('/generate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.body;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    // Get recent data for analysis
    const dataPoints = await prisma.dataPoint.findMany({
      where: {
        organizationId,
        date: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { date: 'desc' },
    });

    const insights: any[] = [];

    if (dataPoints.length > 0) {
      // Calculate trends
      const totalRevenue = dataPoints.reduce((sum, dp) => sum + (dp.revenue || 0), 0);
      const totalOrders = dataPoints.reduce((sum, dp) => sum + (dp.orders || 0), 0);

      // Revenue trend insight
      if (totalRevenue > 0) {
        const recentRevenue = dataPoints.slice(0, 7).reduce((sum, dp) => sum + (dp.revenue || 0), 0);
        const olderRevenue = dataPoints.slice(7, 14).reduce((sum, dp) => sum + (dp.revenue || 0), 0);

        if (olderRevenue > 0) {
          const growthRate = ((recentRevenue - olderRevenue) / olderRevenue) * 100;

          insights.push({
            id: `trend-revenue-${Date.now()}`,
            organizationId,
            type: 'TREND',
            title: growthRate >= 0 ? 'Revenue Growing' : 'Revenue Declining',
            description:
              growthRate >= 0
                ? `Your revenue has increased by ${growthRate.toFixed(1)}% compared to the previous week.`
                : `Your revenue has decreased by ${Math.abs(growthRate).toFixed(1)}% compared to the previous week.`,
            impactScore: Math.min(Math.abs(growthRate), 100),
            isRead: false,
            metadata: { growthRate, period: '7d' },
          });
        }
      }

      // Order volume insight
      if (totalOrders > 100) {
        insights.push({
          id: `trend-orders-${Date.now()}`,
          organizationId,
          type: 'TREND',
          title: 'High Order Volume',
          description: `You've received ${totalOrders} orders in the last 30 days.`,
          impactScore: Math.min(totalOrders / 10, 100),
          isRead: false,
          metadata: { totalOrders, period: '30d' },
        });
      }

      // AOV recommendation
      const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      if (aov > 0) {
        insights.push({
          id: `recommendation-aov-${Date.now()}`,
          organizationId,
          type: 'RECOMMENDATION',
          title: 'Average Order Value Opportunity',
          description: `Your current AOV is $${aov.toFixed(2)}. Consider bundling products or upsells to increase this.`,
          impactScore: 50,
          isRead: false,
          metadata: { aov },
        });
      }
    } else {
      // No data insight
      insights.push({
        id: `alert-nodata-${Date.now()}`,
        organizationId,
        type: 'ALERT',
        title: 'No Recent Data',
        description:
          'No data has been synced in the last 30 days. Make sure your integrations are connected and syncing properly.',
        impactScore: 80,
        isRead: false,
        metadata: {},
      });
    }

    // Save insights to database
    for (const insight of insights) {
      await prisma.insight.upsert({
        where: { id: insight.id },
        create: insight,
        update: insight,
      });
    }

    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ success: false, error: 'Failed to generate insights' });
  }
});

// Get trending insights
router.get('/trending', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const insights = await prisma.insight.findMany({
      where: {
        organizationId: organizationId as string,
        type: 'TREND',
        isRead: false,
      },
      orderBy: { impactScore: 'desc' },
      take: 5,
    });

    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('Error fetching trending insights:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trending insights' });
  }
});

// Mark insight as read
router.post('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const insight = await prisma.insight.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ success: true, data: insight });
  } catch (error) {
    console.error('Error marking insight as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark insight as read' });
  }
});

// Submit insight feedback
router.post('/feedback', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { insightId, helpful, comment } = req.body;

    // In a real app, this would store feedback for ML improvement
    console.log(`Insight feedback: ${insightId}, helpful: ${helpful}, comment: ${comment}`);

    res.json({ success: true, message: 'Feedback submitted' });
  } catch (error) {
    console.error('Error submitting insight feedback:', error);
    res.status(500).json({ success: false, error: 'Failed to submit feedback' });
  }
});

// Delete insight
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.insight.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting insight:', error);
    res.status(500).json({ success: false, error: 'Failed to delete insight' });
  }
});

export default router;
