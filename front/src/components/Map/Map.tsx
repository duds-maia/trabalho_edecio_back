import { Navigation } from 'lucide-react'
import type { Provider } from '../../types/entities'
import styles from './Map.module.css'

interface MapProps {
  providers: Provider[]
  selectedId?: string | null
  onSelect?: (provider: Provider) => void
  className?: string
}

// Posição estável a partir do id enquanto o backend não fornece coordenadas.
function positionFor(id: string) {
  let a = 7
  let b = 13
  for (const char of id) {
    a = (a * 31 + char.charCodeAt(0)) % 997
    b = (b * 17 + char.charCodeAt(0)) % 991
  }
  return { left: `${12 + (a % 76)}%`, top: `${14 + (b % 66)}%` }
}

/**
 * Mapa ilustrativo. Na etapa de integração (Google Maps), troque o conteúdo
 * deste componente mantendo as mesmas props.
 */
export function Map({ providers, selectedId, onSelect, className }: MapProps) {
  return (
    <div className={[styles.map, className].filter(Boolean).join(' ')} role="img" aria-label="Mapa de prestadores próximos">
      <span className={`${styles.road} ${styles.road1}`} />
      <span className={`${styles.road} ${styles.road2}`} />
      <span className={`${styles.road} ${styles.road3}`} />
      <span className={styles.park} />
      <span className={styles.water} />

      <span className={styles.me} style={{ left: '48%', top: '52%' }} title="Você está aqui">
        <span className={styles.meDot} />
      </span>

      {providers.map((provider) => (
        <button
          key={provider.id}
          type="button"
          className={[styles.pin, selectedId === provider.id && styles.pinActive].filter(Boolean).join(' ')}
          style={positionFor(provider.id)}
          onClick={() => onSelect?.(provider)}
          aria-label={`${provider.user.name}, ${provider.category.name}`}
        >
          <span className={styles.pinLabel}>{provider.user.name.split(' ')[0]}</span>
        </button>
      ))}

      <span className={styles.legend}>
        <Navigation aria-hidden /> Localização aproximada
      </span>
    </div>
  )
}
