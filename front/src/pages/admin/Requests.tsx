import { useState } from 'react'
import { EmptyState, ErrorState } from '../../components/Feedback/Feedback'
import { Skeleton } from '../../components/Loading/Loading'
import { RequestCard } from '../../components/RequestCard/RequestCard'
import { Tabs } from '../../components/Tabs/Tabs'
import { useAsync } from '../../hooks/useAsync'
import { adminService } from '../../services/admin.service'
import type { RequestStatus } from '../../types/entities'
import { requestStatusLabel } from '../../utils/format'
import styles from './Admin.module.css'

type Filter = RequestStatus | 'all'

export function Requests() {
  const [filter, setFilter] = useState<Filter>('all')
  const { data, loading, error, reload } = useAsync(() => adminService.listRequests(), [])
  const all = data?.solicitacoes ?? []
  const visible = filter === 'all' ? all : all.filter((r) => r.status === filter)

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Solicitações</h1>
          <p className="page-subtitle">Todas as solicitações da plataforma.</p>
        </div>
      </div>

      <Tabs
        label="Filtrar por status"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all' as Filter, label: 'Todas', count: all.length },
          ...(Object.keys(requestStatusLabel) as RequestStatus[]).map((s) => ({
            value: s as Filter,
            label: requestStatusLabel[s],
            count: all.filter((r) => r.status === s).length,
          })),
        ]}
      />

      {loading ? (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Skeleton count={4} height={104} />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : visible.length === 0 ? (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <EmptyState title="Nenhuma solicitação" />
        </div>
      ) : (
        <div className={styles.cards}>
          {visible.map((r) => (
            <RequestCard key={r.id} request={r} viewer="admin" />
          ))}
        </div>
      )}
    </div>
  )
}
