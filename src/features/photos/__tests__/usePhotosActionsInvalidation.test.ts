import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useDeletePhoto } from '../usePhotos'

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
  useQueryClient: jest.fn(),
}))
jest.mock('../photoService', () => ({}))
jest.mock('@/features/cases/useCases', () => ({ casesQueryKey: ['cases'] }))

test('invalida las acciones después de quitar una foto', async () => {
  const invalidateQueries = jest.fn().mockResolvedValue(undefined)
  ;(useQueryClient as jest.Mock).mockReturnValue({ invalidateQueries })
  useDeletePhoto('case-1')
  const options = (useMutation as jest.Mock).mock.calls.at(-1)?.[0]
  await options.onSuccess()
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['cases', 'case-1'] })
  expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ['cases', 'next-steps'] })
})
