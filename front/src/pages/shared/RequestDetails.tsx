import {
  CalendarClock,
  Check,
  ChevronLeft,
  CircleDollarSign,
  ExternalLink,
  MapPin,
  Phone,
  Play,
  Siren,
  Star,
  X,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../../components/Avatar/Avatar'
import { Badge } from '../../components/Badge/Badge'
import { Button } from '../../components/Button/Button'
import { Card } from '../../components/Card/Card'
import { CategoryIcon } from '../../components/CategoryIcon/CategoryIcon'
import { Alert, ErrorState } from '../../components/Feedback/Feedback'
import { Input, TextArea } from '../../components/Input/Input'
import { Loading } from '../../components/Loading/Loading'
import { Modal } from '../../components/Modal/Modal'
import { Rating, RatingInput } from '../../components/Rating/Rating'
import { useAuth } from '../../contexts/auth-context'
import { useAsync } from '../../hooks/useAsync'
import { requestService } from '../../services/request.service'
import { reviewService } from '../../services/review.service'
import type { RequestStatus, ServiceRequest } from '../../types/entities'
import { formatCurrency, formatDate, requestStatusLabel, requestStatusTone } from '../../utils/format'
import styles from './RequestDetails.module.css'

const TIMELINE: RequestStatus[] = ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED']
const REVIEWED_KEY = 'me-socorre:reviewed-requests'

// A API de detalhe não devolve a avaliação; guardamos localmente quais já foram avaliadas.
function wasReviewed(id: number) {
  try {
    return (JSON.parse(localStorage.getItem(REVIEWED_KEY) ?? '[]') as number[]).includes(id)
  } catch {
    return false
  }
}

function markReviewed(id: number) {
  try {
    const list = JSON.parse(localStorage.getItem(REVIEWED_KEY) ?? '[]') as number[]
    localStorage.setItem(REVIEWED_KEY, JSON.stringify([...new Set([...list, id])]))
  } catch {
    /* ignora */
  }
}

export function RequestDetails() {
  const { id } = useParams()
  const requestId = Number(id)
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const role = session?.usuario.perfil

  const { data, loading, error, reload, setData } = useAsync(() => requestService.getById(requestId), [requestId])
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewed, setReviewed] = useState(() => wasReviewed(requestId))
  const [price, setPrice] = useState('')
  const created = Boolean((location.state as { created?: boolean } | null)?.created)

  if (loading) return <Loading />
  if (error || !data) {
    return (
      <div className="container page">
        <ErrorState message={error ?? 'Solicitação não encontrada.'} onRetry={reload} />
      </div>
    )
  }

  const request = data.solicitacao
  const isEmergency = request.serviceType === 'IMMEDIATE'
  const currentStep = TIMELINE.indexOf(request.status)
  const alreadyReviewed = reviewed || Boolean(request.review)

  const run = async (key: string, action: () => Promise<{ solicitacao: ServiceRequest }>) => {
    setBusy(key)
    setActionError(null)
    try {
      const result = await action()
      setData({ solicitacao: { ...request, ...result.solicitacao } })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível concluir a ação.')
    } finally {
      setBusy(null)
    }
  }

  const submitPrice = (event: FormEvent) => {
    event.preventDefault()
    const value = Number(price.replace(',', '.'))
    if (!(value > 0)) return setActionError('Informe um valor maior que zero.')
    run('price', () => requestService.updateValue(request.id, value)).then(() => setPrice(''))
  }

  const provider = request.provider
  const showContact = request.status !== 'PENDING' && request.status !== 'CANCELLED'

  return (
    <div className={`container ${styles.page}`}>
      <button type="button" className={styles.back} onClick={() => navigate(-1)}>
        <ChevronLeft aria-hidden /> Voltar
      </button>

      {created && (
        <Alert tone="success">
          <strong>Solicitação enviada!</strong> {provider?.user.name ?? 'O profissional'} foi avisado e deve responder em breve.
        </Alert>
      )}

      <header className={styles.header}>
        <span className={styles.headerIcon}>
          <CategoryIcon name={request.category.name} size={24} />
        </span>
        <div>
          <p className="page-subtitle">Solicitação #{request.id}</p>
          <h1 className="page-title">{request.category.name}</h1>
        </div>
        <Badge tone={requestStatusTone[request.status]}>{requestStatusLabel[request.status]}</Badge>
      </header>

      <div className={styles.layout}>
        <div className={styles.main}>
          {request.status === 'CANCELLED' ? (
            <Alert tone="warning">Esta solicitação foi cancelada.</Alert>
          ) : (
            <ol className={styles.timeline} aria-label="Andamento">
              {TIMELINE.map((status, index) => (
                <li
                  key={status}
                  className={[styles.timelineStep, index <= currentStep && styles.done, index === currentStep && styles.current]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className={styles.dot}>{index < currentStep ? <Check /> : index + 1}</span>
                  <span className={styles.timelineLabel}>{requestStatusLabel[status]}</span>
                </li>
              ))}
            </ol>
          )}

          <Card>
            <h2 className={styles.cardTitle}>Detalhes</h2>
            <dl className={styles.details}>
              <div>
                <dt>Tipo</dt>
                <dd className={isEmergency ? styles.emergency : undefined}>
                  {isEmergency ? <Siren aria-hidden /> : <CalendarClock aria-hidden />}
                  {isEmergency ? 'Emergência' : `Agendado para ${formatDate(request.scheduledAt, true)}`}
                </dd>
              </div>
              <div>
                <dt>Descrição</dt>
                <dd>{request.description}</dd>
              </div>
              <div>
                <dt>Endereço</dt>
                <dd>
                  <MapPin aria-hidden /> {request.address}
                </dd>
              </div>
              {request.photoUrl && (
                <div>
                  <dt>Foto</dt>
                  <dd>
                    <a href={request.photoUrl} target="_blank" rel="noreferrer" className="link">
                      Abrir foto <ExternalLink aria-hidden style={{ width: 14, height: 14 }} />
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt>Criada em</dt>
                <dd>{formatDate(request.createdAt, true)}</dd>
              </div>
              <div>
                <dt>Valor final</dt>
                <dd className={styles.price}>{formatCurrency(request.finalPrice)}</dd>
              </div>
            </dl>
          </Card>
        </div>

        <aside className={styles.side}>
          {role !== 'PROVIDER' && provider && (
            <Card>
              <h2 className={styles.cardTitle}>Profissional</h2>
              <Link to={`/prestadores/${provider.id}`} className={styles.person}>
                <Avatar name={provider.user.name} size={48} />
                <div>
                  <strong>{provider.user.name}</strong>
                  <Rating value={provider.ratingAverage} />
                </div>
              </Link>
              {showContact && provider.user.phone && (
                <Button variant="soft" block icon={<Phone />} onClick={() => (window.location.href = `tel:${provider.user.phone}`)}>
                  {provider.user.phone}
                </Button>
              )}
            </Card>
          )}

          {role !== 'CLIENT' && (
            <Card>
              <h2 className={styles.cardTitle}>Cliente</h2>
              <div className={styles.person}>
                <Avatar name={request.client.name} size={48} />
                <div>
                  <strong>{request.client.name}</strong>
                  {request.client.phone && <span className="muted small">{request.client.phone}</span>}
                </div>
              </div>
              {showContact && request.client.phone && (
                <Button variant="soft" block icon={<Phone />} onClick={() => (window.location.href = `tel:${request.client.phone}`)}>
                  Ligar para o cliente
                </Button>
              )}
            </Card>
          )}

          {actionError && <Alert tone="danger">{actionError}</Alert>}

          {/* ---- Ações do cliente ---- */}
          {role === 'CLIENT' && request.status === 'PENDING' && (
            <Button variant="danger" block icon={<X />} onClick={() => setConfirmCancel(true)}>
              Cancelar solicitação
            </Button>
          )}
          {role === 'CLIENT' && request.status === 'COMPLETED' &&
            (alreadyReviewed ? (
              <Alert tone="success">Obrigado! Você já avaliou este atendimento.</Alert>
            ) : (
              <Card className={styles.reviewPrompt}>
                <Star aria-hidden />
                <strong>Como foi o atendimento?</strong>
                <p className="muted small">Sua avaliação ajuda outros clientes.</p>
                <Button block onClick={() => setReviewOpen(true)}>
                  Avaliar atendimento
                </Button>
              </Card>
            ))}

          {/* ---- Ações do prestador ---- */}
          {role === 'PROVIDER' && request.status === 'PENDING' && (
            <div className="stack">
              <Button size="lg" block icon={<Check />} loading={busy === 'accept'} onClick={() => run('accept', () => requestService.accept(request.id))}>
                Aceitar solicitação
              </Button>
              <p className="note">Ao aceitar, o cliente recebe seu contato.</p>
            </div>
          )}
          {role === 'PROVIDER' && request.status === 'ACCEPTED' && (
            <Button size="lg" block icon={<Play />} loading={busy === 'start'} onClick={() => run('start', () => requestService.updateStatus(request.id, 'IN_PROGRESS'))}>
              Iniciar atendimento
            </Button>
          )}
          {role === 'PROVIDER' && request.status === 'IN_PROGRESS' && (
            <Button size="lg" block icon={<Check />} loading={busy === 'complete'} onClick={() => run('complete', () => requestService.updateStatus(request.id, 'COMPLETED'))}>
              Concluir atendimento
            </Button>
          )}
          {(role === 'PROVIDER' || role === 'ADMIN') && ['IN_PROGRESS', 'COMPLETED'].includes(request.status) && (
            <Card>
              <form className="stack" onSubmit={submitPrice}>
                <Input
                  label={request.finalPrice ? 'Atualizar valor final' : 'Informar valor final'}
                  icon={<CircleDollarSign />}
                  inputMode="decimal"
                  placeholder="Ex.: 150,00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <Button type="submit" variant="soft" block loading={busy === 'price'} disabled={!price}>
                  Salvar valor
                </Button>
              </form>
            </Card>
          )}

          {/* ---- Ações do admin ---- */}
          {role === 'ADMIN' && !['COMPLETED', 'CANCELLED'].includes(request.status) && (
            <Button variant="danger" block icon={<X />} onClick={() => setConfirmCancel(true)}>
              Cancelar solicitação
            </Button>
          )}
        </aside>
      </div>

      <Modal
        open={confirmCancel}
        title="Cancelar solicitação?"
        onClose={() => setConfirmCancel(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              loading={busy === 'cancel'}
              onClick={() => run('cancel', () => requestService.updateStatus(request.id, 'CANCELLED')).then(() => setConfirmCancel(false))}
            >
              Sim, cancelar
            </Button>
          </>
        }
      >
        <p className="muted">O profissional será avisado. Essa ação não pode ser desfeita.</p>
      </Modal>

      <ReviewModal
        open={reviewOpen}
        requestId={request.id}
        providerName={provider?.user.name ?? 'o profissional'}
        onClose={() => setReviewOpen(false)}
        onDone={() => {
          markReviewed(request.id)
          setReviewed(true)
          setReviewOpen(false)
        }}
      />
    </div>
  )
}

interface ReviewModalProps {
  open: boolean
  requestId: number
  providerName: string
  onClose: () => void
  onDone: () => void
}

function ReviewModal({ open, requestId, providerName, onClose, onDone }: ReviewModalProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!rating) return setError('Escolha uma nota de 1 a 5.')
    if (comment && comment.trim().length < 3) return setError('O comentário precisa ter pelo menos 3 caracteres.')
    setSending(true)
    setError(null)
    try {
      await reviewService.create({ idSolicitacao: requestId, nota: rating, comentario: comment.trim() || undefined })
      onDone()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível enviar a avaliação.'
      if (/já foi avaliada/i.test(message)) onDone()
      else setError(message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={open} title={`Avaliar ${providerName}`} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <RatingInput value={rating} onChange={setRating} />
        <TextArea
          label="Comentário (opcional)"
          placeholder="Conte como foi o atendimento…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
        />
        {error && <Alert tone="danger">{error}</Alert>}
        <Button type="submit" size="lg" block loading={sending}>
          Enviar avaliação
        </Button>
      </form>
    </Modal>
  )
}
