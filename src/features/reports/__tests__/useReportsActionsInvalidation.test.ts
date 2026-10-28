import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useReturnReport, useSaveReportDraft, useSignReport } from '../useReports'

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
  useQueryClient: jest.fn(),
}))
jest.mock('../reportService', () => ({}))
jest.mock('@/features/cases/useCases', () => ({ casesQueryKey: ['cases'] }))
jest.mock('@/features/photos/usePhotos', () => ({ photosQueryKey: ['case-photos'] }))
jest.mock('@/features/home/useHomeSummary', () => ({ homeSummaryQueryKey: ['home-summary'] }))
jest.mock('@/features/resources/useResources', () => ({
  caseUsagesQueryKey: (id: string) => ['cases', id, 'usages'],
}))

test('el guardado automático del borrador no recarga la cola ni los permisos del caso', async () => {
  const invalidateQueries = jest.fn().mockResolvedValue(undefined)
  const setQueryData = jest.fn()
  ;(useQueryClient as jest.Mock).mockReturnValue({ invalidateQueries, setQueryData })
  useSaveReportDraft('case-1')
  const options = (useMutation as jest.Mock).mock.calls.at(-1)?.[0]
  const draft = { diagnosis: 'Diagnóstico' }
  await options.onSuccess(draft)
  expect(setQueryData).toHaveBeenCalledWith(['case-reports', 'case-1', 'draft'], draft)
  expect(invalidateQueries).not.toHaveBeenCalled()
})

test.each([useSignReport, useReturnReport])(
  'invalida las acciones después de firmar o devolver el reporte',
  async (hook) => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined)
    ;(useQueryClient as jest.Mock).mockReturnValue({ invalidateQueries, setQueryData: jest.fn() })
    hook('case-1')
    const options = (useMutation as jest.Mock).mock.calls.at(-1)?.[0]
    await options.onSuccess({})
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['cases'] })
  },
)
