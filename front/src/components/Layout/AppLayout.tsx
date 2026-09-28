import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { isMockMode } from '../../services/api'
import { BottomNav } from '../BottomNav/BottomNav'
import { Header } from '../Header/Header'
import styles from './AppLayout.module.css'

export function AppLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className={styles.shell}>
      {isMockMode && (
        <div className={styles.mockBanner}>
          Modo demonstração · dados de exemplo · contas de teste na tela “Entrar”
        </div>
      )}
      <Header />
      <main className={styles.main}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
