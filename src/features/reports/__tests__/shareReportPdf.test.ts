import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

import { supabase } from '@/services/supabase/client'
import { downloadReportPdf, shareReportPdf } from '../reportService'

const mockFileDelete = jest.fn()

jest.mock('expo-file-system', () => {
  const File = Object.assign(
    jest.fn().mockImplementation((...parts: string[]) => ({
      uri: parts.length === 2 ? `${parts[0]}/${parts[1]}` : parts[0],
      exists: true,
      delete: mockFileDelete,
    })),
    { downloadFileAsync: jest.fn() },
  )
  return { File, Paths: { cache: 'file:///cache' } }
})
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}))
jest.mock('@/services/supabase/client', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}))

const invoke = supabase.functions.invoke as jest.Mock
const download = File.downloadFileAsync as jest.Mock
const available = Sharing.isAvailableAsync as jest.Mock
const share = Sharing.shareAsync as jest.Mock
const uri = 'file:///cache/Reporte-CAS-2026-00002-v2.pdf'

beforeEach(() => {
  jest.clearAllMocks()
  invoke.mockResolvedValue({ data: { url: 'https://pdf.test/signed-link' }, error: null })
  download.mockResolvedValue({ uri })
  available.mockResolvedValue(true)
  share.mockResolvedValue(undefined)
})

test('descarga el PDF a la caché con nombre y reemplazo autorizados', async () => {
  await expect(downloadReportPdf('case-2', 'CAS-2026-00002', 2)).resolves.toBe(uri)

  expect(invoke).toHaveBeenCalledWith('generate-report-pdf', { body: { caseId: 'case-2' } })
  expect(File).toHaveBeenCalledWith(Paths.cache, 'Reporte-CAS-2026-00002-v2.pdf')
  expect(download).toHaveBeenCalledWith('https://pdf.test/signed-link', expect.anything(), {
    idempotent: true,
  })
})

test('comparte el archivo PDF y lo borra al cerrar el menú', async () => {
  await shareReportPdf('case-2', 'CAS-2026-00002', 2)

  expect(share).toHaveBeenCalledWith(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Compartir reporte',
    UTI: 'com.adobe.pdf',
  })
  expect(share).not.toHaveBeenCalledWith(expect.stringContaining('https://'), expect.anything())
  expect(mockFileDelete).toHaveBeenCalledTimes(1)
})

test('borra el temporal también si el menú de compartir falla', async () => {
  share.mockRejectedValueOnce(new Error('No se pudo abrir el menú'))

  await expect(shareReportPdf('case-2', 'CAS-2026-00002', 2)).rejects.toThrow(
    'No se pudo abrir el menú',
  )
  expect(mockFileDelete).toHaveBeenCalledTimes(1)
})

test('sin disponibilidad no descarga ni comparte', async () => {
  available.mockResolvedValueOnce(false)

  await expect(shareReportPdf('case-2', 'CAS-2026-00002', 2)).rejects.toThrow(
    'No es posible compartir en este dispositivo',
  )
  expect(invoke).not.toHaveBeenCalled()
  expect(share).not.toHaveBeenCalled()
})

test('una descarga fallida elimina cualquier archivo parcial y muestra un error claro', async () => {
  download.mockRejectedValueOnce(new Error('Network failed'))

  await expect(downloadReportPdf('case-2', 'CAS-2026-00002', 2)).rejects.toThrow(
    'No fue posible preparar el PDF. Inténtalo de nuevo.',
  )
  expect(mockFileDelete).toHaveBeenCalledTimes(1)
  expect(share).not.toHaveBeenCalled()
})
