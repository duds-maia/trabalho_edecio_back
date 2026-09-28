import type { ReactNode } from 'react'
import type { Tone } from '../../utils/format'
import styles from './Badge.module.css'

export function Badge({ tone = 'info', children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`${styles.badge} ${styles[tone]}`}>
      {dot && <span className={styles.dot} aria-hidden />}
      {children}
    </span>
  )
}
