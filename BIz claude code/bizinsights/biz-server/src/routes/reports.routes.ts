import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get all reports for organization
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, limit } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const reports = await prisma.report.findMany({
      where: { organizationId: organizationId as string },
      orderBy: { generatedAt: 'desc' },
      take: limit ? parseInt(limit as string) : 20,
    });

    res.json({
      success: true,
      data: { reports },
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
});

// Get report by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { format } = req.query;

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    // If format is specified, return the file
    if (format) {
      // In production, this would fetch from file storage
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${report.title}.${format}"`);
      return res.send(report.content || 'Report content');
    }

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch report' });
  }
});

// Generate new report
router.post('/generate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, reportType, period, currency, format } = req.body;

    if (!organizationId || !reportType) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Calculate period dates
    const now = new Date();
    let periodStart: Date;
    let periodEnd = now;

    switch (period) {
      case 'weekly':
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get data for report
    const dataPoints = await prisma.dataPoint.findMany({
      where: {
        organizationId,
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    const totalRevenue = dataPoints.reduce((sum, dp) => sum + (dp.revenue || 0), 0);
    const totalOrders = dataPoints.reduce((sum, dp) => sum + (dp.orders || 0), 0);

    // Generate report content
    const reportContent = {
      title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
      period: { start: periodStart, end: periodEnd },
      summary: {
        totalRevenue,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      },
      data: dataPoints,
      generatedAt: now,
      currency,
    };

    // Create report record
    const report = await prisma.report.create({
      data: {
        organizationId,
        type: reportType.toUpperCase(),
        title: reportContent.title,
        format: format?.toUpperCase() || 'PDF',
        content: JSON.stringify(reportContent),
        periodStart,
        periodEnd,
        generatedAt: now,
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Return file-like response
    const fileContent = JSON.stringify(reportContent, null, 2);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${report.title}.${format || 'pdf'}"`);
    res.send(fileContent);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// Delete report
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.report.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ success: false, error: 'Failed to delete report' });
  }
});

// Cleanup expired reports
router.post('/cleanup', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await prisma.report.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    res.json({
      success: true,
      data: { deletedCount: result.count },
    });
  } catch (error) {
    console.error('Error cleaning up reports:', error);
    res.status(500).json({ success: false, error: 'Failed to cleanup reports' });
  }
});

// Get scheduled reports
router.get('/schedule', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const schedules = await prisma.reportSchedule.findMany({
      where: { organizationId: organizationId as string },
    });

    res.json({ success: true, data: schedules });
  } catch (error) {
    console.error('Error fetching scheduled reports:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch scheduled reports' });
  }
});

// Create report schedule
router.post('/schedule', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, reportType, frequency, format, recipients, title } = req.body;

    const schedule = await prisma.reportSchedule.create({
      data: {
        organizationId,
        reportType,
        frequency,
        format,
        recipients,
        title,
        isActive: true,
        nextRunDate: new Date(), // Calculate based on frequency
      },
    });

    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Error creating report schedule:', error);
    res.status(500).json({ success: false, error: 'Failed to create report schedule' });
  }
});

// Update report schedule
router.put('/schedule/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const schedule = await prisma.reportSchedule.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Error updating report schedule:', error);
    res.status(500).json({ success: false, error: 'Failed to update report schedule' });
  }
});

// Delete report schedule
router.delete('/schedule/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.reportSchedule.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting report schedule:', error);
    res.status(500).json({ success: false, error: 'Failed to delete report schedule' });
  }
});

export default router;
