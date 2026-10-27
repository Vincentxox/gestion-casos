import { z } from 'zod'

export const organizationCreationSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  contactPhone: z.string().trim().max(30),
  teamSize: z.enum(['1-5', '6-25', '26-75', '76+']),
  message: z.string().trim().max(500),
})

export const organizationRejectionSchema = z.object({
  reason: z.string().trim().min(3).max(300),
})
