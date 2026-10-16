import { z } from 'zod'

export const priorityTargetSchema = z
  .object({
    acceptHours: z
      .number({ error: 'Ingresa las horas para aceptar.' })
      .int('Usa horas enteras.')
      .min(1, 'Aceptación: usa de 1 a 720 horas.')
      .max(720, 'Aceptación: usa de 1 a 720 horas.'),
    resolveHours: z
      .number({ error: 'Ingresa las horas para resolver.' })
      .int('Usa horas enteras.')
      .min(1, 'Resolución: usa de 1 a 2160 horas.')
      .max(2160, 'Resolución: usa de 1 a 2160 horas.'),
  })
  .refine((value) => value.resolveHours >= value.acceptHours, {
    message: 'La resolución no puede ser menor que la aceptación.',
    path: ['resolveHours'],
  })

export const priorityTargetFormSchema = z
  .object({
    acceptHours: z.string().trim().min(1, 'Ingresa las horas para aceptar.').transform(Number),
    resolveHours: z.string().trim().min(1, 'Ingresa las horas para resolver.').transform(Number),
  })
  .pipe(priorityTargetSchema)

export type PriorityTargetFormInput = z.input<typeof priorityTargetFormSchema>
export type PriorityTargetValues = z.output<typeof priorityTargetFormSchema>
