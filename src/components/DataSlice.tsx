import { Component, type ReactNode } from 'react'

interface Props {
  name: string
  fallback?: ReactNode
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class DataSlice extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error(`[DataSlice:${this.props.name}]`, error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '12px',
          margin: '8px 0',
        }}>
          <p style={{ fontSize: '13px', color: '#ef4444', fontWeight: 600 }}>
            Failed to load {this.props.name}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              marginTop: '8px',
              fontSize: '12px',
              color: '#f0ede8',
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
