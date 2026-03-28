'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { createCallLogSchema } from '@/lib/validations/call'
import type { CallDirection, CallStatus } from '@prisma/client'

export async function getCallLogs() {
  const calls = await prisma.callLog.findMany({
    include: { contact: true, transcript: true },
    orderBy: { date: 'desc' },
  })

  return {
    success: true,
    data: calls.map(c => ({
      id: c.id,
      customer: c.customerName,
      phone: c.phone,
      direction: c.direction === 'INBOUND' ? 'Inbound' : 'Outbound',
      status: c.status.charAt(0) + c.status.slice(1).toLowerCase().replace('_', ' '),
      duration: c.duration,
      durationSec: c.durationSec,
      agent: c.agent,
      date: c.date.toISOString().split('T')[0],
      time: c.time,
      purpose: c.purpose,
      outcome: c.outcome,
      notes: c.notes,
      recording: c.recording,
      transcript: c.transcript ? {
        summary: c.transcript.summary,
        sentiment: c.transcript.sentiment,
        messages: c.transcript.messages,
      } : null,
    })),
  }
}

export async function createCallLog(data: unknown) {
  const parsed = createCallLogSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { customerName, phone, direction, status, duration, durationSec, agent, purpose, outcome, notes, recording } = parsed.data

  // Try to link to existing contact
  const contact = await prisma.contact.findFirst({ where: { phone } })

  const now = new Date()
  const callLog = await prisma.callLog.create({
    data: {
      contactId: contact?.id,
      customerName,
      phone,
      direction: direction as CallDirection,
      status: status as CallStatus,
      duration,
      durationSec,
      agent,
      date: now,
      time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      purpose,
      outcome,
      notes,
      recording,
    },
  })

  revalidatePath('/calls')
  return { success: true, data: callLog }
}

export async function getCallStats() {
  const [total, completed, missed, totalDuration] = await Promise.all([
    prisma.callLog.count(),
    prisma.callLog.count({ where: { status: 'COMPLETED' } }),
    prisma.callLog.count({ where: { status: 'MISSED' } }),
    prisma.callLog.aggregate({ _sum: { durationSec: true } }),
  ])

  return {
    success: true,
    data: {
      total,
      completed,
      missed,
      avgDuration: total > 0 ? Math.round((totalDuration._sum.durationSec || 0) / total) : 0,
    },
  }
}
