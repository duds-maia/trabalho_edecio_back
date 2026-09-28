import type {
  AdminClient,
  AdminDashboardData,
  AdminReview,
  ApprovalStatus,
  Provider,
  ServiceRequest,
} from '../types/entities'
import { api } from './api'

export type ProviderAction = 'approve' | 'reject' | 'suspend' | 'ban'

export const adminService = {
  getDashboard: () => api.get<AdminDashboardData>('/admin/dashboard'),
  listProviders: (status?: ApprovalStatus) =>
    api.get<{ prestadores: Provider[] }>(`/admin/providers${status ? `?status=${status}` : ''}`),
  updateProviderStatus: (id: string, action: ProviderAction) =>
    api.patch<{ prestador: Provider }>(`/admin/providers/${id}/${action}`, {}),
  updateFeatured: (id: string, destaque: boolean) =>
    api.patch<{ prestador: Provider }>(`/admin/providers/${id}/featured`, { destaque }),
  listReviews: () => api.get<{ avaliacoes: AdminReview[] }>('/admin/reviews'),
  listRequests: () => api.get<{ solicitacoes: ServiceRequest[] }>('/admin/requests'),
  listClients: () => api.get<{ clientes: AdminClient[] }>('/admin/clients'),
}
