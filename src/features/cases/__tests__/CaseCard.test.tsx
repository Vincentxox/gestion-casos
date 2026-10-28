import { fireEvent, render, within } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'

import { colors, phaseColors } from '@/theme/tokens'
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
  priority: 'alta',
  status: 'asignado',
  createdBy: 'user-1',
  assignedTo: 'user-2',
  creatorName: 'Vincent',
  assigneeName: 'Ana Pérez',
  createdAt: '2026-09-28T10:00:00Z',
  updatedAt: '2026-09-28T10:00:00Z',
}

test('tarjeta pulsable con una etiqueta, lugar, avance y responsable', async () => {
  const onPress = jest.fn()
  const screen = await render(<CaseCard item={item} onPress={onPress} />)
  await fireEvent.press(screen.getByRole('button'))
  expect(onPress).toHaveBeenCalledTimes(1)
  expect(screen.getByText('Asignada')).toBeTruthy()
  expect(screen.getByText('Oficina 1')).toBeTruthy()
  expect(screen.getByText('Paso 2 de 5')).toBeTruthy()
  expect(screen.getByText('Ana')).toBeTruthy()
  expect(screen.queryByText(item.caseNumber)).toBeNull()
  expect(screen.queryByText('Alta')).toBeNull()
  expect(screen.getByRole('button').props.accessibilityLabel).toContain(
    'CAS-2026-00001, Reparar bomba, Asignada, prioridad alta, Oficina 1, paso 2 de 5, responsable Ana',
  )
  expect(StyleSheet.flatten(screen.getByRole('button').props.style)).toMatchObject({
    minHeight: 108,
  })
  expect(screen.queryByTestId('status-circle')).toBeNull()
})

test('vencida usa una sola etiqueta de error y mantiene el estado en texto', async () => {
  const screen = await render(
    <CaseCard item={{ ...item, overdueStage: 'resolucion' }} onPress={jest.fn()} />,
  )
  expect(screen.getByText('Vencida')).toBeTruthy()
  expect(screen.getByText('Asignada · Oficina 1')).toBeTruthy()
  expect(screen.queryByText('Asignada')).toBeNull()
  expect(screen.getByRole('button').props.accessibilityLabel).toContain('vencida por resolucion')
})

test('no agrega separador cuando la tarjeta vencida no tiene lugar', async () => {
  const screen = await render(
    <CaseCard item={{ ...item, location: '', overdueStage: 'resolucion' }} />,
  )
  expect(screen.getByText('Asignada')).toBeTruthy()
  expect(screen.queryByText(/Asignada ·/)).toBeNull()
})

test('aprobada completa la barra verde', async () => {
  const approved = await render(<CaseCard item={{ ...item, status: 'aprobado' }} />)
  expect(approved.getByText('Paso 5 de 5')).toBeTruthy()
  for (let step = 1; step <= 5; step++) {
    expect(
      StyleSheet.flatten(approved.getByTestId(`case-progress-segment-${step}`).props.style),
    ).toMatchObject({ backgroundColor: phaseColors.cerrada.fg })
  }
})

test.each(['rechazado', 'cancelado'] as const)('%s no muestra barra', async (status) => {
  const closed = await render(<CaseCard item={{ ...item, status }} />)
  expect(closed.queryByText(/Paso \d de 5/)).toBeNull()
  expect(closed.queryByTestId('case-progress-segment-1')).toBeNull()
})

test('muestra Sin asignar sin avatar', async () => {
  const screen = await render(<CaseCard item={{ ...item, assignedTo: null, assigneeName: null }} />)
  expect(screen.getByText('Sin asignar')).toBeTruthy()
  expect(screen.queryByLabelText('Ana Pérez')).toBeNull()
  expect(
    StyleSheet.flatten(screen.getByTestId('case-progress-segment-5').props.style),
  ).toMatchObject({ backgroundColor: colors.track })
})

test('solo Ayuda coloca las cuatro marcas junto a la parte que explican', async () => {
  const plain = await render(<CaseCard item={item} />)
  for (let number = 1; number <= 4; number++) {
    expect(
      plain.queryByTestId(`case-guide-marker-${number}`, { includeHiddenElements: true }),
    ).toBeNull()
  }
  await plain.unmount()

  const guided = await render(<CaseCard item={item} guideMarkers />)
  for (let number = 1; number <= 4; number++) {
    expect(
      guided.getByTestId(`case-guide-marker-${number}`, { includeHiddenElements: true }),
    ).toBeTruthy()
  }
  expect(
    within(
      guided.getByTestId('case-guide-marker-2', { includeHiddenElements: true }).parent!,
    ).getByText('Oficina 1'),
  ).toBeTruthy()
  expect(
    within(
      guided.getByTestId('case-guide-marker-3', { includeHiddenElements: true }).parent!,
    ).getByText('Paso 2 de 5'),
  ).toBeTruthy()
  expect(
    within(
      guided.getByTestId('case-guide-marker-4', { includeHiddenElements: true }).parent!,
    ).getByText('Ana'),
  ).toBeTruthy()
  expect(guided.getByLabelText(/CAS-2026-00001/).props.accessibilityLabel).not.toContain('marca')
})
