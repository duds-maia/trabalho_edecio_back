import { ClipboardList, FolderTree, Hourglass, Star, Users, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/Card/Card'
import { ErrorState } from '../../components/Feedback/Feedback'
import { Loading } from '../../components/Loading/Loading'
import { useAsync } from '../../hooks/useAsync'
import { adminService } from '../../services/admin.service'
import { approvalStatusLabel, requestStatusLabel } from '../../utils/format'
import styles from './Admin.module.css'

function Breakdown<T extends string>({ rows, labels }: { rows: Array<{ status: T; quantidade: number }>; labels: Record<T, string> }) {
  const max = Math.max(1, ...rows.map((r) => r.quantidade))
  return (
    <div className={styles.breakdown}>
      {(Object.keys(labels) as T[]).map((status) => {
        const value = rows.find((r) => r.status === status)?.quantidade ?? 0
        return (
          <div key={status} className={styles.breakdownRow}>
            <span>{labels[status]}</span>
            <span className={styles.track}>
              <span className={styles.fill} style={{ width: `${(value / max) * 100}%` }} />
            </span>
            <span>{value}</span>
          </div>
        )
      })}
    </div>
  )
}

export function Dashboard() {
  const { data, loading, error, reload } = useAsync(() => adminService.getDashboard(), [])

  if (loading) return <Loading />
  if (error || !data) {
    return (
      <div className="container page">
        <ErrorState message={error ?? 'Erro ao carregar.'} onRetry={reload} />
      </div>
    )
  }

  const pending = data.prestadoresPorStatus.find((s) => s.status === 'PENDING')?.quantidade ?? 0
  const approved = data.prestadoresPorStatus.find((s) => s.status === 'APPROVED')?.quantidade ?? 0
  const totalRequests = data.solicitacoesPorStatus.reduce((sum, s) => sum + s.quantidade, 0)

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Administração</p>
          <h1 className="page-title">Visão geral</h1>
        </div>
      </div>

      <div className={styles.kpis}>
        <Link to="/admin/prestadores?status=PENDING">
          <Card interactive className={`${styles.kpi} ${pending > 0 ? styles.kpiAlert : ''}`}>
            <Hourglass aria-hidden />
            <strong>{pending}</strong>
            <span>Prestadores aguardando análise</span>
          </Card>
        </Link>
        <Card className={styles.kpi}>
          <Wrench aria-hidden />
          <strong>{approved}</strong>
          <span>Prestadores aprovados</span>
        </Card>
        <Card className={styles.kpi}>
          <Users aria-hidden />
          <strong>{data.clientes}</strong>
          <span>Clientes</span>
        </Card>
        <Card className={styles.kpi}>
          <ClipboardList aria-hidden />
          <strong>{totalRequests}</strong>
          <span>Solicitações</span>
        </Card>
      </div>

      <div className={styles.panels}>
        <Card padding="lg">
          <h2 className={styles.panelTitle}>Prestadores por status</h2>
          <Breakdown rows={data.prestadoresPorStatus} labels={approvalStatusLabel} />
        </Card>
        <Card padding="lg">
          <h2 className={styles.panelTitle}>Solicitações por status</h2>
          <Breakdown rows={data.solicitacoesPorStatus} labels={requestStatusLabel} />
        </Card>
      </div>

      <div className={styles.shortcuts}>
        <Link to="/admin/avaliacoes" className={styles.shortcut}>
          <Star aria-hidden /> Avaliações ({data.avaliacoes})
        </Link>
        <Link to="/admin/categorias" className={styles.shortcut}>
          <FolderTree aria-hidden /> Categorias
        </Link>
        <Link to="/admin/clientes" className={styles.shortcut}>
          <Users aria-hidden /> Clientes
        </Link>
      </div>
    </div>
  )
}
