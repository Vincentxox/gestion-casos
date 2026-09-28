import { fireEvent, render, waitFor } from '@testing-library/react-native'

import { CatalogActionSheet } from '../CatalogActionSheet'

test('ofrece editar y desactivar con el segundo paso destructivo', async () => {
  const onClose = jest.fn()
  const onEdit = jest.fn()
  const onToggle = jest.fn()
  const screen = await render(
    <CatalogActionSheet
      name="Mantenimiento"
      active
      visible
      onClose={onClose}
      onEdit={onEdit}
      onToggle={onToggle}
    />,
  )

  expect(screen.getByText('Opciones de Mantenimiento')).toBeTruthy()
  await fireEvent.press(screen.getByText('Editar'))
  await waitFor(() => expect(onEdit).toHaveBeenCalledTimes(1))
  expect(onToggle).not.toHaveBeenCalled()
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('ofrece activar un catálogo inactivo', async () => {
  const onToggle = jest.fn()
  const screen = await render(
    <CatalogActionSheet
      name="Cable"
      active={false}
      visible
      onClose={jest.fn()}
      onEdit={jest.fn()}
      onToggle={onToggle}
    />,
  )

  await fireEvent.press(screen.getByText('Activar'))
  await waitFor(() => expect(onToggle).toHaveBeenCalledTimes(1))
})
