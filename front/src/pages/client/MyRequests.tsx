import { ClipboardList, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/Button/Button'
import { EmptyState, ErrorState } from '../../components/Feedback/Feedback'
import { Skeleton } from '../../components/Loading/Loading'
import { RequestCard } from '../../components/RequestCard/RequestCard'
import { Tabs } from '../../components/Tabs/Tabs'
import { useAsync } from '../../hooks/useAsync'
import { requestService } from '../../services/request.service'
import type { ServiceRequest } from '../../types/entities'

type Filter = 'active' | 'COMPLETED' | 'CANCELLED' | 'all'

const ACTIVE = ['PENDING', 'ACCEPTED', 'IN_PROGRESS']

function applyFilter(list: ServiceRequest[], filter: Filter) {
  if (filter === 'all') return list
  if (filter === 'active') return list.filter((r) => ACTIVE.includes(r.status))
  return list.filter((r) => r.status === filter)
}

export function MyRequests() {
  const [filter, setFilter] = useState<Filter>('active')
  const requests = useAsync(() => requestService.list(), [])
  const all = useMemo(() => requests.data?.solicitacoes ?? [], [requests.data])
  const visible = applyFilter(all, filter)

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Minhas solicitações</h1>
          <p className="page-subtitle">Acompanhe o andamento e avalie os atendimentos concluídos.</p>
        </div>
        <Button to="/solicitacoes/nova" icon={<Plus />} size="sm">
          Nova solicitação
        </Button>
      </div>

      <Tabs
        label="Filtrar solicitações"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'active', label: 'Em aberto', count: applyFilter(all, 'active').length },
          { value: 'COMPLETED', label: 'Concluídas', count: applyFilter(all, 'COMPLETED').length },
          { value: 'CANCELLED', label: 'Canceladas', count: applyFilter(all, 'CANCELLED').length },
          { value: 'all', label: 'Todas', count: all.length },
        ]}
      />

      <div className="stack" style={{ marginTop: 'var(--space-4)' }}>
        {requests.loading ? (
          <Skeleton count={3} height={104} />
        ) : requests.error ? (
          <ErrorState message={requests.error} onRetry={requests.reload} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title="Nenhuma solicitação aqui"
            description="Quando você pedir um serviço, ele aparecerá nesta lista."
            action={<Button to="/solicitacoes/nova">Fazer uma solicitação</Button>}
          />
        ) : (
          visible.map((request) => <RequestCard key={request.id} request={request} viewer="client" />)
        )}
      </div>
    </div>
  )
}
