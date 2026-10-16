import type { Profile } from './types'

export type AuthenticatedRoute = 'inactive' | 'completeName' | 'main' | 'pending'

export function getAuthenticatedRoute(
  profile: Pick<Profile, 'organizationId' | 'organizationActive' | 'fullName'>,
): AuthenticatedRoute {
  if (profile.organizationId && profile.organizationActive === false) return 'inactive'
  if (!profile.fullName?.trim()) return 'completeName'
  return profile.organizationId ? 'main' : 'pending'
}
