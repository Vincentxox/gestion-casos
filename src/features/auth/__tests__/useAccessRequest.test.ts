import { useQuery } from '@tanstack/react-query'
import { useMyAccessRequest } from '../useAccessRequest'

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}))
jest.mock('../accessService', () => ({
  getMyAccessRequest: jest.fn(),
  requestOrganizationAccess: jest.fn(),
  cancelMyAccessRequest: jest.fn(),
}))

test('consulta cada 45 segundos solo mientras hay una solicitud pendiente', () => {
  useMyAccessRequest()
  const options = (useQuery as jest.Mock).mock.calls[0][0]
  expect(options.refetchInterval({ state: { data: { status: 'pendiente' } } })).toBe(45_000)
  expect(options.refetchInterval({ state: { data: { status: 'rechazada' } } })).toBe(false)
  expect(options.refetchInterval({ state: { data: null } })).toBe(false)
})
