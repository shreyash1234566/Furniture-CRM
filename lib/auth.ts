import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './db'
import bcrypt from 'bcryptjs'
import type { UserRole } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      staffId: number | null
    }
  }

  interface User {
    role: UserRole
    staffId: number | null
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    // Admin/Manager email+password login
    Credentials({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = String(credentials.email).trim().toLowerCase()
        const password = String(credentials.password)

        const bootstrapAdminEmail = 'admin@furniturecrm.com'
        const bootstrapAdminPassword = 'admin123'

        if (email === bootstrapAdminEmail && password === bootstrapAdminPassword) {
          const hashedPassword = await bcrypt.hash(password, 12)
          const admin = await prisma.user.upsert({
            where: { email: bootstrapAdminEmail },
            update: {
              isActive: true,
              role: 'ADMIN',
              hashedPassword,
            },
            create: {
              email: bootstrapAdminEmail,
              name: 'Admin',
              hashedPassword,
              role: 'ADMIN',
              isActive: true,
            },
          })

          return {
            id: String(admin.id),
            email: admin.email,
            name: admin.name,
            role: admin.role,
            staffId: admin.staffId,
          }
        }

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.isActive) {
          return null
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        )

        if (!isValid) {
          return null
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
          staffId: user.staffId,
        }
      },
    }),

    // Staff PIN login
    Credentials({
      id: 'staff-pin',
      name: 'staff-pin',
      credentials: {
        staffId: { label: 'Staff ID', type: 'text' },
        pin: { label: 'PIN', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.staffId || !credentials?.pin) {
          return null
        }

        const staffId = parseInt(credentials.staffId as string)
        if (isNaN(staffId)) return null

        const staff = await prisma.staff.findUnique({
          where: { id: staffId },
          include: { user: true },
        })

        if (!staff || staff.status !== 'Active') {
          return null
        }

        // Verify PIN = last 4 digits of phone number
        const expectedPin = (staff.phone || '').replace(/\s/g, '').slice(-4)
        if (credentials.pin !== expectedPin) {
          return null
        }

        // If staff has a linked User account, use it
        if (staff.user) {
          return {
            id: String(staff.user.id),
            email: staff.user.email,
            name: staff.user.name,
            role: staff.user.role,
            staffId: staff.id,
          }
        }

        // No linked User — return a virtual session with STAFF role
        return {
          id: `staff-${staff.id}`,
          email: staff.email || `staff-${staff.id}@local`,
          name: staff.name,
          role: 'STAFF' as UserRole,
          staffId: staff.id,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.staffId = user.staffId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string
        session.user.role = token.role as UserRole
        session.user.staffId = token.staffId as number | null
      }
      return session
    },
  },
})
