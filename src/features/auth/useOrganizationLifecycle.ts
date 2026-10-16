import NetInfo from '@react-native-community/netinfo'
import { useEffect } from 'react'
import { AppState } from 'react-native'

import { queryClient } from '@/config/queryClient'
import { resumePendingPhotos } from '@/features/photos/uploadQueue'
import { photosQueryKey } from '@/features/photos/usePhotos'

import type { Profile } from './types'

export function useOrganizationLifecycle({
  userId,
  organizationId,
  organizationActive,
  authenticated,
  refreshProfile,
}: {
  userId: string | undefined
  organizationId: string | null | undefined
  organizationActive: boolean | null | undefined
  authenticated: boolean
  refreshProfile: () => Promise<Profile | null>
}) {
  useEffect(() => {
    if (!authenticated || !userId || !organizationId || organizationActive === false) return
    const resume = (mode: 'startup' | 'reconnect') =>
      void resumePendingPhotos(
        userId,
        (caseId) => {
          void queryClient.invalidateQueries({ queryKey: [...photosQueryKey, caseId] })
        },
        mode,
      )
    resume('startup')
    let wasConnected: boolean | null = null
    const unsubscribe = NetInfo.addEventListener((network) => {
      if (network.isConnected && wasConnected === false) resume('reconnect')
      wasConnected = network.isConnected
    })
    return () => unsubscribe()
  }, [authenticated, userId, organizationId, organizationActive])

  useEffect(() => {
    if (!authenticated || !organizationId) return
    let previousState = AppState.currentState
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && previousState !== 'active') {
        void refreshProfile().catch(() => {})
      }
      previousState = nextState
    })
    return () => subscription.remove()
  }, [authenticated, organizationId, refreshProfile])
}
