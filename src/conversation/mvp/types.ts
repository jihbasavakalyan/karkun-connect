/**
 * Digital Rafeeq MVP turn types.
 */

export type RafeeqRole = 'administrator' | 'rukn'

export type RafeeqAction = {
  readonly id: string
  readonly label: string
  readonly route: string
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
}
