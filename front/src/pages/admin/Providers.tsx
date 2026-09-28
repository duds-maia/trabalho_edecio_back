import { ChevronRight, Mail, MapPin, Star } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Avatar } from '../../components/Avatar/Avatar'
import { Badge } from '../../components/Badge/Badge'
import { Button } from '../../components/Button/Button'
import { Card } from '../../components/Card/Card'
import { EmptyState, ErrorState } from '../../components/Feedback/Feedback'
import { Skeleton } from '../../components/Loading/Loading'
import { Tabs } from '../../components/Tabs/Tabs'
import { useAsync } from '../../hooks/useAsync'
import { adminService } from '../../services/admin.service'
import type { ApprovalStatus, Provider } from '../../types/entities'
import { approvalStatusLabel, approvalStatusTone, formatRating, timeAgo } from '../../utils/format'
import styles from './Admin.module.css'
import { ProviderModeration } from './providerActions'

const STATUSES: ApprovalStatus[] = ['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED', 'BANNED']

export function Providers() {
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') as ApprovalStatus | null) ?? 'PENDING'
  const { data, loading, error, reload, setData } = useAsync(() => adminService.listProviders(), [])

  const all = data?.prestadores ?? []
  const visible = all.filter((p) => p.approvalStatus === status)

  const replace = (updated: Provider) =>
    setData({ prestadores: all.map((p) => (p.id === updated.id ? updated : p)) })

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Prestadores</h1>
          <p className="page-subtitle">Analise cadastros e modere a plataforma.</p>
        </div>
      </div>

      <Tabs
        label="Status de aprovação"
        value={status}
        onChange={(value) => setParams({ status: value }, { replace: true })}
        options={STATUSES.map((s) => ({
          value: s,
          label: `${approvalStatusLabel[s]}s`,
          count: all.filter((p) => p.approvalStatus === s).length,
        }))}
      />

      {loading ? (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Skeleton count={3} height={150} />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : visible.length === 0 ? (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <EmptyState title="Nenhum prestador neste status" />
        </div>
      ) : (
        <div className={styles.providerGrid}>
          {visible.map((provider) => (
            <Card key={provider.id} className={styles.providerItem}>
              <div className={styles.providerHead}>
                <Avatar name={provider.user.name} size={46} />
                <div>
                  <h3>{provider.user.name}</h3>
                  <span className="muted small">{provider.category.name}</span>
                </div>
                <Badge tone={approvalStatusTone[provider.approvalStatus]}>{approvalStatusLabel[provider.approvalStatus]}</Badge>
              </div>
              <div className={styles.providerMeta}>
                {provider.user.email && (
                  <span>
                    <Mail size={12} /> {provider.user.email}
                  </span>
                )}
                {provider.address && (
                  <span>
                    <MapPin size={12} /> {provider.address}
                  </span>
                )}
                <span>
                  <Star size={12} /> {formatRating(provider.ratingAverage)} · {provider._count?.reviews ?? 0} avaliações
                </span>
                {provider.createdAt && <span>Cadastro {timeAgo(provider.createdAt)}</span>}
              </div>

              <ProviderModeration provider={provider} onChange={replace} />

              <Button to={`/admin/prestadores/${provider.id}`} variant="ghost" size="sm" icon={<ChevronRight />}>
                Ver análise completa
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
