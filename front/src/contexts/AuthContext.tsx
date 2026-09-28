import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { SESSION_EXPIRED_EVENT, SESSION_KEY } from '../services/api'
import { authService } from '../services/auth.service'
import type { AuthSession } from '../types/entities'
import { AuthContext, type AuthContextValue } from './auth-context'

function readStoredSession(): AuthSession | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY)
    return stored ? (JSON.parse(stored) as AuthSession) : null
  } catch {
    return null
  }
}

function persist(session: AuthSession | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // localStorage indisponível (ex.: navegação privada) — a sessão fica só em memória.
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(readStoredSession)

  useEffect(() => {
    const expire = () => setSession(null)
    window.addEventListener(SESSION_EXPIRED_EVENT, expire)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expire)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.token),
      login: async (email, senha) => {
        const newSession = await authService.login({ email, senha })
        persist(newSession)
        setSession(newSession)
        return newSession
      },
      logout: () => {
        persist(null)
        setSession(null)
      },
      updateUserName: (nome) => {
        setSession((current) => {
          if (!current) return current
          const updated = { ...current, usuario: { ...current.usuario, nome } }
          persist(updated)
          return updated
        })
      },
    }),
    [session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
