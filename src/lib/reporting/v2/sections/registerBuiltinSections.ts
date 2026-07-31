/**
 * KC-037A — Register built-in sections once (side-effect import from composer).
 */

import { registerKc034ExecutiveSection } from './kc034ExecutiveCampaign'
import { registerPlannedSectionStubs } from './plannedSectionStubs'

let registered = false

export function registerBuiltinSections(options?: { force?: boolean }): void {
  if (registered && !options?.force) return
  registerKc034ExecutiveSection()
  registerPlannedSectionStubs()
  registered = true
}

registerBuiltinSections()
