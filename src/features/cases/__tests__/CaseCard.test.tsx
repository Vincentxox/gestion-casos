import { fireEvent, render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'

import { CaseCard } from '../components/CaseCard'
import type { CaseRecord } from '../types'

const item: CaseRecord = {
  id: 'case-1',
  caseNumber: 'CAS-2026-00001',
  title: 'Reparar bomba',
  description: 'La bomba presenta una falla',
  category: 'Mantenimiento',
  categoryId: 'category-1',
  minAfterPhotos: 0,
  requestingAreaId: 'area-1',
  requestingAreaName: 'Administración',
  targetAreaId: 'area-2',
  targetAreaName: 'Mantenimiento',
  location: 'Oficina 1',
  priority: 'media',
  status: 'asignado',
  createdBy: 'user-1',
  assignedTo: 'user-2',
  creatorName: 'Vincent',
  assigneeName: 'Ana Pérez',
  createdAt: '2026-09-28T10:00:00Z',
  updatedAt: '2026-09-28T10:00:00Z',
}

describe('CaseCard', () => {
  test('mantiene la fila pulsable sin flecha y muestra al responsable', async () => {
    const onPress = jest.fn()
    const screen = await render(<CaseCard item={item} onPress={onPress} />)

    await fireEvent.press(screen.getByRole('button'))
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(screen.toJSON())).not.toContain('chevron-forward')

    const avatar = screen.getByLabelText('Ana Pérez')
    expect(StyleSheet.flatten(avatar.parent?.props.style)).toMatchObject({
      flexDirection: 'row',
      alignItems: 'center',
    })
  })

  test('muestra Sin asignar en lugar del avatar', async () => {
    const screen = await render(
      <CaseCard item={{ ...item, assignedTo: null, assigneeName: null }} onPress={jest.fn()} />,
    )

    expect(screen.getByText('Sin asignar')).toBeTruthy()
  })

  test('distingue una solicitud con aceptación vencida', async () => {
    const screen = await render(
      <CaseCard item={{ ...item, overdueStage: 'aceptacion' }} onPress={jest.fn()} />,
    )
    expect(screen.getByText('· Vencida · aceptación')).toBeTruthy()
    expect(screen.getByRole('button', { name: /vencida por aceptacion/ })).toBeTruthy()
  })

  test('un caso vencido conserva su estado para distinguir asignado de en espera', async () => {
    const asignado = await render(
      <CaseCard
        item={{ ...item, status: 'asignado', overdueStage: 'resolucion' }}
        onPress={jest.fn()}
      />,
    )
    expect(asignado.getByText('Asignada')).toBeTruthy()
    expect(asignado.getByText('· Vencida · resolución')).toBeTruthy()
    asignado.unmount()

    const espera = await render(
      <CaseCard
        item={{ ...item, status: 'en_espera', overdueStage: 'resolucion' }}
        onPress={jest.fn()}
      />,
    )
    expect(espera.getByText('En espera')).toBeTruthy()
    expect(espera.getByText('· Vencida · resolución')).toBeTruthy()
  })
})
