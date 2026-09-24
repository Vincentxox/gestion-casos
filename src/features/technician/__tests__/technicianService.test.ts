import { supabase } from '@/services/supabase/client'

import { getRecentAssignedActivities } from '../technicianService'

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn() },
}))

const from = supabase.from as unknown as jest.Mock
const activityId = '00000000-0000-4000-8000-000000000001'

function mockQuery(result: unknown) {
  const query = {
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
  }
  const select = jest.fn().mockReturnValue(query)
  from.mockReturnValue({ select })
  return { query, select }
}

describe('actividades del técnico', () => {
  beforeEach(() => jest.clearAllMocks())

  test('consulta solo asignaciones activas del usuario y limita la lista', async () => {
    const { query, select } = mockQuery({
      data: [
        { actividad: { id: activityId, descripcion: 'Revisar ventilador', estado: 'pendiente' } },
        { actividad: null },
      ],
      error: null,
    })

    await expect(getRecentAssignedActivities('tecnico-1')).resolves.toEqual([
      { id: activityId, descripcion: 'Revisar ventilador', estado: 'pendiente' },
    ])
    expect(from).toHaveBeenCalledWith('asignaciones_actividad')
    expect(select).toHaveBeenCalledWith('actividad:actividades(id, descripcion, estado)')
    expect(query.eq).toHaveBeenNthCalledWith(1, 'id_tecnico', 'tecnico-1')
    expect(query.eq).toHaveBeenNthCalledWith(2, 'activa', true)
    expect(query.order).toHaveBeenCalledWith('asignada_en', { ascending: false })
    expect(query.limit).toHaveBeenCalledWith(10)
  })

  test('propaga errores de Supabase sin mostrar una lista vacía engañosa', async () => {
    const error = new Error('No se pudo consultar')
    mockQuery({ data: null, error })

    await expect(getRecentAssignedActivities('tecnico-1')).rejects.toBe(error)
  })
})
