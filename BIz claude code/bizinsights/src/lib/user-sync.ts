import { prisma } from '@/lib/prisma'

export async function syncUserToDatabase(userId: string, userEmail: string, userName: string, imageUrl: string | null) {
  try {
    // First, try to find existing user by email
    let user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (user) {
      // User exists, update it if needed
      if (user.id !== userId) {
        // Different ID, this is unusual but update the ID
        await prisma.user.update({
          where: { email: userEmail },
          data: {
            id: userId,
            name: userName,
            image: imageUrl
          }
        })
      } else {
        // Same ID, just update the other fields
        await prisma.user.update({
          where: { email: userEmail },
          data: {
            name: userName,
            image: imageUrl
          }
        })
      }
    } else {
      // User doesn't exist, create new
      await prisma.user.create({
        data: {
          id: userId,
          email: userEmail,
          name: userName,
          image: imageUrl
        }
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Error syncing user:', error)
    throw error
  }
}
