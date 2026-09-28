import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState } from '../../components/Feedback/Feedback'
import { Skeleton } from '../../components/Loading/Loading'
import { Map } from '../../components/Map/Map'
import { ProviderCard } from '../../components/ProviderCard/ProviderCard'
import { Tabs } from '../../components/Tabs/Tabs'
import { useAsync } from '../../hooks/useAsync'
import { categoryService } from '../../services/category.service'
import { providerService } from '../../services/provider.service'
import { pseudoDistance } from '../../utils/format'
import styles from './Providers.module.css'

export function Providers() {
  const [params, setParams] = useSearchParams()
  const search = params.get('busca') ?? ''
  const categoryId = Number(params.get('categoria')) || undefined
  const [draft, setDraft] = useState(search)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const categories = useAsync(() => categoryService.list(), [])
  const providers = useAsync(() => providerService.list({ search, categoryId }), [search, categoryId])

  // Pequeno debounce para a busca não disparar a cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft === search) return
      const next = new URLSearchParams(params)
      if (draft.trim()) next.set('busca', draft.trim())
      else next.delete('busca')
      setParams(next, { replace: true })
    }, 350)
    return () => clearTimeout(timer)
  }, [draft, search, params, setParams])

  const sorted = useMemo(
    () => [...(providers.data ?? [])].sort((a, b) => pseudoDistance(a.id) - pseudoDistance(b.id)),
    [providers.data],
  )

  const setCategory = (value: string) => {
    const next = new URLSearchParams(params)
    if (value === 'all') next.delete('categoria')
    else next.set('categoria', value)
    setParams(next, { replace: true })
  }

  const selectFromMap = (id: string) => {
    setSelectedId(id)
    listRef.current?.querySelector(`[data-provider="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const categoryOptions = [
    { value: 'all', label: 'Todos' },
    ...(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name })),
  ]

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.listColumn}>
        <header className={styles.header}>
          <p className="page-subtitle">Serviços próximos</p>
          <h1 className="page-title">Profissionais disponíveis</h1>
        </header>

        <div className={styles.search}>
          <Search aria-hidden />
          <input
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Nome, serviço ou bairro"
            aria-label="Buscar profissionais"
          />
          {draft && (
            <button type="button" onClick={() => setDraft('')} aria-label="Limpar busca">
              <X />
            </button>
          )}
        </div>

        <Tabs label="Categorias" value={categoryId ? String(categoryId) : 'all'} onChange={setCategory} options={categoryOptions} />

        <Map
          providers={sorted}
          selectedId={selectedId}
          onSelect={(provider) => selectFromMap(provider.id)}
          className={styles.mobileMap}
        />

        <section className={styles.sheet} ref={listRef}>
          <div className={styles.sheetHeader}>
            <h2 className="section-title">Ordenados por proximidade</h2>
            {!providers.loading && <span className="muted small">{sorted.length} encontrados</span>}
          </div>

          {providers.loading ? (
            <Skeleton count={4} height={78} />
          ) : providers.error ? (
            <ErrorState message={providers.error} onRetry={providers.reload} />
          ) : sorted.length === 0 ? (
            <EmptyState
              title="Nenhum profissional encontrado"
              description="Tente outra categoria ou termo de busca. Só aparecem profissionais aprovados e disponíveis agora."
            />
          ) : (
            <div className={styles.list}>
              {sorted.map((provider) => (
                <div key={provider.id} data-provider={provider.id} onMouseEnter={() => setSelectedId(provider.id)}>
                  <ProviderCard provider={provider} highlighted={selectedId === provider.id} />
                </div>
              ))}
            </div>
          )}

          <p className="note">A localização exata só será compartilhada após a solicitação ser aceita.</p>
        </section>
      </div>

      <div className={styles.mapColumn}>
        <Map providers={sorted} selectedId={selectedId} onSelect={(provider) => selectFromMap(provider.id)} className={styles.desktopMap} />
      </div>
    </div>
  )
}
