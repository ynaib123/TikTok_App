import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class JourneyErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('JourneyErrorBoundary caught an error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="journey-empty is-error-boundary">
          <div className="journey-error-icon" aria-hidden="true">⚠️</div>
          <strong>Une erreur inattendue est survenue</strong>
          <p>
            {this.state.error?.message || 'Le composant n a pas pu s afficher.'}
          </p>
          <button
            type="button"
            className="journey-btn is-primary"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Réessayer
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
