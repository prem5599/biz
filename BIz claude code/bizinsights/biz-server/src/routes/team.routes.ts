import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

const router = Router();

// All routes accept organizationId from query (GET) or body (POST/PUT/DELETE)

// ─── Pending invitations ──────────────────────────────────────────────────────

router.get('/invitations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.query;
    if (!organizationId) return res.status(400).json({ success: false, error: 'Organization ID required' });

    const membership = await prisma.organizationMember.findFirst({
      where: { organizationId: organizationId as string, userId: req.user!.id }
    });
    if (!membership) return res.status(403).json({ success: false, error: 'Access denied' });

    const invitations = await prisma.teamInvitation.findMany({
      where: { organizationId: organizationId as string, acceptedAt: null, expiresAt: { gt: new Date() } },
      include: { inviter: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: invitations });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invitations' });
  }
});

// Cancel invitation (must be before /:memberId to avoid route conflict)
router.delete('/invitations/:invitationId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { invitationId } = req.params;
    const { organizationId } = req.query;

    const invitation = await prisma.teamInvitation.findFirst({
      where: { id: invitationId, organizationId: organizationId as string }
    });
    if (!invitation) return res.status(404).json({ success: false, error: 'Invitation not found' });

    // Only org members can cancel
    const membership = await prisma.organizationMember.findFirst({
      where: { organizationId: invitation.organizationId, userId: req.user!.id }
    });
    if (!membership) return res.status(403).json({ success: false, error: 'Access denied' });

    await prisma.teamInvitation.delete({ where: { id: invitationId } });

    res.json({ success: true, message: 'Invitation cancelled' });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel invitation' });
  }
});

// ─── Invite member ────────────────────────────────────────────────────────────

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, email, role } = req.body;
    if (!organizationId || !email || !role) {
      return res.status(400).json({ success: false, error: 'Organization ID, email, and role are required' });
    }

    // Only admins/owners can invite
    const membership = await prisma.organizationMember.findFirst({
      where: { organizationId, userId: req.user!.id }
    });
    if (!membership) return res.status(403).json({ success: false, error: 'Access denied' });
    if (!['OWNER', 'ADMIN'].includes(membership.role)) {
      return res.status(403).json({ success: false, error: 'Only owners and admins can invite members' });
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await prisma.organizationMember.findFirst({
        where: { organizationId, userId: existingUser.id }
      });
      if (existingMember) {
        return res.status(400).json({ success: false, error: 'User is already a member of this organization' });
      }
    }

    // Create or update invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.teamInvitation.upsert({
      where: { organizationId_email: { organizationId, email } },
      create: { organizationId, email, role, token, expiresAt, invitedBy: req.user!.id },
      update: { role, token, expiresAt, acceptedAt: null },
    });

    res.json({
      success: true,
      data: { invitation, inviteLink: `${process.env.CLIENT_URL || 'http://localhost:5173'}/invite/${token}` }
    });
  } catch (error) {
    console.error('Error inviting member:', error);
    res.status(500).json({ success: false, error: 'Failed to send invitation' });
  }
});

// ─── Update member role ───────────────────────────────────────────────────────

router.put('/:memberId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { memberId } = req.params;
    const { organizationId, role } = req.body;

    if (!organizationId || !role) {
      return res.status(400).json({ success: false, error: 'Organization ID and role are required' });
    }

    // Only owners/admins can change roles
    const requesterMembership = await prisma.organizationMember.findFirst({
      where: { organizationId, userId: req.user!.id }
    });
    if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
      return res.status(403).json({ success: false, error: 'Only owners and admins can change member roles' });
    }

    // Prevent demoting the only owner
    const targetMember = await prisma.organizationMember.findUnique({ where: { id: memberId } });
    if (!targetMember) return res.status(404).json({ success: false, error: 'Member not found' });

    if (targetMember.role === 'OWNER' && role !== 'OWNER') {
      const ownerCount = await prisma.organizationMember.count({ where: { organizationId, role: 'OWNER' } });
      if (ownerCount <= 1) return res.status(400).json({ success: false, error: 'Cannot demote the only owner' });
    }

    const updated = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ success: false, error: 'Failed to update member role' });
  }
});

// ─── Remove member ────────────────────────────────────────────────────────────

router.delete('/:memberId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { memberId } = req.params;
    const { organizationId } = req.query;

    // Only owners/admins can remove members
    const requesterMembership = await prisma.organizationMember.findFirst({
      where: { organizationId: organizationId as string, userId: req.user!.id }
    });
    if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
      return res.status(403).json({ success: false, error: 'Only owners and admins can remove members' });
    }

    const targetMember = await prisma.organizationMember.findUnique({ where: { id: memberId } });
    if (!targetMember) return res.status(404).json({ success: false, error: 'Member not found' });

    // Prevent removing the only owner
    if (targetMember.role === 'OWNER') {
      const ownerCount = await prisma.organizationMember.count({ where: { organizationId: organizationId as string, role: 'OWNER' } });
      if (ownerCount <= 1) return res.status(400).json({ success: false, error: 'Cannot remove the only owner' });
    }

    await prisma.organizationMember.delete({ where: { id: memberId } });

    res.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ success: false, error: 'Failed to remove member' });
  }
});

export default router;
