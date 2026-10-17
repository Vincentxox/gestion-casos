import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useAddCaseUsage, useDeleteCaseUsage, useUpdateCaseUsage } from '../useResources'

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
  useQueryClient: jest.fn(),
}))
jest.mock('../resourceService', () => ({}))
jest.mock('@/features/cases/useCases', () => ({ casesQueryKey: ['cases'] }))

test.each([useAddCaseUsage, useUpdateCaseUsage, useDeleteCaseUsage])(
  'invalida las acciones después de cambiar un recurso del caso',
  async (hook) => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined)
    ;(useQueryClient as jest.Mock).mockReturnValue({ invalidateQueries })
    hook('case-1')
    const options = (useMutation as jest.Mock).mock.calls.at(-1)?.[0]
    await options.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['cases', 'case-1'] })
  },
)
