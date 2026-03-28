import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET — WhatsApp webhook verification (Meta sends a GET to verify)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const config = await prisma.channelConfig.findUnique({ where: { channel: 'WhatsApp' } })
  const verifyToken = (config?.config as Record<string, string>)?.verifyToken

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// POST — Receive incoming WhatsApp messages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const config = await prisma.channelConfig.findUnique({ where: { channel: 'WhatsApp' } })
    if (!config?.enabled) {
      return NextResponse.json({ error: 'WhatsApp integration disabled' }, { status: 403 })
    }

    // Process WhatsApp Cloud API webhook payload
    const entries = body.entry || []
    for (const entry of entries) {
      const changes = entry.changes || []
      for (const change of changes) {
        if (change.field !== 'messages') continue
        const value = change.value
        const messages = value.messages || []
        const contacts = value.contacts || []

        for (const msg of messages) {
          if (msg.type !== 'text') continue

          const contact = contacts.find((c: any) => c.wa_id === msg.from)
          const customerName = contact?.profile?.name || msg.from
          const customerPhone = msg.from

          const now = new Date()
          const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

          // Find or create conversation
          let conversation = await prisma.conversation.findFirst({
            where: { externalId: customerPhone, channel: 'WhatsApp' },
          })

          if (conversation) {
            const existingMessages = (conversation.messages as any[]) || []
            existingMessages.push({ from: 'customer', text: msg.text.body, time })

            await prisma.conversation.update({
              where: { id: conversation.id },
              data: {
                messages: existingMessages,
                lastMessage: msg.text.body,
                unread: conversation.unread + 1,
                date: now,
              },
            })
          } else {
            // Find or create contact in CRM
            let crmContact = await prisma.contact.findFirst({ where: { phone: customerPhone } })
            if (!crmContact) {
              crmContact = await prisma.contact.create({
                data: { name: customerName, phone: customerPhone, source: 'WhatsApp', address: '' },
              })
            }

            await prisma.conversation.create({
              data: {
                customerName,
                channel: 'WhatsApp',
                externalId: customerPhone,
                contactId: crmContact.id,
                status: 'AI_HANDLED',
                lastMessage: msg.text.body,
                unread: 1,
                date: now,
                messages: [{ from: 'customer', text: msg.text.body, time }],
              },
            })
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('WhatsApp webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
