/**
 * Immutable communication plan (KC-004 Sprint 1.4).
 *
 * Purpose: Channel-neutral composed message sequence for Presentation Layer.
 * Ownership: Communication Engine produces plans; UI renders later.
 * Extension points: Plans may be cached per session for replay without recomposition.
 * Future localization strategy: Presentation resolves localizationKey + variables per locale.
 */

import type {
  CommunicationMessage,
  CommunicationPlanMetadata,
} from './CommunicationTypes'

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

export type CommunicationPlanData = {
  metadata: CommunicationPlanMetadata
  messages: readonly CommunicationMessage[]
}

export class CommunicationPlan {
  private readonly data: Readonly<CommunicationPlanData>

  private constructor(data: CommunicationPlanData) {
    this.data = freezeValue(data) as Readonly<CommunicationPlanData>
  }

  static create(data: CommunicationPlanData): CommunicationPlan {
    return new CommunicationPlan(data)
  }

  getMetadata(): CommunicationPlanMetadata {
    return this.data.metadata
  }

  getMessages(): readonly CommunicationMessage[] {
    return this.data.messages
  }

  getPrimaryMessage(): CommunicationMessage | null {
    return this.data.messages[0] ?? null
  }

  toData(): Readonly<CommunicationPlanData> {
    return this.data
  }
}
