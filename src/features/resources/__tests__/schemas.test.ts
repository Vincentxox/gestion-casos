import { resourceSchema, usageSchema } from '../schemas'

test('valida nombre, unidad de material y costo del catálogo', () => {
  const resource = {
    kind: 'material',
    name: '  Cable  ',
    description: '',
    unit: ' m ',
    unitCost: '2.50',
  }
  expect(resourceSchema.parse(resource)).toMatchObject({ name: 'Cable', unit: 'm' })
  expect(resourceSchema.safeParse({ ...resource, unit: '' }).success).toBe(false)
  expect(resourceSchema.safeParse({ ...resource, unitCost: '-1' }).success).toBe(false)
  expect(resourceSchema.safeParse({ ...resource, unitCost: '1.234' }).success).toBe(false)
  expect(resourceSchema.safeParse({ ...resource, description: 'ab' }).success).toBe(false)
})

test('exige recurso y cantidad de material dentro de los límites', () => {
  const usage = {
    kind: 'recurso',
    resourceId: 'r1',
    resourceKind: 'material',
    technicianId: '',
    quantity: '2.125',
    hours: '',
    notes: '',
  }
  expect(usageSchema.safeParse(usage).success).toBe(true)
  expect(usageSchema.safeParse({ ...usage, resourceId: '' }).success).toBe(false)
  expect(usageSchema.safeParse({ ...usage, quantity: '' }).success).toBe(false)
  expect(usageSchema.safeParse({ ...usage, quantity: '1000001' }).success).toBe(false)
  expect(usageSchema.safeParse({ ...usage, quantity: '0' }).success).toBe(false)
  expect(usageSchema.safeParse({ ...usage, quantity: '2.1234' }).success).toBe(false)
})

test('admite horas opcionales de herramienta y exige técnico y horas de mano de obra', () => {
  const tool = {
    kind: 'recurso',
    resourceId: 'r2',
    resourceKind: 'herramienta',
    technicianId: '',
    quantity: '',
    hours: '',
    notes: '',
  }
  expect(usageSchema.safeParse(tool).success).toBe(true)
  const labor = {
    ...tool,
    kind: 'mano_de_obra',
    resourceId: '',
    resourceKind: null,
    technicianId: 't1',
    hours: '1.5',
  }
  expect(usageSchema.safeParse(labor).success).toBe(true)
  expect(usageSchema.safeParse({ ...labor, technicianId: '' }).success).toBe(false)
  expect(usageSchema.safeParse({ ...labor, hours: '' }).success).toBe(false)
  expect(usageSchema.safeParse({ ...labor, hours: '1001' }).success).toBe(false)
  expect(usageSchema.safeParse({ ...labor, notes: 'ok' }).success).toBe(false)
})
