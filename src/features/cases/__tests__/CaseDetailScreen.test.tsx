import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { ScrollView } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import type { CaseRecord, CaseStatusHistoryRecord } from '../types'
import { CaseDetailScreen } from '../screens/CaseDetailScreen'

const baseCase: CaseRecord = {
  id: 'case-1',
  caseNumber: 'CAS-0142',
  title: 'Fuga de agua en baño',
  description: 'Gotea debajo del lavamanos.',
  category: 'Plomería',
  minAfterPhotos: 1,
  categoryId: 'cat',
  requestingAreaId: 'a1',
  requestingAreaName: 'Administración',
  targetAreaId: 'a2',
  targetAreaName: 'Mantenimiento',
  location: 'Baño 2.º piso',
  priority: 'alta',
  status: 'solicitado',
  createdBy: 'u1',
  assignedTo: null,
  creatorName: 'Ana López',
  assigneeName: null,
  createdAt: '2026-10-16T15:00:00Z',
  updatedAt: '2026-10-16T15:00:00Z',
  overdueStage: null,
}

let mockCase: CaseRecord = baseCase
let mockAllowed: string[] = []
let mockHistory: CaseStatusHistoryRecord[] = []
const mockSendMessage = jest.fn()
let mockSendPending = false

jest.mock('../useCases', () => ({
  useCaseDetail: () => ({ data: mockCase, isLoading: false, error: null, refetch: jest.fn() }),
  useCaseActions: () => ({
    data: Object.fromEntries(mockAllowed.map((action) => [action, { allowed: true }])),
    isPending: false,
    error: null,
    refetch: jest.fn(),
  }),
  useCaseHistory: () => ({ data: mockHistory, isLoading: false, error: null, refetch: jest.fn() }),
  useSendCaseMessage: () => ({ mutateAsync: mockSendMessage, isPending: mockSendPending }),
}))
jest.mock('@/features/reports/components/ReportSummary', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native')
  return { ReportSummary: () => <Text>Resumen del reporte</Text> }
})
jest.mock('@/components/feedback/OfflineBanner', () => ({ OfflineBanner: () => null }))
jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({ profile: { id: 'u1' } }),
}))
jest.mock('../refreshCaseDetail', () => ({ refreshCaseDetail: jest.fn() }))
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({}) }))

const navigate = jest.fn()
const goBack = jest.fn()
const props = {
  navigation: { navigate, goBack },
  route: { params: { caseId: 'case-1' } },
} as unknown as Parameters<typeof CaseDetailScreen>[0]

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
}
function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <CaseDetailScreen {...props} />
    </SafeAreaProvider>,
  )
}

beforeEach(() => {
  navigate.mockClear()
  mockCase = baseCase
  mockAllowed = []
  mockHistory = []
  mockSendPending = false
  mockSendMessage.mockReset().mockResolvedValue(42)
})

test('abre Seguimiento con seis pasos y el resumen del reporte', async () => {
  mockCase = { ...baseCase, status: 'en_ejecucion', assigneeName: 'Marco Ruiz', assignedTo: 'u2' }
  mockHistory = [
    {
      id: 2,
      previousStatus: 'asignado',
      newStatus: 'en_ejecucion',
      action: 'iniciar',
      actorName: 'Marco Ruiz',
      assigneeName: null,
      comment: 'Voy con el repuesto.',
      createdAt: '2026-10-17T10:05:00Z',
    },
    {
      id: 1,
      previousStatus: null,
      newStatus: 'solicitado',
      action: 'crear',
      actorName: 'Ana López',
      assigneeName: null,
      comment: null,
      createdAt: '2026-10-16T15:00:00Z',
    },
  ]
  const screen = await renderScreen()
  expect(screen.getByRole('tab', { name: 'Seguimiento' }).props.accessibilityState.selected).toBe(
    true,
  )
  expect(screen.getByText('Solicitada')).toBeTruthy()
  expect(screen.getByText('Asignar técnico')).toBeTruthy()
  expect(screen.getByText(/Voy con el repuesto/)).toBeTruthy()
  expect(screen.getByText('Resumen del reporte')).toBeTruthy()
  expect(screen.getByText('Gotea debajo del lavamanos.')).toBeTruthy()
  expect(screen.getByText('Ubicación: Baño 2.º piso')).toBeTruthy()
  expect(screen.getByText(/Trabajo en curso/)).toBeTruthy()
  expect(screen.getByTestId('case-tracking')).toBeTruthy()
})

test('una sola acción principal queda abajo y la secundaria en el menú', async () => {
  mockAllowed = ['aceptar', 'rechazar']
  const screen = await renderScreen()
  expect(screen.getByText('Te toca a ti')).toBeTruthy()
  expect(screen.queryByText('Te toca: aceptar solicitud')).toBeNull()

  await fireEvent.press(screen.getByRole('button', { name: 'Aceptar solicitud' }))
  expect(navigate).toHaveBeenCalledWith('ChangeCaseStatus', { caseId: 'case-1', action: 'aceptar' })

  expect(screen.queryByRole('button', { name: 'Más' })).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Más acciones' }))
  await fireEvent.press(await screen.findByText('Rechazar solicitud'))
  expect(navigate).toHaveBeenCalledWith('ChangeCaseStatus', {
    caseId: 'case-1',
    action: 'rechazar',
  })
})

test('el reporte pendiente es la acción principal y Editar queda en el menú', async () => {
  mockCase = { ...baseCase, status: 'en_ejecucion', assignedTo: 'u2' }
  mockAllowed = ['enviar_reporte', 'pausar', 'editar_datos']
  const screen = await renderScreen()
  expect(screen.getByText('Te toca a ti')).toBeTruthy()

  await fireEvent.press(screen.getByRole('button', { name: 'Completar reporte' }))
  expect(navigate).toHaveBeenCalledWith('CaseReport', { caseId: 'case-1' })

  await fireEvent.press(screen.getByRole('button', { name: 'Más acciones' }))
  await fireEvent.press(await screen.findByText('Editar solicitud'))
  expect(navigate).toHaveBeenCalledWith('EditCase', { caseId: 'case-1' })
})

test('administrador con solo reasignar espera al técnico sin marcar que le toca', async () => {
  mockCase = {
    ...baseCase,
    status: 'en_ejecucion',
    assignedTo: 'u2',
    assigneeName: 'Luis Pérez',
  }
  mockAllowed = ['asignar']
  const screen = await renderScreen()
  expect(screen.getByText('Esperando: Luis envía el reporte del trabajo')).toBeTruthy()
  expect(screen.getByText('Trabajo en curso · Luis')).toBeTruthy()
  expect(screen.queryByText(/te toca a ti/i)).toBeNull()
  expect(screen.queryByRole('toolbar')).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Más acciones' }))
  await fireEvent.press(await screen.findByText('Reasignar personal'))
  expect(navigate).toHaveBeenCalledWith('AssignCase', { caseId: 'case-1' })
})

test('administrador con caso vencido ve reasignar como acción secundaria', async () => {
  mockCase = {
    ...baseCase,
    status: 'en_ejecucion',
    assignedTo: 'u2',
    assigneeName: 'Luis Pérez',
    overdueStage: 'resolucion',
  }
  mockAllowed = ['asignar']
  const screen = await renderScreen()
  expect(screen.getByText('Se pasó el plazo de resolución')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Reasignar personal' })).toBeTruthy()
  expect(screen.queryByText(/te toca a ti/i)).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Reasignar personal' }))
  expect(navigate).toHaveBeenCalledWith('AssignCase', { caseId: 'case-1' })
})

test('técnico en ejecución con enviar reporte conserva el turno y la acción principal', async () => {
  mockCase = { ...baseCase, status: 'en_ejecucion', assignedTo: 'u2' }
  mockAllowed = ['enviar_reporte']
  const screen = await renderScreen()
  expect(screen.getByText('Te toca a ti')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Completar reporte' }))
  expect(navigate).toHaveBeenCalledWith('CaseReport', { caseId: 'case-1' })
})

test('técnico en espera con permiso ve Reanudar como acción principal', async () => {
  mockCase = {
    ...baseCase,
    status: 'en_espera',
    assignedTo: 'u2',
    assigneeName: 'Luis Pérez',
  }
  mockAllowed = ['reanudar']
  const screen = await renderScreen()
  expect(screen.getByText('Te toca a ti')).toBeTruthy()
  expect(screen.getByText('Pendiente · te toca a ti')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Reanudar trabajo' }))
  expect(navigate).toHaveBeenCalledWith('ChangeCaseStatus', {
    caseId: 'case-1',
    action: 'reanudar',
  })
})

test('otra persona sin permiso de reanudar ve a quién espera y no un botón principal', async () => {
  mockCase = {
    ...baseCase,
    status: 'en_espera',
    assignedTo: 'u2',
    assigneeName: 'Luis Pérez',
  }
  const screen = await renderScreen()
  expect(screen.getByText('Esperando: Luis reanuda el trabajo')).toBeTruthy()
  expect(screen.getByText('Trabajo en pausa · Luis')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Reanudar trabajo' })).toBeNull()
  expect(screen.queryByRole('toolbar')).toBeNull()
})

test('jefe con aceptar en solicitado conserva el botón principal', async () => {
  mockAllowed = ['aceptar']
  const screen = await renderScreen()
  expect(screen.getByText('Te toca a ti')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Aceptar solicitud' }))
  expect(navigate).toHaveBeenCalledWith('ChangeCaseStatus', { caseId: 'case-1', action: 'aceptar' })
})

test('sin acciones muestra en qué estado espera y no deja barra', async () => {
  mockCase = { ...baseCase, status: 'reporte_enviado' }
  const screen = await renderScreen()
  expect(screen.getByText('Esperando la validación del reporte')).toBeTruthy()
  expect(screen.queryByRole('toolbar')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Más acciones' })).toBeNull()
})

test('Datos del caso abre la hoja con los datos y los recursos', async () => {
  mockCase = { ...baseCase, overdueStage: 'aceptacion' }
  const screen = await renderScreen()
  expect(screen.getByText(/Vencida · aceptación/)).toBeTruthy()

  await fireEvent.press(screen.getByRole('button', { name: 'Datos del caso' }))
  expect(await screen.findByText('Mantenimiento')).toBeTruthy()
  expect(screen.getByText('Alta · vencida · aceptación')).toBeTruthy()
  expect(screen.getByText('Descripción')).toBeTruthy()
  expect(screen.getAllByText('Gotea debajo del lavamanos.')).toHaveLength(2)

  await fireEvent.press(screen.getByRole('button', { name: 'Ver recursos y mano de obra' }))
  expect(navigate).toHaveBeenCalledWith('CaseResources', { caseId: 'case-1' })
})

test('un caso rechazado no muestra avance y muestra el motivo como mensaje', async () => {
  mockCase = { ...baseCase, status: 'rechazado' }
  mockHistory = [
    {
      id: 3,
      previousStatus: 'solicitado',
      newStatus: 'rechazado',
      action: 'rechazar',
      actorName: 'Luis Pérez',
      assigneeName: null,
      comment: 'No corresponde a mantenimiento.',
      createdAt: '2026-10-17T09:00:00Z',
    },
  ]
  const screen = await renderScreen()
  expect(screen.getAllByText('Rechazada')).toHaveLength(2)
  expect(screen.getByText(/No corresponde a mantenimiento/)).toBeTruthy()
})

test('Mensajes separa el chat del Seguimiento y reemplaza la acción principal', async () => {
  const withoutPermission = await renderScreen()
  expect(withoutPermission.queryByLabelText('Escribir mensaje')).toBeNull()
  await fireEvent.press(withoutPermission.getByRole('tab', { name: 'Mensajes' }))
  expect(withoutPermission.getByText('Todavía no hay mensajes')).toBeTruthy()
  await withoutPermission.unmount()

  mockAllowed = ['mensaje', 'aceptar']
  const screen = await renderScreen()
  expect(screen.queryByLabelText('Escribir mensaje')).toBeNull()
  await fireEvent.press(screen.getByRole('tab', { name: 'Mensajes' }))
  expect(screen.getByLabelText('Escribir mensaje')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Aceptar solicitud' })).toBeNull()
  await fireEvent.changeText(screen.getByLabelText('Escribir mensaje'), '  Hola equipo  ')
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar' }))
  await waitFor(() => expect(mockSendMessage).toHaveBeenCalledWith('Hola equipo'))
  await waitFor(() => expect(screen.getByLabelText('Escribir mensaje').props.value).toBe(''))
})

test('al abrir Mensajes y al recibir contenido nuevo baja hasta el final', async () => {
  const scrollToEnd = jest.spyOn(ScrollView.prototype, 'scrollToEnd').mockImplementation()
  const screen = await renderScreen()
  try {
    await fireEvent.press(screen.getByRole('tab', { name: 'Mensajes' }))
    expect(scrollToEnd).toHaveBeenCalledWith({ animated: false })
    const calls = scrollToEnd.mock.calls.length
    await fireEvent(screen.getByTestId('case-detail-scroll'), 'contentSizeChange', 390, 1200)
    expect(scrollToEnd.mock.calls.length).toBeGreaterThan(calls)
  } finally {
    scrollToEnd.mockRestore()
  }
})

test('muestra validación y el error del servidor sin perder el borrador', async () => {
  mockAllowed = ['mensaje']
  mockSendMessage.mockRejectedValue({ code: 'P0001', message: 'La solicitud está cerrada' })
  const screen = await renderScreen()
  await fireEvent.press(screen.getByRole('tab', { name: 'Mensajes' }))
  await fireEvent.changeText(screen.getByLabelText('Escribir mensaje'), ' ab ')
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar' }))
  expect(screen.getByText('El mensaje debe tener entre 3 y 500 caracteres')).toBeTruthy()
  await fireEvent.changeText(screen.getByLabelText('Escribir mensaje'), 'Mensaje válido')
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar' }))
  await waitFor(() => expect(screen.getByText('La solicitud está cerrada')).toBeTruthy())
  expect(screen.getByLabelText('Escribir mensaje').props.value).toBe('Mensaje válido')
})

test('deshabilita Enviar durante el envío', async () => {
  mockAllowed = ['mensaje']
  mockSendPending = true
  const screen = await renderScreen()
  await fireEvent.press(screen.getByRole('tab', { name: 'Mensajes' }))
  expect(screen.getByRole('button', { name: 'Enviar' }).props.accessibilityState.disabled).toBe(
    true,
  )
})

test('un mensaje es burbuja con autor y hora sin línea de cambio de estado', async () => {
  mockHistory = [
    {
      id: 9,
      actorId: 'u1',
      previousStatus: 'solicitado',
      newStatus: 'solicitado',
      action: 'mensaje',
      actorName: 'Ana López',
      assigneeName: null,
      comment: '¿Cuándo pueden venir?',
      createdAt: '2026-10-17T10:05:00Z',
    },
  ]
  const screen = await renderScreen()
  expect(screen.getByRole('tab', { name: 'Mensajes, 1' })).toBeTruthy()
  await fireEvent.press(screen.getByRole('tab', { name: 'Mensajes, 1' }))
  expect(screen.getByTestId('case-message-9')).toBeTruthy()
  expect(screen.getByText('¿Cuándo pueden venir?')).toBeTruthy()
  expect(screen.getByText(/Ana López · (Hoy|Ayer|\d{1,2} )/)).toBeTruthy()
  expect(screen.queryByText(/Ana López cambió el estado/)).toBeNull()
})

test('cabecera permite volver y abre información sin perder las pestañas', async () => {
  const screen = await renderScreen()
  expect(screen.getByText('CAS-0142')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Volver' }))
  expect(goBack).toHaveBeenCalled()
  await fireEvent.press(screen.getByRole('button', { name: 'Datos del caso' }))
  expect(await screen.findByText('Mantenimiento')).toBeTruthy()
})
