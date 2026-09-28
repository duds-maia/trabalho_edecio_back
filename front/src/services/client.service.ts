import type { ClientProfile } from '../types/entities'
import { api } from './api'

interface ClientUpdate {
  nome?: string
  telefone?: string | null
  endereco?: string | null
}

export const clientService = {
  getById: (id: string) => api.get<{ cliente: ClientProfile }>(`/clients/${id}`),
  update: (id: string, data: ClientUpdate) =>
    api.put<{ cliente: ClientProfile }>(`/clients/${id}`, data),
}
