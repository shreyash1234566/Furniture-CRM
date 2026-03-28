'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth-helpers'

// ─── MOVE CUSTOM ORDER TO DRAFT ────────────────────────

export async function moveCustomOrderToDraft(orderId: number) {
  const order = await prisma.customOrder.findUnique({
    where: { id: orderId },
    include: {
      contact: { select: { name: true } },
      assignedStaff: { select: { name: true } },
      referenceProduct: { select: { id: true, name: true, sku: true, price: true } },
      timeline: true,
    },
  })
  if (!order) return { success: false, error: 'Order not found' }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // +30 days

  // Snapshot the full order data
  const snapshot = {
    displayId: order.displayId,
    customer: order.contact.name,
    phone: order.phone,
    address: order.address,
    type: order.type,
    status: order.status,
    assignedStaff: order.assignedStaff?.name || null,
    date: order.date.toISOString(),
    estimatedDelivery: order.estimatedDelivery?.toISOString() || null,
    measurements: order.measurements,
    referenceImages: order.referenceImages,
    referenceProduct: order.referenceProduct,
    materials: order.materials,
    color: order.color,
    quotedPrice: order.quotedPrice,
    advancePaid: order.advancePaid,
    productionNotes: order.productionNotes,
    timeline: order.timeline.map(t => ({
      event: t.event,
      date: t.date.toISOString(),
      notes: t.notes,
      status: t.status,
      updatedBy: t.updatedBy,
    })),
  }

  await prisma.$transaction([
    prisma.draft.create({
      data: {
        sourceType: 'CustomOrder',
        sourceId: order.displayId,
        data: snapshot,
        deletedBy: 'Manager',
        deletedAt: now,
        expiresAt,
      },
    }),
    // Delete timeline entries first (cascade should handle but being explicit)
    prisma.customOrderTimeline.deleteMany({ where: { customOrderId: orderId } }),
    // Unlink field visits from this order (don't delete visits, just unlink)
    prisma.fieldVisit.updateMany({
      where: { customOrderId: orderId },
      data: { customOrderId: null },
    }),
    // Delete the custom order
    prisma.customOrder.delete({ where: { id: orderId } }),
  ])

  revalidatePath('/custom-orders')
  revalidatePath('/staff-portal')
  revalidatePath('/drafts')
  return { success: true }
}

// ─── MOVE SELF VISIT TO DRAFT ─────────────────────────

export async function moveSelfVisitToDraft(visitId: number) {
  const visit = await prisma.fieldVisit.findUnique({
    where: { id: visitId },
    include: { staff: { select: { name: true } } },
  })
  if (!visit) return { success: false, error: 'Visit not found' }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const snapshot = {
    displayId: visit.displayId,
    staffName: visit.staff.name,
    staffId: visit.staffId,
    customer: visit.customer,
    address: visit.address,
    date: visit.date.toISOString(),
    time: visit.time,
    status: visit.status,
    type: visit.type,
    notes: visit.notes,
    staffNotes: visit.staffNotes,
    measurements: visit.measurements,
    photos: visit.photos,
    photoUrls: visit.photoUrls,
  }

  await prisma.$transaction([
    prisma.draft.create({
      data: {
        sourceType: 'FieldVisit',
        sourceId: visit.displayId,
        data: snapshot,
        deletedBy: visit.staff.name,
        deletedAt: now,
        expiresAt,
      },
    }),
    prisma.fieldVisit.delete({ where: { id: visitId } }),
  ])

  revalidatePath('/staff-portal')
  revalidatePath('/staff')
  revalidatePath('/drafts')
  return { success: true }
}

// ─── GET ALL DRAFTS ────────────────────────────────────

export async function getDrafts() {
  // Auto-purge expired drafts first
  await prisma.draft.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })

  const drafts = await prisma.draft.findMany({
    orderBy: { deletedAt: 'desc' },
  })

  return {
    success: true,
    data: drafts.map(d => ({
      id: d.id,
      sourceType: d.sourceType,
      sourceId: d.sourceId,
      data: d.data as Record<string, unknown>,
      deletedBy: d.deletedBy,
      deletedAt: d.deletedAt.toISOString(),
      expiresAt: d.expiresAt.toISOString(),
      daysLeft: Math.max(0, Math.ceil((d.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
    })),
  }
}

// ─── RESTORE CUSTOM ORDER FROM DRAFT ───────────────────

export async function restoreFromDraft(draftId: number) {
  try { await requireRole('ADMIN', 'MANAGER') } catch { return { success: false, error: 'Manager access required' } }
  const draft = await prisma.draft.findUnique({ where: { id: draftId } })
  if (!draft) return { success: false, error: 'Draft not found' }

  if (draft.sourceType === 'CustomOrder') {
    const data = draft.data as Record<string, unknown>

    // Find or create the contact
    let contact = await prisma.contact.findFirst({
      where: { phone: data.phone as string },
    })
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          name: data.customer as string,
          phone: data.phone as string,
          address: data.address as string || '',
          source: 'Custom Order',
        },
      })
    }

    // Generate new displayId
    const lastOrder = await prisma.customOrder.findFirst({ orderBy: { id: 'desc' } })
    const nextNum = lastOrder ? lastOrder.id + 1 : 1
    const displayId = `CUS-${String(nextNum).padStart(3, '0')}`

    await prisma.$transaction([
      prisma.customOrder.create({
        data: {
          displayId,
          contactId: contact.id,
          phone: data.phone as string,
          address: data.address as string,
          type: data.type as string,
          status: 'MEASUREMENT_SCHEDULED',
          date: new Date(),
          measurements: data.measurements as object || undefined,
          referenceImages: (data.referenceImages as string[]) || [],
          materials: data.materials as string || undefined,
          color: data.color as string || undefined,
          quotedPrice: data.quotedPrice as number || undefined,
          advancePaid: (data.advancePaid as number) || 0,
          productionNotes: data.productionNotes as string || undefined,
        },
      }),
      prisma.draft.delete({ where: { id: draftId } }),
    ])

    revalidatePath('/custom-orders')
    revalidatePath('/drafts')
    return { success: true, data: { displayId } }
  }

  if (draft.sourceType === 'FieldVisit') {
    const data = draft.data as Record<string, unknown>

    // Generate new displayId
    const count = await prisma.fieldVisit.count({ where: { staffId: data.staffId as number, customOrderId: null } })
    const displayId = `SV-${data.staffId}-${count + 1}`

    await prisma.$transaction([
      prisma.fieldVisit.create({
        data: {
          displayId,
          staffId: data.staffId as number,
          customer: data.customer as string,
          address: data.address as string,
          date: new Date(data.date as string),
          time: data.time as string,
          status: data.status as string || 'Completed',
          type: data.type as string,
          notes: data.notes as string || null,
          staffNotes: data.staffNotes as string || null,
          measurements: data.measurements as object || undefined,
          photos: data.photos as number || 0,
          photoUrls: (data.photoUrls as string[]) || [],
        },
      }),
      prisma.draft.delete({ where: { id: draftId } }),
    ])

    revalidatePath('/staff-portal')
    revalidatePath('/staff')
    revalidatePath('/drafts')
    return { success: true, data: { displayId } }
  }

  return { success: false, error: 'Unsupported draft type' }
}

// ─── PERMANENTLY DELETE A DRAFT ────────────────────────

export async function permanentlyDeleteDraft(draftId: number) {
  try { await requireRole('ADMIN', 'MANAGER') } catch { return { success: false, error: 'Manager access required' } }
  await prisma.draft.delete({ where: { id: draftId } })
  revalidatePath('/drafts')
  return { success: true }
}
