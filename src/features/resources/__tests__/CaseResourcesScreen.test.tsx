import { fireEvent, render } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AppFeedback } from '@/components/feedback/AppFeedback'

import { CaseResourcesScreen } from '../screens/CaseResourcesScreen'
import type { CaseUsageRecord } from '../types'

const usage: CaseUsageRecord = {
  id: 'usage-1',
  caseId: 'case-1',
  kind: 'recurso',
  resourceId: 'resource-1',
  resourceKind: 'material',
  resourceName: 'Tubo PVC',
  unit: 'unidad',
  unitCost: 5,
  quantity: 2,
  hours: null,
  technicianId: null,
  technicianName: null,
  notes: null,
  createdAt: '2026-10-24T12:00:00Z',
}

jest.mock('@/features/cases/useCases', () => ({
  useCaseDetail: () => ({ data: { targetAreaId: 'area-1' }, isLoading: false, error: null }),
  useCaseActions: () => ({ data: { recursos: { allowed: true } }, isPending: false, error: null }),
  useAssignableProfiles: () => ({ data: [], error: null }),
}))
jest.mock('../useResources', () => ({
  useCaseUsages: () => ({ data: [usage], isLoading: false, isRefetching: false, error: null }),
  useResources: () => ({ data: [], isLoading: false, error: null }),
  useAddCaseUsage: () => ({ isPending: false }),
  useUpdateCaseUsage: () => ({ isPending: false }),
  useDeleteCaseUsage: () => ({ isPending: false }),
}))

function renderScreen() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <CaseResourcesScreen
        route={{ params: { caseId: 'case-1' } } as never}
        navigation={{} as never}
      />
    </SafeAreaProvider>,
  )
}

test('el recurso usado muestra un solo menú de 44 px con Editar y Quitar', async () => {
  const screen = await renderScreen()
  expect(screen.queryByRole('button', { name: 'Corregir registro' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Eliminar registro' })).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Opciones de Tubo PVC' }))
  expect(screen.getByText('Opciones del registro')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Editar' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Quitar' })).toBeTruthy()
})

test('Quitar pide confirmación antes de eliminar', async () => {
  const feedback = jest.spyOn(AppFeedback, 'show').mockImplementation(jest.fn())
  const screen = await renderScreen()
  await fireEvent.press(screen.getByRole('button', { name: 'Opciones de Tubo PVC' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Quitar' }))
  expect(feedback).toHaveBeenCalledWith(
    'Eliminar registro',
    '¿Deseas quitar este uso de la solicitud?',
    expect.any(Array),
  )
  feedback.mockRestore()
})
