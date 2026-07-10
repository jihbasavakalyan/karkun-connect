/**
 * M7.1 — Rukn identity verification verification.
 * Run: npm run verify:rukn-identity
 */
import { runProductionDataMigration } from '@/services/productionDataMigrationService'
import { ruknMaster } from '@/data/ruknMaster'
import {
  findByMobile,
  findDuplicateMobilesInMaster,
  normalizeRuknMobile,
  phonesMatchRukn,
  RUKN_NOT_REGISTERED_MESSAGE,
  validateRuknMobileFormat,
} from '@/services/ruknIdentityService'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

runProductionDataMigration()

console.log('▶ mobile format validation')
{
  assert(!validateRuknMobileFormat('123'), 'Short numbers must be invalid')
  assert(validateRuknMobileFormat('9876543210'), '10-digit numbers must be valid')
  assert(normalizeRuknMobile('+919876543210') === '9876543210', 'E.164 numbers normalize to 10 digits')
}

console.log('▶ registered mobile lookup')
{
  const activeRukn = ruknMaster.find((rukn) => rukn.status === 'active' && rukn.mobile.trim())
  assert(Boolean(activeRukn), 'Need an active Rukn with mobile in master')

  const lookup = await findByMobile(activeRukn!.mobile)
  assert(lookup.allowed === true, 'Registered mobile must be allowed')
  if (lookup.allowed) {
    assert(lookup.rukn.id === activeRukn!.id, 'Lookup must return matching Rukn')
  }
}

console.log('▶ unregistered mobile lookup')
{
  const lookup = await findByMobile('0000000000')
  assert(!lookup.allowed, 'Unknown mobile must not be allowed')
  if (!lookup.allowed) {
    assert(lookup.reason === 'NOT_REGISTERED', 'Unknown mobile must be NOT_REGISTERED')
  }
}

console.log('▶ duplicate mobile detection')
{
  const duplicates = findDuplicateMobilesInMaster()
  assert(duplicates.length === 0, `Rukn master must not contain duplicate mobiles: ${duplicates.join(', ')}`)
}

console.log('▶ phone match helper')
{
  const activeRukn = ruknMaster.find((rukn) => rukn.status === 'active' && rukn.mobile.trim())
  assert(Boolean(activeRukn), 'Need active Rukn mobile for phone match test')
  assert(
    phonesMatchRukn(`+91${normalizeRuknMobile(activeRukn!.mobile)}`, activeRukn!),
    'Firebase E.164 phone must match Rukn master mobile',
  )
  assert(
    !phonesMatchRukn('+919999999999', activeRukn!),
    'Mismatched Firebase phone must fail verification',
  )
}

console.log('▶ not registered message')
{
  assert(
    RUKN_NOT_REGISTERED_MESSAGE.includes('not registered with the campaign'),
    'Not registered message must match product copy',
  )
}

console.log('Rukn identity verification passed.')
