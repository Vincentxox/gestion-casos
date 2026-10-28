import { supabase } from '@/services/supabase/client'
import {
  cancelOrganizationCreationRequest,
  getMyOrganizationCreationRequest,
  isPlatformAdmin,
  listOrganizationCreationRequests,
  requestOrganizationCreation,
  reviewOrganizationCreationRequest,
} from '../organizationRequestService'

jest.mock('@/services/supabase/client', () => ({ supabase: { rpc: jest.fn() } }))

const rpc = supabase.rpc as jest.Mock

beforeEach(() => jest.clearAllMocks())

test('solicita la empresa con nombre recortado y opcionales nulos', async () => {
  rpc.mockResolvedValue({ data: 'request-id', error: null })
  await expect(
    requestOrganizationCreation({
      organizationName: '  Mi Empresa  ',
      contactPhone: '',
      teamSize: '6-25',
      message: '   ',
    }),
  ).resolves.toBe('request-id')
  expect(rpc).toHaveBeenCalledWith('request_organization_creation', {
    organization_name: 'Mi Empresa',
    contact_phone: null,
    team_size: '6-25',
    message: null,
  })
})

test('consulta y cancela la solicitud propia', async () => {
  rpc.mockResolvedValueOnce({
    data: [
      {
        id: 'r1',
        organization_name: 'Empresa',
        status: 'rechazada',
        rejection_reason: 'Motivo',
        created_at: '2026-10-26',
        reviewed_at: '2026-10-27',
      },
    ],
    error: null,
  })
  await expect(getMyOrganizationCreationRequest()).resolves.toMatchObject({
    id: 'r1',
    organizationName: 'Empresa',
    rejectionReason: 'Motivo',
  })
  rpc.mockResolvedValueOnce({ data: [], error: null })
  await expect(getMyOrganizationCreationRequest()).resolves.toBeNull()
  rpc.mockResolvedValueOnce({ error: null })
  await expect(cancelOrganizationCreationRequest()).resolves.toBeUndefined()
  expect(rpc).toHaveBeenCalledWith('cancel_organization_creation_request')
})

test('consulta permisos y lista filtrada por estado', async () => {
  rpc.mockResolvedValueOnce({ data: true, error: null })
  await expect(isPlatformAdmin()).resolves.toBe(true)
  rpc.mockResolvedValueOnce({
    data: [
      {
        id: 'r2',
        organization_name: 'Nueva',
        requester_name: 'Ana',
        email: 'ana@example.test',
        status: 'pendiente',
        team_size: '1-5',
        created_at: '2026-10-26',
      },
    ],
    error: null,
  })
  await expect(listOrganizationCreationRequests('pendiente')).resolves.toMatchObject([
    { id: 'r2', organizationName: 'Nueva', requesterName: 'Ana' },
  ])
  expect(rpc).toHaveBeenCalledWith('list_organization_creation_requests', {
    requested_status: 'pendiente',
  })
})

test('revisa con null al aprobar y motivo al rechazar', async () => {
  rpc.mockResolvedValue({ data: 'org-id', error: null })
  await expect(
    reviewOrganizationCreationRequest({ requestId: 'r3', approve: true, reason: null }),
  ).resolves.toBe('org-id')
  expect(rpc).toHaveBeenCalledWith('review_organization_creation_request', {
    request_id: 'r3',
    approve: true,
    reason: null,
  })
  await reviewOrganizationCreationRequest({
    requestId: 'r3',
    approve: false,
    reason: 'Datos insuficientes',
  })
  expect(rpc).toHaveBeenCalledWith('review_organization_creation_request', {
    request_id: 'r3',
    approve: false,
    reason: 'Datos insuficientes',
  })
})

test('propaga sin reescribir los errores de todas las RPC', async () => {
  const error = new Error('Esta persona ya pertenece a una empresa')
  rpc.mockResolvedValue({ data: null, error })
  await expect(
    requestOrganizationCreation({
      organizationName: 'Empresa',
      contactPhone: '',
      teamSize: '1-5',
      message: '',
    }),
  ).rejects.toBe(error)
  await expect(cancelOrganizationCreationRequest()).rejects.toBe(error)
  await expect(getMyOrganizationCreationRequest()).rejects.toBe(error)
  await expect(isPlatformAdmin()).rejects.toBe(error)
  await expect(listOrganizationCreationRequests('pendiente')).rejects.toBe(error)
  await expect(
    reviewOrganizationCreationRequest({ requestId: 'r1', approve: true, reason: null }),
  ).rejects.toBe(error)
})
