import { BadgeCheck, CalendarDays, ChevronLeft, MapPin, Phone } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AiSummary } from '../../components/AiSummary/AiSummary'
import { Avatar } from '../../components/Avatar/Avatar'
import { Badge } from '../../components/Badge/Badge'
import { Button } from '../../components/Button/Button'
import { Card } from '../../components/Card/Card'
import { CategoryIcon } from '../../components/CategoryIcon/CategoryIcon'
import { EmptyState, ErrorState } from '../../components/Feedback/Feedback'
import { Loading } from '../../components/Loading/Loading'
import { Rating, Stars } from '../../components/Rating/Rating'
import { useAuth } from '../../contexts/auth-context'
import { useAsync } from '../../hooks/useAsync'
import { providerService } from '../../services/provider.service'
import { formatKm, formatMonthYear, pseudoDistance, timeAgo } from '../../utils/format'
import styles from './ProviderDetails.module.css'

export function ProviderDetails() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()

  const provider = useAsync(() => providerService.getById(id), [id])
  const reviews = useAsync(() => providerService.getReviews(id), [id])
  const summary = useAsync(() => providerService.getReviewSummary(id).catch(() => null), [id])

  if (provider.loading) return <Loading />
  if (provider.error || !provider.data) {
    return (
      <div className="container page">
        <ErrorState message={provider.error ?? 'Prestador não encontrado.'} onRetry={provider.reload} />
      </div>
    )
  }

  const p = provider.data
  const reviewList = reviews.data?.avaliacoes ?? []
  const canRequest = !session || session.usuario.perfil === 'CLIENT'
  const requestLink = `/solicitacoes/nova?prestador=${p.id}&categoria=${p.categoryId}`

  return (
    <div className={`container ${styles.page}`}>
      <button type="button" className={styles.back} onClick={() => navigate(-1)}>
        <ChevronLeft aria-hidden /> Voltar
      </button>

      <div className={styles.layout}>
        <aside className={styles.profile}>
          <Card padding="lg" className={styles.profileCard}>
            <Avatar name={p.user.name} size={84} />
            <h1 className={styles.name}>{p.user.name}</h1>
            <p className={styles.meta}>
              <CategoryIcon name={p.category.name} size={15} /> {p.category.name}
              {p.address && (
                <>
                  <span aria-hidden>·</span> {p.address}
                </>
              )}
            </p>
            <Rating value={reviews.data?.avaliacaoMedia ?? p.ratingAverage} count={reviewList.length} size="md" />

            <div className={styles.badges}>
              {p.approvalStatus === 'APPROVED' && (
                <Badge tone="info">
                  <BadgeCheck /> Perfil aprovado
                </Badge>
              )}
              <Badge tone={p.isAvailable ? 'success' : 'neutral'} dot>
                {p.isAvailable ? 'Disponível agora' : 'Indisponível'}
              </Badge>
            </div>

            <dl className={styles.facts}>
              <div>
                <dt>Distância</dt>
                <dd>{formatKm(pseudoDistance(p.id))}</dd>
              </div>
              <div>
                <dt>Atendimentos</dt>
                <dd>{p._count?.requests ?? '—'}</dd>
              </div>
              <div>
                <dt>Na plataforma</dt>
                <dd>{formatMonthYear(p.user.createdAt)}</dd>
              </div>
            </dl>

            {canRequest && (
              <div className={styles.cta}>
                <Button to={requestLink} size="lg" block disabled={!p.isAvailable}>
                  Solicitar este profissional
                </Button>
                {!session && <p className="note">Para solicitar um serviço, você precisará entrar ou criar uma conta.</p>}
                {!p.isAvailable && <p className="note">Este profissional está indisponível no momento.</p>}
              </div>
            )}
          </Card>
        </aside>

        <div className={styles.content}>
          <AiSummary text={summary.data?.resumoGeradoPorIa} loading={summary.loading} />

          <section>
            <h2 className={styles.sectionTitle}>Sobre o profissional</h2>
            <Card>
              <p className={styles.about}>
                Profissional de <strong>{p.category.name.toLowerCase()}</strong>
                {p.address ? ` atendendo a região de ${p.address}` : ''}. Perfil verificado pela equipe Me Socorre.
              </p>
              <ul className={styles.contactList}>
                {p.address && (
                  <li>
                    <MapPin aria-hidden /> Atende em {p.address}
                  </li>
                )}
                <li>
                  <CalendarDays aria-hidden /> Emergências e agendamentos
                </li>
                <li>
                  <Phone aria-hidden /> Contato liberado após o aceite da solicitação
                </li>
              </ul>
            </Card>
          </section>

          <section>
            <h2 className={styles.sectionTitle}>Serviços oferecidos</h2>
            <Card>
              <p className={styles.about}>{p.category.description ?? `Serviços de ${p.category.name.toLowerCase()}.`}</p>
            </Card>
          </section>

          <section>
            <h2 className={styles.sectionTitle}>
              Avaliações <span className="muted">({reviewList.length})</span>
            </h2>
            {reviews.loading ? (
              <Loading label="Carregando avaliações…" />
            ) : reviewList.length === 0 ? (
              <EmptyState title="Ainda sem avaliações" description="Seja o primeiro a avaliar este profissional." />
            ) : (
              <ul className={styles.reviews}>
                {reviewList.map((review) => (
                  <li key={review.id} className={styles.review}>
                    <div className={styles.reviewHeader}>
                      <Stars value={review.rating} />
                      <span className="muted small">{timeAgo(review.createdAt)}</span>
                    </div>
                    {review.comment && <p>{review.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {canRequest && (
            <div className={styles.mobileCta}>
              <Button to={requestLink} size="lg" block disabled={!p.isAvailable}>
                Solicitar este profissional
              </Button>
            </div>
          )}

          <Link to="/prestadores" className={`link ${styles.moreLink}`}>
            Ver outros profissionais
          </Link>
        </div>
      </div>
    </div>
  )
}
