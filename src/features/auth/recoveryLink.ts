export const EXPIRED_RECOVERY_LINK_MESSAGE = 'El enlace venció o ya se usó. Pide uno nuevo.'

export type RecoveryLink = { type: 'valid'; url: string } | { type: 'expired' } | null

/** Only the dedicated reset callback is allowed to start password recovery. */
export function parseRecoveryLink(value: string): RecoveryLink {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'gestion-casos:' || url.hostname !== 'auth' || url.pathname !== '/reset')
    return null

  const query = new URLSearchParams(url.search)
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''))
  if (
    query.has('error') ||
    query.has('error_code') ||
    fragment.has('error') ||
    fragment.has('error_code')
  )
    return { type: 'expired' }
  if (fragment.get('type') !== 'recovery') return null
  if (!fragment.get('access_token') || !fragment.get('refresh_token')) return { type: 'expired' }
  return { type: 'valid', url: value }
}
