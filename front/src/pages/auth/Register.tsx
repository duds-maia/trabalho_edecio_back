import { Lock, Mail, MapPin, Phone, UserRound, Wrench } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/Button/Button'
import { Alert } from '../../components/Feedback/Feedback'
import { Input, Select } from '../../components/Input/Input'
import { useAuth } from '../../contexts/auth-context'
import { useAsync } from '../../hooks/useAsync'
import { authService } from '../../services/auth.service'
import { categoryService } from '../../services/category.service'
import { roleHome } from '../../utils/format'
import styles from './Auth.module.css'
import { AuthLayout } from './AuthLayout'
import { safeRedirect } from './Login'

type Kind = 'client' | 'provider'

export function Register() {
  const { login, session } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirect = safeRedirect(params.get('redirect'))

  const [kind, setKind] = useState<Kind>(params.get('tipo') === 'prestador' ? 'provider' : 'client')
  const [form, setForm] = useState({ nome: '', email: '', senha: '', telefone: '', endereco: '', idCategoria: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const categories = useAsync(() => categoryService.list(), [])

  if (session) return <Navigate to={redirect ?? roleHome(session.usuario.perfil)} replace />

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: event.target.value }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (form.senha.length < 4) return setError('A senha deve ter ao menos 4 caracteres.')
    if (kind === 'provider' && !form.idCategoria) return setError('Escolha a categoria do seu serviço.')

    setLoading(true)
    setError(null)
    const base = {
      nome: form.nome.trim(),
      email: form.email.trim(),
      senha: form.senha,
      telefone: form.telefone.trim() || undefined,
      endereco: form.endereco.trim() || undefined,
    }
    try {
      if (kind === 'provider') await authService.registerProvider({ ...base, idCategoria: Number(form.idCategoria) })
      else await authService.registerClient(base)

      const newSession = await login(base.email, base.senha)
      navigate(kind === 'client' && redirect ? redirect : roleHome(newSession.usuario.perfil), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a conta.')
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Criar conta"
      subtitle={kind === 'client' ? 'Leva menos de um minuto.' : 'Seu perfil passa por aprovação antes de aparecer para clientes.'}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.roleSwitch} role="group" aria-label="Tipo de conta">
          <button type="button" className={styles.roleOption} aria-pressed={kind === 'client'} onClick={() => setKind('client')}>
            <UserRound aria-hidden /> Preciso de um serviço
          </button>
          <button type="button" className={styles.roleOption} aria-pressed={kind === 'provider'} onClick={() => setKind('provider')}>
            <Wrench aria-hidden /> Sou profissional
          </button>
        </div>

        <Input label="Nome completo" icon={<UserRound />} value={form.nome} onChange={set('nome')} autoComplete="name" required minLength={2} />
        <Input label="E-mail" type="email" icon={<Mail />} value={form.email} onChange={set('email')} autoComplete="email" required />
        <Input label="Senha" type="password" icon={<Lock />} value={form.senha} onChange={set('senha')} autoComplete="new-password" hint="Mínimo de 4 caracteres." required />

        <div className={styles.grid2}>
          <Input label="Telefone (opcional)" type="tel" icon={<Phone />} value={form.telefone} onChange={set('telefone')} autoComplete="tel" />
          {kind === 'provider' && (
            <Select label="Categoria do serviço" value={form.idCategoria} onChange={set('idCategoria')} required>
              <option value="">Selecione…</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </div>
        <Input
          label={kind === 'provider' ? 'Região de atendimento (opcional)' : 'Endereço (opcional)'}
          icon={<MapPin />}
          value={form.endereco}
          onChange={set('endereco')}
          autoComplete="street-address"
        />

        {error && <Alert tone="danger">{error}</Alert>}
        <Button type="submit" size="lg" block loading={loading}>
          {kind === 'provider' ? 'Enviar cadastro para análise' : 'Criar conta'}
        </Button>
      </form>

      <p className={styles.footer}>
        Já tem conta? <Link to={`/entrar${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}>Entrar</Link>
      </p>
    </AuthLayout>
  )
}
