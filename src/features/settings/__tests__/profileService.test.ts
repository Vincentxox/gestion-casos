import { supabase } from '@/services/supabase/client'
import { updateOwnName } from '../profileService'

jest.mock('@/services/supabase/client', () => ({ supabase: { from: jest.fn() } }))

test('valida y guarda el nombre del usuario autenticado', async () => {
  const query = { update: jest.fn(), eq: jest.fn() }
  ;(supabase.from as jest.Mock).mockReturnValue(query)
  query.update.mockReturnValue(query)
  query.eq.mockResolvedValue({ error: null })
  await expect(updateOwnName('user', '  Ana López  ')).resolves.toBe('Ana López')
  expect(query.update).toHaveBeenCalledWith({ full_name: 'Ana López' })
  expect(query.eq).toHaveBeenCalledWith('id', 'user')
  await expect(updateOwnName('user', 'A')).rejects.toThrow('Usa entre 2 y 120')
})
