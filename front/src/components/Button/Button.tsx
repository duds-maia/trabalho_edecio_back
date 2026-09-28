import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './Button.module.css'

type Variant = 'primary' | 'soft' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  block?: boolean
  loading?: boolean
  icon?: ReactNode
  /** Quando informado, renderiza um link do React Router com a aparência de botão. */
  to?: string
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  loading,
  icon,
  to,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], styles[size], block && styles.block, className]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {loading ? <span className={styles.spinner} aria-hidden /> : icon}
      {children && <span>{children}</span>}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    )
  }

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {content}
    </button>
  )
}
