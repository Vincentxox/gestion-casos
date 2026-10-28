import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'

import { supabase } from '@/services/supabase/client'

export class AccountDeletionBlockedError extends Error {}
export class AccountDeletionNetworkError extends Error {}

function isNetworkError(error: unknown): boolean {
  return (
    error instanceof FunctionsFetchError ||
    error instanceof TypeError ||
    (error instanceof Error &&
      /network request failed|failed to fetch|network error/i.test(error.message))
  )
}

export async function deleteOwnAccount(): Promise<void> {
  let result: Awaited<ReturnType<typeof supabase.functions.invoke<{ deleted: boolean }>>>
  try {
    result = await supabase.functions.invoke<{ deleted: boolean }>('delete-account', {
      method: 'POST',
    })
  } catch (error) {
    if (isNetworkError(error)) throw new AccountDeletionNetworkError('No hay conexión.')
    throw new Error('No se pudo eliminar la cuenta.')
  }
  const { data, error } = result
  if (error instanceof FunctionsHttpError && error.context.status === 409) {
    let message = 'No se puede eliminar tu cuenta en este momento.'
    try {
      const body: unknown = await error.context.json()
      if (
        body !== null &&
        typeof body === 'object' &&
        'error' in body &&
        typeof body.error === 'string'
      ) {
        message = body.error
      }
    } catch {
      // Keep a safe message if the server did not return JSON.
    }
    throw new AccountDeletionBlockedError(message)
  }
  if (isNetworkError(error)) throw new AccountDeletionNetworkError('No hay conexión.')
  if (error || data?.deleted !== true) throw new Error('No se pudo eliminar la cuenta.')
}

export async function isSoleOrganizationMember(organizationId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
  if (error) throw error
  return count === 1
}
