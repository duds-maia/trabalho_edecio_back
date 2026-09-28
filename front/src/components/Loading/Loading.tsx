import styles from './Loading.module.css'

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className={styles.wrapper} role="status">
      <span className={styles.spinner} aria-hidden />
      <span className={styles.label}>{label}</span>
    </div>
  )
}

export function Skeleton({ height = 72, count = 3 }: { height?: number; count?: number }) {
  return (
    <div className={styles.skeletons} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.skeleton} style={{ height }} />
      ))}
    </div>
  )
}
