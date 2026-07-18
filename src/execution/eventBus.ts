/**
 * KC-020 — Lightweight in-process execution event bus.
 * Not a notification system — lifecycle pub/sub for automation subscribers.
 */

import type { ExecutionEvent, ExecutionEventListener, ExecutionEventType } from './events'

export class ExecutionEventBus {
  private readonly listeners = new Set<ExecutionEventListener>()
  private readonly typed = new Map<ExecutionEventType, Set<ExecutionEventListener>>()

  publish(event: ExecutionEvent): void {
    for (const listener of this.listeners) {
      listener(event)
    }
    const typedListeners = this.typed.get(event.type)
    if (!typedListeners) return
    for (const listener of typedListeners) {
      listener(event)
    }
  }

  subscribe(listener: ExecutionEventListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  subscribeTo(type: ExecutionEventType, listener: ExecutionEventListener): () => void {
    const set = this.typed.get(type) ?? new Set<ExecutionEventListener>()
    set.add(listener)
    this.typed.set(type, set)
    return () => {
      set.delete(listener)
      if (set.size === 0) this.typed.delete(type)
    }
  }

  clear(): void {
    this.listeners.clear()
    this.typed.clear()
  }
}

let sharedBus: ExecutionEventBus | null = null

export function getExecutionEventBus(): ExecutionEventBus {
  if (!sharedBus) sharedBus = new ExecutionEventBus()
  return sharedBus
}

export function resetExecutionEventBusForTests(): void {
  sharedBus?.clear()
  sharedBus = null
}
