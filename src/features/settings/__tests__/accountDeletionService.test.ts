import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'

import { supabase } from '@/services/supabase/client'

import {
  AccountDeletionBlockedError,
  AccountDeletionNetworkError,
  deleteOwnAccount,
  isSoleOrganizationMember,
} from '../accountDeletionService'

jest.mock('@/services/supabase/client', () => ({
  supabase: { functions: { invoke: jest.fn() }, from: jest.fn() },
}))

const invoke = jest.mocked(supabase.functions.invoke)

beforeEach(() => jest.clearAllMocks())

test('invoca delete-account con POST sin cuerpo y acepta deleted true', async () => {
  invoke.mockResolvedValueOnce({ data: { deleted: true }, error: null })
  await expect(deleteOwnAccount()).resolves.toBeUndefined()
  expect(invoke).toHaveBeenCalledWith('delete-account', { method: 'POST' })
})

test('409 conserva el texto exacto del servidor como error tipado', async () => {
  const message = 'Nombra a otro administrador antes de eliminar tu cuenta'
  const response = new Response(JSON.stringify({ error: message }), { status: 409 })
  invoke.mockResolvedValueOnce({ data: null, error: new FunctionsHttpError(response) })
  await expect(deleteOwnAccount()).rejects.toThrow(AccountDeletionBlockedError)

  const again = new Response(JSON.stringify({ error: message }), { status: 409 })
  invoke.mockResolvedValueOnce({ data: null, error: new FunctionsHttpError(again) })
  await expect(deleteOwnAccount()).rejects.toThrow(message)
})

test('un fallo de red se distingue de un 500', async () => {
  invoke.mockResolvedValueOnce({
    data: null,
    error: new FunctionsFetchError(new TypeError('Network request failed')),
  })
  await expect(deleteOwnAccount()).rejects.toThrow(AccountDeletionNetworkError)
  invoke.mockResolvedValueOnce({
    data: null,
    error: new FunctionsHttpError(new Response('error', { status: 500 })),
  })
  await expect(deleteOwnAccount()).rejects.toThrow('No se pudo eliminar la cuenta.')
})

test('cuenta solo perfiles de la empresa actual', async () => {
  const eq = jest.fn().mockResolvedValue({ count: 1, error: null })
  const select = jest.fn(() => ({ eq }))
  jest.mocked(supabase.from).mockReturnValue({ select } as never)
  await expect(isSoleOrganizationMember('org-1')).resolves.toBe(true)
  expect(supabase.from).toHaveBeenCalledWith('profiles')
  expect(select).toHaveBeenCalledWith('id', { count: 'exact', head: true })
  expect(eq).toHaveBeenCalledWith('organization_id', 'org-1')
})
