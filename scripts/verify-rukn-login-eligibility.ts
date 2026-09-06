/**
 * KC-0061 — Authoritative pre-OTP Rukn / A Rukn login eligibility.
 * Run: npm run verify:rukn-login-eligibility
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildOfficerRuknClaims } from '@/lib/officerIdentity'
import {
  matchActiveOfficersByMobile,
  type OfficerLoginCandidate,
} from '@/lib/officerMobileEligibility'
import { handleRuknLoginEligibility } from '@/server/ruknClaims/eligibilityHandler'
import {
  findByMobile,
  RUKN_LOGIN_ELIGIBILITY_PATH,
  RUKN_NOT_REGISTERED_MESSAGE,
  setRuknEligibilityLookupForTests,
} from '@/services/ruknIdentityService'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

const officers: OfficerLoginCandidate[] = [
  { id: 'R007', name: 'Normal Rukn', mobile: '9035668228', status: 'active' },
  {
    id: 'AR02',
    name: 'A Rukn',
    mobile: '7676586284',
    status: 'active',
    isArchived: false,
  },
  { id: 'R099', name: 'Inactive', mobile: '7000000001', status: 'inactive' },
  { id: 'AR99', name: 'Archived A Rukn', mobile: '7000000002', status: 'active', isArchived: true },
  { id: 'R088', name: 'Dup A', mobile: '7000000003', status: 'active' },
  { id: 'AR88', name: 'Dup B', mobile: '7000000003', status: 'active' },
]

async function lookupFromRecords(mobile: string) {
  const match = matchActiveOfficersByMobile(officers, mobile)
  if (match.kind === 'invalid_format') return { allowed: false as const, reason: 'INVALID_FORMAT' as const }
  if (match.kind === 'none') return { allowed: false as const, reason: 'NOT_REGISTERED' as const }
  if (match.kind === 'duplicate') return { allowed: false as const, reason: 'DUPLICATE_MOBILE' as const }
  return {
    allowed: true as const,
    rukn: { id: match.officer.id, mobile: match.officer.mobile ?? mobile, name: match.officer.name ?? match.officer.id },
  }
}

console.log('▶ matcher: normal Rukn')
{
  const match = matchActiveOfficersByMobile(officers, '9035668228')
  assert(match.kind === 'one' && match.officer.id === 'R007', 'normal Rukn eligible')
}

console.log('▶ matcher: A Rukn AR##')
{
  const match = matchActiveOfficersByMobile(officers, '7676586284')
  assert(match.kind === 'one' && match.officer.id === 'AR02', 'A Rukn eligible by AR## id')
}

console.log('▶ matcher: karkun/muttafiq/unknown mobiles are not officers')
{
  assert(matchActiveOfficersByMobile(officers, '8686219890').kind === 'none', 'karkun-only mobile not eligible')
  assert(matchActiveOfficersByMobile(officers, '9999999999').kind === 'none', 'unknown not eligible')
}

console.log('▶ matcher: inactive and archived')
{
  assert(matchActiveOfficersByMobile(officers, '7000000001').kind === 'none', 'inactive not eligible')
  assert(matchActiveOfficersByMobile(officers, '7000000002').kind === 'none', 'archived A Rukn not eligible')
}

console.log('▶ matcher: duplicate active mobiles')
{
  const match = matchActiveOfficersByMobile(officers, '7000000003')
  assert(match.kind === 'duplicate', 'duplicate active mobiles blocked')
}

console.log('▶ matcher: no campaign fields consulted')
{
  const matcher = read('src/lib/officerMobileEligibility.ts')
  assert(!matcher.includes("collection('campaigns')"), 'eligibility matcher has no campaign query')
  assert(!matcher.includes("collection('karkuns')"), 'eligibility matcher does not read karkuns')
  assert(!matcher.includes("officerKind === 'rukn'"), 'does not require officerKind rukn')
}

console.log('▶ handler: A Rukn eligible without campaign')
{
  const result = await handleRuknLoginEligibility(
    { method: 'POST', body: { mobile: '7676586284' } },
    { listOfficers: async () => officers },
  )
  assert(result.status === 200, 'eligibility HTTP 200')
  assert(result.body.allowed === true, 'A Rukn allowed')
  const rukn = result.body.rukn as { id?: string; mobile?: string }
  assert(rukn.id === 'AR02', 'returns AR## id')
  assert(rukn.mobile === '7676586284', 'returns mobile only')
  assert(!('officerKind' in (result.body.rukn as object)), 'does not return officerKind')
  assert(!('sourcePersonId' in (result.body.rukn as object)), 'does not return sourcePersonId')
  assert(!('place' in (result.body.rukn as object)), 'does not return place')
}

console.log('▶ handler: GET does not enumerate')
{
  const result = await handleRuknLoginEligibility({ method: 'GET', body: { mobile: '7676586284' } })
  assert(result.status === 405, 'GET is rejected')
}

console.log('▶ handler: unknown / karkun / duplicate')
{
  const unknown = await handleRuknLoginEligibility(
    { method: 'POST', body: { mobile: '0000000000' } },
    { listOfficers: async () => officers },
  )
  assert(unknown.body.allowed === false && unknown.body.reason === 'NOT_REGISTERED', 'unknown rejected')
  const duplicate = await handleRuknLoginEligibility(
    { method: 'POST', body: { mobile: '7000000003' } },
    { listOfficers: async () => officers },
  )
  assert(duplicate.body.reason === 'DUPLICATE_MOBILE', 'duplicate rejected')
}

console.log('▶ findByMobile OTP gate via injected lookup')
{
  setRuknEligibilityLookupForTests(lookupFromRecords)
  try {
    const normal = await findByMobile('9035668228')
    assert(normal.allowed && normal.rukn.id === 'R007', 'normal Rukn OTP path continues')
    const aRukn = await findByMobile('7676586284')
    assert(aRukn.allowed && aRukn.rukn.id === 'AR02', 'A Rukn OTP path continues')
    const karkun = await findByMobile('8686219890')
    assert(!karkun.allowed && karkun.reason === 'NOT_REGISTERED', 'karkun without officer identity rejected')
  } finally {
    setRuknEligibilityLookupForTests(null)
  }
}

console.log('▶ JWT claims helper')
{
  const aClaims = buildOfficerRuknClaims('AR02')
  assert(aClaims.role === 'rukn' && aClaims.ruknId === 'AR02', 'A Rukn JWT remains role rukn + AR##')
  const nClaims = buildOfficerRuknClaims('R007')
  assert(nClaims.role === 'rukn' && nClaims.ruknId === 'R007', 'normal Rukn JWT remains role rukn + R###')
}

console.log('▶ first-sign-in provisioner still uses Firestore rukns + shared matcher')
{
  const provisioner = read('src/server/ruknClaims/provisionHandler.ts')
  assert(provisioner.includes('matchRuknOfficersByNormalizedMobileFromDb'), 'provisioner reuses officer lookup')
  assert(provisioner.includes('buildOfficerRuknClaims'), 'provisioner still mints existing claims')
  assert(!provisioner.includes("role: 'a_rukn'"), 'no a_rukn JWT role')
}

console.log('▶ unauthenticated clients cannot read rukns; eligibility is the narrow API')
{
  const rules = read('firestore.rules')
  const ruknsBlock = rules.slice(rules.indexOf('match /rukns/{docId}'), rules.indexOf('match /karkuns/{karkunId}'))
  assert(ruknsBlock.includes('allow read: if isAdministrator() || (isRukn() && docId == ruknId())'), 'rukns read stays scoped')
  assert(!ruknsBlock.includes('allow read: if true'), 'rukns not public')
  assert(!ruknsBlock.includes('allow read: if isSignedIn()'), 'rukns not signed-in listing')
  const identity = read('src/services/ruknIdentityService.ts')
  assert(identity.includes(RUKN_LOGIN_ELIGIBILITY_PATH), 'client uses eligibility API')
  assert(!identity.includes('ruknMaster.filter'), 'findByMobile no longer filters seed master')
}

console.log('▶ login still gated before OTP; copy is identity-oriented')
{
  const auth = read('src/services/authenticationService.ts')
  assert(auth.includes('findByMobile(mobile)'), 'sendOtp still identity-gated')
  assert(RUKN_NOT_REGISTERED_MESSAGE.includes('active Rukn'), 'message is identity-oriented')
  assert(!RUKN_NOT_REGISTERED_MESSAGE.includes('campaign'), 'message is not campaign-oriented')
}

console.log('verify-rukn-login-eligibility: OK')
