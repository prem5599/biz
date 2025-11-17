import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user exists in database
    const user = await currentUser()
    if (user) {
      const userEmail = user.emailAddresses[0]?.emailAddress
      if (userEmail) {
        try {
          await prisma.user.upsert({
            where: { id: userId },
            update: {
              email: userEmail,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User',
              image: user.imageUrl
            },
            create: {
              id: userId,
              email: userEmail,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User',
              image: user.imageUrl
            }
          })
        } catch (error) {
          console.error('[Organizations API GET] Error syncing user:', error)
          // Continue anyway - user might already exist
        }
      }
    }

    const organizations = await prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId: userId
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
    const { userId } = await auth()

    if (!userId) {
      console.error('[Organizations API] No userId from auth')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Organizations API] Creating organization for user:', userId)

    // Ensure user exists in database
    const user = await currentUser()
    if (user) {
      const userEmail = user.emailAddresses[0]?.emailAddress
      if (!userEmail) {
        console.error('[Organizations API] No email address found for user')
        return NextResponse.json(
          { error: 'User must have an email address' },
          { status: 400 }
        )
      }

      try {
        await prisma.user.upsert({
          where: { id: userId },
          update: {
            email: userEmail,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User',
            image: user.imageUrl
          },
          create: {
            id: userId,
            email: userEmail,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User',
            image: user.imageUrl
          }
        })
        console.log('[Organizations API] User synced to database:', userId)
      } catch (userError) {
        console.error('[Organizations API] Error syncing user:', userError)
        return NextResponse.json(
          { error: 'Failed to sync user to database', details: userError instanceof Error ? userError.message : String(userError) },
          { status: 500 }
        )
      }
    }

    const { name, slug } = await request.json()

    if (!name || !slug) {
      console.error('[Organizations API] Missing name or slug')
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    console.log('[Organizations API] Checking for existing org with slug:', slug)

    const existingOrg = await prisma.organization.findUnique({
      where: { slug }
    })

    if (existingOrg) {
      console.error('[Organizations API] Slug already exists:', slug)
      return NextResponse.json(
        { error: 'Organization with this slug already exists' },
        { status: 400 }
      )
    }

    console.log('[Organizations API] Creating organization:', { name, slug, userId })

    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        members: {
          create: {
            userId: userId,
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

    console.log('[Organizations API] Organization created successfully:', organization.id)
    return NextResponse.json({ success: true, data: organization })
  } catch (error) {
    console.error('[Organizations API] Error creating organization:', error)
    console.error('[Organizations API] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      cause: error instanceof Error ? error.cause : undefined
    })
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}