import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const shop = searchParams.get('shop')
    // const hmac = searchParams.get('hmac') // TODO: Implement HMAC verification

    if (!code || !state || !shop) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/integrations?error=missing_params`
      )
    }

    const [organizationId, userId] = state.split(':')

    const membershipCheck = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
        role: {
          in: ['OWNER', 'ADMIN']
        }
      }
    })

    if (!membershipCheck) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/integrations?error=unauthorized`
      )
    }

    const accessTokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code,
      }),
    })

    if (!accessTokenResponse.ok) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/integrations?error=token_exchange_failed`
      )
    }

    const { access_token } = await accessTokenResponse.json()

    const encryptedToken = encryptToken(access_token)

    await prisma.integration.upsert({
      where: {
        organizationId_platform: {
          organizationId,
          platform: 'SHOPIFY'
        }
      },
      update: {
        accessToken: encryptedToken,
        status: 'CONNECTED',
        metadata: {
          shopDomain: shop.replace('.myshopify.com', '')
        }
      },
      create: {
        organizationId,
        platform: 'SHOPIFY',
        accessToken: encryptedToken,
        status: 'CONNECTED',
        metadata: {
          shopDomain: shop.replace('.myshopify.com', '')
        }
      }
    })

    scheduleInitialSync(organizationId, 'SHOPIFY')

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/integrations?success=shopify_connected`
    )
  } catch (error) {
    console.error('Error in Shopify callback:', error)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/integrations?error=callback_failed`
    )
  }
}

function encryptToken(token: string): string {
  const algorithm = 'aes-256-gcm'
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex')
  const iv = crypto.randomBytes(16)
  
  const cipher = crypto.createCipher(algorithm, key)
  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return `${iv.toString('hex')}:${encrypted}`
}

async function scheduleInitialSync(organizationId: string, platform: string) {
  console.log(`Scheduling initial sync for ${platform} integration in organization ${organizationId}`)
}