import { supabase } from '@/services/supabase/client'

import {
  assignCase,
  changeCaseStatus,
  createCase,
  getCase,
  getStatusLabel,
  listAssignableProfiles,
  listCaseHistory,
  listCases,
  updateCase,
} from '../caseService'

jest.mock('@/services/supabase/client', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }))

const from = supabase.from as jest.Mock
const rpc = supabase.rpc as jest.Mock
const query = {
  select: jest.fn(),
  eq: jest.fn(),
  order: jest.fn(),
  limit: jest.fn(),
  single: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  in: jest.fn(),
}
const row = {
  id: 'case-1',
  case_number: 'CAS-2026-00001',
  title: 'Equipo sin energía',
  description: 'No enciende el equipo',
  category_id: 'cat-1',
  category: { name: 'Equipos' },
  requesting_area_id: 'a1',
  requesting_area: { name: 'Administración' },
  target_area_id: 'a2',
  target_area: { name: 'Tecnología' },
  location: 'Oficina',
  priority: 'media',
  status: 'solicitado',
  created_by: 'u1',
  creator: { full_name: 'Ana' },
  assigned_to: null,
  assignee: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
}

beforeEach(() => {
  jest.clearAllMocks()
  from.mockReturnValue(query)
  for (const method of ['select', 'eq', 'order', 'insert', 'update', 'in'] as const)
    query[method].mockReturnValue(query)
  query.single.mockResolvedValue({ data: row, error: null })
  query.limit.mockResolvedValue({ data: [row], error: null })
})

test('lista y mapea solicitudes con nombres de relaciones', async () => {
  await expect(listCases()).resolves.toMatchObject([
    { category: 'Equipos', creatorName: 'Ana', targetAreaName: 'Tecnología' },
  ])
  expect(query.limit).toHaveBeenCalledWith(100)
})

test('lee una solicitud por id', async () => {
  await expect(getCase('case-1')).resolves.toMatchObject({ id: 'case-1', categoryId: 'cat-1' })
  expect(query.eq).toHaveBeenCalledWith('id', 'case-1')
})

test('crea y edita solo los campos de entrada autorizados', async () => {
  const input = {
    title: '  Equipo sin energía ',
    description: '  No enciende el equipo ',
    categoryId: 'cat-1',
    location: ' Oficina ',
    priority: 'media' as const,
  }
  await createCase(input)
  expect(query.insert).toHaveBeenCalledWith({
    title: 'Equipo sin energía',
    description: 'No enciende el equipo',
    category_id: 'cat-1',
    location: 'Oficina',
    priority: 'media',
  })
  await updateCase('case-1', input)
  expect(query.update).toHaveBeenCalledWith({
    title: 'Equipo sin energía',
    description: 'No enciende el equipo',
    category_id: 'cat-1',
    location: 'Oficina',
    priority: 'media',
  })
})

test('transiciona mediante RPC sin actualizar status directamente', async () => {
  rpc.mockResolvedValue({ data: { id: 'case-1' }, error: null })
  await changeCaseStatus('case-1', { action: 'aceptar', comment: '' })
  expect(rpc).toHaveBeenCalledWith('transition_case', {
    target_case_id: 'case-1',
    requested_action: 'aceptar',
    action_comment: null,
  })
  await assignCase('case-1', 'tech-1')
  expect(rpc).toHaveBeenCalledWith('transition_case', {
    target_case_id: 'case-1',
    requested_action: 'asignar',
    new_assignee_id: 'tech-1',
  })
  expect(query.update).not.toHaveBeenCalled()
})

test('lista solo técnicos y jefes del área destino', async () => {
  query.order.mockResolvedValue({
    data: [
      {
        id: 'tech-1',
        full_name: 'Tomás',
        role: 'tecnico',
        area_id: 'a2',
        area: { name: 'Tecnología' },
      },
    ],
    error: null,
  })
  await expect(listAssignableProfiles('a2')).resolves.toMatchObject([
    { role: 'tecnico', areaId: 'a2' },
  ])
  expect(query.eq).toHaveBeenCalledWith('area_id', 'a2')
  expect(query.in).toHaveBeenCalledWith('role', ['tecnico', 'jefe_area'])
})

test('lee eventos inmutables con nombre de actor y asignado', async () => {
  query.order.mockResolvedValue({
    data: [
      {
        id: 1,
        action: 'asignar',
        from_status: 'aceptado',
        to_status: 'asignado',
        comment: null,
        created_at: '2026-01-01',
        actor: { full_name: 'Jefe' },
        assignee: { full_name: 'Tomás' },
      },
    ],
    error: null,
  })
  await expect(listCaseHistory('case-1')).resolves.toMatchObject([
    { action: 'asignar', actorName: 'Jefe', assigneeName: 'Tomás' },
  ])
  expect(from).toHaveBeenCalledWith('case_events')
})

test('traduce los diez estados', () => {
  expect(getStatusLabel('en_ejecucion')).toBe('En ejecución')
  expect(getStatusLabel('aprobado')).toBe('Aprobada')
})

test('propaga errores del listado y del detalle', async () => {
  const error = new Error('sin conexión')
  query.limit.mockResolvedValue({ data: null, error })
  await expect(listCases()).rejects.toBe(error)
  query.single.mockResolvedValue({ data: null, error })
  await expect(getCase('case-1')).rejects.toBe(error)
})

test('propaga errores de escritura y de transición', async () => {
  const error = new Error('sin permiso')
  query.single.mockResolvedValue({ data: null, error })
  const input = {
    title: 'Título válido',
    description: 'Descripción suficiente',
    categoryId: 'cat',
    location: 'Oficina',
    priority: 'baja' as const,
  }
  await expect(createCase(input)).rejects.toBe(error)
  await expect(updateCase('case-1', input)).rejects.toBe(error)
  rpc.mockResolvedValue({ data: null, error })
  await expect(changeCaseStatus('case-1', { action: 'aceptar', comment: 'ok' })).rejects.toBe(error)
  await expect(assignCase('case-1', 'tech')).rejects.toBe(error)
})

test('explica cuando una solicitud ya no se puede editar', async () => {
  query.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
  await expect(
    updateCase('case-1', {
      title: 'Título válido',
      description: 'Descripción suficiente',
      categoryId: 'cat',
      location: 'Oficina',
      priority: 'baja',
    }),
  ).rejects.toThrow('La solicitud ya no se puede editar; actualiza la pantalla')
})

test('usa nombres de reserva cuando faltan relaciones visibles', async () => {
  query.single.mockResolvedValue({
    data: {
      ...row,
      creator: null,
      assignee: null,
      category: null,
      requesting_area: null,
      target_area: null,
    },
    error: null,
  })
  await expect(getCase('case-1')).resolves.toMatchObject({
    creatorName: 'Usuario sin nombre',
    assigneeName: null,
    category: 'Tipo no disponible',
    requestingAreaName: 'Área no disponible',
  })
})

test('propaga errores de personal e historial', async () => {
  const error = new Error('sin conexión')
  query.order.mockResolvedValue({ data: null, error })
  await expect(listAssignableProfiles('area')).rejects.toBe(error)
  await expect(listCaseHistory('case')).rejects.toBe(error)
})
