import {
  cancelMyAccessRequest,
  getMyAccessRequest,
  normalizeJoinCode,
  requestOrganizationAccess,
} from '../accessService'
import { supabase } from '@/services/supabase/client'

jest.mock('@/services/supabase/client', () => ({ supabase: { rpc: jest.fn() } }))

test('normaliza el código con o sin guion', () => {
  expect(normalizeJoinCode('ab12cd34')).toBe('AB12-CD34')
  expect(normalizeJoinCode('AB12-CD34')).toBe('AB12-CD34')
  expect(normalizeJoinCode('ab12')).toBe('AB12')
})

test('consulta, solicita y cancela el acceso', async () => {
  const rpc = supabase.rpc as jest.Mock
  rpc.mockResolvedValueOnce({
    data: [
      {
        id: '1',
        organization_name: 'Empresa',
        status: 'pendiente',
        decision_note: null,
        created_at: '2026-01-01',
      },
    ],
    error: null,
  })
  await expect(getMyAccessRequest()).resolves.toMatchObject({
    organizationName: 'Empresa',
    status: 'pendiente',
  })
  rpc.mockResolvedValueOnce({
    data: { status: 'codigo_invalido', organization_name: null },
    error: null,
  })
  await expect(requestOrganizationAccess('abcd1234')).resolves.toEqual({
    status: 'codigo_invalido',
    organizationName: null,
  })
  rpc.mockResolvedValueOnce({
    data: { status: 'pendiente', organization_name: 'Empresa' },
    error: null,
  })
  await expect(requestOrganizationAccess('ABCD-1234')).resolves.toEqual({
    status: 'pendiente',
    organizationName: 'Empresa',
  })
  expect(rpc).toHaveBeenCalledWith('request_organization_access', { access_code: 'ABCD-1234' })
  rpc.mockResolvedValueOnce({ error: null })
  await expect(cancelMyAccessRequest()).resolves.toBeUndefined()
})

test('propaga errores de acceso', async () => {
  const rpc = supabase.rpc as jest.Mock
  const error = new Error('Sin permiso')
  rpc.mockResolvedValue({ error })
  await expect(getMyAccessRequest()).rejects.toBe(error)
  await expect(requestOrganizationAccess('ABCD-1234')).rejects.toBe(error)
  await expect(cancelMyAccessRequest()).rejects.toBe(error)
})
