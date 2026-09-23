import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApproveAccessRequest, useRejectAccessRequest } from '../useAccessRequests'

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}))
jest.mock('../accessRequestService', () => ({
  approveAccessRequest: jest.fn(),
  rejectAccessRequest: jest.fn(),
  listAccessRequests: jest.fn(),
}))
jest.mock('@/features/home/useHomeSummary', () => ({ homeSummaryQueryKey: ['home-summary'] }))

test.each([useApproveAccessRequest, useRejectAccessRequest])(
  'invalida bandeja y resumen tras decidir un acceso',
  async (hook) => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined)
    ;(useQueryClient as jest.Mock).mockReturnValue({ invalidateQueries })
    hook()
    const options = (useMutation as jest.Mock).mock.calls.at(-1)?.[0]
    await options.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['access-requests'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['home-summary'] })
  },
)
