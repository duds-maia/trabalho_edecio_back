import { ChevronLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../../components/Avatar/Avatar'
import { Badge } from '../../components/Badge/Badge'
import { Card } from '../../components/Card/Card'
import { EmptyState, ErrorState } from '../../components/Feedback/Feedback'
import { Loading } from '../../components/Loading/Loading'
import { Rating, Stars } from '../../components/Rating/Rating'
import { useAsync } from '../../hooks/useAsync'
import { adminService } from '../../services/admin.service'
import { providerService } from '../../services/provider.service'
import { approvalStatusLabel, approvalStatusTone, formatDate, timeAgo } from '../../utils/format'
import styles from './Admin.module.css'
import { ProviderModeration } from './providerActions'

export function ProviderAnalysis() {
  const { id = '' } = useParams()
  const navigate = useNavigate()

  // A API de admin só tem listagem; buscamos a lista e filtramos pelo id.
  const provider = useAsync(
    () => adminService.listProviders().then(({ prestadores }) => prestadores.find((p) => p.id === id) ?? null),
    [id],
  )
  const reviews = useAsync(() => providerService.getReviews(id).catch(() => null), [id])

  if (provider.loading) return <Loading />
  if (!provider.data) {
    return (
      <div className="container page">
        <ErrorState message={provider.error ?? 'Prestador não encontrado.'} onRetry={provider.reload} />
      </div>
    )
  }

  const p = provider.data
  const list = reviews.data?.avaliacoes ?? []

  return (
    <div className="container page">
      <button type="button" className="link" onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', marginBottom: 12 }}>
        <ChevronLeft size={18} /> Voltar
      </button>

      <div className={styles.analysis}>
        <Card padding="lg" className="stack">
          <div className={styles.providerHead}>
            <Avatar name={p.user.name} size={60} />
            <div>
              <h1 className="page-title">{p.user.name}</h1>
              <Rating value={p.ratingAverage} count={p._count?.reviews} />
            </div>
          </div>
          <Badge tone={approvalStatusTone[p.approvalStatus]}>{approvalStatusLabel[p.approvalStatus]}</Badge>

          <dl className={styles.infoList}>
            <div>
              <dt>E-mail</dt>
              <dd>{p.user.email ?? '—'}</dd>
            </div>
            <div>
              <dt>Telefone</dt>
              <dd>{p.user.phone ?? '—'}</dd>
            </div>
            <div>
              <dt>Categoria</dt>
              <dd>{p.category.name}</dd>
            </div>
            <div>
              <dt>Endereço / região</dt>
              <dd>{p.address ?? '—'}</dd>
            </div>
            <div>
              <dt>Cadastrado em</dt>
              <dd>{formatDate(p.user.createdAt ?? p.createdAt)}</dd>
            </div>
            <div>
              <dt>Atendimentos</dt>
              <dd>{p._count?.requests ?? 0}</dd>
            </div>
            <div>
              <dt>Disponibilidade</dt>
              <dd>{p.isAvailable ? 'Disponível' : 'Indisponível'}</dd>
            </div>
          </dl>

          <ProviderModeration provider={p} onChange={provider.setData} size="md" />
        </Card>

        <section className="stack">
          <h2 className="section-title">Avaliações recebidas</h2>
          {list.length === 0 ? (
            <EmptyState title="Sem avaliações" />
          ) : (
            list.map((review) => (
              <Card key={review.id} padding="sm" className={styles.reviewCard}>
                <div className={styles.reviewHead}>
                  <Stars value={review.rating} />
                  <span className="muted small">{timeAgo(review.createdAt)}</span>
                </div>
                {review.comment && <p>{review.comment}</p>}
              </Card>
            ))
          )}
        </section>
      </div>
    </div>
  )
}
