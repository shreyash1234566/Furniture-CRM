import { auth } from './auth'
import type { UserRole } from '@prisma/client'

export async function getSession() {
  const session = await auth()
  return session
}

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function requireRole(...roles: UserRole[]) {
  const session = await requireAuth()
  if (!roles.includes(session.user.role)) {
    throw new Error('Forbidden')
  }
  return session
}
