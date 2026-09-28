import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'

interface AsyncState<T> {
  data: T | undefined
  error: string | null
  loading: boolean
  reload: () => void
  setData: (data: T) => void
}

/** Carrega dados assíncronos e expõe loading/erro/reload. */
export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    loaderRef
      .current()
      .then((result) => active && setData(result))
      .catch((err: unknown) => active && setError(err instanceof Error ? err.message : 'Erro inesperado.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, loading, reload, setData }
}
