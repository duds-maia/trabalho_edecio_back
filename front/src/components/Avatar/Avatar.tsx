import { initials } from '../../utils/format'
import styles from './Avatar.module.css'

// Tons da paleta para diferenciar pessoas sem usar fotos.
const TONES = ['#d8e9f6', '#b6d5ec', '#c9dcef', '#dbe6f5', '#cfe4f1']

function toneFor(name: string) {
  let hash = 0
  for (const char of name) hash = (hash + char.charCodeAt(0)) % TONES.length
  return TONES[hash]
}

export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: size * 0.36, background: toneFor(name) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}
