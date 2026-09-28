import { AlertCircle, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../Button/Button'
import styles from './Feedback.module.css'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className={styles.box}>
      <span className={styles.icon}>{icon ?? <Inbox />}</span>
      <strong className={styles.title}>{title}</strong>
      {description && <p className={styles.description}>{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className={`${styles.box} ${styles.error}`} role="alert">
      <span className={styles.icon}>
        <AlertCircle />
      </span>
      <strong className={styles.title}>Algo deu errado</strong>
      <p className={styles.description}>{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'success' | 'danger' | 'warning'; children: ReactNode }) {
  return (
    <div className={`${styles.alert} ${styles[tone]}`} role={tone === 'danger' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}
