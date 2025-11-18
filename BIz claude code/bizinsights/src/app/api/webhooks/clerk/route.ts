import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing webhook headers', { status: 400 })
  }

  const body = await req.text()
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '')

  let evt: WebhookEvent
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error: Webhook verification failed', { status: 400 })
  }

  const eventType = evt.type

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    const primaryEmail = email_addresses?.[0]?.email_address
    if (!primaryEmail) {
      return new Response('Error: No email found', { status: 400 })
    }

    try {
      // Use upsert with proper handling of unique constraint
      const user = await prisma.user.upsert({
        where: { email: primaryEmail },
        update: {
          name: `${first_name || ''} ${last_name || ''}`.trim(),
          image: image_url || null,
          updatedAt: new Date(),
        },
        create: {
          id: id,
          email: primaryEmail,
          name: `${first_name || ''} ${last_name || ''}`.trim(),
          image: image_url || null,
        },
      })

      console.log(`User ${eventType} synced:`, user.id)
      return new Response('Webhook processed', { status: 200 })
    } catch (error) {
      console.error('Error syncing user to database:', error)
      return new Response('Error: Database sync failed', { status: 400 })
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    try {
      // Find user by Clerk ID and delete
      const user = await prisma.user.findFirst({
        where: { id },
      })

      if (user) {
        await prisma.user.delete({
          where: { id: user.id },
        })
        console.log('User deleted:', id)
      }

      return new Response('Webhook processed', { status: 200 })
    } catch (error) {
      console.error('Error deleting user:', error)
      return new Response('Error: User deletion failed', { status: 400 })
    }
  }

  return new Response('Webhook received', { status: 200 })
}
