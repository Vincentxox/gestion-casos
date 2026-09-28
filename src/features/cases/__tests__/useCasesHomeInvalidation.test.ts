import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCreateCase, useChangeCaseStatus } from '../useCases'

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}))
jest.mock('../caseService', () => ({ createCase: jest.fn(), changeCaseStatus: jest.fn() }))
jest.mock('@/features/home/useHomeSummary', () => ({ homeSummaryQueryKey: ['home-summary'] }))

test.each([useCreateCase, () => useChangeCaseStatus('case-1')])(
  'invalida casos y resumen al modificar una solicitud',
  async (hook) => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined)
    ;(useQueryClient as jest.Mock).mockReturnValue({ invalidateQueries })
    hook()
    const options = (useMutation as jest.Mock).mock.calls.at(-1)?.[0]
    await options.onSuccess(undefined, { action: 'aceptar', comment: '' })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['cases'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['home-summary'] })
  },
)
