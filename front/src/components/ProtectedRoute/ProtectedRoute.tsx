import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/auth-context'
import type { UserRole } from '../../types/entities'
import { roleHome } from '../../utils/format'

/** Bloqueia rotas por login e, opcionalmente, por tipo de usuário. */
export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { session } = useAuth()
  const location = useLocation()

  if (!session) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/entrar?redirect=${redirect}`} replace />
  }

  if (roles && !roles.includes(session.usuario.perfil)) {
    return <Navigate to={roleHome(session.usuario.perfil)} replace />
  }

  return <Outlet />
}
