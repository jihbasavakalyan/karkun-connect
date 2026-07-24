/**
 * KC-0102A — Isolate a single dashboard widget/section failure so the rest of the
 * dashboard keeps rendering. Presentation-only; does not change data loading.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'

type WidgetErrorBoundaryProps = {
  children: ReactNode
  /** Accessible name for the failed section. */
  title?: string
  /** Compact inline fallback vs taller panel. */
  compact?: boolean
}

type WidgetErrorBoundaryState = {
  error: Error | null
}

export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[KC-0102A] WidgetErrorBoundary caught', {
      title: this.props.title ?? 'Widget',
      message: error.message,
      componentStack: info.componentStack,
    })
  }

  private handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    const title = this.props.title ?? 'This section'
    const compact = this.props.compact ?? false

    return (
      <section
        className={
          compact
            ? 'rounded-lg border border-border bg-surface-muted px-3 py-3'
            : 'exdash-panel'
        }
        role="alert"
        aria-live="polite"
      >
        <h2 className="text-sm font-semibold text-text-heading">{title} unavailable</h2>
        <p className="mt-1 text-xs text-secondary">
          Something went wrong in this section. Other dashboard sections are unaffected.
        </p>
        <p className="mt-2 break-words font-mono text-[11px] text-secondary">
          {this.state.error.message}
        </p>
        <button
          type="button"
          className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
          onClick={this.handleRetry}
        >
          Retry section
        </button>
      </section>
    )
  }
}
