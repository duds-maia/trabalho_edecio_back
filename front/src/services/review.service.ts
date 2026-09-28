import { api } from './api'

export const reviewService = {
  create: (data: { idSolicitacao: number; nota: number; comentario?: string }) =>
    api.post<{ avaliacao: { id: number } }>('/reviews', data),
}
