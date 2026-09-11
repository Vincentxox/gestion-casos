import { z } from 'zod'

export const categorySchema = z.object({
  areaId: z.string().uuid('Selecciona un área.'),
  name: z.string().trim().min(2, 'Ingresa al menos 2 caracteres.').max(80),
  description: z
    .string()
    .trim()
    .max(300)
    .refine((value) => value.length === 0 || value.length >= 3, {
      message: 'Ingresa al menos 3 caracteres o deja el campo vacío.',
    }),
})
