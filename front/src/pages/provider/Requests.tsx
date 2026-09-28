import { useMemo, useState } from 'react'
import { EmptyState, ErrorState } from '../../components/Feedback/Feedback'
import { Skeleton } from '../../components/Loading/Loading'
import { RequestCard } from '../../components/RequestCard/RequestCard'
import { Tabs } from '../../components/Tabs/Tabs'
import { useAsync } from '../../hooks/useAsync'
import { requestService } from '../../services/request.service'
import type { RequestStatus } from '../../types/entities'

type Filter = 'PENDING' | 'active' | 'COMPLETED' | 'CANCELLED'

const matches = (status: RequestStatus, filter: Filter) =>
  filter === 'active' ? status === 'ACCEPTED' || status === 'IN_PROGRESS' : status === filter

export function Requests() {
  const [filter, setFilter] = useState<Filter>('PENDING')
  const requests = useAsync(() => requestService.list(), [])
  const all = useMemo(() => requests.data?.solicitacoes ?? [], [requests.data])
  const visible = all.filter((r) => matches(r.status, filter))
  const countOf = (f: Filter) => all.filter((r) => matches(r.status, f)).length

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Solicitações</h1>
          <p className="page-subtitle">Aceite, inicie e conclua seus atendimentos.</p>
        </div>
      </div>

      <Tabs
        label="Filtrar solicitações"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'PENDING', label: 'Novas', count: countOf('PENDING') },
          { value: 'active', label: 'Aceitas', count: countOf('active') },
          { value: 'COMPLETED', label: 'Concluídas', count: countOf('COMPLETED') },
          { value: 'CANCELLED', label: 'Canceladas', count: countOf('CANCELLED') },
        ]}
      />

      <div className="stack" style={{ marginTop: 'var(--space-4)' }}>
        {requests.loading ? (
          <Skeleton count={3} height={104} />
        ) : requests.error ? (
          <ErrorState message={requests.error} onRetry={requests.reload} />
        ) : visible.length === 0 ? (
          <EmptyState title="Nenhuma solicitação nesta aba" />
        ) : (
          visible.map((r) => <RequestCard key={r.id} request={r} viewer="provider" />)
        )}
      </div>
    </div>
  )
}
