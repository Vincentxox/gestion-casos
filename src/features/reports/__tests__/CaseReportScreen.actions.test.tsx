import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import { Keyboard, Platform, StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { CaseReportScreen } from '../screens/CaseReportScreen'
import { AppFeedback } from '@/components/feedback/AppFeedback'
import { colors, spacing } from '@/theme/tokens'

let mockActions: {
  data:
    | {
        editar_reporte?: { allowed: boolean }
        enviar_reporte?: { allowed: boolean }
        fotos_antes?: { allowed: boolean }
      }
    | undefined
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
let mockMinAfterPhotos = 0
let mockAfterCount = 0

jest.mock('@/features/cases/useCases', () => ({
  useCaseActions: () => mockActions,
  useCaseDetail: () => ({
    data: {
      caseNumber: 'CAS-2026-00001',
      status: mockCaseStatus,
      minAfterPhotos: mockMinAfterPhotos,
    },
    isLoading: false,
    error: null,
  }),
}))
jest.mock('@/features/photos/components/PhotoGrid', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native')
  return {
    PhotoGrid: ({ kind, editable }: { kind: string; editable: boolean }) => (
      <Text>{`${kind}: ${editable ? 'editable' : 'lectura'}`}</Text>
    ),
  }
})
jest.mock('@/features/photos/uploadQueue', () => ({ listPendingPhotos: jest.fn() }))
jest.mock('@/features/photos/usePhotos', () => ({
  useCasePhotos: () => ({
    data: Array.from({ length: mockAfterCount }, () => ({ kind: 'despues' })),
  }),
}))
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
  mockMinAfterPhotos = 0
  mockAfterCount = 0
  mockDraftData = {
    diagnosis: 'Diagnóstico inicial',
    workDone: 'Trabajo realizado',
    cause: '',
    observations: '',
  }
})

test.each(['asignado', 'en_ejecucion', 'en_espera'])(
  'permite subir fotos de antes en el reporte en estado %s',
  async (status) => {
    mockCaseStatus = status
    mockActions = {
      ...mockActions,
      data: { fotos_antes: { allowed: true }, editar_reporte: { allowed: status !== 'asignado' } },
    }
    const screen = await renderReport()
    expect(screen.getByText('antes: editable')).toBeTruthy()
    expect(screen.getByText('despues: lectura')).toBeTruthy()
  },
)

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
  expect(screen.getByRole('header', { name: 'Reporte' })).toBeTruthy()
  expect(screen.getByText('Guardado')).toBeTruthy()
  expect(screen.queryByText(/caracteres/)).toBeNull()
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

test('los chips pendientes tienen contorno y sin marca; omite fotos cuando no se exigen', async () => {
  mockDraftData = { diagnosis: '', workDone: '', cause: '', observations: '' }
  const screen = await renderReport()
  const diagnosis = screen.getAllByText('Diagnóstico')[0]?.parent
  expect(StyleSheet.flatten(diagnosis?.props.style)).toMatchObject({
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  })
  expect(diagnosis?.children).toHaveLength(1)
  expect(screen.queryByText('Foto de después')).toBeNull()
  expect(screen.queryByText(/Completa el diagnóstico/)).toBeNull()
  const feedback = jest.spyOn(AppFeedback, 'show').mockImplementation(() => undefined)
  await fireEvent.press(screen.getByRole('button', { name: 'Revisar y firmar' }))
  expect(feedback).toHaveBeenCalledWith(
    'Completa el reporte',
    expect.stringContaining('Completa el diagnóstico'),
    { tone: 'warning' },
  )
})

test.each([
  [1, 'Foto de después'],
  [2, '2 fotos de después'],
] as const)('la categoría con %s fotos muestra el chip %s', async (minimum, label) => {
  mockMinAfterPhotos = minimum
  const screen = await renderReport()
  expect(screen.getByText(label).parent?.children).toHaveLength(1)
  mockAfterCount = minimum
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
  expect(screen.getByText(label).parent?.children).toHaveLength(2)
})

test('los campos crecen desde 72 px y el relleno sigue la altura del pie', async () => {
  const screen = await renderReport()
  const input = screen.getByLabelText('Diagnóstico')
  expect(StyleSheet.flatten(input.props.style).minHeight).toBe(72)
  await fireEvent(input, 'contentSizeChange', { nativeEvent: { contentSize: { height: 130 } } })
  expect(StyleSheet.flatten(screen.getByLabelText('Diagnóstico').props.style).height).toBe(154)
  const footer = screen.getByText('Revisar y firmar').parent?.parent?.parent
  if (!footer) throw new Error('No se encontró el pie del reporte')
  await fireEvent(footer, 'layout', { nativeEvent: { layout: { height: 64 } } })
  const scroll = screen.getByTestId('report-scroll')
  expect(StyleSheet.flatten(scroll.props.contentContainerStyle).paddingBottom).toBe(64 + spacing.lg)
})

test('oculta el pie al abrir el teclado y lo restaura sin lista de requisitos', async () => {
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
    expect(screen.queryByText('Completa el diagnóstico (mínimo 10 caracteres)')).toBeNull()
    expect(screen.getByText('Revisar y firmar')).toBeTruthy()

    await act(async () => listeners.get('keyboardDidShow')?.forEach((callback) => callback()))
    expect(screen.queryByText('Revisar y firmar')).toBeNull()
    expect(screen.queryByText('Completa el diagnóstico (mínimo 10 caracteres)')).toBeNull()

    await act(async () => listeners.get('keyboardDidHide')?.forEach((callback) => callback()))
    expect(screen.getByText('Revisar y firmar')).toBeTruthy()
    expect(screen.queryByText('Completa el diagnóstico (mínimo 10 caracteres)')).toBeNull()
  } finally {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform })
  }
})
