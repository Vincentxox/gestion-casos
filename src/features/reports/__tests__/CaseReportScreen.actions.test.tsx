import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { CaseReportScreen } from '../screens/CaseReportScreen'

let mockActions: {
  data: { editar_reporte?: { allowed: boolean }; enviar_reporte?: { allowed: boolean } } | undefined
  isPending: boolean
  isFetching: boolean
  error: Error | null
} = {
  data: { editar_reporte: { allowed: true }, enviar_reporte: { allowed: true } },
  isPending: false,
  isFetching: false,
  error: null,
}
const mockSaveDraft = jest.fn().mockResolvedValue(undefined)

jest.mock('@/features/cases/useCases', () => ({
  useCaseActions: () => mockActions,
  useCaseDetail: () => ({
    data: { caseNumber: 'CAS-2026-00001', status: 'en_ejecucion', minAfterPhotos: 0 },
    isLoading: false,
    error: null,
  }),
}))
jest.mock('@/features/photos/components/PhotoGrid', () => ({ PhotoGrid: () => null }))
jest.mock('@/features/photos/uploadQueue', () => ({ listPendingPhotos: jest.fn() }))
jest.mock('@/features/photos/usePhotos', () => ({ useCasePhotos: () => ({ data: [] }) }))
jest.mock('@/features/resources/useResources', () => ({ useCaseUsages: () => ({ data: [] }) }))
jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({ profile: { id: 'tech' } }),
}))
jest.mock('../useReports', () => ({
  useReportDraft: () => ({
    data: {
      diagnosis: 'Diagnóstico inicial',
      workDone: 'Trabajo realizado',
      cause: '',
      observations: '',
    },
    isFetched: true,
    isLoading: false,
    error: null,
  }),
  useSaveReportDraft: () => ({ mutateAsync: mockSaveDraft, isPending: false }),
}))

const props = {
  navigation: { addListener: jest.fn(() => jest.fn()), navigate: jest.fn() },
  route: { params: { caseId: 'case-1' } },
} as unknown as Parameters<typeof CaseReportScreen>[0]

function renderReport() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <CaseReportScreen {...props} />
    </SafeAreaProvider>,
  )
}

beforeEach(() => {
  mockActions = {
    data: { editar_reporte: { allowed: true }, enviar_reporte: { allowed: true } },
    isPending: false,
    isFetching: false,
    error: null,
  }
  mockSaveDraft.mockClear()
})

test('conserva el texto editable del reporte durante una recarga de permisos', async () => {
  const screen = await renderReport()
  await waitFor(() =>
    expect(screen.getByLabelText('Diagnóstico').props.value).toBe('Diagnóstico inicial'),
  )
  await fireEvent.changeText(screen.getByLabelText('Diagnóstico'), 'Diagnóstico editado')

  mockActions = { ...mockActions, isFetching: true }
  await screen.rerender(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <CaseReportScreen {...props} />
    </SafeAreaProvider>,
  )

  expect(screen.getByLabelText('Diagnóstico').props.value).toBe('Diagnóstico editado')
  expect(screen.getByLabelText('Diagnóstico').props.editable).toBe(true)
  expect(screen.queryByText('Este reporte está en solo lectura.')).toBeNull()
})
