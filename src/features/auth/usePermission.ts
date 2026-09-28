import { useAuthStore } from '@/store/authStore'

import { hasPermission, type AppPermission } from './permissions'

export function usePermission(permission: AppPermission) {
  const role = useAuthStore((state) => state.profile?.role)

  return hasPermission(role, permission)
}
