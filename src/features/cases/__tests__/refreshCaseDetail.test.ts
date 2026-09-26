import type { QueryClient } from '@tanstack/react-query'

import { refreshCaseDetail } from '../refreshCaseDetail'

jest.mock('@/features/photos/usePhotos', () => ({ photosQueryKey: ['case-photos'] }))
jest.mock('@/features/reports/useReports', () => ({ reportsQueryKey: ['case-reports'] }))
jest.mock('../useCases', () => ({ casesQueryKey: ['cases'] }))

test('actualiza solicitud, historial, reporte y fotos al jalar el detalle', async () => {
  const invalidateQueries = jest.fn().mockResolvedValue(undefined)
  await refreshCaseDetail({ invalidateQueries } as unknown as QueryClient, 'case-1')

  expect(invalidateQueries).toHaveBeenCalledTimes(3)
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['cases', 'case-1'] })
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['case-reports', 'case-1'] })
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['case-photos', 'case-1'] })
})
