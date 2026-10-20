import { useCallback, useState } from 'react'
import { onlineManager } from '@tanstack/react-query'

export function useCasePullRefresh(
  refetchCases: () => Promise<unknown>,
  refetchCounts: () => Promise<unknown>,
  updateRange: () => void,
) {
  const [refreshing, setRefreshing] = useState(false)
  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      updateRange()
      // Una consulta pausada por NetInfo no resuelve hasta recuperar la conexión.
      if (!onlineManager.isOnline()) return
      await Promise.allSettled([
        Promise.resolve().then(refetchCases),
        Promise.resolve().then(refetchCounts),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [refetchCases, refetchCounts, updateRange])

  return { refreshing, refresh }
}
