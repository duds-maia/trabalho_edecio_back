import { Star } from 'lucide-react'
import { useState } from 'react'
import { formatRating } from '../../utils/format'
import styles from './Rating.module.css'

interface RatingProps {
  value: number | string
  count?: number
  size?: 'sm' | 'md'
}

/** Exibição compacta: ★ 4,8 · 32 avaliações */
export function Rating({ value, count, size = 'sm' }: RatingProps) {
  const hasRating = Number(value) > 0
  return (
    <span className={`${styles.rating} ${styles[size]}`}>
      <Star className={styles.star} aria-hidden />
      {hasRating ? formatRating(value) : 'Novo'}
      {!!count && hasRating && (
        <span className={styles.count}>
          · {count} {count === 1 ? 'avaliação' : 'avaliações'}
        </span>
      )}
    </span>
  )
}

/** Cinco estrelas fixas (ex.: em cada comentário). */
export function Stars({ value }: { value: number }) {
  return (
    <span className={styles.stars} aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={n <= value ? styles.filled : styles.empty} aria-hidden />
      ))}
    </span>
  )
}

/** Seleção de nota para avaliar um atendimento. */
export function RatingInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hover, setHover] = useState(0)
  const labels = ['', 'Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente']
  const shown = hover || value

  return (
    <div className={styles.input}>
      <div className={styles.inputStars} role="radiogroup" aria-label="Nota" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
            className={styles.inputStar}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
          >
            <Star className={n <= shown ? styles.filled : styles.empty} />
          </button>
        ))}
      </div>
      <span className={styles.inputLabel}>{labels[shown] || 'Toque para avaliar'}</span>
    </div>
  )
}
