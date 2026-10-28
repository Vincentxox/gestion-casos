import { act, renderHook } from '@testing-library/react-native'
import { onlineManager } from '@tanstack/react-query'

import { useCasePullRefresh } from '../useCasePullRefresh'

test('apaga el indicador después de una recarga manual aunque fallen ambas consultas', async () => {
  const refetchCases = jest.fn().mockRejectedValue(new Error('Sin conexión'))
  const refetchCounts = jest.fn().mockRejectedValue(new Error('Sin conexión'))
  const updateRange = jest.fn()
  const { result } = await renderHook(() =>
    useCasePullRefresh(refetchCases, refetchCounts, updateRange),
  )

  await act(async () => result.current.refresh())

  expect(updateRange).toHaveBeenCalledTimes(1)
  expect(refetchCases).toHaveBeenCalledTimes(1)
  expect(refetchCounts).toHaveBeenCalledTimes(1)
  expect(result.current.refreshing).toBe(false)
})

test('sin conexión no deja el indicador girando por consultas pausadas', async () => {
  const isOnline = jest.spyOn(onlineManager, 'isOnline').mockReturnValue(false)
  const refetchCases = jest.fn()
  const refetchCounts = jest.fn()
  const { result } = await renderHook(() =>
    useCasePullRefresh(refetchCases, refetchCounts, jest.fn()),
  )
  try {
    await act(async () => result.current.refresh())
    expect(result.current.refreshing).toBe(false)
    expect(refetchCases).not.toHaveBeenCalled()
    expect(refetchCounts).not.toHaveBeenCalled()
  } finally {
    isOnline.mockRestore()
  }
})
