import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const organization = await prisma.organization.findFirst({
      where: {
        id,
        members: {
          some: {
            userId: session.user.id
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
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: organization })
  } catch (error) {
    console.error('Error fetching organization:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const { name, billingEmail } = await request.json()

    const membershipCheck = await prisma.organizationMember.findFirst({
      where: {
        organizationId: id,
        userId: session.user.id,
        role: {
          in: ['OWNER', 'ADMIN']
        }
      }
    })

    if (!membershipCheck) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(billingEmail && { billingEmail })
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
    })

    return NextResponse.json({ success: true, data: organization })
  } catch (error) {
    console.error('Error updating organization:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const membershipCheck = await prisma.organizationMember.findFirst({
      where: {
        organizationId: id,
        userId: session.user.id,
        role: 'OWNER'
      }
    })

    if (!membershipCheck) {
      return NextResponse.json(
        { error: 'Only organization owners can delete organizations' },
        { status: 403 }
      )
    }

    await prisma.organization.update({
      where: { id },
      data: {
        isDeleted: true
      }
    })

    return NextResponse.json({ success: true, message: 'Organization deleted' })
  } catch (error) {
    console.error('Error deleting organization:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
