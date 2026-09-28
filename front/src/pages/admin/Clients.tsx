import { Search } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '../../components/Avatar/Avatar'
import { Card } from '../../components/Card/Card'
import { EmptyState, ErrorState } from '../../components/Feedback/Feedback'
import { Input } from '../../components/Input/Input'
import { Skeleton } from '../../components/Loading/Loading'
import { useAsync } from '../../hooks/useAsync'
import { adminService } from '../../services/admin.service'
import { formatDate } from '../../utils/format'
import styles from './Admin.module.css'

export function Clients() {
  const [query, setQuery] = useState('')
  const { data, loading, error, reload } = useAsync(() => adminService.listClients(), [])
  const term = query.trim().toLowerCase()
  const list = (data?.clientes ?? []).filter(
    (c) => !term || c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term),
  )

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{data?.clientes.length ?? 0} clientes cadastrados.</p>
        </div>
      </div>

      <Input label="Buscar" icon={<Search />} placeholder="Nome ou e-mail" value={query} onChange={(e) => setQuery(e.target.value)} />

      {loading ? (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Skeleton count={4} height={72} />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <EmptyState title="Nenhum cliente encontrado" />
        </div>
      ) : (
        <div className={styles.cards}>
          {list.map((client) => (
            <Card key={client.id} className={styles.row}>
              <Avatar name={client.name} size={42} />
              <div>
                <div className={styles.rowTitle}>{client.name}</div>
                <div className={styles.rowSub}>{client.email}</div>
                <div className={styles.rowSub}>
                  {client.phone ?? 'Sem telefone'} · desde {formatDate(client.createdAt)}
                </div>
              </div>
              <div className={styles.counters}>
                <span>
                  <strong>{client._count.requests}</strong>pedidos
                </span>
                <span>
                  <strong>{client._count.reviews}</strong>avaliações
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
