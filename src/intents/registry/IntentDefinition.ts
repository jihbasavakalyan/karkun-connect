/**
 * KC-035B — Intent definition shape for the registry.
 */

import type { IntentCategory } from '../models/IntentCategory'
import type { IntentCode } from '../models/IntentCode'

/**
 * A pattern group: all tokens in `allOf` must appear (order-independent),
 * and at least one of `anyOf` if provided.
 */
export type IntentPatternGroup = {
  readonly id: string
  /** Normalized tokens that must all be present. */
  readonly allOf?: readonly string[]
  /** At least one of these normalized tokens/phrases must be present. */
  readonly anyOf?: readonly string[]
  /** Boost when this group matches. */
  readonly weight?: number
}

export type IntentDefinition = {
  readonly code: IntentCode
  readonly category: IntentCategory
  readonly patterns: readonly IntentPatternGroup[]
  /** Base strength when a pattern group matches. */
  readonly baseStrength: number
}
