import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { countCasesByStatus, listCases } from '../caseService'
import { useCaseCounts, useCases } from '../useCases'

jest.mock('@tanstack/react-query', () => ({
  keepPreviousData: jest.requireActual('@tanstack/react-query').keepPreviousData,
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
  priorities: null,
  createdFrom: null,
  createdTo: null,
  overdueOnly: false,
  unassignedOnly: false,
  searchText: 'motor',
  sort: 'recientes' as const,
}

test('usa páginas de 30 y separa la clave por filtros', async () => {
  useCases(filters)
  const options = (useInfiniteQuery as jest.Mock).mock.calls[0]?.[0]
  expect(options.queryKey).toEqual(['cases', 'search', filters])
  expect(options.initialPageParam).toBe(0)
  expect(options.placeholderData).toBe(keepPreviousData)
  expect(options.getNextPageParam(new Array(30).fill({}), [new Array(30).fill({})])).toBe(1)
  expect(options.getNextPageParam([{}], [new Array(30).fill({}), [{}]])).toBeUndefined()
  await options.queryFn({ pageParam: 1 })
  expect(listCases).toHaveBeenCalledWith(filters, 1)
})

test('los conteos respetan estados y filtros, pero no el orden', async () => {
  useCaseCounts(filters)
  const options = (useQuery as jest.Mock).mock.calls[0]?.[0]
  expect(options.queryKey).toEqual([
    'cases',
    'counts',
    'todas',
    ['solicitado'],
    null,
    null,
    null,
    false,
    false,
    'motor',
  ])
  expect(options.placeholderData).toBe(keepPreviousData)
  await options.queryFn()
  expect(countCasesByStatus).toHaveBeenCalledWith(filters)
})
