import type { Provider, Review, ReviewSummary } from '../types/entities'
import { api } from './api'

interface ProviderFilters {
  search?: string
  categoryId?: number
}

interface ProviderUpdate {
  nome?: string
  telefone?: string | null
  endereco?: string | null
  idCategoria?: number
}

function buildQuery({ search, categoryId }: ProviderFilters) {
  const params = new URLSearchParams()
  if (search?.trim()) params.set('search', search.trim())
  if (categoryId) params.set('categoryId', String(categoryId))
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const providerService = {
  /** Apenas prestadores aprovados e disponíveis. */
  list: (filters: ProviderFilters = {}) => api.get<Provider[]>(`/providers${buildQuery(filters)}`),
  getById: (id: string) => api.get<Provider>(`/providers/${id}`),
  getReviews: (id: string) =>
    api.get<{ avaliacaoMedia: number | string; avaliacoes: Review[] }>(`/providers/${id}/reviews`),
  getReviewSummary: (id: string) => api.get<ReviewSummary>(`/providers/${id}/review-summary`),
  update: (id: string, data: ProviderUpdate) => api.put<Provider>(`/providers/${id}`, data),
  updateAvailability: (id: string, disponivel: boolean) =>
    api.patch<Provider>(`/providers/${id}/status`, { disponivel }),
}
