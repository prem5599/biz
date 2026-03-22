import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get all alerts for organization
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, status } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const where: any = { organizationId: organizationId as string };
    if (status) {
      where.status = status as string;
    }

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({ success: true, alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
  }
});

// Get alert rules (must be BEFORE /:id to avoid Express matching 'rules' as an ID)
router.get('/rules', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const rules = await prisma.alertRule.findMany({
      where: { organizationId: organizationId as string },
    });

    res.json({ success: true, data: rules });
  } catch (error) {
    console.error('Error fetching alert rules:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alert rules' });
  }
});

// Create alert rule
router.post('/rules', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, name, type, thresholds, conditions, severity, isEnabled } = req.body;

    const rule = await prisma.alertRule.create({
      data: {
        organizationId,
        name,
        type,
        thresholds: thresholds ?? '{}',
        conditions: conditions ?? '{}',
        severity: severity ?? 'MEDIUM',
        isEnabled: isEnabled ?? true,
      },
    });

    res.json({ success: true, data: rule });
  } catch (error) {
    console.error('Error creating alert rule:', error);
    res.status(500).json({ success: false, error: 'Failed to create alert rule' });
  }
});

// Update alert rule
router.put('/rules/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, thresholds, conditions, severity, isEnabled } = req.body;

    const rule = await prisma.alertRule.update({
      where: { id },
      data: { name, type, thresholds, conditions, severity, isEnabled },
    });

    res.json({ success: true, data: rule });
  } catch (error) {
    console.error('Error updating alert rule:', error);
    res.status(500).json({ success: false, error: 'Failed to update alert rule' });
  }
});

// Delete alert rule
router.delete('/rules/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.alertRule.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting alert rule:', error);
    res.status(500).json({ success: false, error: 'Failed to delete alert rule' });
  }
});

// Get alert by ID (dynamic route — must be AFTER all static routes)
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const alert = await prisma.alert.findUnique({ where: { id } });

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    res.json({ success: true, data: alert });
  } catch (error) {
    console.error('Error fetching alert:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alert' });
  }
});

// Acknowledge alert
router.post('/:id/acknowledge', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const alert = await prisma.alert.update({
      where: { id },
      data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() },
    });

    res.json({ success: true, data: alert });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ success: false, error: 'Failed to acknowledge alert' });
  }
});

// Resolve alert
router.post('/:id/resolve', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const alert = await prisma.alert.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });

    res.json({ success: true, data: alert });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ success: false, error: 'Failed to resolve alert' });
  }
});

// Dismiss alert
router.post('/:id/dismiss', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const alert = await prisma.alert.update({
      where: { id },
      data: { status: 'DISMISSED', dismissedAt: new Date() },
    });

    res.json({ success: true, data: alert });
  } catch (error) {
    console.error('Error dismissing alert:', error);
    res.status(500).json({ success: false, error: 'Failed to dismiss alert' });
  }
});

export default router;
