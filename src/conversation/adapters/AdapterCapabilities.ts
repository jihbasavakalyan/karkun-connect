/**
 * Adapter capability model (KC-004 Sprint 1.5).
 *
 * Purpose: Report what an adapter can do — never execute operations.
 * Dependencies: None beyond shared adapter identity types.
 * Future extensions: Domain-specific capability flags without changing method names.
 */

import type { AdapterAvailability, AdapterId } from './AdapterTypes'

/**
 * Capability flags — describe support only; do not execute operations.
 */
export type AdapterCapabilities = {
  canRead: boolean
  canWrite: boolean
  supportsRealtime: boolean
  supportsOffline: boolean
  supportsBatch: boolean
  supportsHistory: boolean
}

export const DEFAULT_READ_CAPABILITIES: AdapterCapabilities = {
  canRead: true,
  canWrite: false,
  supportsRealtime: false,
  supportsOffline: false,
  supportsBatch: false,
  supportsHistory: false,
}

export const DEFAULT_READ_WRITE_CAPABILITIES: AdapterCapabilities = {
  canRead: true,
  canWrite: true,
  supportsRealtime: false,
  supportsOffline: false,
  supportsBatch: false,
  supportsHistory: false,
}

/**
 * Shared repository adapter contract.
 *
 * Purpose: Every domain adapter reports identity, capabilities, and availability.
 * Ownership: Adapter implementations; Conversation Layer consumes via AdapterRegistry.
 */
export interface RepositoryAdapter {
  readonly adapterId: AdapterId
  getCapabilities(): AdapterCapabilities
  getAvailability(): AdapterAvailability
  canRead(): boolean
  canWrite(): boolean
  supportsRealtime(): boolean
  supportsOffline(): boolean
  supportsBatch(): boolean
  supportsHistory(): boolean
}

/** Helper base for capability getters — concrete adapters compose this pattern. */
export abstract class BaseRepositoryAdapter implements RepositoryAdapter {
  abstract readonly adapterId: AdapterId

  protected availability: AdapterAvailability = 'unavailable'
  protected capabilities: AdapterCapabilities = {
    canRead: false,
    canWrite: false,
    supportsRealtime: false,
    supportsOffline: false,
    supportsBatch: false,
    supportsHistory: false,
  }

  getCapabilities(): AdapterCapabilities {
    return { ...this.capabilities }
  }

  getAvailability(): AdapterAvailability {
    return this.availability
  }

  canRead(): boolean {
    return this.capabilities.canRead
  }

  canWrite(): boolean {
    return this.capabilities.canWrite
  }

  supportsRealtime(): boolean {
    return this.capabilities.supportsRealtime
  }

  supportsOffline(): boolean {
    return this.capabilities.supportsOffline
  }

  supportsBatch(): boolean {
    return this.capabilities.supportsBatch
  }

  supportsHistory(): boolean {
    return this.capabilities.supportsHistory
  }

  protected setAvailability(availability: AdapterAvailability): void {
    this.availability = availability
  }

  protected setCapabilities(capabilities: AdapterCapabilities): void {
    this.capabilities = { ...capabilities }
  }
}
