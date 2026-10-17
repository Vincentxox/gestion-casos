import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  useAssignCase,
  useCaseActions,
  useCreateCase,
  useChangeCaseStatus,
  useUpdateCase,
  useSendCaseMessage,
} from '../useCases'
import { getCaseActions } from '../caseService'

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}))
jest.mock('../caseService', () => ({
  createCase: jest.fn(),
  changeCaseStatus: jest.fn(),
  updateCase: jest.fn(),
  assignCase: jest.fn(),
  getCaseActions: jest.fn(),
  sendCaseMessage: jest.fn(),
}))
jest.mock('@/features/home/useHomeSummary', () => ({ homeSummaryQueryKey: ['home-summary'] }))
jest.mock('@/features/notifications/notificationQueryKey', () => ({
  notificationsQueryKey: ['notifications'],
}))

test.each([
  useCreateCase,
  () => useChangeCaseStatus('case-1'),
  () => useUpdateCase('case-1'),
  () => useAssignCase('case-1'),
])('invalida casos y resumen al modificar una solicitud', async (hook) => {
  const invalidateQueries = jest.fn().mockResolvedValue(undefined)
  ;(useQueryClient as jest.Mock).mockReturnValue({ invalidateQueries })
  hook()
  const options = (useMutation as jest.Mock).mock.calls.at(-1)?.[0]
  await options.onSuccess(undefined, { action: 'aceptar', comment: '' })
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['cases'] })
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['home-summary'] })
})

test('consulta las acciones con la clave del caso y conserva una lista vacía', async () => {
  useCaseActions('case-1')
  const options = (useQuery as jest.Mock).mock.calls.at(-1)?.[0]
  expect(options.queryKey).toEqual(['cases', 'case-1', 'actions'])
  ;(getCaseActions as jest.Mock).mockResolvedValue({})
  await expect(options.queryFn()).resolves.toEqual({})
})

test('al enviar un mensaje invalida historial, acciones y avisos', async () => {
  const invalidateQueries = jest.fn().mockResolvedValue(undefined)
  ;(useQueryClient as jest.Mock).mockReturnValue({ invalidateQueries })
  useSendCaseMessage('case-1')
  const options = (useMutation as jest.Mock).mock.calls.at(-1)?.[0]
  await options.onSuccess(42, 'Hola')
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['cases', 'case-1', 'history'] })
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['cases', 'case-1', 'actions'] })
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['notifications'] })
})
