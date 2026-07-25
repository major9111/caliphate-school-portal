/**
 * FUGUSAU Portal — Root Error Boundary
 * Without this, ANY uncaught render error anywhere in the tree crashes to a
 * totally blank, silent white screen — no message, no way to recover.
 * This catches it and offers a reload instead.
 */
import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : 'Something went wrong.' }
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error('FUGUSAU Portal — uncaught render error:', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: '#060E0A', color: '#E8F5ED', fontFamily: 'Sora, sans-serif',
        textAlign: 'center', padding: 24,
      }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Something went wrong</h1>
        <p style={{ fontSize: 13, opacity: 0.6, maxWidth: 320, margin: 0 }}>
          {this.state.message || 'The page hit an unexpected error and could not load.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8, padding: '10px 24px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #006B3F 0%, #00A85A 100%)',
            color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}
        >
          Reload page
        </button>
      </div>
    )
  }
}
