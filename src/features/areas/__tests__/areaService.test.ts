import { supabase } from '@/services/supabase/client'

import { createArea, listAreas, setAreaActive, updateArea } from '../areaService'

jest.mock('@/services/supabase/client', () => ({ supabase: { from: jest.fn() } }))

const from = supabase.from as jest.Mock
const query = {
  select: jest.fn(),
  order: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
}
const row = {
  id: 'a1',
  name: 'Tecnología',
  description: null,
  kind: 'tecnica',
  is_active: true,
  created_at: '',
  updated_at: '',
}

beforeEach(() => {
  jest.clearAllMocks()
  from.mockReturnValue(query)
  query.select.mockReturnValue(query)
  query.insert.mockReturnValue(query)
  query.update.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.single.mockResolvedValue({ data: row, error: null })
})

test('lista las áreas con su tipo', async () => {
  query.order.mockResolvedValue({ data: [row], error: null })
  await expect(listAreas()).resolves.toMatchObject([{ kind: 'tecnica', name: 'Tecnología' }])
})

test('crea y actualiza el tipo de área con campos permitidos', async () => {
  const input = { name: ' Tecnología ', description: '', kind: 'tecnica' as const }
  await createArea(input)
  expect(query.insert).toHaveBeenCalledWith({
    name: 'Tecnología',
    description: null,
    kind: 'tecnica',
  })
  await updateArea('a1', input)
  expect(query.update).toHaveBeenCalledWith({
    name: 'Tecnología',
    description: null,
    kind: 'tecnica',
  })
})

test('activa o desactiva un área', async () => {
  await setAreaActive('a1', false)
  expect(query.update).toHaveBeenCalledWith({ is_active: false })
})

test('propaga errores en lecturas y escrituras', async () => {
  const error = new Error('Acceso denegado')
  query.order.mockResolvedValue({ data: null, error })
  await expect(listAreas()).rejects.toBe(error)
  query.single.mockResolvedValue({ data: null, error })
  const input = { name: 'Tecnología', description: '', kind: 'tecnica' as const }
  await expect(createArea(input)).rejects.toBe(error)
  await expect(updateArea('a1', input)).rejects.toBe(error)
  await expect(setAreaActive('a1', false)).rejects.toBe(error)
})
