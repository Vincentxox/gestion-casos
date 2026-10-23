import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useState } from 'react'

export function useCaseListGuide(userId: string | undefined) {
  const key = userId ? `case-list-guide:${userId}` : null
  const [state, setState] = useState<{ key: string | null; ready: boolean; seen: boolean }>({
    key: null,
    ready: false,
    seen: true,
  })
  useEffect(() => {
    if (!key) return
    let active = true
    void AsyncStorage.getItem(key)
      .then(async (value) => {
        if (value === null) await AsyncStorage.setItem(key, 'pending')
        if (active) setState({ key, ready: true, seen: value === 'seen' })
      })
      .catch(() => {
        // Si no podemos recordar que se mostró, no arriesgamos repetirlo.
        if (active) setState({ key, ready: true, seen: true })
      })
    return () => {
      active = false
    }
  }, [key])

  const markSeen = useCallback(async () => {
    setState({ key, ready: true, seen: true })
    if (key) {
      try {
        await AsyncStorage.setItem(key, 'seen')
      } catch {
        /* No repetir en esta sesión. */
      }
    }
  }, [key])

  return { show: Boolean(key && state.key === key && state.ready && !state.seen), markSeen }
}
