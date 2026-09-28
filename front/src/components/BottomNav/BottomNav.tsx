import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/auth-context'
import { navFor } from '../Layout/navigation'
import styles from './BottomNav.module.css'

/** Barra de navegação inferior, visível apenas no celular. */
export function BottomNav() {
  const { session } = useAuth()
  const items = navFor(session?.usuario.perfil).filter((item) => !item.desktopOnly)

  return (
    <nav className={styles.bar} aria-label="Navegação">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => [styles.item, isActive && styles.active].filter(Boolean).join(' ')}
        >
          <Icon aria-hidden />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
