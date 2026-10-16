import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { countCasesByStatus, listCases } from '../caseService'
import { useCaseCounts, useCases } from '../useCases'

jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: jest.fn(),
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}))
jest.mock('../caseService', () => ({
  CASE_PAGE_SIZE: 30,
  listCases: jest.fn(),
  countCasesByStatus: jest.fn(),
}))
jest.mock('@/features/home/useHomeSummary', () => ({ homeSummaryQueryKey: ['home-summary'] }))

const filters = {
  scope: 'todas' as const,
  statuses: ['solicitado' as const],
  priority: null,
  updatedSince: null,
  searchText: 'motor',
  sortPending: true,
}

test('usa páginas de 30 y separa la clave por filtros', async () => {
  useCases(filters)
  const options = (useInfiniteQuery as jest.Mock).mock.calls[0]?.[0]
  expect(options.queryKey).toEqual(['cases', 'search', filters])
  expect(options.initialPageParam).toBe(0)
  expect(options.getNextPageParam(new Array(30).fill({}), [new Array(30).fill({})])).toBe(1)
  expect(options.getNextPageParam([{}], [new Array(30).fill({}), [{}]])).toBeUndefined()
  await options.queryFn({ pageParam: 1 })
  expect(listCases).toHaveBeenCalledWith(filters, 1)
})

test('los conteos ignoran estados y orden en la clave pero respetan los demás filtros', async () => {
  useCaseCounts(filters)
  const options = (useQuery as jest.Mock).mock.calls[0]?.[0]
  expect(options.queryKey).toEqual(['cases', 'counts', 'todas', null, null, 'motor'])
  await options.queryFn()
  expect(countCasesByStatus).toHaveBeenCalledWith(filters)
})
