/**
 * Observer extension points (KC-0131.5).
 * Interfaces only — no audit/logging/notification/metrics/UI implementations.
 */

import type { ExecutionEvent, ExecutionSession } from '../lifecycle/models'

export type ExecutionObserver = {
  readonly name: string
  onEvent(event: ExecutionEvent, session: ExecutionSession): void
}

/** Extension point — audit trail consumers. */
export type AuditExecutionObserver = ExecutionObserver & {
  readonly kind: 'audit'
}

/** Extension point — structured logging consumers. */
export type LoggingExecutionObserver = ExecutionObserver & {
  readonly kind: 'logging'
}

/** Extension point — notification consumers. */
export type NotificationExecutionObserver = ExecutionObserver & {
  readonly kind: 'notifications'
}

/** Extension point — metrics consumers. */
export type MetricsExecutionObserver = ExecutionObserver & {
  readonly kind: 'metrics'
}

/** Extension point — UI projection consumers. */
export type UiExecutionObserver = ExecutionObserver & {
  readonly kind: 'ui'
}

export type ExecutionObserverBus = {
  subscribe(observer: ExecutionObserver): () => void
  publish(event: ExecutionEvent, session: ExecutionSession): void
  list(): readonly ExecutionObserver[]
}

export function createExecutionObserverBus(): ExecutionObserverBus {
  const observers = new Set<ExecutionObserver>()
  return {
    subscribe(observer) {
      observers.add(observer)
      return () => {
        observers.delete(observer)
      }
    },
    publish(event, session) {
      for (const observer of observers) {
        observer.onEvent(event, session)
      }
    },
    list() {
      return [...observers]
    },
  }
}
