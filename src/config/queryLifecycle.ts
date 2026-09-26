import NetInfo from '@react-native-community/netinfo'
import { focusManager, onlineManager } from '@tanstack/react-query'
import { AppState, Platform } from 'react-native'

export function registerQueryLifecycle() {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(state.isConnected === true && state.isInternetReachable !== false)
    }),
  )

  if (Platform.OS === 'web') return () => onlineManager.setEventListener(() => () => {})

  focusManager.setFocused(AppState.currentState === 'active')
  const subscription = AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active')
  })

  return () => {
    subscription.remove()
    focusManager.setFocused(undefined)
    onlineManager.setEventListener(() => () => {})
  }
}
