/**
 * Digital Rafeeq MVP turn types.
 */

export type RafeeqRole = 'administrator' | 'rukn'

export type RafeeqEntityType =
  | 'karkun'
  | 'muttafiq'
  | 'rukn'
  | 'campaign'
  | 'assignment'
  | 'report'
  | 'module'
  | 'dashboard'
  | 'settings'
  | 'attendance'
  | 'weekly_ijtema'

export type RafeeqAction = {
  readonly id: string
  readonly label: string
  readonly route: string
  readonly entityType?: RafeeqEntityType
  readonly description?: string
  readonly primaryActionLabel?: string
  /** Confirm / Cancel / alternative / follow-up affordance for safe actions */
  readonly confirmRole?: 'confirm' | 'cancel' | 'alternative' | 'followup'
}

export type RafeeqTurnResult = {
  readonly text: string
  readonly actions: readonly RafeeqAction[]
  readonly intentCode: string
  readonly usedStack: boolean
  readonly usedFallback: boolean
  readonly readOnly: boolean
  readonly requiresConfirmation: boolean
  readonly confirmationState: string | null
  readonly layersVisited: readonly string[]
  readonly metadata: Readonly<Record<string, unknown>>
}

export type RafeeqTurnContext = {
  readonly role: RafeeqRole
  readonly ruknId: string | null
  readonly locale: 'ur' | 'en'
  readonly sessionId: string
  readonly signal?: AbortSignal
}
