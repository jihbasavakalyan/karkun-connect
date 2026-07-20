/**
 * KC-0060.2 — Optional profile failures must never block Connect confirmation.
 * Run: npm run verify:kc0060.2
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  FRIENDLY_ASSIGNMENT_ERROR,
  OPTIONAL_PROFILE_UNAVAILABLE_WARNING,
  toOperatorAssignmentError,
} from '../src/lib/assignment/operatorFacingError'
import { FRIENDLY_DATA_ACCESS_ERROR } from '../src/repositories/errors'
import {
  hasOptionalAdditionalInfo,
  hasRequiredConnectData,
} from '../src/components/relationship/ConnectKarkunConfirmModal'
import type { KarkunRegistryRecord } from '../src/types/karkun-registry.types'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const now = new Date().toISOString()
const base: KarkunRegistryRecord = {
  id: 'kr-00602',
  name: 'Verify Connect',
  gender: 'Male',
  mobile: '9000000060',
  place: '',
  status: 'active',
  createdAt: now,
  updatedAt: now,
  updatedBy: 'Verification',
  address: '',
  area: '',
  assignedRukn: '',
  assignedRuknId: '',
  assignmentStatus: 'Available',
  campaignStatus: 'not_assigned',
  visitStatus: 'none',
  lastVisit: null,
  commitment: null,
  currentCommitment: '',
  jihAppRegistrationStatus: 'Not Discussed',
  notes: '',
  isArchived: false,
}

assert(hasRequiredConnectData(base), 'required connect data must pass with name+mobile')
assert(!hasOptionalAdditionalInfo(base), 'missing area/place is optional unavailable')
assert(
  OPTIONAL_PROFILE_UNAVAILABLE_WARNING === 'Additional information is unavailable.',
  'optional warning copy must match product expectation',
)

assert(
  toOperatorAssignmentError('permission-denied') === FRIENDLY_ASSIGNMENT_ERROR,
  'permission-denied must map to assignment error, not additional-info',
)
assert(
  toOperatorAssignmentError(FRIENDLY_DATA_ACCESS_ERROR) === FRIENDLY_ASSIGNMENT_ERROR,
  'legacy additional-info repository copy must not block connect messaging',
)
assert(
  !toOperatorAssignmentError('permission-denied')
    .toLowerCase()
    .includes('additional information'),
  'connect error must never say additional information',
)

const modalSource = readFileSync(
  resolve('src/components/relationship/ConnectKarkunConfirmModal.tsx'),
  'utf8',
)
assert(modalSource.includes('primaryDisabled={!canConfirm}'), 'Confirm must gate on required data only')
assert(
  modalSource.includes('OPTIONAL_PROFILE_UNAVAILABLE_WARNING'),
  'modal must show optional unavailable warning',
)
assert(
  modalSource.includes('unable to load additional information'),
  'modal must demote legacy additional-info errors to non-blocking',
)

const pageSource = readFileSync(resolve('src/pages/rukn/AvailableKarkunPage.tsx'), 'utf8')
assert(pageSource.includes('toOperatorAssignmentError'), 'Rukn connect must use operator mapping')
assert(pageSource.includes('connectLoading'), 'Confirm must support loading without optional gate')

// Regression: constrained paths untouched by this sprint.
const forbiddenTouches = [
  'src/providers/AuthProvider.tsx',
  'src/services/metricsService.ts',
  'src/pages/admin/AdminHomePage.tsx',
]
for (const file of forbiddenTouches) {
  // Presence check only — files must still exist; this sprint must not delete them.
  assert(readFileSync(resolve(file), 'utf8').length > 0, `${file} must remain`)
}

console.log('KC-0060.2 verify OK', {
  requiredConnect: true,
  optionalWarning: OPTIONAL_PROFILE_UNAVAILABLE_WARNING,
  assignErrorPreview: FRIENDLY_ASSIGNMENT_ERROR.slice(0, 40),
})
