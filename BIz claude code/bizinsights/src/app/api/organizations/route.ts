import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizations = await prisma.organization.findMany({
      where: {
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
        _count: {
          select: {
            integrations: true,
            insights: true
          }
        }
      }
    })

    return NextResponse.json({ success: true, data: organizations })
  } catch (error) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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

    const { name, slug } = await request.json()

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    const existingOrg = await prisma.organization.findUnique({
      where: { slug }
    })

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization with this slug already exists' },
        { status: 400 }
      )
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        members: {
          create: {
            userId: session.user.id,
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
    })

    return NextResponse.json({ success: true, data: organization })
  } catch (error) {
    console.error('Error creating organization:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
