/**
 * KC-035F — Voice Navigation engine façade.
 */

import {
  resolveVoiceNavigation,
  type ResolveVoiceNavigationInput,
} from '../resolveVoiceNavigation'
import type { VoiceNavigationResult } from '../models/NavigationTypes'

export type VoiceNavigationEngine = {
  resolve: (input: ResolveVoiceNavigationInput) => VoiceNavigationResult
}

export function createVoiceNavigationEngine(): VoiceNavigationEngine {
  return { resolve: resolveVoiceNavigation }
}

let singleton: VoiceNavigationEngine | null = null

export function getVoiceNavigationEngine(): VoiceNavigationEngine {
  if (!singleton) singleton = createVoiceNavigationEngine()
  return singleton
}

export function resetVoiceNavigationEngineForTests(): void {
  singleton = null
}
