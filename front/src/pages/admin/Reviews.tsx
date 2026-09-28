import { Link } from 'react-router-dom'
import { Card } from '../../components/Card/Card'
import { EmptyState, ErrorState } from '../../components/Feedback/Feedback'
import { Skeleton } from '../../components/Loading/Loading'
import { Stars } from '../../components/Rating/Rating'
import { useAsync } from '../../hooks/useAsync'
import { adminService } from '../../services/admin.service'
import { timeAgo } from '../../utils/format'
import styles from './Admin.module.css'

export function Reviews() {
  const { data, loading, error, reload } = useAsync(() => adminService.listReviews(), [])
  const list = data?.avaliacoes ?? []

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Avaliações</h1>
          <p className="page-subtitle">{list.length} avaliações registradas.</p>
        </div>
      </div>

      {loading ? (
        <Skeleton count={4} height={110} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <EmptyState title="Nenhuma avaliação ainda" />
      ) : (
        <div className={styles.cards}>
          {list.map((review) => (
            <Card key={review.id} className={styles.reviewCard}>
              <div className={styles.reviewHead}>
                <Stars value={review.rating} />
                <span className="muted small">{timeAgo(review.createdAt)}</span>
              </div>
              <p>{review.comment ?? <span className="muted">Sem comentário.</span>}</p>
              <div className={styles.rowSub}>
                <strong>{review.client.name}</strong> avaliou{' '}
                <Link to={`/admin/prestadores/${review.provider.id}`} className="link">
                  {review.provider.user.name}
                </Link>{' '}
                · {review.request.category.name} ·{' '}
                <Link to={`/solicitacoes/${review.requestId}`} className="link">
                  #{review.requestId}
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
