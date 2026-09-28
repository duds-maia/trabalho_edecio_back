import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import styles from './Input.module.css'

interface FieldProps {
  label: string
  hint?: string
  error?: string
  icon?: ReactNode
}

function Field({ id, label, hint, error, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children}
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : (
        hint && <span className={styles.hint}>{hint}</span>
      )}
    </div>
  )
}

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(' ')

export function Input({ label, hint, error, icon, className, ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <div className={styles.control}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <input
          id={id}
          className={cx(styles.input, !!icon && styles.withIcon, !!error && styles.invalid, className)}
          aria-invalid={Boolean(error)}
          {...rest}
        />
      </div>
    </Field>
  )
}

export function TextArea({ label, hint, error, className, ...rest }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        className={cx(styles.input, styles.textarea, !!error && styles.invalid, className)}
        aria-invalid={Boolean(error)}
        {...rest}
      />
    </Field>
  )
}

export function Select({
  label,
  hint,
  error,
  className,
  children,
  ...rest
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        className={cx(styles.input, styles.select, !!error && styles.invalid, className)}
        aria-invalid={Boolean(error)}
        {...rest}
      >
        {children}
      </select>
    </Field>
  )
}
