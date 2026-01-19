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

        if (!(session?.user as any)?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = params

        // Verify membership
        const membershipCheck = await prisma.organizationMember.findFirst({
            where: {
                organizationId: id,
                userId: (session.user as any).id
            }
        })

        if (!membershipCheck) {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403 }
            )
        }

        // Get the latest GA snapshot
        const snapshot = await prisma.dataPoint.findFirst({
            where: {
                organizationId: id,
                metricType: 'ga_snapshot'
            },
            orderBy: {
                dateRecorded: 'desc'
            }
        })

        if (!snapshot || !snapshot.metadata) {
            // Try to find individual data points if snapshot doesn't exist
            // But for the new page we rely on snapshot.
            return NextResponse.json({
                success: true,
                data: null,
                message: 'No Google Analytics data found. Please run a sync.'
            })
        }

        const data = JSON.parse(snapshot.metadata)

        return NextResponse.json({
            success: true,
            data: {
                ...data,
                lastSyncedAt: snapshot.dateRecorded
            }
        })

    } catch (error) {
        console.error('Error fetching GA analytics:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
