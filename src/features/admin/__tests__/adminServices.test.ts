import { supabase } from '@/services/supabase/client'

import { createInvitation, listInvitations, revokeInvitation } from '../invitationService'
import { invitationSchema } from '../invitationSchemas'
import {
  getOrganization,
  getOrganizationJoinCode,
  regenerateOrganizationJoinCode,
  renameOrganization,
} from '../organizationService'
import { listManagedProfiles, setMemberAccess } from '../userService'

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}))

const from = supabase.from as jest.Mock
const rpc = supabase.rpc as jest.Mock
const query = {
  select: jest.fn(),
  eq: jest.fn(),
  order: jest.fn(),
  single: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  from.mockReturnValue(query)
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.update.mockReturnValue(query)
})

test('valida correo y área para roles técnicos', () => {
  expect(
    invitationSchema.safeParse({ email: 'ana@example.com', role: 'tecnico', areaId: null }).success,
  ).toBe(false)
  expect(
    invitationSchema.safeParse({ email: 'ana@example.com', role: 'solicitante', areaId: null })
      .success,
  ).toBe(true)
})

test('lista invitaciones y convierte nombres de campos', async () => {
  query.order.mockResolvedValue({
    data: [
      {
        id: '1',
        email: 'ana@example.com',
        role: 'solicitante',
        area_id: null,
        accepted_at: null,
        revoked_at: null,
        created_at: '2026-01-01',
      },
    ],
    error: null,
  })
  await expect(listInvitations()).resolves.toEqual([
    {
      id: '1',
      email: 'ana@example.com',
      role: 'solicitante',
      areaId: null,
      acceptedAt: null,
      revokedAt: null,
      createdAt: '2026-01-01',
    },
  ])
})

test('normaliza correo y propaga errores al invitar', async () => {
  query.insert.mockResolvedValue({ error: null })
  await createInvitation({ email: '  ANA@EXAMPLE.COM ', role: 'solicitante', areaId: null })
  expect(query.insert).toHaveBeenCalledWith({
    email: 'ana@example.com',
    role: 'solicitante',
    area_id: null,
  })
  const error = new Error('duplicate key')
  query.insert.mockResolvedValue({ error })
  await expect(
    createInvitation({ email: 'ana@example.com', role: 'solicitante', areaId: null }),
  ).rejects.toBe(error)
})

test('revoca una invitación por id', async () => {
  query.eq.mockResolvedValue({ error: null })
  await revokeInvitation('invite-1')
  expect(query.update).toHaveBeenCalledWith({ revoked_at: expect.any(String) })
  expect(query.eq).toHaveBeenCalledWith('id', 'invite-1')
})

test('lee y renombra únicamente la empresa indicada', async () => {
  query.single.mockResolvedValue({ data: { id: 'org', name: 'Empresa' }, error: null })
  await expect(getOrganization('org')).resolves.toEqual({ id: 'org', name: 'Empresa' })
  await renameOrganization('org', '  Empresa  ')
  expect(query.update).toHaveBeenCalledWith({ name: 'Empresa' })
  expect(query.eq).toHaveBeenCalledWith('id', 'org')
})

test('consulta y regenera el código por RPC', async () => {
  rpc
    .mockResolvedValueOnce({ data: 'ABCD-1234', error: null })
    .mockResolvedValueOnce({ data: 'EFGH-5678', error: null })
  await expect(getOrganizationJoinCode()).resolves.toBe('ABCD-1234')
  await expect(regenerateOrganizationJoinCode()).resolves.toBe('EFGH-5678')
  expect(rpc).toHaveBeenCalledWith('get_organization_join_code')
  expect(rpc).toHaveBeenCalledWith('regenerate_organization_join_code')
})

test('mapea perfiles y actualiza rol y área con la RPC', async () => {
  query.order.mockResolvedValue({
    data: [
      {
        id: 'u1',
        full_name: ' Ana ',
        role: 'tecnico',
        area_id: 'a1',
        area: { name: 'Tecnología' },
      },
    ],
    error: null,
  })
  await expect(listManagedProfiles()).resolves.toEqual([
    { id: 'u1', fullName: 'Ana', role: 'tecnico', areaId: 'a1', areaName: 'Tecnología' },
  ])
  rpc.mockResolvedValue({ error: null })
  await setMemberAccess('u1', 'tecnico', 'a1')
  expect(rpc).toHaveBeenCalledWith('set_member_access', {
    target_user_id: 'u1',
    new_role: 'tecnico',
    new_area_id: 'a1',
  })
})

test('propaga fallos del servidor sin ocultarlos', async () => {
  const error = new Error('Acceso denegado')
  query.order.mockResolvedValue({ data: null, error })
  await expect(listInvitations()).rejects.toBe(error)
  await expect(listManagedProfiles()).rejects.toBe(error)
  query.single.mockResolvedValue({ data: null, error })
  await expect(getOrganization('org')).rejects.toBe(error)
  await expect(renameOrganization('org', 'Empresa')).rejects.toBe(error)
  query.eq.mockResolvedValue({ error })
  await expect(revokeInvitation('invite')).rejects.toBe(error)
  rpc.mockResolvedValue({ error })
  await expect(setMemberAccess('u1', 'tecnico', 'a1')).rejects.toBe(error)
})

test('muestra valores seguros para perfiles incompletos', async () => {
  query.order.mockResolvedValue({
    data: [{ id: 'u1', full_name: ' ', role: 'solicitante', area_id: null, area: null }],
    error: null,
  })
  await expect(listManagedProfiles()).resolves.toMatchObject([
    { fullName: 'Usuario sin nombre', areaName: null },
  ])
})
