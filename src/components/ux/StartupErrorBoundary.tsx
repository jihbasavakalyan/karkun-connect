/**
 * KC-027A — Catch authenticated-tree render failures so Safari does not white-screen.
 * Logs component stack + route for diagnosis; offers a reload recovery action.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'

type StartupErrorBoundaryProps = {
  children: ReactNode
}

type StartupErrorBoundaryState = {
  error: Error | null
  componentStack: string | null
}

function currentRoute(): string {
  if (typeof window === 'undefined') return '(ssr)'
  return `${window.location.pathname}${window.location.search}`
}

export class StartupErrorBoundary extends Component<
  StartupErrorBoundaryProps,
  StartupErrorBoundaryState
> {
  state: StartupErrorBoundaryState = {
    error: null,
    componentStack: null,
  }

  static getDerivedStateFromError(error: Error): Partial<StartupErrorBoundaryState> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const route = currentRoute()
    console.error('[KC-027A] Authenticated render failure', {
      message: error.message,
      name: error.name,
      route,
      componentStack: info.componentStack,
      stack: error.stack,
    })
    this.setState({ componentStack: info.componentStack ?? null })
  }

  private handleReload = () => {
    this.setState({ error: null, componentStack: null })
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <div
        className="flex min-h-svh flex-col items-center justify-center gap-4 bg-surface-muted px-6 text-center"
        role="alert"
      >
        <h1 className="text-lg font-semibold text-text-heading">Something went wrong</h1>
        <p className="max-w-md text-sm text-secondary">
          The dashboard failed to load after sign-in. Your session is intact — reload to continue.
        </p>
        <button
          type="button"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          onClick={this.handleReload}
        >
          Reload
        </button>
      </div>
    )
  }
}
