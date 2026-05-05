import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  closable?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  closable = true,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closable) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closable, onClose])

  if (!open) return null

  const sizeClass = size === 'sm' ? 'is-sm' : size === 'lg' ? 'is-lg' : ''
  const titleId = `modal-title-${title.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div className="journey-modal-overlay">
      {closable ? (
        <button
          type="button"
          className="journey-modal-backdrop"
          aria-label="Fermer la fenêtre"
          onClick={onClose}
        />
      ) : null}
      <div
        className={`journey-modal-card ${sizeClass}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="journey-modal-head">
          <h3 id={titleId}>{title}</h3>
          {closable ? (
            <button
              type="button"
              className="journey-modal-close"
              onClick={onClose}
              aria-label="Fermer"
            >
              ×
            </button>
          ) : null}
        </header>
        <div className="journey-modal-body">{children}</div>
        {footer ? <footer className="journey-modal-actions">{footer}</footer> : null}
      </div>
    </div>
  )
}
