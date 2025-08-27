import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

// Team member schema for updates
const teamMemberUpdateSchema = z.object({
  memberId: z.string(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])
})

// Team invitation schema
const teamInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER'])
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Check user access to organization
    const membershipCheck = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id
      }
    })

    if (!membershipCheck) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get team members
    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    // Get pending invitations
    const pendingInvitations = await prisma.teamInvitation.findMany({
      where: {
        organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: {
        inviter: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Format team members
    const formattedMembers = members.map(member => ({
      id: member.id,
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
      role: member.role,
      joinedAt: member.createdAt.toISOString().split('T')[0],
      lastActive: 'Today' // TODO: Implement last activity tracking
    }))

    // Format pending invitations
    const formattedInvitations = pendingInvitations.map(invitation => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      invitedAt: invitation.createdAt.toISOString().split('T')[0],
      expiresAt: invitation.expiresAt.toISOString().split('T')[0],
      invitedBy: invitation.inviter.name
    }))

    return NextResponse.json({
      success: true,
      data: {
        members: formattedMembers,
        pendingInvitations: formattedInvitations,
        stats: {
          totalMembers: members.length,
          activeMembers: members.length, // All are active for now
          pendingInvites: pendingInvitations.length,
          adminUsers: members.filter(m => ['OWNER', 'ADMIN'].includes(m.role)).length
        }
      }
    })

  } catch (error) {
    console.error('Error fetching team data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { organizationId, action, ...data } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Check user access to organization (must be admin or owner)
    const membershipCheck = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN'] }
      }
    })

    if (!membershipCheck) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    switch (action) {
      case 'invite': {
        const validatedData = teamInvitationSchema.parse(data)
        
        // Check if user is already a member
        const existingMember = await prisma.organizationMember.findFirst({
          where: {
            organizationId,
            user: { email: validatedData.email }
          }
        })

        if (existingMember) {
          return NextResponse.json(
            { error: 'User is already a member of this organization' },
            { status: 400 }
          )
        }

        // Check if there's already a pending invitation
        const existingInvitation = await prisma.teamInvitation.findFirst({
          where: {
            organizationId,
            email: validatedData.email,
            acceptedAt: null,
            expiresAt: { gt: new Date() }
          }
        })

        if (existingInvitation) {
          return NextResponse.json(
            { error: 'Invitation already sent to this email' },
            { status: 400 }
          )
        }

        // Create invitation token
        const token = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

        const invitation = await prisma.teamInvitation.create({
          data: {
            organizationId,
            email: validatedData.email,
            role: validatedData.role,
            token,
            expiresAt,
            invitedBy: session.user.id
          }
        })

        // Log the invitation
        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            organizationId,
            action: 'CREATE',
            entityType: 'TEAM_INVITATION',
            entityId: invitation.id,
            newValues: {
              email: validatedData.email,
              role: validatedData.role
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown'
          }
        })

        // TODO: Send invitation email
        
        return NextResponse.json({
          success: true,
          data: {
            invitationId: invitation.id,
            token: invitation.token
          },
          message: 'Invitation sent successfully'
        })
      }

      case 'updateRole': {
        const validatedData = teamMemberUpdateSchema.parse(data)
        
        // Can't change owner role
        const targetMember = await prisma.organizationMember.findUnique({
          where: { id: validatedData.memberId },
          include: { user: true }
        })

        if (!targetMember) {
          return NextResponse.json({ error: 'Member not found' }, { status: 404 })
        }

        if (targetMember.role === 'OWNER' && validatedData.role !== 'OWNER') {
          return NextResponse.json(
            { error: 'Cannot change owner role' },
            { status: 400 }
          )
        }

        // Only owners can create other owners
        if (validatedData.role === 'OWNER' && membershipCheck.role !== 'OWNER') {
          return NextResponse.json(
            { error: 'Only owners can promote to owner' },
            { status: 403 }
          )
        }

        const oldRole = targetMember.role
        
        await prisma.organizationMember.update({
          where: { id: validatedData.memberId },
          data: { role: validatedData.role }
        })

        // Log the role change
        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            organizationId,
            action: 'UPDATE',
            entityType: 'ORGANIZATION_MEMBER',
            entityId: validatedData.memberId,
            oldValues: { role: oldRole },
            newValues: { role: validatedData.role },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown'
          }
        })

        return NextResponse.json({
          success: true,
          message: 'Member role updated successfully'
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error managing team:', error)
    return NextResponse.json(
      { error: 'Failed to manage team' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const memberId = searchParams.get('memberId')
    const invitationId = searchParams.get('invitationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Check user access to organization (must be admin or owner)
    const membershipCheck = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN'] }
      }
    })

    if (!membershipCheck) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (memberId) {
      // Remove team member
      const targetMember = await prisma.organizationMember.findUnique({
        where: { id: memberId },
        include: { user: true }
      })

      if (!targetMember) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 })
      }

      // Can't remove owner
      if (targetMember.role === 'OWNER') {
        return NextResponse.json(
          { error: 'Cannot remove organization owner' },
          { status: 400 }
        )
      }

      // Can't remove yourself
      if (targetMember.userId === session.user.id) {
        return NextResponse.json(
          { error: 'Cannot remove yourself' },
          { status: 400 }
        )
      }

      await prisma.organizationMember.delete({
        where: { id: memberId }
      })

      // Log the removal
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          organizationId,
          action: 'DELETE',
          entityType: 'ORGANIZATION_MEMBER',
          entityId: memberId,
          oldValues: {
            email: targetMember.user.email,
            role: targetMember.role
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Member removed successfully'
      })
    }

    if (invitationId) {
      // Cancel invitation
      await prisma.teamInvitation.delete({
        where: { id: invitationId }
      })

      // Log the cancellation
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          organizationId,
          action: 'DELETE',
          entityType: 'TEAM_INVITATION',
          entityId: invitationId,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Invitation cancelled successfully'
      })
    }

    return NextResponse.json({ error: 'Member ID or Invitation ID required' }, { status: 400 })

  } catch (error) {
    console.error('Error removing team member/invitation:', error)
    return NextResponse.json(
      { error: 'Failed to remove member/invitation' },
      { status: 500 }
    )
  }
}