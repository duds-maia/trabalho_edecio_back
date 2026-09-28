import { Ban, Check, PauseCircle, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '../../components/Button/Button'
import { Alert } from '../../components/Feedback/Feedback'
import { Modal } from '../../components/Modal/Modal'
import { adminService, type ProviderAction } from '../../services/admin.service'
import type { ApprovalStatus, Provider } from '../../types/entities'
import styles from './Admin.module.css'

interface ActionConfig {
  action: ProviderAction
  label: string
  icon: ReactNode
  variant: 'primary' | 'outline' | 'danger'
  confirm: string
}

const APPROVE: ActionConfig = { action: 'approve', label: 'Aprovar', icon: <Check />, variant: 'primary', confirm: 'O prestador poderá ficar disponível e receber solicitações.' }
const REJECT: ActionConfig = { action: 'reject', label: 'Reprovar', icon: <X />, variant: 'outline', confirm: 'O cadastro será reprovado.' }
const SUSPEND: ActionConfig = { action: 'suspend', label: 'Suspender', icon: <PauseCircle />, variant: 'outline', confirm: 'O prestador deixará de aparecer para clientes.' }
const BAN: ActionConfig = { action: 'ban', label: 'Banir', icon: <Ban />, variant: 'danger', confirm: 'O prestador será banido da plataforma. Essa ação é definitiva.' }

// Transições aceitas pelo backend (Back/src/routes/admin.ts).
function actionsFor(status: ApprovalStatus): ActionConfig[] {
  if (status === 'PENDING') return [APPROVE, REJECT, BAN]
  if (status === 'APPROVED') return [SUSPEND, BAN]
  if (status === 'SUSPENDED') return [BAN]
  return []
}

interface ModerationProps {
  provider: Provider
  onChange: (provider: Provider) => void
  size?: 'sm' | 'md'
}

/** Botões de moderação + destaque, com confirmação. */
export function ProviderModeration({ provider, onChange, size = 'sm' }: ModerationProps) {
  const [pending, setPending] = useState<ActionConfig | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (task: () => Promise<{ prestador: Provider }>) => {
    setBusy(true)
    setError(null)
    try {
      const { prestador } = await task()
      onChange({ ...provider, ...prestador })
      setPending(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir.')
    } finally {
      setBusy(false)
    }
  }

  const actions = actionsFor(provider.approvalStatus)

  return (
    <>
      {provider.approvalStatus === 'APPROVED' && (
        <label className={styles.featured}>
          <input
            type="checkbox"
            checked={provider.isFeatured}
            disabled={busy}
            onChange={(e) => run(() => adminService.updateFeatured(provider.id, e.target.checked))}
          />
          Destacar na página inicial
        </label>
      )}

      {actions.length > 0 && (
        <div className={styles.actions}>
          {actions.map((config) => (
            <Button key={config.action} size={size} variant={config.variant} icon={config.icon} onClick={() => setPending(config)}>
              {config.label}
            </Button>
          ))}
        </div>
      )}

      {error && !pending && <Alert tone="danger">{error}</Alert>}

      <Modal
        open={Boolean(pending)}
        title={`${pending?.label} ${provider.user.name}?`}
        onClose={() => setPending(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Voltar
            </Button>
            <Button
              variant={pending?.variant === 'danger' ? 'danger' : 'primary'}
              loading={busy}
              onClick={() => pending && run(() => adminService.updateProviderStatus(provider.id, pending.action))}
            >
              Confirmar
            </Button>
          </>
        }
      >
        <div className="stack">
          <p className="muted">{pending?.confirm}</p>
          {error && <Alert tone="danger">{error}</Alert>}
        </div>
      </Modal>
    </>
  )
}
