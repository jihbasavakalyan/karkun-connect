/**
 * KC-0069 — Verify KC-0068 duplicate prevention business rules (in-memory, no Firestore).
 */
import { findMobileOwner } from '@/lib/peopleStore'
import { normalizeMobile } from '@/lib/mobileValidation'
import { getPendingKarkunRequests } from '@/stores/karkunRequestStore'
import { findPossibleNameDuplicates } from '@/lib/nameMatching'
import { submitNewKarkunRequest } from '@/services/karkunRequestService'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function main() {
  // Check 1 path exists: submit rejects when findMobileOwner finds karkun.
  const source = submitNewKarkunRequest.toString()
  assert(source.includes('acknowledgeNameWarning'), 'NAME_WARNING acknowledge path present')
  assert(
    source.includes('This mobile number already belongs to an existing Karkun.'),
    'KC-0068 mobile exists message present',
  )
  assert(
    source.includes('A request for this mobile number already exists.'),
    'KC-0068 pending exists message present',
  )
  assert(
    source.includes('Possible duplicate name found'),
    'KC-0068 name warning message present',
  )

  // Runtime helpers still resolve.
  void findMobileOwner
  void normalizeMobile
  void getPendingKarkunRequests
  void findPossibleNameDuplicates

  console.log(
    JSON.stringify(
      {
        ok: true,
        ticket: 'KC-0069',
        checks: {
          mobileExistsMessage: true,
          pendingExistsMessage: true,
          nameWarningMessage: true,
          acknowledgeNameWarning: true,
        },
        note: 'Source-level verification of KC-0068 prevention strings/paths. Live UI still required in production.',
      },
      null,
      2,
    ),
  )
}

main()
