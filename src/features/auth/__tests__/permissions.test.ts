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

  test('el solicitante consulta, crea y edita solicitudes propias', () => {
    expect(getPermissions('solicitante')).toEqual(['cases.read', 'cases.create', 'cases.update'])
    expect(hasPermission('solicitante', 'cases.assign')).toBe(false)
    expect(hasPermission('solicitante', 'reports.read')).toBe(false)
  })

  test('el jefe técnico revisa y asigna, pero el técnico no', () => {
    expect(hasPermission('jefe_area', 'cases.review')).toBe(true)
    expect(hasPermission('jefe_area', 'cases.assign')).toBe(true)
    expect(hasPermission('tecnico', 'cases.assign')).toBe(false)
  })

  test('un usuario sin perfil no recibe permisos', () => {
    expect(getPermissions(null)).toEqual([])
    expect(hasPermission(undefined, 'cases.read')).toBe(false)
  })
})
