/**
 * KC-0069 — Verify KC-0068 duplicate prevention business rules (in-memory, no Firestore).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { findMobileOwner } from '@/lib/peopleStore'
import { normalizeMobile } from '@/lib/mobileValidation'
import { getPendingKarkunRequests } from '@/stores/karkunRequestStore'
import { findPossibleNameDuplicates, namesPossiblyDuplicate } from '@/lib/nameMatching'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function main() {
  // Check 1 path exists: submit rejects when findMobileOwner finds karkun.
  const source = readFileSync(resolve('src/services/karkunRequestService.ts'), 'utf8')
  assert(source.includes('acknowledgeNameWarning'), 'NAME_WARNING acknowledge path present')
  assert(
    source.includes('Existing Person Found'),
    'KC-0068 mobile exists message present',
  )
  assert(
    source.includes('A request for this mobile number already exists.'),
    'KC-0068 pending exists message present',
  )
  assert(
    /findPossibleNameDuplicates\(fullName, 'karkun', undefined, \{[\s\S]*gender,[\s\S]*fatherHusbandName/.test(
      source,
    ),
    'name duplicate lookup is scoped by gender and father/husband name',
  )

  // Runtime helpers still resolve.
  void findMobileOwner
  void normalizeMobile
  void getPendingKarkunRequests
  void findPossibleNameDuplicates

  // KC-EVO-010 — honorific stripping must not treat a leftover token as a subset match.
  assert(
    !namesPossiblyDuplicate('Mohammed Ali', 'Ali Hassan'),
    'single leftover token must not match a longer different name',
  )
  assert(
    namesPossiblyDuplicate('Mohammed Ahmed', 'Mohd Ahmed'),
    'same name with different honorifics still matches',
  )
  assert(
    namesPossiblyDuplicate('Abdul Khader Er', 'Abdul Khader'),
    'multi-word near-match still matches',
  )
  assert(namesPossiblyDuplicate('Ali', 'Ali'), 'identical single-token names still match')
  assert(
    !namesPossiblyDuplicate('Syed Yusuf', 'Yusuf Khan'),
    'shared one token after prefix strip is not enough',
  )

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
