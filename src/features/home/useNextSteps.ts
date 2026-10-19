import { useQuery } from '@tanstack/react-query'

import { listNextSteps } from './homeService'
import { nextStepsQueryKey } from './nextStepsQueryKey'

export function useNextSteps(enabled = true) {
  return useQuery({ queryKey: nextStepsQueryKey, queryFn: listNextSteps, enabled })
}
