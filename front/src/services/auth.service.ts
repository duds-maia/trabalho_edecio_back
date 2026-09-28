import type { AuthSession, ProviderRegistrationData, RegistrationData, User } from '../types/entities'
import { api } from './api'

export const authService = {
  login: (data: { email: string; senha: string }) => api.post<AuthSession>('/auth/login', data),
  registerClient: (data: RegistrationData) =>
    api.post<{ usuario: User }>('/auth/client/register', data),
  registerProvider: (data: ProviderRegistrationData) =>
    api.post<{ usuario: User; prestador: { id: string; statusAprovacao: 'PENDING' } }>(
      '/auth/provider/register',
      data,
    ),
}
