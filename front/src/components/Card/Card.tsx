import type { HTMLAttributes } from 'react'
import styles from './Card.module.css'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg'
  interactive?: boolean
}

export function Card({ padding = 'md', interactive, className, ...rest }: CardProps) {
  return (
    <div
      className={[styles.card, styles[padding], interactive && styles.interactive, className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}
