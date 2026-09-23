import { z } from 'zod'

export const areaSchema = z.object({
  kind: z.enum(['solicitante', 'tecnica']),
  name: z
    .string()
    .trim()
    .min(2, 'Ingresa al menos 2 caracteres.')
    .max(80, 'El nombre no puede superar 80 caracteres.'),
  description: z
    .string()
    .trim()
    .max(300, 'La descripción no puede superar 300 caracteres.')
    .refine((value) => value.length === 0 || value.length >= 3, {
      message: 'Ingresa al menos 3 caracteres o deja el campo vacío.',
    }),
})
