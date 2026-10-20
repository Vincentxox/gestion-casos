import NetInfo from '@react-native-community/netinfo'
import { focusManager, onlineManager } from '@tanstack/react-query'
import { AppState } from 'react-native'

import { registerQueryLifecycle } from '../queryLifecycle'

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn() },
}))

const addNetworkListener = NetInfo.addEventListener as jest.Mock
const flushMicrotasks = async () => {
  for (let index = 0; index < 10; index++) await Promise.resolve()
}

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

test('espera la sesión antes de devolver el foco a las consultas', async () => {
  const originalState = AppState.currentState
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'background' })
  const setFocused = jest.spyOn(focusManager, 'setFocused')
  const listener = jest
    .spyOn(AppState, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() } as ReturnType<typeof AppState.addEventListener>)
  let completeSession: () => void = () => undefined
  const beforeFocus = jest.fn(() => new Promise<void>((resolve) => (completeSession = resolve)))
  const unregister = registerQueryLifecycle(beforeFocus)
  try {
    const onChange = listener.mock.calls[0]![1]!
    onChange('active')
    expect(setFocused).toHaveBeenLastCalledWith(false)
    await flushMicrotasks()
    expect(beforeFocus).toHaveBeenCalledTimes(1)
    completeSession()
    await flushMicrotasks()
    expect(setFocused).toHaveBeenLastCalledWith(true)
  } finally {
    unregister()
    listener.mockRestore()
    setFocused.mockRestore()
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: originalState })
  }
})

test('devuelve el foco al cumplirse el tope aunque la sesión siga esperando', async () => {
  const originalState = AppState.currentState
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'background' })
  jest.useFakeTimers()
  const setFocused = jest.spyOn(focusManager, 'setFocused')
  const listener = jest
    .spyOn(AppState, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() } as ReturnType<typeof AppState.addEventListener>)
  const unregister = registerQueryLifecycle(() => new Promise(() => undefined))
  try {
    listener.mock.calls[0]![1]!('active')
    await flushMicrotasks()
    jest.advanceTimersByTime(10_000)
    await flushMicrotasks()
    expect(setFocused).toHaveBeenLastCalledWith(true)
  } finally {
    unregister()
    listener.mockRestore()
    setFocused.mockRestore()
    jest.useRealTimers()
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: originalState })
  }
})
