import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type')

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

    // Build query filters - exclude expired reports
    const whereClause: any = { 
      organizationId,
      expiresAt: {
        gt: new Date() // Only show non-expired reports
      }
    }
    if (type) {
      whereClause.type = type.toUpperCase()
    }

    // Fetch reports
    const [reports, totalCount] = await Promise.all([
      prisma.report.findMany({
        where: whereClause,
        orderBy: { generatedAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          type: true,
          format: true,
          periodStart: true,
          periodEnd: true,
          generatedAt: true,
          expiresAt: true,
          organization: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.report.count({ where: whereClause })
    ])

    return NextResponse.json({
      success: true,
      data: {
        reports,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      }
    })

  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}