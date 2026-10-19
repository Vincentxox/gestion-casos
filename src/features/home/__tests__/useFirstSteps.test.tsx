import { act, renderHook, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFirstSteps } from '../useFirstSteps'

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}))

beforeEach(() => {
  jest.clearAllMocks()
  ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
  ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)
})

test('guarda el avance y permite ocultar la tarjeta por persona', async () => {
  const { result } = await renderHook(() => useFirstSteps('member-1'))
  await waitFor(() => expect(result.current.loaded).toBe(true))
  await act(async () => result.current.complete('profile'))
  expect(result.current.completed).toEqual(['profile'])
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    'home-first-steps:member-1',
    JSON.stringify({ completed: ['profile'], hidden: false }),
  )
  await act(async () => result.current.hide())
  expect(result.current.hidden).toBe(true)
})

test('recupera el avance previo y tolera almacenamiento no disponible', async () => {
  ;(AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
    JSON.stringify({ completed: ['profile'], hidden: true }),
  )
  const saved = await renderHook(() => useFirstSteps('member-2'))
  await waitFor(() => expect(saved.result.current.completed).toEqual(['profile']))
  expect(saved.result.current.hidden).toBe(true)
  await saved.unmount()

  ;(AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Sin almacenamiento'))
  const unavailable = await renderHook(() => useFirstSteps('member-3'))
  await waitFor(() => expect(unavailable.result.current.loaded).toBe(true))
  expect(unavailable.result.current.completed).toEqual([])
})
