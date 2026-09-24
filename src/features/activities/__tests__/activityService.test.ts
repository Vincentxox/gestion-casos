import { supabase } from '@/services/supabase/client'

import {
  assignMaintenanceTechnician,
  createMaintenanceRequestWithActivity,
  getActivitiesPage,
} from '../activityService'

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}))

const from = supabase.from as unknown as jest.Mock
const rpc = supabase.rpc as unknown as jest.Mock
const areaId = '00000000-0000-4000-8000-000000000001'

function mockList() {
  const query = {
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue({ data: [], error: null, count: 21 }),
  }
  const select = jest.fn().mockReturnValue(query)
  from.mockReturnValue({ select })
  return { query, select }
}

describe('lista de actividades', () => {
  beforeEach(() => jest.clearAllMocks())

  test('Activas reúne pendientes y en proceso, filtra por área y pagina en Supabase', async () => {
    const { query, select } = mockList()

    await expect(
      getActivitiesPage({ page: 1, areaId, status: 'activas', priorityDirection: 'desc' }),
    ).resolves.toEqual({ items: [], total: 21 })

    expect(from).toHaveBeenCalledWith('actividades')
    expect(select).toHaveBeenCalledWith(expect.stringContaining('!inner'), { count: 'exact' })
    expect(query.eq).toHaveBeenCalledWith('solicitud.id_area', areaId)
    expect(query.in).toHaveBeenCalledWith('estado', ['pendiente', 'en_proceso'])
    expect(query.order).toHaveBeenNthCalledWith(1, 'prioridad', { ascending: false })
    expect(query.range).toHaveBeenCalledWith(10, 19)
  })

  test('ordena ascendente y distingue finalizadas de en proceso', async () => {
    const { query } = mockList()
    await getActivitiesPage({
      page: 0,
      areaId: null,
      status: 'finalizadas',
      priorityDirection: 'asc',
    })

    expect(query.eq).toHaveBeenCalledWith('estado', 'finalizada')
    expect(query.in).not.toHaveBeenCalled()
    expect(query.order).toHaveBeenNthCalledWith(1, 'prioridad', { ascending: true })
    expect(query.range).toHaveBeenCalledWith(0, 9)
  })

  test('propaga los errores de la consulta', async () => {
    const error = new Error('Sin conexión')
    const { query } = mockList()
    query.range.mockResolvedValue({ data: null, error, count: null })

    await expect(
      getActivitiesPage({ page: 0, areaId: null, status: 'todas', priorityDirection: 'desc' }),
    ).rejects.toBe(error)
  })
})

test('crear solicitud y actividad en una operación atómica', async () => {
  rpc.mockResolvedValue({ error: null })

  await createMaintenanceRequestWithActivity({
    requestNumber: '  SOL-2026-001  ',
    areaId,
    equipmentId: null,
    employeeId: 'empleado-1',
    requestedOn: '2026-09-20',
    activityTypeId: 'tipo-1',
    requestDescription: '  Fallo en el área  ',
    activityDescription: '  Revisar equipo  ',
    priority: 'alta',
  })

  expect(rpc).toHaveBeenCalledWith('crear_solicitud_con_actividad', {
    p_numero_solicitud: 'SOL-2026-001',
    p_id_area: areaId,
    p_id_equipo: null,
    p_id_empleado: 'empleado-1',
    p_fecha_solicitud: '2026-09-20',
    p_id_tipo_actividad: 'tipo-1',
    p_descripcion_solicitud: 'Fallo en el área',
    p_descripcion_actividad: 'Revisar equipo',
    p_prioridad: 'alta',
  })
})

test('la actividad creada puede asignarse a un técnico', async () => {
  const insert = jest.fn().mockResolvedValue({ error: null })
  from.mockReturnValue({ insert })

  await assignMaintenanceTechnician({ activityId: 'actividad-1', technicianId: 'tecnico-1' })

  expect(from).toHaveBeenCalledWith('asignaciones_actividad')
  expect(insert).toHaveBeenCalledWith({
    id_actividad: 'actividad-1',
    id_tecnico: 'tecnico-1',
  })
})
