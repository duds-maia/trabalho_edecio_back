import { LogOut, Plus } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/auth-context'
import { roleHome } from '../../utils/format'
import { Avatar } from '../Avatar/Avatar'
import { Button } from '../Button/Button'
import { navFor } from '../Layout/navigation'
import styles from './Header.module.css'

export function Logo() {
  const { session } = useAuth()
  return (
    <Link to={roleHome(session?.usuario.perfil)} className={styles.logo} aria-label="Me Socorre, página inicial">
      <span className={styles.logoMark} aria-hidden>
        <Plus strokeWidth={3.2} />
      </span>
      <span>
        me<span className={styles.logoAccent}>socorre</span>
      </span>
    </Link>
  )
}

export function Header() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const role = session?.usuario.perfil
  const items = navFor(role)
  const isClientSide = !role || role === 'CLIENT'

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Logo />

        <nav className={styles.nav} aria-label="Navegação principal">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => [styles.navLink, isActive && styles.active].filter(Boolean).join(' ')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.actions}>
          {isClientSide && (
            <Button to="/solicitacoes/nova" size="sm" icon={<Plus />} className={styles.cta}>
              Fazer solicitação
            </Button>
          )}

          {session ? (
            <div className={styles.user}>
              <Link to={role === 'PROVIDER' ? '/prestador/perfil' : role === 'ADMIN' ? '/admin' : '/perfil'} className={styles.userLink}>
                <Avatar name={session.usuario.nome} size={34} />
                <span className={styles.userName}>{session.usuario.nome.split(' ')[0]}</span>
              </Link>
              <button type="button" className={styles.iconButton} onClick={handleLogout} aria-label="Sair" title="Sair">
                <LogOut />
              </button>
            </div>
          ) : (
            <>
              <Link to="/entrar" className={styles.login}>
                Entrar
              </Link>
              <Button to="/cadastro" size="sm" variant="soft" className={styles.desktopOnly}>
                Criar conta
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
