import { CalendarClock, ChevronLeft, ImagePlus, LocateFixed, Siren } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/Button/Button'
import { Card } from '../../components/Card/Card'
import { Alert, EmptyState } from '../../components/Feedback/Feedback'
import { Input, Select, TextArea } from '../../components/Input/Input'
import { Skeleton } from '../../components/Loading/Loading'
import { ProviderCard } from '../../components/ProviderCard/ProviderCard'
import { useAuth } from '../../contexts/auth-context'
import { useAsync } from '../../hooks/useAsync'
import { categoryService } from '../../services/category.service'
import { clientService } from '../../services/client.service'
import { providerService } from '../../services/provider.service'
import { requestService } from '../../services/request.service'
import type { ServiceType } from '../../types/entities'
import { pseudoDistance } from '../../utils/format'
import styles from './NewRequest.module.css'

const DRAFT_KEY = 'me-socorre:request-draft'

interface Draft {
  serviceType: ServiceType
  scheduledAt: string
  categoryId: string
  providerId: string
  description: string
  address: string
  photoUrl: string
}

const emptyDraft: Draft = {
  serviceType: 'IMMEDIATE',
  scheduledAt: '',
  categoryId: '',
  providerId: '',
  description: '',
  address: '',
  photoUrl: '',
}

// O rascunho sobrevive ao login: o visitante preenche, entra e continua de onde parou.
function readDraft(): Draft {
  try {
    const stored = sessionStorage.getItem(DRAFT_KEY)
    return stored ? { ...emptyDraft, ...(JSON.parse(stored) as Partial<Draft>) } : emptyDraft
  } catch {
    return emptyDraft
  }
}

function saveDraft(draft: Draft | null) {
  try {
    if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    else sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    /* sem storage: segue só em memória */
  }
}

export function NewRequest() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()

  const [draft, setDraft] = useState<Draft>(() => {
    const initial = readDraft()
    return {
      ...initial,
      categoryId: params.get('categoria') ?? initial.categoryId,
      providerId: params.get('prestador') ?? initial.providerId,
    }
  })
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [locating, setLocating] = useState(false)
  const [showPhoto, setShowPhoto] = useState(Boolean(draft.photoUrl))

  const isClient = session?.usuario.perfil === 'CLIENT'
  const blockedRole = session && !isClient

  const categories = useAsync(() => categoryService.list(), [])
  const providers = useAsync(
    () => (draft.categoryId ? providerService.list({ categoryId: Number(draft.categoryId) }) : Promise.resolve([])),
    [draft.categoryId],
  )

  // Pré-preenche o endereço com o cadastrado no perfil do cliente.
  useEffect(() => {
    if (!isClient || draft.address) return
    clientService
      .getById(session!.usuario.id)
      .then(({ cliente }) => cliente.endereco && setDraft((d) => (d.address ? d : { ...d, address: cliente.endereco! })))
      .catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient])

  useEffect(() => saveDraft(draft), [draft])

  const sortedProviders = useMemo(
    () => [...(providers.data ?? [])].sort((a, b) => pseudoDistance(a.id) - pseudoDistance(b.id)),
    [providers.data],
  )

  // Em emergência, já sugere o profissional mais próximo (menos um passo).
  useEffect(() => {
    if (providers.loading || !sortedProviders.length) return
    if (!sortedProviders.some((p) => p.id === draft.providerId)) {
      setDraft((d) => ({ ...d, providerId: d.serviceType === 'IMMEDIATE' ? sortedProviders[0].id : '' }))
    }
  }, [sortedProviders, providers.loading, draft.providerId])

  const selectedProvider = sortedProviders.find((p) => p.id === draft.providerId)
  const selectedCategory = categories.data?.find((c) => String(c.id) === draft.categoryId)

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        update('address', `Minha localização (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})`)
        setLocating(false)
      },
      () => {
        setErrors((e) => ({ ...e, address: 'Não foi possível obter sua localização. Digite o endereço.' }))
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  const validate = () => {
    const next: typeof errors = {}
    if (!draft.categoryId) next.categoryId = 'Escolha uma categoria.'
    if (!draft.providerId) next.providerId = 'Escolha um profissional.'
    if (draft.description.trim().length < 10) next.description = 'Descreva com pelo menos 10 caracteres.'
    if (draft.address.trim().length < 5) next.address = 'Informe o endereço do atendimento.'
    if (draft.serviceType === 'SCHEDULED' && !draft.scheduledAt) next.scheduledAt = 'Escolha data e horário.'
    if (draft.photoUrl && !/^https?:\/\/.+/.test(draft.photoUrl)) next.photoUrl = 'Informe um link válido (https://…).'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const goToLogin = (path: '/entrar' | '/cadastro') => {
    saveDraft(draft)
    navigate(`${path}?redirect=${encodeURIComponent(location.pathname)}`)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!session) return goToLogin('/entrar')
    if (!validate()) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const { solicitacao } = await requestService.create({
        idCategoria: Number(draft.categoryId),
        idPrestador: draft.providerId,
        descricao: draft.description.trim(),
        endereco: draft.address.trim(),
        tipoAtendimento: draft.serviceType,
        dataAgendamento: draft.serviceType === 'SCHEDULED' ? new Date(draft.scheduledAt).toISOString() : undefined,
        fotoUrl: draft.photoUrl.trim() || undefined,
      })
      saveDraft(null)
      navigate(`/solicitacoes/${solicitacao.id}`, { replace: true, state: { created: true } })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Não foi possível enviar a solicitação.')
    } finally {
      setSubmitting(false)
    }
  }

  const minDate = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.top}>
        <button type="button" className={styles.back} onClick={() => navigate(-1)}>
          <ChevronLeft aria-hidden /> Voltar
        </button>
        <h1 className={styles.title}>Nova solicitação</h1>
      </header>

      {!session && (
        <div className={styles.almost}>
          <strong>Você está quase lá!</strong>
          <span>Preencha os dados e entre para enviar sua solicitação a um profissional.</span>
        </div>
      )}
      {blockedRole && <Alert tone="warning">Apenas contas de cliente podem criar solicitações.</Alert>}

      <form className={styles.layout} onSubmit={handleSubmit} noValidate>
        <div className={styles.form}>
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>
              <span className={styles.step}>1</span> Tipo de atendimento
            </legend>
            <div className={styles.choices}>
              <button
                type="button"
                className={`${styles.choice} ${styles.emergency}`}
                aria-pressed={draft.serviceType === 'IMMEDIATE'}
                onClick={() => update('serviceType', 'IMMEDIATE')}
              >
                <Siren aria-hidden />
                <strong>Emergência</strong>
                <span>Agora</span>
              </button>
              <button
                type="button"
                className={styles.choice}
                aria-pressed={draft.serviceType === 'SCHEDULED'}
                onClick={() => update('serviceType', 'SCHEDULED')}
              >
                <CalendarClock aria-hidden />
                <strong>Agendar</strong>
                <span>Escolher horário</span>
              </button>
            </div>
            {draft.serviceType === 'SCHEDULED' && (
              <Input
                label="Data e horário"
                type="datetime-local"
                min={minDate}
                value={draft.scheduledAt}
                onChange={(e) => update('scheduledAt', e.target.value)}
                error={errors.scheduledAt}
              />
            )}
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>
              <span className={styles.step}>2</span> Qual serviço?
            </legend>
            <Select
              label="Categoria"
              value={draft.categoryId}
              onChange={(e) => {
                update('categoryId', e.target.value)
                update('providerId', '')
              }}
              error={errors.categoryId}
            >
              <option value="">Selecione…</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>

            {draft.categoryId && (
              <div className={styles.providers}>
                <span className={styles.subLabel}>
                  Profissional {draft.serviceType === 'IMMEDIATE' && <em>· sugerimos o mais próximo</em>}
                </span>
                {providers.loading ? (
                  <Skeleton count={2} height={78} />
                ) : sortedProviders.length === 0 ? (
                  <EmptyState
                    title="Ninguém disponível nesta categoria agora"
                    description="Tente agendar para mais tarde ou escolher outra categoria."
                  />
                ) : (
                  sortedProviders.map((provider) => (
                    <ProviderCard
                      key={provider.id}
                      provider={provider}
                      showStatus={false}
                      selected={provider.id === draft.providerId}
                      onSelect={(p) => update('providerId', p.id)}
                    />
                  ))
                )}
                {errors.providerId && <span className={styles.error}>{errors.providerId}</span>}
              </div>
            )}
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>
              <span className={styles.step}>3</span> O que aconteceu?
            </legend>
            <TextArea
              label="Descreva o problema"
              placeholder="Conte brevemente o que aconteceu…"
              value={draft.description}
              onChange={(e) => update('description', e.target.value)}
              error={errors.description}
              hint={`${draft.description.trim().length}/10 caracteres mínimos`}
              maxLength={1000}
            />

            {showPhoto ? (
              <Input
                label="Link de uma foto (opcional)"
                type="url"
                placeholder="https://…"
                value={draft.photoUrl}
                onChange={(e) => update('photoUrl', e.target.value)}
                error={errors.photoUrl}
              />
            ) : (
              <button type="button" className={styles.addPhoto} onClick={() => setShowPhoto(true)}>
                <ImagePlus aria-hidden /> Adicionar foto
              </button>
            )}
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>
              <span className={styles.step}>4</span> Onde?
            </legend>
            <Input
              label="Local do atendimento"
              placeholder="Rua, número, bairro"
              value={draft.address}
              onChange={(e) => update('address', e.target.value)}
              error={errors.address}
              autoComplete="street-address"
            />
            <Button variant="soft" icon={<LocateFixed />} onClick={useMyLocation} loading={locating}>
              Usar minha localização
            </Button>
          </fieldset>
        </div>

        <aside className={styles.summary}>
          <Card padding="lg" className={styles.summaryCard}>
            <h2 className={styles.summaryTitle}>Resumo</h2>
            <dl className={styles.summaryList}>
              <div>
                <dt>Atendimento</dt>
                <dd>{draft.serviceType === 'IMMEDIATE' ? 'Emergência (agora)' : 'Agendado'}</dd>
              </div>
              <div>
                <dt>Serviço</dt>
                <dd>{selectedCategory?.name ?? '—'}</dd>
              </div>
              <div>
                <dt>Profissional</dt>
                <dd>{selectedProvider?.user.name ?? '—'}</dd>
              </div>
            </dl>

            {submitError && <Alert tone="danger">{submitError}</Alert>}

            {session ? (
              <Button type="submit" size="lg" block loading={submitting} disabled={Boolean(blockedRole)}>
                Enviar solicitação
              </Button>
            ) : (
              <div className="stack">
                <Button size="lg" block onClick={() => goToLogin('/entrar')}>
                  Entrar para continuar
                </Button>
                <Button size="lg" block variant="soft" onClick={() => goToLogin('/cadastro')}>
                  Criar uma conta
                </Button>
              </div>
            )}
            <p className="note">
              {session
                ? 'O profissional recebe sua solicitação e confirma o atendimento. Seu endereço exato só é compartilhado após o aceite.'
                : 'O site é público, mas login é necessário para criar, acompanhar e avaliar solicitações.'}
            </p>
          </Card>
        </aside>
      </form>
    </div>
  )
}
