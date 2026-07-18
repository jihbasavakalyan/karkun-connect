/**
 * KC-027B — Catch authenticated-tree render failures; expose exact exception for diagnosis.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { loadAuthSession } from '@/lib/authSession'

type StartupErrorBoundaryProps = {
  children: ReactNode
}

type StartupErrorBoundaryState = {
  error: Error | null
  componentStack: string | null
  route: string | null
  role: string | null
}

export type StartupErrorCapture = {
  message: string
  name: string
  stack: string | null
  componentStack: string | null
  route: string
  role: string | null
  at: string
}

declare global {
  interface Window {
    __KC027B_LAST_ERROR__?: StartupErrorCapture
  }
}

function currentRoute(): string {
  if (typeof window === 'undefined') return '(ssr)'
  return `${window.location.pathname}${window.location.search}`
}

function currentRole(): string | null {
  try {
    return loadAuthSession()?.role ?? null
  } catch {
    return null
  }
}

function persistCapture(capture: StartupErrorCapture): void {
  if (typeof window === 'undefined') return
  window.__KC027B_LAST_ERROR__ = capture
  try {
    sessionStorage.setItem('kc027b.lastError', JSON.stringify(capture))
  } catch {
    // Safari private / quota — in-memory capture still available.
  }
}

export class StartupErrorBoundary extends Component<
  StartupErrorBoundaryProps,
  StartupErrorBoundaryState
> {
  state: StartupErrorBoundaryState = {
    error: null,
    componentStack: null,
    route: null,
    role: null,
  }

  static getDerivedStateFromError(error: Error): Partial<StartupErrorBoundaryState> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const route = currentRoute()
    const role = currentRole()
    const componentStack = info.componentStack ?? null
    const capture: StartupErrorCapture = {
      message: error.message,
      name: error.name,
      stack: error.stack ?? null,
      componentStack,
      route,
      role,
      at: new Date().toISOString(),
    }
    persistCapture(capture)
    console.error('[KC-027B] StartupErrorBoundary caught', capture)
    this.setState({ componentStack, route, role })
  }

  private handleReload = () => {
    this.setState({ error: null, componentStack: null, route: null, role: null })
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
        className="flex min-h-svh flex-col items-center justify-center gap-4 bg-surface-muted px-6 py-8 text-left"
        role="alert"
      >
        <div className="w-full max-w-2xl space-y-3">
          <h1 className="text-center text-lg font-semibold text-text-heading">
            Something went wrong
          </h1>
          <p className="text-center text-sm text-secondary">
            The dashboard failed to load after sign-in. Diagnostic details below (KC-027B).
          </p>
          <dl className="space-y-2 rounded-lg border border-border bg-surface p-4 text-xs text-text-heading">
            <div>
              <dt className="font-semibold text-secondary">Message</dt>
              <dd className="mt-0.5 break-words font-mono">{this.state.error.message}</dd>
            </div>
            <div>
              <dt className="font-semibold text-secondary">Route</dt>
              <dd className="mt-0.5 font-mono">{this.state.route ?? currentRoute()}</dd>
            </div>
            <div>
              <dt className="font-semibold text-secondary">Role</dt>
              <dd className="mt-0.5 font-mono">{this.state.role ?? 'unknown'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-secondary">Stack</dt>
              <dd className="mt-0.5 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-secondary">
                {this.state.error.stack ?? '(no stack)'}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-secondary">Component stack</dt>
              <dd className="mt-0.5 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-secondary">
                {this.state.componentStack ?? '(no component stack)'}
              </dd>
            </div>
          </dl>
          <div className="flex justify-center">
            <button
              type="button"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
              onClick={this.handleReload}
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
