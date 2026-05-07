import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'danger' | 'secondary'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'journey-btn is-primary',
  ghost: 'journey-btn is-ghost',
  danger: 'journey-btn is-danger',
  secondary: 'journey-btn is-secondary',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leadingIcon,
  trailingIcon,
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const sizeClass = size === 'sm' ? 'is-sm' : size === 'lg' ? 'is-lg' : ''
  const composed = `${VARIANT_CLASS[variant]} ${sizeClass} ${className}`.trim()

  return (
    <button type="button" {...rest} className={composed} disabled={disabled || loading}>
      {leadingIcon ? <span className="journey-btn-icon">{leadingIcon}</span> : null}
      <span className="journey-btn-label">{loading ? 'Chargement…' : children}</span>
      {trailingIcon ? <span className="journey-btn-icon">{trailingIcon}</span> : null}
    </button>
  )
}
