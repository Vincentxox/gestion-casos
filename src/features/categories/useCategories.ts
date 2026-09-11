import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createCategory,
  listCategories,
  setCategoryActive,
  updateCategory,
} from './categoryService'
import type { CategoryInput } from './types'

export const categoriesQueryKey = ['categories'] as const

export function useCategories() {
  return useQuery({ queryKey: categoriesQueryKey, queryFn: listCategories })
}

function useInvalidateCategories() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: categoriesQueryKey })
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({ mutationFn: createCategory, onSuccess: invalidate })
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: ({ categoryId, input }: { categoryId: string; input: CategoryInput }) =>
      updateCategory(categoryId, input),
    onSuccess: invalidate,
  })
}

export function useSetCategoryActive() {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: ({ categoryId, isActive }: { categoryId: string; isActive: boolean }) =>
      setCategoryActive(categoryId, isActive),
    onSuccess: invalidate,
  })
}
