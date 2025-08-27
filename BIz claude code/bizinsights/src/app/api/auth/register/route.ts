import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Try to connect to database
    try {
      const { prisma } = await import('@/lib/prisma')
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        )
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12)

      // Create user
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        }
      })

      // Create a default organization for the user
      const organizationSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')
      
      const organization = await prisma.organization.create({
        data: {
          name: `${name}'s Organization`,
          slug: `${organizationSlug}-${Date.now()}`, // Add timestamp to ensure uniqueness
          members: {
            create: {
              userId: user.id,
              role: 'OWNER'
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        data: {
          user,
          organization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug
          }
        }
      })

    } catch (dbError: unknown) {
      console.error('Database error:', dbError)
      
      // If database connection fails, return a helpful message
      if (dbError?.code === 'P1001' || dbError?.message?.includes('Can\'t reach database')) {
        return NextResponse.json(
          { 
            error: 'Database connection failed. Please check your database configuration.',
            details: 'The database might not be running or the connection string is incorrect.'
          },
          { status: 503 }
        )
      }

      // If table doesn't exist
      if (dbError?.code === 'P2021' || dbError?.message?.includes('table') || dbError?.message?.includes('relation')) {
        return NextResponse.json(
          { 
            error: 'Database tables not found. Please run database migrations.',
            details: 'Run: npx prisma db push'
          },
          { status: 503 }
        )
      }

      throw dbError
    }

  } catch (error: unknown) {
    console.error('Registration error:', error)
    
    return NextResponse.json(
      { 
        error: 'Registration failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}