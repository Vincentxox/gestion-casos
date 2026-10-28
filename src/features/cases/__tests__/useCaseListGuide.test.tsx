import { act, renderHook, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { useCaseListGuide } from '../useCaseListGuide'

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}))

beforeEach(() => {
  jest.clearAllMocks()
  ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
  ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)
})

test('primera vez por persona y Entendido persiste el aviso', async () => {
  const { result } = await renderHook(() => useCaseListGuide('person-1'))
  await waitFor(() => expect(result.current.show).toBe(true))
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('case-list-guide:person-1', 'pending')
  await act(async () => result.current.markSeen())
  expect(result.current.show).toBe(false)
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('case-list-guide:person-1', 'seen')
})

test('aviso visto, almacenamiento fallido o usuario ausente no muestra aviso', async () => {
  ;(AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('seen')
  const saved = await renderHook(() => useCaseListGuide('person-2'))
  await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith('case-list-guide:person-2'))
  expect(saved.result.current.show).toBe(false)
  await saved.unmount()

  ;(AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage unavailable'))
  const failed = await renderHook(() => useCaseListGuide('person-3'))
  await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith('case-list-guide:person-3'))
  expect(failed.result.current.show).toBe(false)
  await failed.unmount()

  const anonymous = await renderHook(() => useCaseListGuide(undefined))
  expect(anonymous.result.current.show).toBe(false)
})

test('no muestra el aviso si no puede guardar que se inició', async () => {
  ;(AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage unavailable'))
  const { result } = await renderHook(() => useCaseListGuide('person-4'))
  await waitFor(() =>
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('case-list-guide:person-4', 'pending'),
  )
  expect(result.current.show).toBe(false)
})
