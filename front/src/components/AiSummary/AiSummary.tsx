import { Sparkles } from 'lucide-react'
import styles from './AiSummary.module.css'

interface AiSummaryProps {
  text: string | null | undefined
  loading?: boolean
  title?: string
}

/** Bloco identificado como gerado por IA (Gemini), conforme o wireframe. */
export function AiSummary({ text, loading, title = 'Resumo das avaliações gerado por IA' }: AiSummaryProps) {
  if (!loading && !text) return null
  return (
    <aside className={styles.box} aria-busy={loading}>
      <span className={styles.title}>
        <Sparkles aria-hidden />
        {title}
      </span>
      {loading ? <span className={styles.shimmer} /> : <p className={styles.text}>{text}</p>}
    </aside>
  )
}
