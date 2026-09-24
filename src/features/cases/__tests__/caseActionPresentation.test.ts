import { getSecondaryActionPresentation } from '../caseActionPresentation'

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
