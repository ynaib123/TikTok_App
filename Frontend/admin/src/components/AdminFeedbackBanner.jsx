import { useEffect, useState } from 'react'
import '../styles/components/feedback.css'

const AUTO_DISMISS_MS = 3000

export default function AdminFeedbackBanner({
  type = 'error',
  message,
  onClose,
  placement = 'floating',
}) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (!message) return undefined

    const timeoutId = window.setTimeout(() => {
      setIsVisible(false)
      if (typeof onClose === 'function') {
        onClose()
      }
    }, AUTO_DISMISS_MS)

    return () => window.clearTimeout(timeoutId)
  }, [message, onClose, type])

  const handleClose = () => {
    setIsVisible(false)
    if (typeof onClose === 'function') {
      onClose()
    }
  }

  if (!message || !isVisible) return null

  const variantClassName = (
    type === 'error'
      ? 'error-message'
      : type === 'success'
        ? 'success-message'
        : 'info-message'
  )
  const className = [
    variantClassName,
    'account-feedback-dismissible',
    placement === 'navbar' ? 'is-inline-navbar' : null,
  ].filter(Boolean).join(' ')
  const role = type === 'error' ? 'alert' : 'status'
  const ariaLive = type === 'error' ? 'assertive' : 'polite'

  return (
    <div className={className} role={role} aria-live={ariaLive}>
      <span>{message}</span>
      <button type="button" className="alert-close-btn" onClick={handleClose} aria-label="Fermer le message">
        x
      </button>
    </div>
  )
}
