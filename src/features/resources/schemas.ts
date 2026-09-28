import { z } from 'zod'

const optionalCost = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/
const quantity = /^(?:0|[1-9]\d{0,6})(?:\.\d{1,3})?$/
const hours = /^(?:0|[1-9]\d{0,3})(?:\.\d{1,2})?$/

export const resourceSchema = z
  .object({
    kind: z.enum(['material', 'herramienta', 'equipo']),
    name: z.string().trim().min(2, 'Escribe al menos 2 caracteres').max(120),
    description: z
      .string()
      .trim()
      .refine((value) => !value || value.length >= 3, 'Escribe al menos 3 caracteres')
      .refine((value) => value.length <= 300, 'Máximo 300 caracteres'),
    unit: z.string().trim().max(30, 'Máximo 30 caracteres'),
    unitCost: z
      .string()
      .trim()
      .refine(
        (value) => !value || (optionalCost.test(value) && Number(value) <= 9999999999.99),
        'Indica un costo válido con hasta 2 decimales',
      ),
  })
  .refine((value) => value.kind !== 'material' || value.unit.length > 0, {
    path: ['unit'],
    message: 'La unidad es obligatoria para materiales.',
  })

export const usageSchema = z
  .object({
    kind: z.enum(['recurso', 'mano_de_obra']),
    resourceId: z.string(),
    resourceKind: z.enum(['material', 'herramienta', 'equipo']).nullable(),
    technicianId: z.string(),
    quantity: z.string().trim(),
    hours: z.string().trim(),
    notes: z
      .string()
      .trim()
      .refine((value) => !value || value.length >= 3, 'Escribe al menos 3 caracteres')
      .refine((value) => value.length <= 300, 'Máximo 300 caracteres'),
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'recurso' && !value.resourceId) {
      ctx.addIssue({ code: 'custom', path: ['resourceId'], message: 'Selecciona un recurso.' })
    }
    if (value.kind === 'mano_de_obra' && !value.technicianId) {
      ctx.addIssue({ code: 'custom', path: ['technicianId'], message: 'Selecciona un técnico.' })
    }
    if (value.kind === 'recurso' && value.resourceKind === 'material' && !value.quantity) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: 'Indica la cantidad de material utilizada.',
      })
    }
    if (value.kind === 'mano_de_obra' && !value.hours) {
      ctx.addIssue({ code: 'custom', path: ['hours'], message: 'Indica las horas trabajadas.' })
    }
    if (
      value.quantity &&
      (!quantity.test(value.quantity) ||
        Number(value.quantity) <= 0 ||
        Number(value.quantity) > 1000000)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: 'Cantidad mayor que 0 y hasta 1 000 000, con 3 decimales.',
      })
    }
    if (
      value.hours &&
      (!hours.test(value.hours) || Number(value.hours) <= 0 || Number(value.hours) > 1000)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['hours'],
        message: 'Horas mayores que 0 y hasta 1000, con 2 decimales.',
      })
    }
  })
