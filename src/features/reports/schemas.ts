import { z } from 'zod'

export const reportDraftSchema = z.object({
  diagnosis: z.string().max(2000, 'Máximo 2000 caracteres'),
  workDone: z.string().max(4000, 'Máximo 4000 caracteres'),
  cause: z.string().max(1000, 'Máximo 1000 caracteres'),
  observations: z.string().max(2000, 'Máximo 2000 caracteres'),
})

export const returnReportSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Escribe al menos 3 caracteres')
    .max(500, 'Máximo 500 caracteres'),
})

export function getReportRequirements(
  diagnosis: string,
  workDone: string,
  confirmedAfterPhotos: number,
  minAfterPhotos: number,
) {
  const missing: string[] = []
  if (diagnosis.trim().length < 10) missing.push('Completa el diagnóstico (mínimo 10 caracteres)')
  if (workDone.trim().length < 10)
    missing.push('Completa el trabajo realizado (mínimo 10 caracteres)')
  if (confirmedAfterPhotos < minAfterPhotos) {
    const count = minAfterPhotos - confirmedAfterPhotos
    missing.push(`Falta${count === 1 ? '' : 'n'} ${count} foto${count === 1 ? '' : 's'} de después`)
  }
  return missing
}
