'use server'

import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import type { UserRole } from '@prisma/client'
import { requireRole } from '@/lib/auth-helpers'

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']),
  staffId: z.number().optional(),
})

const updatePasswordSchema = z.object({
  userId: z.number(),
  oldPassword: z.string(),
  newPassword: z.string().min(6),
})

export async function createUser(data: unknown) {
  try { await requireRole('ADMIN') } catch { return { success: false, error: 'Admin access required' } }
  const parsed = createUserSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) return { success: false, error: 'Email already in use' }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12)

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      hashedPassword,
      role: parsed.data.role as UserRole,
      staffId: parsed.data.staffId,
    },
  })

  return {
    success: true,
    data: { id: user.id, email: user.email, name: user.name, role: user.role },
  }
}

export async function updatePassword(data: unknown) {
  const parsed = updatePasswordSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } })
  if (!user) return { success: false, error: 'User not found' }

  const valid = await bcrypt.compare(parsed.data.oldPassword, user.hashedPassword)
  if (!valid) return { success: false, error: 'Incorrect current password' }

  const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12)
  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { hashedPassword },
  })

  return { success: true }
}

export async function listUsers() {
  try { await requireRole('ADMIN') } catch { return { success: false, error: 'Admin access required', data: [] } }
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      staffId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return { success: true, data: users }
}

export async function toggleUserActive(userId: number) {
  try { await requireRole('ADMIN') } catch { return { success: false, error: 'Admin access required' } }
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { success: false, error: 'User not found' }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
  })

  return { success: true, data: { id: updated.id, isActive: updated.isActive } }
}
