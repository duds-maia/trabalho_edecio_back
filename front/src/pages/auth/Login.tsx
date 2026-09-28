import { Lock, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/Button/Button'
import { Alert } from '../../components/Feedback/Feedback'
import { Input } from '../../components/Input/Input'
import { useAuth } from '../../contexts/auth-context'
import { isMockMode } from '../../services/api'
import { roleHome } from '../../utils/format'
import styles from './Auth.module.css'
import { AuthLayout } from './AuthLayout'

// Aceita apenas caminhos internos para evitar redirecionamento para outro site.
export function safeRedirect(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null
}

const DEMO_ACCOUNTS = [
  { label: 'Cliente', email: 'cliente@teste.com' },
  { label: 'Prestador', email: 'prestador@teste.com' },
  { label: 'Admin', email: 'admin@teste.com' },
]

export function Login() {
  const { login, session } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirect = safeRedirect(params.get('redirect'))

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (session) return <Navigate to={redirect ?? roleHome(session.usuario.perfil)} replace />

  const doLogin = async (userEmail: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const newSession = await login(userEmail.trim(), password)
      navigate(redirect ?? roleHome(newSession.usuario.perfil), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
      setLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    doLogin(email, senha)
  }

  return (
    <AuthLayout title="Entrar" subtitle="Acesse para solicitar, acompanhar e avaliar atendimentos.">
      <form className={styles.form} onSubmit={handleSubmit}>
        <Input label="E-mail" type="email" icon={<Mail />} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        <Input label="Senha" type="password" icon={<Lock />} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
        {error && <Alert tone="danger">{error}</Alert>}
        <Button type="submit" size="lg" block loading={loading}>
          Entrar
        </Button>
      </form>

      <p className={styles.footer}>
        Ainda não tem conta? <Link to={`/cadastro${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}>Criar conta</Link>
      </p>

      {isMockMode && (
        <div className={styles.demo}>
          <p className={styles.demoTitle}>Entrar com conta de teste</p>
          <div className={styles.demoButtons}>
            {DEMO_ACCOUNTS.map((account) => (
              <Button key={account.email} size="sm" variant="outline" disabled={loading} onClick={() => doLogin(account.email, 'teste')}>
                {account.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  )
}
