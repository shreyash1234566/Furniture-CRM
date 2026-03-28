import { z } from 'zod'

export const createStaffSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  phone: z.string().min(10),
  email: z.string().email(),
  joinDate: z.string(),
})

export const clockInSchema = z.object({
  staffId: z.number(),
  time: z.string(),
})

export type CreateStaffInput = z.infer<typeof createStaffSchema>
