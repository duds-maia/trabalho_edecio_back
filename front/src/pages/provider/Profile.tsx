import { LogOut, MapPin, Phone, UserRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/Avatar/Avatar'
import { Badge } from '../../components/Badge/Badge'
import { Button } from '../../components/Button/Button'
import { Card } from '../../components/Card/Card'
import { Alert } from '../../components/Feedback/Feedback'
import { Input, Select } from '../../components/Input/Input'
import { Loading } from '../../components/Loading/Loading'
import { useAuth } from '../../contexts/auth-context'
import { useAsync } from '../../hooks/useAsync'
import { categoryService } from '../../services/category.service'
import { providerService } from '../../services/provider.service'
import { approvalStatusLabel, approvalStatusTone } from '../../utils/format'
import styles from '../client/Profile.module.css'

export function Profile() {
  const { session, logout, updateUserName } = useAuth()
  const navigate = useNavigate()
  const providerId = session?.prestador?.id ?? ''
  const status = session?.prestador?.statusAprovacao ?? 'PENDING'

  const provider = useAsync(() => providerService.getById(providerId).catch(() => null), [providerId])
  const categories = useAsync(() => categoryService.list(), [])

  const [form, setForm] = useState({ nome: session?.usuario.nome ?? '', telefone: '', endereco: '', idCategoria: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  useEffect(() => {
    const p = provider.data
    if (p) setForm({ nome: p.user.name, telefone: p.user.phone ?? '', endereco: p.address ?? '', idCategoria: String(p.categoryId) })
  }, [provider.data])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const updated = await providerService.update(providerId, {
        nome: form.nome.trim(),
        telefone: form.telefone.trim() || null,
        endereco: form.endereco.trim() || null,
        idCategoria: form.idCategoria ? Number(form.idCategoria) : undefined,
      })
      updateUserName(updated.user.name)
      setMessage({ tone: 'success', text: 'Perfil atualizado.' })
    } catch (err) {
      setMessage({ tone: 'danger', text: err instanceof Error ? err.message : 'Erro ao salvar.' })
    } finally {
      setSaving(false)
    }
  }

  if (provider.loading) return <Loading />

  const currentStatus = provider.data?.approvalStatus ?? status

  return (
    <div className={`container page ${styles.page}`}>
      <Card padding="lg" className={styles.identity}>
        <Avatar name={form.nome || 'Prestador'} size={72} />
        <div>
          <h1 className={styles.name}>{form.nome}</h1>
          <Badge tone={approvalStatusTone[currentStatus]}>{approvalStatusLabel[currentStatus]}</Badge>
        </div>
      </Card>

      <Card padding="lg">
        <form className={styles.form} onSubmit={handleSubmit}>
          <h2 className={styles.formTitle}>Dados do perfil</h2>
          <Input label="Nome" icon={<UserRound />} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required minLength={2} />
          <Input label="Telefone" type="tel" icon={<Phone />} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          <Input label="Região de atendimento" icon={<MapPin />} value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
          <Select label="Categoria" value={form.idCategoria} onChange={(e) => setForm({ ...form, idCategoria: e.target.value })}>
            <option value="">Selecione…</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {message && <Alert tone={message.tone}>{message.text}</Alert>}
          <Button type="submit" size="lg" loading={saving}>
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
