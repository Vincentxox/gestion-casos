import NetInfo from '@react-native-community/netinfo'
import { focusManager, onlineManager } from '@tanstack/react-query'
import { AppState, Platform } from 'react-native'

async function waitForSession(beforeFocus: () => Promise<unknown>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      Promise.resolve()
        .then(beforeFocus)
        .catch(() => undefined),
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, timeoutMs)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export function registerQueryLifecycle(
  beforeFocus?: () => Promise<unknown>,
  focusTimeoutMs = 10_000,
) {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(state.isConnected === true && state.isInternetReachable !== false)
    }),
  )

  if (Platform.OS === 'web') return () => onlineManager.setEventListener(() => () => {})

  let active = AppState.currentState === 'active'
  let generation = 0
  let disposed = false
  const updateFocus = (isActive: boolean) => {
    active = isActive
    const currentGeneration = ++generation
    if (!isActive) {
      focusManager.setFocused(false)
      return
    }
    if (!beforeFocus) {
      focusManager.setFocused(true)
      return
    }
    focusManager.setFocused(false)
    void waitForSession(beforeFocus, focusTimeoutMs).then(() => {
      if (!disposed && active && generation === currentGeneration) focusManager.setFocused(true)
    })
  }

  updateFocus(active)
  const subscription = AppState.addEventListener('change', (status) => {
    updateFocus(status === 'active')
  })

  return () => {
    disposed = true
    generation++
    subscription.remove()
    focusManager.setFocused(undefined)
    onlineManager.setEventListener(() => () => {})
  }
}
