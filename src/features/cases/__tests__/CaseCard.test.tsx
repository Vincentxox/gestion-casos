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
  test('mantiene la tarjeta pulsable sin flecha y alinea el avatar a la derecha', async () => {
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
})
