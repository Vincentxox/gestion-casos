import NetInfo from '@react-native-community/netinfo'
import { focusManager, onlineManager } from '@tanstack/react-query'
import { AppState } from 'react-native'

import { registerQueryLifecycle } from '../queryLifecycle'

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn() },
}))

const addNetworkListener = NetInfo.addEventListener as jest.Mock

test('sincroniza conexión y foco de TanStack Query con el teléfono', () => {
  const unsubscribeNetwork = jest.fn()
  const removeAppListener = jest.fn()
  addNetworkListener.mockReturnValue(unsubscribeNetwork)
  const setEventListener = jest.spyOn(onlineManager, 'setEventListener')
  const setOnline = jest.fn()
  const setFocused = jest.spyOn(focusManager, 'setFocused')
  const appListener = jest
    .spyOn(AppState, 'addEventListener')
    .mockReturnValue({ remove: removeAppListener } as ReturnType<typeof AppState.addEventListener>)

  const unregister = registerQueryLifecycle()
  const onlineListener = setEventListener.mock.calls[0]![0]
  const stopNetwork = onlineListener(setOnline)
  const networkListener = addNetworkListener.mock.calls.at(-1)![0]
  networkListener({ isConnected: false, isInternetReachable: false })
  expect(setOnline).toHaveBeenCalledWith(false)
  networkListener({ isConnected: true, isInternetReachable: true })
  expect(setOnline).toHaveBeenCalledWith(true)

  const onAppStateChange = appListener.mock.calls[0]![1]!
  onAppStateChange('background')
  expect(setFocused).toHaveBeenCalledWith(false)
  onAppStateChange('active')
  expect(setFocused).toHaveBeenCalledWith(true)

  stopNetwork?.()
  unregister()
  expect(unsubscribeNetwork).toHaveBeenCalled()
  expect(removeAppListener).toHaveBeenCalled()
  setEventListener.mockRestore()
  setFocused.mockRestore()
  appListener.mockRestore()
})
