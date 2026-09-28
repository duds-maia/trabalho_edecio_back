import { LogOut, Mail, MapPin, Phone, UserRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/Avatar/Avatar'
import { Button } from '../../components/Button/Button'
import { Card } from '../../components/Card/Card'
import { Alert, ErrorState } from '../../components/Feedback/Feedback'
import { Input } from '../../components/Input/Input'
import { Loading } from '../../components/Loading/Loading'
import { useAuth } from '../../contexts/auth-context'
import { useAsync } from '../../hooks/useAsync'
import { clientService } from '../../services/client.service'
import { formatMonthYear } from '../../utils/format'
import styles from './Profile.module.css'

export function Profile() {
  const { session, logout, updateUserName } = useAuth()
  const navigate = useNavigate()
  const userId = session!.usuario.id
  const profile = useAsync(() => clientService.getById(userId), [userId])

  const [form, setForm] = useState({ nome: '', telefone: '', endereco: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  useEffect(() => {
    const c = profile.data?.cliente
    if (c) setForm({ nome: c.nome, telefone: c.telefone ?? '', endereco: c.endereco ?? '' })
  }, [profile.data])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const { cliente } = await clientService.update(userId, {
        nome: form.nome.trim(),
        telefone: form.telefone.trim() || null,
        endereco: form.endereco.trim() || null,
      })
      updateUserName(cliente.nome)
      setMessage({ tone: 'success', text: 'Dados atualizados.' })
    } catch (err) {
      setMessage({ tone: 'danger', text: err instanceof Error ? err.message : 'Erro ao salvar.' })
    } finally {
      setSaving(false)
    }
  }

  if (profile.loading) return <Loading />
  if (profile.error) {
    return (
      <div className="container page">
        <ErrorState message={profile.error} onRetry={profile.reload} />
      </div>
    )
  }

  const client = profile.data!.cliente

  return (
    <div className={`container page ${styles.page}`}>
      <Card padding="lg" className={styles.identity}>
        <Avatar name={client.nome} size={72} />
        <div>
          <h1 className={styles.name}>{client.nome}</h1>
          <p className="muted small">Cliente desde {formatMonthYear(client.criadoEm)}</p>
        </div>
      </Card>

      <Card padding="lg">
        <form className={styles.form} onSubmit={handleSubmit}>
          <h2 className={styles.formTitle}>Meus dados</h2>
          <Input label="Nome" icon={<UserRound />} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required minLength={2} />
          <Input label="E-mail" icon={<Mail />} value={client.email} disabled hint="O e-mail não pode ser alterado." />
          <Input label="Telefone" icon={<Phone />} type="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(53) 99999-9999" />
          <Input
            label="Endereço padrão"
            icon={<MapPin />}
            value={form.endereco}
            onChange={(e) => setForm({ ...form, endereco: e.target.value })}
            placeholder="Rua, número, bairro"
            hint="Usado para preencher suas solicitações mais rápido."
          />
          {message && <Alert tone={message.tone}>{message.text}</Alert>}
          <Button type="submit" loading={saving} size="lg">
            Salvar alterações
          </Button>
        </form>
      </Card>

      <Button
        variant="ghost"
        icon={<LogOut />}
        onClick={() => {
          logout()
          navigate('/')
        }}
      >
        Sair da conta
      </Button>
    </div>
  )
}
