import styles from './Tabs.module.css'

interface TabsProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string; count?: number }>
  label: string
}

/** Filtros em "pílulas" com rolagem horizontal no celular. */
export function Tabs<T extends string>({ value, onChange, options, label }: TabsProps<T>) {
  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          className={styles.tab}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count !== undefined && <span className={styles.count}>{option.count}</span>}
        </button>
      ))}
    </div>
  )
}
