import type { Category } from '../types/entities'
import { api } from './api'

type CategoryData = { name: string; description?: string }

export const categoryService = {
  list: () => api.get<Category[]>('/categories'),
  create: (data: CategoryData) => api.post<Category>('/categories', data),
  update: (id: number, data: CategoryData) => api.put<Category>(`/categories/${id}`, data),
  remove: (id: number) => api.delete<void>(`/categories/${id}`),
}
