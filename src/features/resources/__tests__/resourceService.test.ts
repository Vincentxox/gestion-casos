import { supabase } from '@/services/supabase/client'

import {
  addCaseUsage,
  createResource,
  deleteCaseUsage,
  listCaseUsages,
  listResources,
  setResourceActive,
  updateCaseUsage,
  updateResource,
} from '../resourceService'
import type { ResourceInput, UsageInput } from '../types'

jest.mock('@/services/supabase/client', () => ({ supabase: { from: jest.fn() } }))

const from = supabase.from as jest.Mock
const query = {
  select: jest.fn(),
  order: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}
const resource = {
  id: 'r1',
  kind: 'material',
  name: 'Cable',
  description: null,
  unit: 'm',
  unit_cost: 2.5,
  is_active: true,
}
const usage = {
  id: 'u1',
  case_id: 'c1',
  kind: 'recurso',
  resource_id: 'r1',
  resource_kind: 'material',
  resource_name: 'Cable',
  unit: 'm',
  unit_cost: 2.5,
  quantity: 2,
  hours: null,
  technician_id: null,
  technician: null,
  notes: null,
  created_at: '2026-01-01',
}
const resourceInput: ResourceInput = {
  kind: 'material',
  name: ' Cable ',
  description: '  ',
  unit: ' m ',
  unitCost: '2.50',
}
const usageInput: UsageInput = {
  kind: 'recurso',
  resourceId: 'r1',
  resourceKind: 'material',
  technicianId: '',
  quantity: '2.125',
  hours: '',
  notes: '  usado  ',
}

beforeEach(() => {
  jest.clearAllMocks()
  from.mockReturnValue(query)
  for (const method of ['select', 'eq', 'update', 'delete'] as const)
    query[method].mockReturnValue(query)
  query.single.mockResolvedValue({ data: resource, error: null })
  query.order.mockResolvedValue({ data: [resource], error: null })
  query.insert.mockResolvedValue({ error: null })
})

test('consulta y mapea el catálogo', async () => {
  await expect(listResources()).resolves.toMatchObject([
    { id: 'r1', unitCost: 2.5, isActive: true },
  ])
  expect(from).toHaveBeenCalledWith('resources')
  expect(query.order).toHaveBeenCalledWith('name')
})

test('crea y edita solo columnas permitidas del recurso', async () => {
  query.insert.mockReturnValue(query)
  await createResource(resourceInput)
  expect(query.insert).toHaveBeenCalledWith({
    kind: 'material',
    name: 'Cable',
    description: null,
    unit: 'm',
    unit_cost: 2.5,
  })
  await updateResource('r1', resourceInput)
  expect(query.update).toHaveBeenCalledWith({
    kind: 'material',
    name: 'Cable',
    description: null,
    unit: 'm',
    unit_cost: 2.5,
  })
  expect(query.eq).toHaveBeenCalledWith('id', 'r1')
  await setResourceActive('r1', false)
  expect(query.update).toHaveBeenCalledWith({ is_active: false })
})

test('consulta registros de uso con los datos copiados por el servidor', async () => {
  query.order.mockResolvedValue({ data: [usage], error: null })
  await expect(listCaseUsages('c1')).resolves.toMatchObject([
    { caseId: 'c1', resourceName: 'Cable', unitCost: 2.5, quantity: 2 },
  ])
  expect(query.eq).toHaveBeenCalledWith('case_id', 'c1')
})

test('registra recurso y mano de obra sin enviar empresa ni costos desde el cliente', async () => {
  await addCaseUsage('c1', usageInput)
  expect(query.insert).toHaveBeenCalledWith({
    case_id: 'c1',
    kind: 'recurso',
    resource_id: 'r1',
    quantity: 2.125,
    hours: null,
    notes: 'usado',
  })
  await addCaseUsage('c1', {
    ...usageInput,
    kind: 'mano_de_obra',
    technicianId: 't1',
    hours: '1.5',
  })
  expect(query.insert).toHaveBeenCalledWith({
    case_id: 'c1',
    kind: 'mano_de_obra',
    technician_id: 't1',
    hours: 1.5,
    notes: 'usado',
  })
})

test('solo corrige cantidad, horas y notas, y permite eliminar', async () => {
  await updateCaseUsage('u1', { quantity: '3', hours: '', notes: ' nuevo ' })
  expect(query.update).toHaveBeenCalledWith({ quantity: 3, hours: null, notes: 'nuevo' })
  await deleteCaseUsage('u1')
  expect(query.delete).toHaveBeenCalled()
  expect(query.eq).toHaveBeenCalledWith('id', 'u1')
})

test('traduce intentos de cambiar un registro ya no editable', async () => {
  query.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
  await expect(updateCaseUsage('u1', { quantity: '2', hours: '', notes: '' })).rejects.toThrow(
    'ya no se puede modificar',
  )
  await expect(deleteCaseUsage('u1')).rejects.toThrow('ya no se puede eliminar')
})

test('propaga errores de lectura y escritura', async () => {
  const error = new Error('sin conexión')
  query.order.mockResolvedValue({ data: null, error })
  await expect(listResources()).rejects.toBe(error)
  await expect(listCaseUsages('c1')).rejects.toBe(error)
  query.insert.mockResolvedValue({ error })
  await expect(addCaseUsage('c1', usageInput)).rejects.toBe(error)
  query.single.mockResolvedValue({ data: null, error })
  await expect(updateResource('r1', resourceInput)).rejects.toBe(error)
})
