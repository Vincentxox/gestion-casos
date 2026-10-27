import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect } from 'react'

import { AppFeedback } from '@/components/feedback/AppFeedback'
import { getMyOrganizationCreationRequest } from '@/features/auth/organizationRequestService'
import type { Profile } from '@/features/auth/types'

const keyFor = (userId: string, organizationId: string) =>
  `approved-organization-notice:${userId}:${organizationId}`

/**
 * Al aprobar su solicitud, la persona entra directo a su empresa nueva y nunca ve el panel verde
 * de «Únete a tu empresa». Este aviso lo muestra una sola vez, la primera vez que llega a Inicio.
 * Para todos los demás administradores se marca como visto tras una sola consulta.
 */
export function useApprovedOrganizationNotice(profile: Profile | null) {
  const userId = profile?.id
  const organizationId = profile?.organizationId
  const organizationName = profile?.organizationName
  const isAdmin = profile?.role === 'administrador'

  useEffect(() => {
    if (!userId || !organizationId || !organizationName || !isAdmin) return
    const key = keyFor(userId, organizationId)
    let active = true
    void (async () => {
      try {
        if (await AsyncStorage.getItem(key)) return
        const request = await getMyOrganizationCreationRequest()
        if (!active) return
        await AsyncStorage.setItem(key, '1')
        if (request?.status !== 'aprobada' || request.organizationName !== organizationName) return
        AppFeedback.show(
          `${organizationName} ya está creada`,
          'Eres su administrador. Ya puedes configurar las áreas e invitar a tu equipo.',
          { tone: 'success', icon: 'checkmark-circle-outline' },
        )
      } catch {
        // Sin red o sin almacenamiento: se intenta de nuevo la próxima vez.
      }
    })()
    return () => {
      active = false
    }
  }, [userId, organizationId, organizationName, isAdmin])
}
