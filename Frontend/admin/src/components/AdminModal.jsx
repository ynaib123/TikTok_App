import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

function getModalRoot() {
  if (typeof document === 'undefined') return null
  return document.body
}

export default function AdminModal({
  isOpen,
  onClose,
  title,
  kicker,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
  closeOnEscape = true,
  showCloseButton = true,
  labelledById,
  className = '',
}) {
  const modalRef = useRef(null)
  const lastFocusedElementRef = useRef(null)

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined

    lastFocusedElementRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
      if (lastFocusedElementRef.current instanceof HTMLElement) {
        lastFocusedElementRef.current.focus()
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined

    const frame = window.requestAnimationFrame(() => {
      const modalElement = modalRef.current
      if (!(modalElement instanceof HTMLElement)) return

      const focusableElements = modalElement.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      const firstFocusable = focusableElements[0]

      if (firstFocusable instanceof HTMLElement) {
        firstFocusable.focus()
        return
      }

      modalElement.focus()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !closeOnEscape || typeof window === 'undefined') return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose?.()
        return
      }

      if (event.key !== 'Tab') return

      const modalElement = modalRef.current
      if (!(modalElement instanceof HTMLElement)) return

      const focusableElements = Array.from(modalElement.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter((element) => element instanceof HTMLElement)

      if (focusableElements.length === 0) {
        event.preventDefault()
        modalElement.focus()
        return
      }

      const firstFocusable = focusableElements[0]
      const lastFocusable = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      if (event.shiftKey && activeElement === firstFocusable) {
        event.preventDefault()
        lastFocusable.focus()
      } else if (!event.shiftKey && activeElement === lastFocusable) {
        event.preventDefault()
        firstFocusable.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeOnEscape, isOpen, onClose])

  if (!isOpen) return null

  const modalRoot = getModalRoot()
  if (!modalRoot) return null

  const titleId = labelledById || `admin-modal-title-${title?.toLowerCase().replace(/\s+/g, '-') || 'dialog'}`

  return createPortal(
    <div
      className="admin-modal-overlay"
      onClick={() => {
        if (!closeOnOverlay) return
        onClose?.()
      }}
    >
      <div
        className={`admin-modal admin-modal-${size} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? `${titleId}-description` : undefined}
        onClick={(event) => event.stopPropagation()}
        ref={modalRef}
        tabIndex={-1}
      >
        <div className="admin-modal-head">
          <div className="admin-modal-copy">
            {kicker ? <p className="admin-modal-kicker">{kicker}</p> : null}
            {title ? <h2 id={titleId}>{title}</h2> : null}
            {description ? <p id={`${titleId}-description`} className="admin-modal-description">{description}</p> : null}
          </div>
          {showCloseButton ? (
            <button
              type="button"
              className="admin-modal-close"
              onClick={() => onClose?.()}
              aria-label="Fermer la modale"
              title="Fermer"
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="admin-modal-body">{children}</div>

        {footer ? (
          <div className="admin-modal-footer">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    modalRoot,
  )
}
