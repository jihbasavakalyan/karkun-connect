type CacheListener = () => void

export class SyncCache<T> {
  private value: T
  private hydrated = false
  private readonly listeners = new Set<CacheListener>()
  private readonly fallback: T

  constructor(fallback: T) {
    this.fallback = fallback
    this.value = fallback
  }

  get(): T {
    return this.value
  }

  getHydrated(): boolean {
    return this.hydrated
  }

  set(value: T, markHydrated = true): void {
    this.value = value
    if (markHydrated) {
      this.hydrated = true
    }
    this.listeners.forEach((listener) => listener())
  }

  reset(value?: T): void {
    this.value = value ?? this.fallback
    this.hydrated = false
    this.listeners.forEach((listener) => listener())
  }

  subscribe(listener: CacheListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
