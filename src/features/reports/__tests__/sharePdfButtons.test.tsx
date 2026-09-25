import { act, fireEvent, render } from '@testing-library/react-native'

import type { CaseRecord } from '@/features/cases/types'
import { ReportSummary } from '../components/ReportSummary'
import { shareReportPdf } from '../reportService'
import { ReportReviewScreen } from '../screens/ReportReviewScreen'

const mockItem = {
  id: 'case-2',
  caseNumber: 'CAS-2026-00002',
  status: 'aprobado',
  minAfterPhotos: 0,
} as CaseRecord
const mockVersion = {
  id: 'version-2',
  status: 'vigente',
  versionNumber: 2,
  contentHash: 'abc123',
  content: { fotos: [], recursos: [], solicitud: {}, reporte: {}, fechas: {} },
}

jest.mock('@/features/cases/useCases', () => ({
  useCaseDetail: () => ({ data: mockItem, isLoading: false, error: null }),
}))
jest.mock('@/features/photos/usePhotos', () => ({
  useCasePhotos: () => ({ data: [] }),
}))
jest.mock('@/features/photos/components/PhotoGrid', () => ({ PhotoGrid: () => null }))
jest.mock('@/features/resources/useResources', () => ({
  useCaseUsages: () => ({ data: [] }),
}))
jest.mock('@/store/authStore', () => ({
  useAuthStore: () => null,
}))
jest.mock('../useReports', () => ({
  useReportDraft: () => ({ data: null, isLoading: false }),
  useReportVersions: () => ({ data: [mockVersion], isLoading: false, error: null }),
  useReportSignatures: () => ({ data: [], isLoading: false, error: null }),
  useAreaChiefs: () => ({ data: [] }),
  useSignReport: () => ({ isPending: false }),
  useReturnReport: () => ({ isPending: false }),
}))
jest.mock('../reportPermissions', () => ({ getReportActions: () => [] }))
jest.mock('../reportService', () => ({
  generateReportPdf: jest.fn(),
  shareReportPdf: jest.fn(),
}))
jest.mock('../components/ReportContent', () => ({ ReportContent: () => null }))
jest.mock('../components/SignatureSheet', () => ({ SignatureSheet: () => null }))
jest.mock('../components/ReturnSheet', () => ({ ReturnSheet: () => null }))

const mockShareReportPdf = shareReportPdf as jest.Mock

afterEach(() => {
  mockItem.status = 'aprobado'
  jest.clearAllMocks()
})

test('el detalle ofrece compartir el PDF solo cuando está aprobado', async () => {
  const props = {
    item: mockItem,
    beforeEditable: false,
    afterEditable: false,
    userId: 'user-1',
    onOpen: jest.fn(),
    onReview: jest.fn(),
  }
  const approved = await render(<ReportSummary {...props} />)
  expect(approved.getByRole('button', { name: 'Descargar PDF' })).toBeTruthy()
  expect(approved.getByRole('button', { name: 'Compartir PDF' })).toBeTruthy()

  await approved.rerender(<ReportSummary {...props} item={{ ...mockItem, status: 'validado' }} />)
  expect(approved.queryByRole('button', { name: 'Compartir PDF' })).toBeNull()
})

test('la revisión ofrece compartir el PDF solo cuando está aprobado', async () => {
  const props = {
    navigation: {},
    route: { key: 'ReportReview', name: 'ReportReview', params: { caseId: 'case-2' } },
  } as unknown as Parameters<typeof ReportReviewScreen>[0]
  const approved = await render(<ReportReviewScreen {...props} />)
  expect(approved.getByRole('button', { name: 'Descargar PDF' })).toBeTruthy()
  expect(approved.getByRole('button', { name: 'Compartir PDF' })).toBeTruthy()

  mockItem.status = 'validado'
  await approved.rerender(<ReportReviewScreen {...props} />)
  expect(approved.queryByRole('button', { name: 'Compartir PDF' })).toBeNull()
})

test('muestra progreso visible mientras prepara el archivo', async () => {
  let finishShare!: () => void
  mockShareReportPdf.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishShare = resolve
      }),
  )
  const props = {
    item: mockItem,
    beforeEditable: false,
    afterEditable: false,
    userId: 'user-1',
    onOpen: jest.fn(),
    onReview: jest.fn(),
  }
  const screen = await render(<ReportSummary {...props} />)

  await fireEvent.press(screen.getByRole('button', { name: 'Compartir PDF' }))
  expect(screen.getByText('Preparando PDF…')).toBeTruthy()

  await act(async () => finishShare())
})
