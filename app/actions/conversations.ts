'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import type { ConversationStatus } from '@prisma/client'

export async function getConversations() {
  const conversations = await prisma.conversation.findMany({
    include: { contact: true },
    orderBy: { date: 'desc' },
  })

  return {
    success: true,
    data: conversations.map(c => ({
      id: c.id,
      customer: c.customerName,
      channel: c.channel,
      status: c.status === 'AI_HANDLED' ? 'AI Handled' : c.status === 'NEEDS_HUMAN' ? 'Needs Human' : 'Resolved',
      lastMessage: c.lastMessage,
      unread: c.unread,
      date: c.date.toISOString().split('T')[0],
      messages: c.messages,
    })),
  }
}

export async function getConversation(id: number) {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { contact: true },
  })
  if (!conversation) return { success: false, error: 'Conversation not found' }
  return { success: true, data: conversation }
}

export async function addMessage(id: number, message: { from: string; text: string; time: string }) {
  const conversation = await prisma.conversation.findUnique({ where: { id } })
  if (!conversation) return { success: false, error: 'Conversation not found' }

  const messages = (conversation.messages as any[]) || []
  messages.push(message)

  const updated = await prisma.conversation.update({
    where: { id },
    data: {
      messages,
      lastMessage: message.text,
      date: new Date(),
    },
  })

  revalidatePath('/conversations')
  return { success: true, data: updated }
}

export async function updateConversationStatus(id: number, status: string) {
  const statusMap: Record<string, ConversationStatus> = {
    'AI Handled': 'AI_HANDLED',
    'Needs Human': 'NEEDS_HUMAN',
    'Resolved': 'RESOLVED',
  }

  const dbStatus = statusMap[status]
  if (!dbStatus) return { success: false, error: 'Invalid status' }

  const conversation = await prisma.conversation.update({
    where: { id },
    data: { status: dbStatus },
  })

  revalidatePath('/conversations')
  return { success: true, data: conversation }
}
