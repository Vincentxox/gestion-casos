import { useQuery } from '@tanstack/react-query'

import { listNextSteps } from '../homeService'
import { nextStepsQueryKey } from '../nextStepsQueryKey'
import { useNextSteps } from '../useNextSteps'

jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }))
jest.mock('../homeService', () => ({ listNextSteps: jest.fn() }))

test('consulta la cola con su propia clave y respeta enabled', () => {
  useNextSteps(false)
  expect(useQuery).toHaveBeenCalledWith({
    queryKey: nextStepsQueryKey,
    queryFn: listNextSteps,
    enabled: false,
  })
})
