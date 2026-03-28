import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET — Instagram webhook verification (Meta sends a GET to verify)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const config = await prisma.channelConfig.findUnique({ where: { channel: 'Instagram' } })
  const verifyToken = (config?.config as Record<string, string>)?.verifyToken

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// POST — Receive incoming Instagram messages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const config = await prisma.channelConfig.findUnique({ where: { channel: 'Instagram' } })
    if (!config?.enabled) {
      return NextResponse.json({ error: 'Instagram integration disabled' }, { status: 403 })
    }

    // Process Instagram Messaging API webhook payload
    const entries = body.entry || []
    for (const entry of entries) {
      const messaging = entry.messaging || []
      for (const event of messaging) {
        if (!event.message?.text) continue

        const senderId = event.sender?.id
        const text = event.message.text
        const now = new Date()
        const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

        // Find or create conversation
        let conversation = await prisma.conversation.findFirst({
          where: { externalId: senderId, channel: 'Instagram' },
        })

        if (conversation) {
          const existingMessages = (conversation.messages as any[]) || []
          existingMessages.push({ from: 'customer', text, time })

          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              messages: existingMessages,
              lastMessage: text,
              unread: conversation.unread + 1,
              date: now,
            },
          })
        } else {
          // Try to get username via Graph API
          const accessToken = (config.config as Record<string, string>)?.accessToken
          let customerName = `IG User ${senderId.slice(-4)}`
          if (accessToken) {
            try {
              const profileRes = await fetch(`https://graph.facebook.com/v21.0/${senderId}?fields=name,username&access_token=${accessToken}`)
              if (profileRes.ok) {
                const profile = await profileRes.json()
                customerName = profile.name || profile.username || customerName
              }
            } catch { /* use fallback name */ }
          }

          await prisma.conversation.create({
            data: {
              customerName,
              channel: 'Instagram',
              externalId: senderId,
              status: 'AI_HANDLED',
              lastMessage: text,
              unread: 1,
              date: now,
              messages: [{ from: 'customer', text, time }],
            },
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Instagram webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
