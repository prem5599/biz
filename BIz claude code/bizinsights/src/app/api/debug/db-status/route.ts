import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect()

    // Try to count users
    const userCount = await prisma.user.count()

    // Try to count organizations
    const orgCount = await prisma.organization.count()

    return NextResponse.json({
      success: true,
      status: 'Database is connected and working',
      stats: {
        users: userCount,
        organizations: orgCount
      }
    })
  } catch (error) {
    console.error('[DB Status] Database error:', error)
    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
