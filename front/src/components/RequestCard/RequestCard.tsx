import { CalendarClock, ChevronRight, Siren } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ServiceRequest } from '../../types/entities'
import { formatDate, requestStatusLabel, requestStatusTone, timeAgo } from '../../utils/format'
import { Badge } from '../Badge/Badge'
import { CategoryIcon } from '../CategoryIcon/CategoryIcon'
import styles from './RequestCard.module.css'

interface RequestCardProps {
  request: ServiceRequest
  /** Quem está vendo: o cliente vê o prestador; o prestador vê o cliente. */
  viewer: 'client' | 'provider' | 'admin'
}

export function RequestCard({ request, viewer }: RequestCardProps) {
  const counterpart =
    viewer === 'provider'
      ? request.client.name
      : viewer === 'client'
        ? (request.provider?.user.name ?? 'Aguardando profissional')
        : `${request.client.name} → ${request.provider?.user.name ?? '—'}`

  const isEmergency = request.serviceType === 'IMMEDIATE'

  return (
    <Link to={`/solicitacoes/${request.id}`} className={styles.card}>
      <span className={styles.icon}>
        <CategoryIcon name={request.category.name} />
      </span>
      <div className={styles.body}>
        <div className={styles.row}>
          <strong className={styles.category}>{request.category.name}</strong>
          <Badge tone={requestStatusTone[request.status]}>{requestStatusLabel[request.status]}</Badge>
        </div>
        <p className={styles.description}>{request.description}</p>
        <div className={styles.meta}>
          <span>{counterpart}</span>
          <span className={isEmergency ? styles.emergency : styles.scheduled}>
            {isEmergency ? <Siren aria-hidden /> : <CalendarClock aria-hidden />}
            {isEmergency ? 'Emergência' : formatDate(request.scheduledAt, true)}
          </span>
          <span className={styles.time}>{timeAgo(request.createdAt)}</span>
        </div>
      </div>
      <ChevronRight className={styles.chevron} aria-hidden />
    </Link>
  )
}
