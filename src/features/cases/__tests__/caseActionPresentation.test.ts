import { getCaseActionMeta, getSecondaryActionPresentation } from '../caseActionPresentation'

test('distingue asignación inicial y reasignación en el detalle', () => {
  expect(getCaseActionMeta('asignar', null).label).toBe('Asignar personal')
  expect(getCaseActionMeta('asignar', 'responsable-actual').label).toBe('Reasignar personal')
  expect(getCaseActionMeta('asignar', 'responsable-actual').description).toBe(
    'Cambia la persona responsable',
  )
})

test('muestra una única acción de cancelar o rechazar como botón de peligro', () => {
  expect(getSecondaryActionPresentation(['cancelar'])).toEqual({
    kind: 'direct',
    action: 'cancelar',
    variant: 'danger',
  })
  expect(getSecondaryActionPresentation(['rechazar'])).toEqual({
    kind: 'direct',
    action: 'rechazar',
    variant: 'danger',
  })
})

test('mantiene el menú cuando hay varias acciones secundarias', () => {
  expect(getSecondaryActionPresentation(['rechazar', 'cancelar'])).toEqual({ kind: 'menu' })
  expect(getSecondaryActionPresentation([])).toEqual({ kind: 'none' })
})
