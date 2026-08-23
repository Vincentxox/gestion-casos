import { getPermissions, hasPermission } from '../permissions'

describe('matriz RBAC', () => {
  test('el administrador puede ejecutar todas las funciones definidas', () => {
    expect(getPermissions('administrador')).toEqual(
      expect.arrayContaining([
        'cases.read',
        'cases.create',
        'cases.update',
        'cases.assign',
        'reports.read',
        'audit.read',
        'users.manage',
      ]),
    )
  })

  test('el auditor puede consultar casos, reportes y auditoría', () => {
    expect(getPermissions('auditor')).toEqual(['cases.read', 'reports.read', 'audit.read'])
    expect(hasPermission('auditor', 'cases.create')).toBe(false)
    expect(hasPermission('auditor', 'users.manage')).toBe(false)
  })

  test('el visualizador puede consultar y crear casos', () => {
    expect(getPermissions('visualizador')).toEqual(['cases.read', 'cases.create'])
    expect(hasPermission('visualizador', 'cases.read')).toBe(true)
    expect(hasPermission('visualizador', 'cases.create')).toBe(true)
    expect(hasPermission('visualizador', 'cases.update')).toBe(false)
    expect(hasPermission('visualizador', 'cases.assign')).toBe(false)
    expect(hasPermission('visualizador', 'reports.read')).toBe(false)
  })

  test('un usuario sin perfil no recibe permisos', () => {
    expect(getPermissions(null)).toEqual([])
    expect(hasPermission(undefined, 'cases.read')).toBe(false)
  })
})
