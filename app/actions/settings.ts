'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireRole } from '@/lib/auth-helpers'

const updateSettingsSchema = z.object({
  storeName: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  gstRate: z.number().min(0).max(100).optional(),
  currency: z.string().optional(),
  logo: z.string().optional(),
  storeLat: z.number().optional(),
  storeLng: z.number().optional(),
  geofenceRadius: z.number().min(10).max(5000).optional(),
  shiftStartTime: z.string().optional(),
  shiftEndTime: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().min(1).max(65535).optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpFromName: z.string().optional(),
  smtpSecure: z.boolean().optional(),
  smtpConfigured: z.boolean().optional(),
})

export async function getStoreSettings() {
  let settings = await prisma.storeSettings.findFirst({ where: { id: 1 } })
  if (!settings) {
    settings = await prisma.storeSettings.create({
      data: { id: 1 },
    })
  }

  return {
    success: true,
    data: {
      storeName: settings.storeName,
      phone: settings.phone,
      email: settings.email,
      address: settings.address,
      gstNumber: settings.gstNumber,
      gstRate: settings.gstRate,
      currency: settings.currency,
      logo: settings.logo,
      storeLat: settings.storeLat,
      storeLng: settings.storeLng,
      geofenceRadius: settings.geofenceRadius,
      shiftStartTime: settings.shiftStartTime,
      shiftEndTime: settings.shiftEndTime,
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      smtpPass: settings.smtpPass,
      smtpFromName: settings.smtpFromName,
      smtpSecure: settings.smtpSecure,
      smtpConfigured: settings.smtpConfigured,
    },
  }
}

export async function updateStoreSettings(data: unknown) {
  try { await requireRole('ADMIN') } catch { return { success: false, error: 'Admin access required' } }
  const parsed = updateSettingsSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const settings = await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, ...parsed.data },
  })

  revalidatePath('/settings')
  return { success: true, data: settings }
}

export async function getMarketplaceChannels() {
  const channels = await prisma.marketplaceChannel.findMany({
    orderBy: { name: 'asc' },
  })

  return {
    success: true,
    data: channels.map(ch => ({
      id: ch.id,
      slug: ch.slug,
      name: ch.name,
      logo: ch.logo,
      color: ch.color,
      connected: ch.connected,
      lastSync: ch.lastSync?.toISOString() || null,
      sellerId: ch.sellerId,
    })),
  }
}

export async function updateMarketplaceChannel(id: number, data: { connected?: boolean; sellerId?: string }) {
  const channel = await prisma.marketplaceChannel.update({
    where: { id },
    data,
  })

  revalidatePath('/settings')
  return { success: true, data: channel }
}

export async function getStoreCampaigns() {
  const campaigns = await prisma.storeCampaign.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return {
    success: true,
    data: campaigns.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      location: c.location,
      scans: c.scans,
      leads: c.leads,
      status: c.status,
      purpose: c.purpose,
    })),
  }
}
