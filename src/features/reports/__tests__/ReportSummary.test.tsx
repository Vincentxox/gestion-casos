import { render } from '@testing-library/react-native'

import type { CaseRecord } from '@/features/cases/types'
import { ReportSummary } from '../components/ReportSummary'

let mockDraft = { diagnosis: 'Diagnóstico de prueba', workDone: 'Trabajo realizado en el sitio' }
let mockPhotos = [{ kind: 'antes' }, { kind: 'antes' }, { kind: 'despues' }]

jest.mock('../useReports', () => ({
  useReportDraft: () => ({ data: mockDraft }),
  useReportVersions: () => ({ data: [] }),
  useReportSignatures: () => ({ data: [] }),
}))
jest.mock('@/features/photos/usePhotos', () => ({
  useCasePhotos: () => ({ data: mockPhotos }),
}))
jest.mock('../reportService', () => ({
  generateReportPdf: jest.fn(),
  shareReportPdf: jest.fn(),
}))

const item = {
  id: 'case-1',
  caseNumber: 'CAS-2026-0142',
  status: 'en_ejecucion',
  minAfterPhotos: 1,
} as CaseRecord

beforeEach(() => {
  mockDraft = { diagnosis: 'Diagnóstico de prueba', workDone: 'Trabajo realizado en el sitio' }
  mockPhotos = [{ kind: 'antes' }, { kind: 'antes' }, { kind: 'despues' }]
})

test('resume lo completado en el reporte, no los requisitos de captura', async () => {
  const screen = await render(<ReportSummary item={item} onOpen={jest.fn()} onReview={jest.fn()} />)
  expect(screen.getByText('Diagnóstico y trabajo realizado')).toBeTruthy()
  expect(screen.getByText('Fotos: 2 de antes, 1 de después')).toBeTruthy()
  expect(screen.queryByText(/10 caracteres/)).toBeNull()
})

test('no marca como hecho el diagnóstico que falta', async () => {
  mockDraft = { diagnosis: 'Corto', workDone: 'Trabajo realizado en el sitio' }
  mockPhotos = []
  const screen = await render(<ReportSummary item={item} onOpen={jest.fn()} onReview={jest.fn()} />)
  expect(screen.queryByText('Diagnóstico y trabajo realizado')).toBeNull()
  expect(screen.getByText('Trabajo realizado')).toBeTruthy()
  expect(screen.queryByText(/10 caracteres/)).toBeNull()
})
