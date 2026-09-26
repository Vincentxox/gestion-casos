import { QueryClient } from '@tanstack/react-query'

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 3) return false
  if (!error || typeof error !== 'object') return true

  const candidate = error as {
    status?: number | string
    statusCode?: number | string
    code?: string
    message?: string
    context?: { status?: number }
  }
  const status = Number(candidate.status ?? candidate.statusCode ?? candidate.context?.status)
  if (status >= 400 && status < 500) return false
  if (
    candidate.code &&
    (/^(22|23|28)/.test(candidate.code) ||
      ['42501', 'PGRST116', 'PGRST301'].includes(candidate.code) ||
      (Number(candidate.code) >= 400 && Number(candidate.code) < 500))
  )
    return false
  if (
    /permission denied|not authorized|unauthorized|forbidden|sin permiso|no autorizado|row.level.security/i.test(
      candidate.message ?? '',
    )
  )
    return false
  return true
}

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: shouldRetryQuery } },
})
