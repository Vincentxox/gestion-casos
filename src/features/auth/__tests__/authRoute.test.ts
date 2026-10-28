import { getAuthenticatedRoute } from '../authRoute'

test('la empresa inactiva tiene prioridad sobre el nombre faltante', () => {
  expect(
    getAuthenticatedRoute({ organizationId: 'org', organizationActive: false, fullName: '' }),
  ).toBe('inactive')
})

test('una empresa reactivada vuelve a la app', () => {
  expect(
    getAuthenticatedRoute({ organizationId: 'org', organizationActive: true, fullName: 'Ana' }),
  ).toBe('main')
})

test('la persona sin nombre completa su perfil si la empresa está activa', () => {
  expect(
    getAuthenticatedRoute({ organizationId: 'org', organizationActive: true, fullName: ' ' }),
  ).toBe('completeName')
})

test('la persona sin empresa sigue esperando acceso', () => {
  expect(
    getAuthenticatedRoute({ organizationId: null, organizationActive: null, fullName: 'Ana' }),
  ).toBe('pending')
})
