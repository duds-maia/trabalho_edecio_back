import type { RequestStatus, ServiceRequest, ServiceType } from '../types/entities'
import { api } from './api'

export interface CreateRequestData {
  idCategoria: number
  idPrestador: string
  descricao: string
  endereco: string
  tipoAtendimento: ServiceType
  dataAgendamento?: string
  fotoUrl?: string
}

type RequestResponse = { solicitacao: ServiceRequest }

export const requestService = {
  create: (data: CreateRequestData) => api.post<RequestResponse>('/requests', data),
  list: (status?: RequestStatus) =>
    api.get<{ solicitacoes: ServiceRequest[] }>(`/requests${status ? `?status=${status}` : ''}`),
  getById: (id: number) => api.get<RequestResponse>(`/requests/${id}`),
  updateStatus: (id: number, status: RequestStatus) =>
    api.patch<RequestResponse>(`/requests/${id}/status`, { status }),
  accept: (id: number) => api.patch<RequestResponse>(`/requests/${id}/provider`, {}),
  updateValue: (id: number, valorFinal: number) =>
    api.patch<RequestResponse>(`/requests/${id}/value`, { valorFinal }),
}
