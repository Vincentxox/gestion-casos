import { z } from 'zod'

export const createCaseSchema = z.object({
  title: z.string().trim().min(5, 'Escribe un título de al menos 5 caracteres').max(120),
  description: z.string().trim().min(10, 'Describe el caso con al menos 10 caracteres').max(2000),
  category: z.string().trim().min(2, 'Indica una categoría').max(80),
  location: z.string().trim().min(3, 'Indica una ubicación').max(180),
  priority: z.enum(['alta', 'media', 'baja']),
})

export const updateCaseSchema = createCaseSchema

export const changeCaseStatusSchema = z.object({
  status: z.enum(['abierto', 'en_progreso', 'cerrado']),
  comment: z
    .string()
    .trim()
    .min(3, 'Explica el cambio con al menos 3 caracteres')
    .max(500, 'El comentario no puede exceder 500 caracteres'),
})

export type CreateCaseForm = z.infer<typeof createCaseSchema>
export type ChangeCaseStatusForm = z.infer<typeof changeCaseStatusSchema>
