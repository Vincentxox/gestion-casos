import { z } from 'zod'

export const createCaseSchema = z.object({
  title: z.string().trim().min(5, 'Escribe un título de al menos 5 caracteres').max(120),
  description: z.string().trim().min(10, 'Describe el caso con al menos 10 caracteres').max(2000),
  category: z.string().trim().min(2, 'Indica una categoría').max(80),
  location: z.string().trim().min(3, 'Indica una ubicación').max(180),
  priority: z.enum(['alta', 'media', 'baja']),
})

export type CreateCaseForm = z.infer<typeof createCaseSchema>
