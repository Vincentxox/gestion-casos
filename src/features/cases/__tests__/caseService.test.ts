import { supabase } from '@/services/supabase/client'
import { listFormerMemberNames } from '@/services/supabase/formerMembers'

import {
  assignCase,
  changeCaseStatus,
  countCasesByStatus,
  createCase,
  getCase,
  getCaseActions,
  getStatusLabel,
  listAssignableProfiles,
  listCaseHistory,
  listCases,
  sendCaseMessage,
  updateCase,
} from '../caseService'

jest.mock('@/services/supabase/client', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }))
jest.mock('@/services/supabase/formerMembers', () => ({
  listFormerMemberNames: jest.fn(),
  memberDisplayName: jest.requireActual('@/services/supabase/formerMembers').memberDisplayName,
}))

const from = supabase.from as jest.Mock
const rpc = supabase.rpc as jest.Mock
const query = {
  select: jest.fn(),
  eq: jest.fn(),
  is: jest.fn(),
  order: jest.fn(),
  range: jest.fn(),
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
  creator: { full_name: 'Ana', avatar_url: 'org/u1/photo.jpg' },
  assigned_to: null,
  assignee: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  due_at: '2026-01-01T08:00:00Z',
  overdue_stage: 'aceptacion',
}
const filters = {
  scope: 'mi_area' as const,
  statuses: ['solicitado' as const],
  priorities: ['alta' as const, 'media' as const],
  createdFrom: '2026-10-10T00:00:00.000Z',
  createdTo: null,
  overdueOnly: true,
  unassignedOnly: false,
  searchText: '  energía  ',
  sort: 'prioridad' as const,
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(listFormerMemberNames as jest.Mock).mockResolvedValue(new Map())
  from.mockReturnValue(query)
  rpc.mockReturnValue(query)
  for (const method of ['select', 'eq', 'is', 'order', 'insert', 'update', 'in'] as const)
    query[method].mockReturnValue(query)
  query.single.mockResolvedValue({ data: row, error: null })
  query.limit.mockResolvedValue({ data: [row], error: null })
  query.range.mockResolvedValue({ data: [row], error: null })
})

test('mapea las acciones del servidor y conserva una respuesta vacía como sin acciones', async () => {
  rpc.mockResolvedValueOnce({
    data: [
      { action: 'aceptar', allowed: true, reason: null },
      { action: 'rechazar', allowed: false, reason: 'No puedes rechazar' },
      { action: 'mensaje', allowed: true, reason: null },
    ],
    error: null,
  })
  await expect(getCaseActions('case-1')).resolves.toEqual({
    aceptar: { allowed: true, reason: null },
    rechazar: { allowed: false, reason: 'No puedes rechazar' },
    mensaje: { allowed: true, reason: null },
  })
  expect(rpc).toHaveBeenCalledWith('get_case_actions', { target_case_id: 'case-1' })
  rpc.mockResolvedValueOnce({ data: [], error: null })
  await expect(getCaseActions('case-1')).resolves.toEqual({})
})

test('envía el mensaje recortado por RPC y devuelve el id del evento', async () => {
  rpc.mockResolvedValueOnce({ data: 42, error: null })
  await expect(sendCaseMessage('case-1', '  Hola equipo.  ')).resolves.toBe(42)
  expect(rpc).toHaveBeenCalledWith('send_case_message', {
    target_case_id: 'case-1',
    message: 'Hola equipo.',
  })
  const error = { code: 'P0001', message: 'La solicitud está cerrada' }
  rpc.mockResolvedValueOnce({ data: null, error })
  await expect(sendCaseMessage('case-1', 'Hola')).rejects.toBe(error)
})

test('propaga el error al consultar acciones', async () => {
  const error = { code: 'PGRST116', message: 'Sin acceso' }
  rpc.mockResolvedValueOnce({ data: null, error })
  await expect(getCaseActions('case-1')).rejects.toBe(error)
})

test('pagina y ordena solicitudes en el servidor y conserva los nombres de relaciones', async () => {
  await expect(listCases(filters, 2)).resolves.toMatchObject([
    {
      category: 'Equipos',
      creatorName: 'Ana',
      creatorAvatarPath: 'org/u1/photo.jpg',
      targetAreaName: 'Tecnología',
      dueAt: '2026-01-01T08:00:00Z',
      overdueStage: 'aceptacion',
    },
  ])
  expect(rpc).toHaveBeenCalledWith('search_cases', {
    scope: 'mi_area',
    statuses: ['solicitado'],
    priorities: ['alta', 'media'],
    created_from: '2026-10-10T00:00:00.000Z',
    created_to: null,
    overdue_only: true,
    search_text: 'energía',
  })
  expect(query.range).toHaveBeenCalledWith(60, 89)
  expect(query.order.mock.calls).toEqual([
    ['priority', { ascending: true }],
    ['created_at', { ascending: false }],
    ['id', { ascending: false }],
  ])
  expect(query.select.mock.calls[0]?.[0]).toContain('due_at, overdue_stage')
})

test('ordena por fecha e id y cuenta con los filtros nuevos', async () => {
  await listCases({ ...filters, sort: 'recientes' }, 0)
  expect(query.order.mock.calls.map(([field]) => field)).toEqual(['created_at', 'id'])
  rpc.mockResolvedValue({
    data: [{ status: 'solicitado', total: 4, overdue: 2, unassigned: 4 }],
    error: null,
  })
  await expect(countCasesByStatus(filters)).resolves.toEqual([
    { status: 'solicitado', total: 4, overdue: 2, unassigned: 4 },
  ])
  expect(rpc).toHaveBeenLastCalledWith('count_cases_by_status', {
    scope: 'mi_area',
    statuses: ['solicitado'],
    priorities: ['alta', 'media'],
    created_from: '2026-10-10T00:00:00.000Z',
    created_to: null,
    overdue_only: true,
    search_text: 'energía',
  })
})

test('Sin asignar conserva el alcance y usa la columna unassigned de aceptadas', async () => {
  const unassigned = { ...filters, statuses: ['aceptado' as const], unassignedOnly: true }
  await listCases(unassigned, 0)
  expect(query.is).toHaveBeenCalledWith('assigned_to', null)
  expect(rpc).toHaveBeenCalledWith(
    'search_cases',
    expect.objectContaining({ scope: 'mi_area', statuses: ['aceptado'] }),
  )
  rpc.mockResolvedValue({
    data: [{ status: 'aceptado', total: 5, overdue: 1, unassigned: 2 }],
    error: null,
  })
  await expect(countCasesByStatus(unassigned)).resolves.toEqual([
    { status: 'aceptado', total: 2, overdue: 1, unassigned: 2 },
  ])
})

test('una página conserva los nombres históricos de integrantes dados de baja', async () => {
  ;(listFormerMemberNames as jest.Mock).mockResolvedValue(new Map([['u1', 'Ana anterior']]))
  query.range.mockResolvedValue({ data: [{ ...row, creator: null }], error: null })
  await expect(listCases(filters, 0)).resolves.toMatchObject([
    { creatorName: 'Ana anterior (dado de baja)' },
  ])
  expect(listFormerMemberNames).toHaveBeenCalledWith(['u1', null])
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
    action_comment: null,
  })
  await assignCase('case-1', 'tech-2', '  Cambio de turno  ')
  expect(rpc).toHaveBeenCalledWith('transition_case', {
    target_case_id: 'case-1',
    requested_action: 'asignar',
    new_assignee_id: 'tech-2',
    action_comment: 'Cambio de turno',
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
        actor_id: 'jefe-1',
        assignee_id: 'tech-1',
        actor: { full_name: 'Jefe', avatar_url: 'org/jefe-1/photo.jpg' },
        assignee: { full_name: 'Tomás' },
      },
    ],
    error: null,
  })
  await expect(listCaseHistory('case-1')).resolves.toMatchObject([
    {
      action: 'asignar',
      actorName: 'Jefe',
      actorAvatarPath: 'org/jefe-1/photo.jpg',
      assigneeName: 'Tomás',
    },
  ])
  expect(from).toHaveBeenCalledWith('case_events')
})

test('recupera del historial los nombres de personas dadas de baja', async () => {
  ;(listFormerMemberNames as jest.Mock).mockResolvedValue(
    new Map([
      ['jefe-1', 'Jefa anterior'],
      ['tech-1', 'Técnico anterior'],
    ]),
  )
  query.order.mockResolvedValue({
    data: [
      {
        id: 2,
        action: 'reasignar',
        from_status: 'en_ejecucion',
        to_status: 'en_ejecucion',
        comment: 'Cambio de turno',
        created_at: '2026-10-15',
        actor_id: 'jefe-1',
        assignee_id: 'tech-1',
        actor: null,
        assignee: null,
      },
    ],
    error: null,
  })
  await expect(listCaseHistory('case-1')).resolves.toMatchObject([
    {
      actorName: 'Jefa anterior (dado de baja)',
      assigneeName: 'Técnico anterior (dado de baja)',
    },
  ])
})

test('traduce los diez estados', () => {
  expect(getStatusLabel('en_ejecucion')).toBe('En ejecución')
  expect(getStatusLabel('aprobado')).toBe('Aprobada')
})

test('propaga errores del listado y del detalle', async () => {
  const error = new Error('sin conexión')
  query.range.mockResolvedValue({ data: null, error })
  await expect(listCases(filters, 0)).rejects.toBe(error)
  query.single.mockResolvedValue({ data: null, error })
  await expect(getCase('case-1')).rejects.toBe(error)
})

test('propaga errores de conteo y no envía búsquedas de más de 100 caracteres', async () => {
  const error = new Error('sin conexión')
  rpc.mockResolvedValue({ data: null, error })
  await expect(countCasesByStatus(filters)).rejects.toBe(error)
  await expect(listCases({ ...filters, searchText: 'x'.repeat(101) }, 0)).rejects.toThrow(
    'La búsqueda no puede exceder 100 caracteres',
  )
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

test('muestra el nombre histórico sin leer el perfil de otra empresa', async () => {
  ;(listFormerMemberNames as jest.Mock).mockResolvedValue(new Map([['u1', 'Ana histórica']]))
  query.single.mockResolvedValue({ data: { ...row, creator: null }, error: null })
  await expect(getCase('case-1')).resolves.toMatchObject({
    creatorName: 'Ana histórica (dado de baja)',
  })
  expect(listFormerMemberNames).toHaveBeenCalledWith(['u1', null])
})

test('propaga errores de personal e historial', async () => {
  const error = new Error('sin conexión')
  query.order.mockResolvedValue({ data: null, error })
  await expect(listAssignableProfiles('area')).rejects.toBe(error)
  await expect(listCaseHistory('case')).rejects.toBe(error)
})
