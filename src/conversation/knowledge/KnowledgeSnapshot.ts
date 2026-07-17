/**
 * Immutable knowledge snapshots (KC-004 Sprint 1.2).
 *
 * Purpose: Read-only representations of aggregated knowledge at resolution time.
 * Ownership: Knowledge Manager produces snapshots; consumers must not mutate payloads.
 * Future implementations: Repository provider fills high-confidence campaign payloads.
 * Extension points: Version bumps when payload schema evolves per domain.
 */

import type {
  DomainKnowledgePayload,
  KnowledgeAvailability,
  KnowledgeBundleMetadata,
  KnowledgeConfidenceLevel,
  KnowledgeConfidenceReport,
  KnowledgeConflictRecord,
  KnowledgeDomain,
  KnowledgeAvailabilityReport,
} from './KnowledgeTypes'

function freezeValue<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value
  }
  if (Array.isArray(value)) {
    value.forEach((item) => freezeValue(item))
    return Object.freeze(value) as T
  }
  for (const key of Object.keys(value)) {
    freezeValue((value as Record<string, unknown>)[key])
  }
  return Object.freeze(value)
}

export type KnowledgeSnapshotData = {
  domain: KnowledgeDomain
  timestamp: number
  availability: KnowledgeAvailability
  confidence: KnowledgeConfidenceLevel
  sourceIdentifier: string
  snapshotVersion: number
  payload: DomainKnowledgePayload
}

export type KnowledgeBundleSnapshotData = {
  metadata: KnowledgeBundleMetadata
  snapshots: readonly KnowledgeSnapshotData[]
}

/** Immutable per-domain knowledge snapshot. */
export class KnowledgeSnapshot {
  private readonly data: Readonly<KnowledgeSnapshotData>

  private constructor(data: KnowledgeSnapshotData) {
    this.data = freezeValue(data) as Readonly<KnowledgeSnapshotData>
  }

  static create(data: KnowledgeSnapshotData): KnowledgeSnapshot {
    return new KnowledgeSnapshot(data)
  }

  getDomain(): KnowledgeDomain {
    return this.data.domain
  }

  getTimestamp(): number {
    return this.data.timestamp
  }

  getAvailability(): KnowledgeAvailability {
    return this.data.availability
  }

  getConfidence(): KnowledgeConfidenceLevel {
    return this.data.confidence
  }

  getSourceIdentifier(): string {
    return this.data.sourceIdentifier
  }

  getSnapshotVersion(): number {
    return this.data.snapshotVersion
  }

  getPayload(): DomainKnowledgePayload {
    return this.data.payload
  }

  toData(): Readonly<KnowledgeSnapshotData> {
    return this.data
  }
}

/** Immutable bundle of domain snapshots for a single knowledge request. */
export class KnowledgeBundleSnapshot {
  private readonly data: Readonly<KnowledgeBundleSnapshotData>

  private constructor(data: KnowledgeBundleSnapshotData) {
    this.data = freezeValue(data) as Readonly<KnowledgeBundleSnapshotData>
  }

  static create(data: KnowledgeBundleSnapshotData): KnowledgeBundleSnapshot {
    return new KnowledgeBundleSnapshot(data)
  }

  getMetadata(): KnowledgeBundleMetadata {
    return this.data.metadata
  }

  getSnapshots(): readonly KnowledgeSnapshot[] {
    return this.data.snapshots.map((entry) => KnowledgeSnapshot.create(entry))
  }

  getSnapshotForDomain(domain: KnowledgeDomain): KnowledgeSnapshot | null {
    const entry = this.data.snapshots.find((snapshot) => snapshot.domain === domain)
    return entry ? KnowledgeSnapshot.create(entry) : null
  }

  getAvailability(): KnowledgeAvailabilityReport {
    return this.data.metadata.availability
  }

  getConfidence(): KnowledgeConfidenceReport {
    return this.data.metadata.confidence
  }

  getConflicts(): readonly KnowledgeConflictRecord[] {
    return this.data.metadata.conflicts
  }

  toData(): Readonly<KnowledgeBundleSnapshotData> {
    return this.data
  }
}
