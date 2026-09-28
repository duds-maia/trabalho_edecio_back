import { Ban, CheckCircle2, CircleDashed, Clock3, Hourglass, PauseCircle, Power, Star, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/Badge/Badge'
import { Button } from '../../components/Button/Button'
import { Card } from '../../components/Card/Card'
import { Alert, EmptyState } from '../../components/Feedback/Feedback'
import { Loading, Skeleton } from '../../components/Loading/Loading'
import { RequestCard } from '../../components/RequestCard/RequestCard'
import { useAuth } from '../../contexts/auth-context'
import { useAsync } from '../../hooks/useAsync'
import { providerService } from '../../services/provider.service'
import { requestService } from '../../services/request.service'
import type { ApprovalStatus } from '../../types/entities'
import { formatRating } from '../../utils/format'
import styles from './Provider.module.css'

const BLOCKED: Record<Exclude<ApprovalStatus, 'APPROVED'>, { icon: typeof Hourglass; title: string; text: string; tone: 'warning' | 'danger' }> = {
  PENDING: { icon: Hourglass, title: 'Cadastro em análise', text: 'Nossa equipe está verificando seus dados. Assim que for aprovado, você poderá ficar disponível e receber solicitações.', tone: 'warning' },
  REJECTED: { icon: XCircle, title: 'Cadastro não aprovado', text: 'Seu cadastro não foi aprovado. Entre em contato com o suporte para mais informações.', tone: 'danger' },
  SUSPENDED: { icon: PauseCircle, title: 'Conta suspensa', text: 'Sua conta está temporariamente suspensa e não aparece para clientes.', tone: 'warning' },
  BANNED: { icon: Ban, title: 'Conta banida', text: 'Sua conta foi banida da plataforma.', tone: 'danger' },
}

export function Dashboard() {
  const { session } = useAuth()
  const providerId = session?.prestador?.id ?? ''
  const sessionStatus = session?.prestador?.statusAprovacao ?? 'PENDING'

  // A rota pública só devolve prestadores aprovados; 404 = ainda não aprovado.
  const profile = useAsync(() => providerService.getById(providerId).catch(() => null), [providerId])
  const status: ApprovalStatus = profile.data?.approvalStatus ?? sessionStatus
  const approved = status === 'APPROVED'

  const requests = useAsync(() => (approved ? requestService.list() : Promise.resolve({ solicitacoes: [] })), [approved])
  const [toggling, setToggling] = useState(false)
  const [toggleError, setToggleError] = useState<string | null>(null)

  if (profile.loading) return <Loading />

  const firstName = session?.usuario.nome.split(' ')[0]

  if (!approved) {
    const info = BLOCKED[status as keyof typeof BLOCKED]
    const Icon = info.icon
    return (
      <div className="container page">
        <h1 className="page-title">Olá, {firstName}</h1>
        <Card padding="lg" className={styles.blocked}>
          <span className={`${styles.blockedIcon} ${styles[info.tone]}`}>
            <Icon />
          </span>
          <h2>{info.title}</h2>
          <p className="muted">{info.text}</p>
          <Button to="/prestador/perfil" variant="outline">
            Revisar meu perfil
          </Button>
        </Card>
      </div>
    )
  }

  const available = profile.data?.isAvailable ?? false
  const list = requests.data?.solicitacoes ?? []
  const count = (s: string) => list.filter((r) => r.status === s).length
  const pending = list.filter((r) => r.status === 'PENDING')
  const active = list.filter((r) => r.status === 'ACCEPTED' || r.status === 'IN_PROGRESS')

  const toggle = async () => {
    setToggling(true)
    setToggleError(null)
    try {
      const updated = await providerService.updateAvailability(providerId, !available)
      profile.setData({ ...profile.data!, ...updated })
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : 'Não foi possível alterar.')
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Painel do prestador</p>
          <h1 className="page-title">Olá, {firstName}</h1>
        </div>
      </div>

      <button
        type="button"
        className={`${styles.availability} ${available ? styles.on : styles.off}`}
        onClick={toggle}
        disabled={toggling}
        aria-pressed={available}
      >
        <span className={styles.availabilityIcon}>
          <Power />
        </span>
        <span className={styles.availabilityText}>
          <strong>{available ? 'Você está disponível' : 'Você está indisponível'}</strong>
          <span>{available ? 'Clientes podem te encontrar e enviar solicitações.' : 'Você não aparece nas buscas. Toque para ficar disponível.'}</span>
        </span>
        <span className={styles.switch} aria-hidden>
          <span />
        </span>
      </button>
      {toggleError && <Alert tone="danger">{toggleError}</Alert>}

      <div className={styles.stats}>
        <Card className={styles.stat}>
          <CircleDashed aria-hidden />
          <strong>{count('PENDING')}</strong>
          <span>Novas</span>
        </Card>
        <Card className={styles.stat}>
          <Clock3 aria-hidden />
          <strong>{count('ACCEPTED') + count('IN_PROGRESS')}</strong>
          <span>Em andamento</span>
        </Card>
        <Card className={styles.stat}>
          <CheckCircle2 aria-hidden />
          <strong>{count('COMPLETED')}</strong>
          <span>Concluídas</span>
        </Card>
        <Card className={styles.stat}>
          <Star aria-hidden />
          <strong>{Number(profile.data?.ratingAverage) > 0 ? formatRating(profile.data?.ratingAverage) : '—'}</strong>
          <span>Avaliação</span>
        </Card>
      </div>

      <div className={styles.columns}>
        <section>
          <div className="section-row">
            <h2 className="section-title">
              Novas solicitações {pending.length > 0 && <Badge tone="warning">{pending.length}</Badge>}
            </h2>
          </div>
          {requests.loading ? (
            <Skeleton count={2} height={104} />
          ) : pending.length === 0 ? (
            <EmptyState title="Nenhuma solicitação nova" description={available ? 'Fique de olho — novas solicitações aparecem aqui.' : 'Fique disponível para receber solicitações.'} />
          ) : (
            <div className="stack">
              {pending.map((r) => (
                <RequestCard key={r.id} request={r} viewer="provider" />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="section-row">
            <h2 className="section-title">Em andamento</h2>
            <Link to="/prestador/solicitacoes" className="link">
              Ver todas
            </Link>
          </div>
          {requests.loading ? (
            <Skeleton count={2} height={104} />
          ) : active.length === 0 ? (
            <EmptyState title="Nada em andamento" />
          ) : (
            <div className="stack">
              {active.map((r) => (
                <RequestCard key={r.id} request={r} viewer="provider" />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
