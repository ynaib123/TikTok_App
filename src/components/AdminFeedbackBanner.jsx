import '../styles/components/feedback.css'

export default function AdminFeedbackBanner({
  type = 'error',
  message,
  onClose,
  placement = 'floating',
}) {
  if (!message) return null

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
      <button type="button" className="alert-close-btn" onClick={onClose} aria-label="Fermer le message">
        ×
      </button>
    </div>
  )
}
