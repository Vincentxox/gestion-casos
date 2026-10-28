import { supabase } from '../client'
import { listFormerMemberNames, memberDisplayName } from '../formerMembers'

jest.mock('../client', () => ({ supabase: { from: jest.fn() } }))

const from = supabase.from as jest.Mock
const query = { select: jest.fn(), in: jest.fn() }

beforeEach(() => {
  jest.clearAllMocks()
  from.mockReturnValue(query)
  query.select.mockReturnValue(query)
  query.in.mockResolvedValue({ data: [{ user_id: 'u1', full_name: 'Ana' }], error: null })
})

test('consulta solo los identificadores faltantes y marca a la persona dada de baja', async () => {
  const names = await listFormerMemberNames(['u1', 'u1', null])
  expect(from).toHaveBeenCalledWith('former_members')
  expect(query.in).toHaveBeenCalledWith('user_id', ['u1'])
  expect(memberDisplayName('u1', null, names, 'Sin nombre')).toBe('Ana (dado de baja)')
  expect(memberDisplayName('u1', 'Ana actual', names, 'Sin nombre')).toBe('Ana actual')
  expect(memberDisplayName('u1', ' ', names, 'Sin nombre')).toBe('Sin nombre')
  expect(memberDisplayName('u2', null, names, 'Sin nombre')).toBe('Sin nombre')
})

test('no consulta la tabla si no hay identificadores y propaga errores', async () => {
  await expect(listFormerMemberNames([null, undefined])).resolves.toEqual(new Map())
  expect(from).not.toHaveBeenCalled()
  const error = new Error('sin acceso')
  query.in.mockResolvedValue({ data: null, error })
  await expect(listFormerMemberNames(['u1'])).rejects.toBe(error)
})
