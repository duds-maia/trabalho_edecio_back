import { AiSummary } from '../../components/AiSummary/AiSummary'
import { Card } from '../../components/Card/Card'
import { EmptyState, ErrorState } from '../../components/Feedback/Feedback'
import { Loading } from '../../components/Loading/Loading'
import { Stars } from '../../components/Rating/Rating'
import { useAuth } from '../../contexts/auth-context'
import { useAsync } from '../../hooks/useAsync'
import { providerService } from '../../services/provider.service'
import { formatRating, timeAgo } from '../../utils/format'
import styles from './Provider.module.css'

export function Reviews() {
  const { session } = useAuth()
  const providerId = session?.prestador?.id ?? ''
  // Prestador ainda não aprovado recebe 404: mostramos a lista vazia.
  const reviews = useAsync(
    () => providerService.getReviews(providerId).catch(() => ({ avaliacaoMedia: 0, avaliacoes: [] })),
    [providerId],
  )
  const summary = useAsync(() => providerService.getReviewSummary(providerId).catch(() => null), [providerId])

  if (reviews.loading) return <Loading />

  const list = reviews.data?.avaliacoes ?? []
  const average = Number(reviews.data?.avaliacaoMedia ?? 0)

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Minhas avaliações</h1>
          <p className="page-subtitle">O que os clientes dizem sobre o seu trabalho.</p>
        </div>
      </div>

      {reviews.error ? (
        <ErrorState message={reviews.error} onRetry={reviews.reload} />
      ) : list.length === 0 ? (
        <EmptyState title="Você ainda não tem avaliações" description="Elas aparecem aqui quando clientes avaliam atendimentos concluídos." />
      ) : (
        <div className="stack">
          <Card padding="lg">
            <div className={styles.ratingHero}>
              <div>
                <div className={styles.ratingValue}>{formatRating(average)}</div>
                <Stars value={Math.round(average)} />
                <p className="muted small">{list.length} avaliações</p>
              </div>
              <div className={styles.bars}>
                {[5, 4, 3, 2, 1].map((n) => {
                  const total = list.filter((r) => r.rating === n).length
                  return (
                    <div key={n} className={styles.barRow}>
                      <span>{n}</span>
                      <span className={styles.bar}>
                        <span style={{ width: `${(total / list.length) * 100}%` }} />
                      </span>
                      <span>{total}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <AiSummary text={summary.data?.resumoGeradoPorIa} loading={summary.loading} />
          </Card>

          {list.map((review) => (
            <article key={review.id} className={styles.reviewItem}>
              <header>
                <Stars value={review.rating} />
                <span className="muted small">{timeAgo(review.createdAt)}</span>
              </header>
              <p>{review.comment ?? <span className="muted">Sem comentário.</span>}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
