import { createContext, useContext } from 'react'
import type { AuthSession } from '../types/entities'

export interface AuthContextValue {
  session: AuthSession | null
  isAuthenticated: boolean
  login: (email: string, senha: string) => Promise<AuthSession>
  logout: () => void
  updateUserName: (nome: string) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.')
  return context
}
