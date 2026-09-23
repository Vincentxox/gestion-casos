import { z } from 'zod'

import { APP_ROLES } from '@/features/auth/types'

export const invitationSchema = z
  .object({
    email: z.email('Ingresa un correo válido.').trim().toLowerCase().max(254),
    role: z.enum(APP_ROLES),
    areaId: z.uuid().nullable(),
  })
  .refine((input) => !['jefe_area', 'tecnico'].includes(input.role) || input.areaId !== null, {
    path: ['areaId'],
    message: 'Este rol requiere un área asignada.',
  })
