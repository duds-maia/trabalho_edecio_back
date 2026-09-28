import { ArrowRight, BadgeCheck, MapPinned, Search, Siren, Sparkles, UserRoundCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AiSummary } from '../../components/AiSummary/AiSummary'
import { Button } from '../../components/Button/Button'
import { CategoryIcon } from '../../components/CategoryIcon/CategoryIcon'
import { EmptyState, ErrorState } from '../../components/Feedback/Feedback'
import { Skeleton } from '../../components/Loading/Loading'
import { ProviderCard } from '../../components/ProviderCard/ProviderCard'
import { useAuth } from '../../contexts/auth-context'
import { useAsync } from '../../hooks/useAsync'
import { categoryService } from '../../services/category.service'
import { providerService } from '../../services/provider.service'
import { greeting } from '../../utils/format'
import styles from './Home.module.css'

// Mosaico decorativo inspirado na paleta de azulejos.
const TILE_COLORS = [
  '#80b9de', '#b6d5ec', '#80b9de', '#3a93c9', '#b6d5ec',
  '#1374b0', '#80b9de', '#6497c5', '#b9cdeb', '#93bfea',
  '#80b9de', '#55a5d8', '#1374b0', '#80b9de', '#0f72bf',
  '#b9cdeb', '#55a5d8', '#9ec9e2', '#55a5d8', '#9ec9e2',
]

const STEPS = [
  { icon: Search, title: 'Encontre', text: 'Busque por categoria e veja quem está disponível perto de você.' },
  { icon: BadgeCheck, title: 'Confie', text: 'Perfis aprovados, avaliações reais e resumo feito por IA.' },
  { icon: Siren, title: 'Solicite', text: 'Emergência agora ou agendado — em poucos passos.' },
  { icon: UserRoundCheck, title: 'Avalie', text: 'Ao final, conte como foi e ajude outros clientes.' },
]

export function Home() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const categories = useAsync(() => categoryService.list(), [])
  const providers = useAsync(() => providerService.list(), [])

  const featured = (providers.data ?? []).slice(0, 4)
  const firstName = session?.usuario.nome.split(' ')[0] ?? 'visitante'

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    navigate(`/prestadores${search.trim() ? `?busca=${encodeURIComponent(search.trim())}` : ''}`)
  }

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <p className={styles.greeting}>
              {greeting()}, {firstName}
            </p>
            <h1 className={styles.title}>
              Resolva seu problema <br />
              com quem entende.
            </h1>
            <p className={styles.lead}>
              Chaveiros, encanadores, eletricistas e outros profissionais aprovados, perto de você.
            </p>

            <form className={styles.search} onSubmit={handleSearch} role="search">
              <Search aria-hidden className={styles.searchIcon} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="O que você precisa?"
                aria-label="O que você precisa?"
              />
              <button type="submit" className={styles.searchButton} aria-label="Buscar">
                <ArrowRight />
              </button>
            </form>

            <div className={styles.heroActions}>
              <Button to="/solicitacoes/nova" size="lg" block icon={<Siren />}>
                Fazer uma solicitação
              </Button>
              <Button to="/prestadores" size="lg" variant="outline" icon={<MapPinned />} className={styles.mapButton}>
                Ver no mapa
              </Button>
            </div>
          </div>

          <div className={styles.mosaic} aria-hidden>
            {TILE_COLORS.map((color, i) => (
              <span key={i} style={{ background: color }} />
            ))}
          </div>
        </div>
      </section>

      <div className="container">
        <div className="section-row">
          <h2 className="section-title">Encontre um serviço</h2>
          <Link to="/prestadores" className="link">
            Ver todos
          </Link>
        </div>

        {categories.error ? (
          <ErrorState message={categories.error} onRetry={categories.reload} />
        ) : (
          <div className={styles.categories}>
            {categories.loading
              ? Array.from({ length: 8 }, (_, i) => <span key={i} className={styles.categorySkeleton} />)
              : categories.data?.slice(0, 8).map((category) => (
                  <Link key={category.id} to={`/prestadores?categoria=${category.id}`} className={styles.category}>
                    <span className={styles.categoryIcon}>
                      <CategoryIcon name={category.name} />
                    </span>
                    {category.name}
                  </Link>
                ))}
          </div>
        )}

        <div className={styles.twoColumns}>
          <section>
            <div className="section-row">
              <h2 className="section-title">Profissionais em destaque</h2>
              <Link to="/prestadores" className="link">
                Ver mapa
              </Link>
            </div>

            {providers.loading ? (
              <Skeleton count={3} height={78} />
            ) : providers.error ? (
              <ErrorState message={providers.error} onRetry={providers.reload} />
            ) : featured.length === 0 ? (
              <EmptyState title="Nenhum profissional disponível agora" description="Tente novamente em alguns minutos." />
            ) : (
              <div className={styles.providerList}>
                {featured.map((provider) => (
                  <ProviderCard key={provider.id} provider={provider} />
                ))}
                <AiSummary
                  title="Resumo gerado por IA"
                  text={featured.find((p) => p.aiSummary)?.aiSummary ?? 'Clientes destacam a rapidez, a qualidade e a cordialidade dos profissionais em destaque.'}
                />
              </div>
            )}
          </section>

          <aside className={styles.how}>
            <h2 className="section-title">
              <Sparkles aria-hidden className={styles.howIcon} /> Como funciona
            </h2>
            <ol className={styles.steps}>
              {STEPS.map(({ icon: Icon, title, text }, index) => (
                <li key={title} className={styles.step}>
                  <span className={styles.stepNumber}>{index + 1}</span>
                  <div>
                    <strong>
                      <Icon aria-hidden /> {title}
                    </strong>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ol>
            {!session && (
              <p className="note" style={{ textAlign: 'left' }}>
                O site é público. Você só precisa entrar quando decidir fazer uma solicitação.
              </p>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
