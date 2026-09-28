import type { ReactNode } from 'react'
import styles from './Auth.module.css'

const TILES = ['#80b9de', '#1374b0', '#b6d5ec', '#55a5d8', '#9ec9e2', '#6497c5', '#0f72bf', '#b9cdeb', '#2787cb']

/** Estrutura comum das telas de entrar/cadastrar. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <aside className={styles.brand} aria-hidden>
        <div className={styles.tiles}>
          {TILES.map((color, i) => (
            <span key={i} style={{ background: color }} />
          ))}
        </div>
        <p className={styles.brandText}>
          Ajuda de confiança,
          <br />
          na hora que você precisa.
        </p>
      </aside>

      <section className={styles.panel}>
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </header>
        {children}
      </section>
    </div>
  )
}
