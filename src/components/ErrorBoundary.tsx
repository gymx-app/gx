import { Component, type ReactNode } from 'react'
import { logger } from '../lib/logger'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('ErrorBoundary caught:', error, info?.componentStack)
  }

  isChunkError() {
    const msg = this.state.error?.message ?? ''
    return (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('Loading chunk') ||
      msg.includes('Loading CSS chunk')
    )
  }

  handleReset = () => {
    if (this.isChunkError()) {
      window.location.reload()
      return
    }
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const isChunk = this.isChunkError()
      return (
        <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center px-6">
          <h1 className="text-[22px] font-black text-white tracking-tight">Something broke</h1>
          <p className="text-[13px] text-disabled mt-2 text-center">
            {isChunk
              ? 'A new version is available. Tap to reload.'
              : (this.state.error?.message ?? 'An unexpected error occurred.')}
          </p>
          <button
            onClick={this.handleReset}
            className="mt-6 w-full max-w-[280px] h-[52px] bg-accent text-white font-semibold text-[15px] active:scale-[0.98] transition-transform"
          >
            {isChunk ? 'Reload' : 'Try Again'}
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
