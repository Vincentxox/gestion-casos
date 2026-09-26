import { z } from 'zod'

export const createCaseSchema = z.object({
  title: z.string().trim().min(5, 'Escribe un título de al menos 5 caracteres').max(120),
  description: z.string().trim().min(10, 'Describe el caso con al menos 10 caracteres').max(2000),
  categoryId: z.uuid('Selecciona un tipo de servicio.'),
  location: z.string().trim().min(3, 'Indica una ubicación').max(180),
  priority: z.enum(['alta', 'media', 'baja']),
})

export const updateCaseSchema = createCaseSchema

export const changeCaseStatusSchema = z
  .object({
    action: z.enum(['aceptar', 'rechazar', 'cancelar', 'iniciar', 'pausar', 'reanudar']),
    comment: z.string().trim().max(500, 'El comentario no puede exceder 500 caracteres'),
  })
  .refine((input) => input.comment.length === 0 || input.comment.length >= 3, {
    path: ['comment'],
    message: 'El comentario debe tener entre 3 y 500 caracteres.',
  })
  .refine((input) => !['rechazar', 'pausar'].includes(input.action) || input.comment.length > 0, {
    path: ['comment'],
    message: 'Explica el motivo con al menos 3 caracteres.',
  })

export type CreateCaseForm = z.infer<typeof createCaseSchema>
export type ChangeCaseStatusForm = z.infer<typeof changeCaseStatusSchema>
