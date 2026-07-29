/**
 * Secretary Intelligence v1.0 — Urdu-first حلقہ سیکرٹری composition.
 * Read-only: existing guidance / journey / metrics / search only.
 */

export type SecretaryFocus = 'full' | 'remaining'

export type SecretaryCheckItem = {
  readonly label: string
  readonly done: boolean
}

export type PersonSecretaryFacts = {
  readonly personId: string
  readonly name: string
  readonly mobile: string
  readonly categoryLabel: string
  readonly ruknLabel: string
  readonly situationSummary: string
  readonly completed: readonly SecretaryCheckItem[]
  readonly remaining: readonly SecretaryCheckItem[]
  readonly attentionNotes: readonly string[]
  readonly recentActivity: readonly string[]
  readonly lastContactLabel: string
  readonly followUpLabel: string
  readonly riskLabel: string
  readonly nextPlan: readonly string[]
  readonly advice: string
  readonly profilePath: string
}

export type CampaignSecretarySections = {
  readonly situation: string
  readonly progress: readonly string[]
  readonly remaining: readonly string[]
  readonly attention: readonly string[]
  readonly nextPlan: readonly string[]
  readonly advice: string
}
