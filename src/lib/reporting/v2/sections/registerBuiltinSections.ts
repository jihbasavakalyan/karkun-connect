/**
 * KC-037A/C-F — Register built-in sections (KC-034 + platform sections).
 */

import { registerKc034ExecutiveSection } from './kc034ExecutiveCampaign'
import { registerPlannedSectionStubs } from './plannedSectionStubs'
import { registerActivePlatformSections } from './activePlatformSections'

let registered = false

export function registerBuiltinSections(options?: { force?: boolean }): void {
  if (registered && !options?.force) return
  registerKc034ExecutiveSection()
  // Stubs first; active platform sections overwrite same ids with builders.
  registerPlannedSectionStubs()
  registerActivePlatformSections()
  registered = true
}

registerBuiltinSections()
