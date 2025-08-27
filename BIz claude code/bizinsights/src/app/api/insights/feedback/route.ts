import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { insightId, rating, helpful, implemented, feedback, organizationId } = body

    // Validate required fields
    if (!insightId || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields: insightId, organizationId' },
        { status: 400 }
      )
    }

    // Verify user has access to organization
    const membershipCheck = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id
      }
    })

    if (!membershipCheck) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Create or update insight feedback
    const feedbackData = {
      insightId,
      userId: session.user.id,
      organizationId,
      rating: rating || null,
      helpful: helpful || false,
      implemented: implemented || false,
      feedback: feedback || null,
      timestamp: new Date()
    }

    // Since we don't have a feedback table in the schema, we'll store it in UserSettings
    // or create a simple JSON structure for now
    const userSettings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        settings: {
          insightFeedback: {
            [insightId]: feedbackData
          }
        }
      },
      update: {
        settings: {
          // We need to merge the existing settings
          ...((await prisma.userSettings.findUnique({
            where: { userId: session.user.id }
          }))?.settings as any || {}),
          insightFeedback: {
            ...((await prisma.userSettings.findUnique({
              where: { userId: session.user.id }
            }))?.settings as any)?.insightFeedback || {},
            [insightId]: feedbackData
          }
        }
      }
    })

    // Also mark the insight as read
    try {
      await prisma.insight.updateMany({
        where: {
          id: insightId,
          organizationId
        },
        data: {
          isRead: true,
          updatedAt: new Date()
        }
      })
    } catch (error) {
      // Insight might not exist in database, that's ok
      console.warn('Could not mark insight as read:', error)
    }

    return NextResponse.json({
      success: true,
      data: {
        feedback: feedbackData,
        message: 'Feedback recorded successfully'
      }
    })

  } catch (error) {
    console.error('Error recording insight feedback:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to record feedback',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const insightId = searchParams.get('insightId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing required parameter: organizationId' },
        { status: 400 }
      )
    }

    // Verify user has access to organization
    const membershipCheck = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id
      }
    })

    if (!membershipCheck) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get user settings to retrieve feedback
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id }
    })

    const insightFeedback = (userSettings?.settings as any)?.insightFeedback || {}

    if (insightId) {
      // Return feedback for specific insight
      const feedback = insightFeedback[insightId]
      return NextResponse.json({
        success: true,
        data: feedback || null
      })
    }

    // Return all feedback for organization
    const organizationFeedback = Object.entries(insightFeedback)
      .filter(([_, feedback]: [string, any]) => feedback.organizationId === organizationId)
      .reduce((acc, [id, feedback]) => {
        acc[id] = feedback
        return acc
      }, {} as any)

    return NextResponse.json({
      success: true,
      data: organizationFeedback
    })

  } catch (error) {
    console.error('Error fetching insight feedback:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch feedback',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}