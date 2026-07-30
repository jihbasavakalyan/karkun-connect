/**
 * KC-035B — Extracted operational entities.
 */

export type RelativePersonRef =
  | 'this'
  | 'that'
  | 'him_her'
  | 'this_worker'
  | 'next'
  | 'previous'

export type IntentEntities = {
  readonly personName: string | null
  readonly personId: string | null
  readonly relativePerson: RelativePersonRef | null
  readonly campaignName: string | null
  readonly campaignId: string | null
  readonly ward: string | null
  readonly activity: string | null
  readonly number: number | null
  readonly dateText: string | null
  readonly navigationTarget: string | null
}

export function emptyIntentEntities(): IntentEntities {
  return {
    personName: null,
    personId: null,
    relativePerson: null,
    campaignName: null,
    campaignId: null,
    ward: null,
    activity: null,
    number: null,
    dateText: null,
    navigationTarget: null,
  }
}
