import { Component } from 'react'
import { logger } from '../lib/logger'

/**
 * Error boundary — catches render errors and shows fallback UI.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    logger.error('ErrorBoundary caught:', error, info?.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
          <h1 className="text-[22px] font-black text-white tracking-tight">Something broke</h1>
          <p className="text-[13px] text-[#555555] mt-2 text-center">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.handleReset}
            className="mt-6 w-full max-w-[280px] h-[52px] bg-[#ff4520] text-white font-semibold text-[15px] active:scale-[0.98] transition-transform"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
