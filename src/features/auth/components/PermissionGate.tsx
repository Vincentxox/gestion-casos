import type { ReactNode } from 'react'

import { usePermission } from '../usePermission'
import type { AppPermission } from '../permissions'

interface PermissionGateProps {
  children: ReactNode
  fallback?: ReactNode
  permission: AppPermission
}

export function PermissionGate({ children, fallback = null, permission }: PermissionGateProps) {
  return usePermission(permission) ? children : fallback
}
