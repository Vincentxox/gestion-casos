import { supabase } from '@/services/supabase/client'

import {
  generateReportPdf,
  getReportDraft,
  listAreaChiefs,
  listCurrentReportSigners,
  listReportSignatures,
  listReportVersions,
  returnReport,
  saveReportDraft,
  signReport,
} from '../reportService'

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn(), functions: { invoke: jest.fn() } },
}))

const from = supabase.from as jest.Mock
const rpc = supabase.rpc as jest.Mock
const invoke = supabase.functions.invoke as jest.Mock
const query = {
  select: jest.fn(),
  eq: jest.fn(),
  maybeSingle: jest.fn(),
  single: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  order: jest.fn(),
}
const draftRow = {
  case_id: 'case-1',
  diagnosis: 'Diag',
  work_done: 'Done',
  cause: null,
  observations: null,
  updated_at: '2026-09-24',
}
const input = { diagnosis: ' Diag ', workDone: ' Done ', cause: '', observations: '' }

beforeEach(() => {
  jest.clearAllMocks()
  from.mockReturnValue(query)
  for (const method of ['select', 'eq', 'insert', 'update'] as const)
    query[method].mockReturnValue(query)
  query.maybeSingle.mockResolvedValue({ data: draftRow, error: null })
  query.single.mockResolvedValue({ data: draftRow, error: null })
})

test('lee el borrador y actualiza solo campos editables; no usa upsert', async () => {
  await expect(getReportDraft('case-1')).resolves.toMatchObject({
    diagnosis: 'Diag',
    workDone: 'Done',
  })
  await saveReportDraft('case-1', input)
  expect(query.update).toHaveBeenCalledWith({
    diagnosis: 'Diag',
    work_done: 'Done',
    cause: null,
    observations: null,
  })
  expect(query.eq).toHaveBeenCalledWith('case_id', 'case-1')
})

test('inserta el primer borrador y transmite el error del servidor', async () => {
  query.maybeSingle.mockResolvedValue({ data: null, error: null })
  await saveReportDraft('case-1', input)
  expect(query.insert).toHaveBeenCalledWith({
    case_id: 'case-1',
    diagnosis: 'Diag',
    work_done: 'Done',
    cause: null,
    observations: null,
  })
  query.single.mockResolvedValue({ data: null, error: new Error('No puedes editar') })
  await expect(saveReportDraft('case-1', input)).rejects.toThrow('No puedes editar')
})

test('lee versiones congeladas, firmas y jefes de área', async () => {
  query.order.mockResolvedValueOnce({
    data: [
      {
        id: 'version-1',
        case_id: 'case-1',
        version_number: 2,
        status: 'vigente',
        content: { reporte: {} },
        content_hash: 'abcdef123456',
        created_at: '2026-09-24',
        returned_at: null,
        return_reason: null,
        returned_by: null,
      },
    ],
    error: null,
  })
  await expect(listReportVersions('case-1')).resolves.toMatchObject([
    { versionNumber: 2, contentHash: 'abcdef123456' },
  ])
  query.order.mockResolvedValueOnce({
    data: [
      {
        id: 'signature-1',
        version_id: 'version-1',
        signature_type: 'ejecucion',
        signer_id: 'user-1',
        signer_role: 'tecnico',
        signed_at: '2026-09-24',
        consent_text: 'Consent',
        stroke_path: 'M 1 1 L 4 4',
        signer: { full_name: 'Ana' },
      },
    ],
    error: null,
  })
  await expect(listReportSignatures('case-1')).resolves.toMatchObject([
    { signerName: 'Ana', type: 'ejecucion' },
  ])
  query.eq.mockResolvedValueOnce({
    data: [
      { id: 'u1', area_id: 'a1' },
      { id: 'u2', area_id: null },
    ],
    error: null,
  })
  await expect(listAreaChiefs()).resolves.toEqual([{ id: 'u1', areaId: 'a1' }])
})

test('lista quiénes firmaron la versión vigente', async () => {
  query.eq.mockReturnValueOnce(query).mockResolvedValueOnce({
    data: [{ signer_id: 'u1' }, { signer_id: 'u2' }],
    error: null,
  })
  await expect(listCurrentReportSigners('case-1')).resolves.toEqual(['u1', 'u2'])
  expect(from).toHaveBeenCalledWith('case_signatures')
  expect(query.eq).toHaveBeenCalledWith('case_id', 'case-1')
  expect(query.eq).toHaveBeenCalledWith('case_report_versions.status', 'vigente')
})

test('firma y devuelve solo mediante las RPC contratadas', async () => {
  rpc.mockResolvedValue({ error: null })
  await signReport('case-1', 'submit', 'M 1 1 L 4 4')
  await signReport('case-1', 'validate', 'M 1 1 L 4 4')
  await signReport('case-1', 'approve', 'M 1 1 L 4 4')
  expect(rpc.mock.calls.map((call) => call[0])).toEqual([
    'submit_case_report',
    'validate_case_report',
    'approve_case_report',
  ])
  expect(rpc).toHaveBeenCalledWith('submit_case_report', {
    target_case_id: 'case-1',
    signature_stroke: 'M 1 1 L 4 4',
    accepts_terms: true,
  })
  await returnReport('case-1', ' Motivo válido ')
  expect(rpc).toHaveBeenCalledWith('return_case_report', {
    target_case_id: 'case-1',
    return_reason: 'Motivo válido',
  })
})

test('genera un enlace PDF temporal y traduce los errores conocidos', async () => {
  invoke.mockResolvedValueOnce({ data: { url: 'https://pdf.test/file' }, error: null })
  await expect(generateReportPdf('case-1')).resolves.toBe('https://pdf.test/file')
  expect(invoke).toHaveBeenCalledWith('generate-report-pdf', { body: { caseId: 'case-1' } })
  invoke.mockResolvedValueOnce({ data: null, error: { context: { status: 409 } } })
  await expect(generateReportPdf('case-1')).rejects.toThrow('solicitud está aprobada')
  invoke.mockResolvedValueOnce({ data: null, error: { context: { status: 404 } } })
  await expect(generateReportPdf('case-1')).rejects.toThrow('Solicitud no encontrada')
  invoke.mockResolvedValueOnce({ data: { url: 'http://inseguro' }, error: null })
  await expect(generateReportPdf('case-1')).rejects.toThrow('No fue posible generar')
})
