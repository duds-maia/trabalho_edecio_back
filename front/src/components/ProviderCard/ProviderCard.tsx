import { ChevronRight, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Provider } from '../../types/entities'
import { formatKm, pseudoDistance } from '../../utils/format'
import { Avatar } from '../Avatar/Avatar'
import { Badge } from '../Badge/Badge'
import { Rating } from '../Rating/Rating'
import styles from './ProviderCard.module.css'

interface ProviderCardProps {
  provider: Provider
  /** Se informado, o card vira um botão de seleção em vez de link para o perfil. */
  onSelect?: (provider: Provider) => void
  selected?: boolean
  highlighted?: boolean
  showStatus?: boolean
}

export function ProviderCard({ provider, onSelect, selected, highlighted, showStatus = true }: ProviderCardProps) {
  const className = [styles.card, selected && styles.selected, highlighted && styles.highlighted].filter(Boolean).join(' ')

  const content = (
    <>
      <Avatar name={provider.user.name} size={52} />
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <h3 className={styles.name}>{provider.user.name}</h3>
          {showStatus && (
            <Badge tone={provider.isAvailable ? 'success' : 'neutral'} dot>
              {provider.isAvailable ? 'Disponível' : 'Indisponível'}
            </Badge>
          )}
        </div>
        <p className={styles.meta}>
          {provider.category.name}
          {provider.address && (
            <>
              {' · '}
              <MapPin aria-hidden className={styles.pin} />
              {provider.address.split(',')[0]}
            </>
          )}
        </p>
        <Rating value={provider.ratingAverage} count={provider._count?.reviews} />
      </div>
      <div className={styles.side}>
        <span className={styles.distance}>{formatKm(pseudoDistance(provider.id))}</span>
        {!onSelect && <ChevronRight className={styles.chevron} aria-hidden />}
      </div>
    </>
  )

  if (onSelect) {
    return (
      <button type="button" className={className} onClick={() => onSelect(provider)} aria-pressed={selected}>
        {content}
      </button>
    )
  }

  return (
    <Link to={`/prestadores/${provider.id}`} className={className}>
      {content}
    </Link>
  )
}
