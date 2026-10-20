import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import { Keyboard, Platform } from 'react-native'
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
let mockDraftData = {
  diagnosis: 'Diagnóstico inicial',
  workDone: 'Trabajo realizado',
  cause: '',
  observations: '',
}
let mockCaseStatus = 'en_ejecucion'

jest.mock('@/features/cases/useCases', () => ({
  useCaseActions: () => mockActions,
  useCaseDetail: () => ({
    data: { caseNumber: 'CAS-2026-00001', status: mockCaseStatus, minAfterPhotos: 0 },
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
    data: mockDraftData,
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
  mockCaseStatus = 'en_ejecucion'
  mockDraftData = {
    diagnosis: 'Diagnóstico inicial',
    workDone: 'Trabajo realizado',
    cause: '',
    observations: '',
  }
})

test('también oculta el aviso de reanudar mientras se escribe', async () => {
  mockCaseStatus = 'en_espera'
  mockActions = { ...mockActions, data: { editar_reporte: { allowed: true } } }
  let showKeyboard: () => void = () => undefined
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, listener) => {
    if (event === (Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'))
      showKeyboard = () => listener({ endCoordinates: { height: 200 } } as never)
    return { remove: jest.fn() } as unknown as ReturnType<typeof Keyboard.addListener>
  })
  const screen = await renderReport()
  expect(screen.getByText('Reanuda el trabajo para enviar el reporte.')).toBeTruthy()
  await act(async () => showKeyboard())
  expect(screen.queryByText('Reanuda el trabajo para enviar el reporte.')).toBeNull()
})

afterEach(() => jest.restoreAllMocks())

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

test('oculta el pie al abrir el teclado y lo restaura con los requisitos al cerrarlo', async () => {
  const originalPlatform = Platform.OS
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' })
  const listeners = new Map<string, (() => void)[]>()
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, listener) => {
    const callbacks = listeners.get(event) ?? []
    callbacks.push(() => listener({ endCoordinates: { height: 200 } } as never))
    listeners.set(event, callbacks)
    return { remove: jest.fn() } as unknown as ReturnType<typeof Keyboard.addListener>
  })
  mockDraftData = { diagnosis: 'Corto', workDone: 'Trabajo realizado', cause: '', observations: '' }

  try {
    const screen = await renderReport()
    await waitFor(() =>
      expect(screen.getByText('Completa el diagnóstico (mínimo 10 caracteres)')).toBeTruthy(),
    )
    expect(screen.getByText('Revisar y firmar')).toBeTruthy()

    await act(async () => listeners.get('keyboardDidShow')?.forEach((callback) => callback()))
    expect(screen.queryByText('Revisar y firmar')).toBeNull()
    expect(screen.queryByText('Completa el diagnóstico (mínimo 10 caracteres)')).toBeNull()

    await act(async () => listeners.get('keyboardDidHide')?.forEach((callback) => callback()))
    expect(screen.getByText('Revisar y firmar')).toBeTruthy()
    expect(screen.getByText('Completa el diagnóstico (mínimo 10 caracteres)')).toBeTruthy()
  } finally {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform })
  }
})
