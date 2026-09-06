/**
 * Increment 1 — A Rukn identity, AR## counter, rules, provisioner compatibility.
 * Run: npm run verify:a-rukn-identity
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  allocateNextARuknIdExclusive,
  planNextARuknAllocation,
  resetARuknAllocationLockForTests,
} from '@/lib/aRuknAllocation'
import {
  buildOfficerRuknClaims,
  formatARuknId,
  isCompleteARuknOfficer,
  parseARuknOfficerNum,
  parseRuknOfficerNum,
  resolveOfficerKind,
} from '@/lib/officerIdentity'
import { createRukn } from '@/lib/peopleStore'
import { resolveAuthUser } from '@/lib/auth/roleResolver'
import { getNextRuknId, getRuknById, ruknMaster, type Rukn } from '@/data/ruknMaster'
import { getRepositories, resetRepositoryProviderForTests } from '@/repositories/provider'
import { STORAGE_KEYS } from '@/repositories/storageKeys'
import { removeFromStorage } from '@/lib/browserStorage'
import { DEFAULT_PLACE } from '@/types/people.types'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

console.log('verify-a-rukn-identity: start')

resetRepositoryProviderForTests()
resetARuknAllocationLockForTests()
removeFromStorage(STORAGE_KEYS.aRuknCounter)

{
  const first = planNextARuknAllocation({ occupiedIds: [], nextARuknNum: 1 })
  assert(!('ok' in first), 'empty counter should allocate')
  assert(first.id === 'AR01', `expected AR01, got ${'id' in first ? first.id : first}`)
  assert(first.nextARuknNum === 2, 'counter should advance to 2')
}

{
  const occupied: string[] = []
  let next = 1
  const ids: string[] = []
  for (let i = 0; i < 3; i += 1) {
    const plan = planNextARuknAllocation({ occupiedIds: occupied, nextARuknNum: next })
    assert(!('ok' in plan), 'sequential plan should succeed')
    ids.push(plan.id)
    occupied.push(plan.id)
    next = plan.nextARuknNum
  }
  assert(ids.join(',') === 'AR01,AR02,AR03', `sequential ids ${ids.join(',')}`)
}

{
  const occupied = new Set<string>(['AR01'])
  let nextARuknNum = 1
  resetARuknAllocationLockForTests()
  const [a, b] = await Promise.all([
    allocateNextARuknIdExclusive({
      readOccupiedIds: () => occupied,
      readNextARuknNum: () => nextARuknNum,
      persistNextARuknNum: (value) => {
        nextARuknNum = value
        occupied.add(formatARuknId(value - 1))
      },
    }),
    allocateNextARuknIdExclusive({
      readOccupiedIds: () => occupied,
      readNextARuknNum: () => nextARuknNum,
      persistNextARuknNum: (value) => {
        nextARuknNum = value
        occupied.add(formatARuknId(value - 1))
      },
    }),
  ])
  const got = [a.id, b.id].sort()
  assert(got.join(',') === 'AR02,AR03', `concurrent exclusive ids must be unique, got ${got.join(',')}`)
  assert(new Set(got).size === 2, 'no duplicate AR allocation')
}

{
  resetRepositoryProviderForTests()
  removeFromStorage(STORAGE_KEYS.aRuknCounter)
  resetARuknAllocationLockForTests()
  const repo = getRepositories().rukn
  const first = await repo.allocateNextARuknId()
  const second = await repo.allocateNextARuknId()
  assert(first.ok && first.data.aRuknId === 'AR01', 'local repo first id AR01')
  assert(second.ok && second.data.aRuknId === 'AR02', 'local repo second id AR02')
  const afterRead = planNextARuknAllocation({
    occupiedIds: [],
    nextARuknNum: second.ok ? second.data.nextARuknNum : 1,
  })
  assert(!('ok' in afterRead) && afterRead.id === 'AR03', 'reads must not allocate; next remains AR03')
}

{
  const before = getNextRuknId()
  assert(parseRuknOfficerNum(before) != null, 'next Rukn id is R###')
  const injected: Rukn = {
    id: 'AR99',
    name: 'Injected A Rukn',
    gender: 'Male',
    mobile: '9000000099',
    place: DEFAULT_PLACE,
    status: 'active',
    createdAt: '2026-09-05T00:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z',
    updatedBy: 'Verification',
    officerKind: 'a_rukn',
    origin: 'promoted_karkun',
    sourcePersonId: 'kr-099',
  }
  ruknMaster.push(injected)
  try {
    assert(getNextRuknId() === before, 'AR## must not change R### sequence')
    const created = createRukn(
      {
        name: 'Verify Rukn Numbering',
        gender: 'Male',
        mobile: '9000000199',
        place: DEFAULT_PLACE,
        status: 'active',
      },
      'Administrator',
    )
    assert(created.success, `createRukn failed: ${created.error ?? ''}`)
    const createdId = getRuknById(before)?.id
    assert(createdId === before, `createRukn must use ${before}`)
    assert(parseARuknOfficerNum(before) == null, 'new Rukn is not AR##')
    assert(getRuknById(before)?.officerKind === 'rukn', 'new Rukn officerKind defaults to rukn')
  } finally {
    const idx = ruknMaster.findIndex((row) => row.id === 'AR99')
    if (idx >= 0) ruknMaster.splice(idx, 1)
    const createdIdx = ruknMaster.findIndex((row) => row.id === before)
    if (createdIdx >= 0) ruknMaster.splice(createdIdx, 1)
  }
}

{
  const officer: Rukn = {
    id: 'AR01',
    name: 'A Rukn Officer',
    gender: 'Female',
    mobile: '9000000001',
    place: DEFAULT_PLACE,
    status: 'active',
    createdAt: '2026-09-05T00:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z',
    updatedBy: 'Administrator',
    officerKind: 'a_rukn',
    origin: 'promoted_karkun',
    sourcePersonId: 'kr-123',
  }
  assert(isCompleteARuknOfficer(officer), 'A Rukn shape is complete')
  assert(resolveOfficerKind(officer) === 'a_rukn', 'officerKind a_rukn')
  const claims = buildOfficerRuknClaims(officer.id)
  assert(claims.role === 'rukn', 'JWT role remains rukn')
  assert(claims.ruknId === 'AR01', 'ruknId is AR##')
  const session = resolveAuthUser({
    uid: 'uid-ar01',
    email: null,
    phoneNumber: '+919000000001',
    displayName: officer.name,
    customClaims: claims,
  })
  assert(session?.role === 'rukn', 'session role is rukn')
  assert(session?.ruknId === 'AR01', 'session ruknId is AR01')
}

{
  const authTypes = read('src/types/auth.types.ts')
  assert(authTypes.includes("export type UserRole = 'administrator' | 'rukn'"), 'no new JWT role')
  assert(!authTypes.includes("'a_rukn'"), 'UserRole must not include a_rukn')
}

{
  const rules = read('firestore.rules')
  assert(rules.includes('function isARuknDocId'), 'AR doc id helper')
  assert(rules.includes('function validRuknOfficerCreate'), 'A Rukn create shape')
  assert(
    /match \/rukns\/\{docId\}[\s\S]*?allow create: if isAdministrator\(\) && validRuknOfficerCreate\(docId\)/.test(
      rules,
    ),
    'rukn/A Rukn create remains Admin-only',
  )
  assert(
    /match \/rukns\/\{docId\}[\s\S]*?allow update: if isAdministrator\(\) && referredByUnchanged\(\)/.test(
      rules,
    ),
    'rukn update remains Admin-only',
  )
  assert(!/isRukn\(\)[\s\S]{0,80}allow create: if isRukn/.test(rules), 'Rukn cannot create officers')
  const settingsBlock = rules.slice(rules.indexOf('match /settings/{docId}'))
  assert(settingsBlock.includes("docId == 'aRuknCounter'"), 'aRuknCounter monotonic Admin update')
  assert(settingsBlock.includes("docId != 'aRuknCounter'"), 'aRuknCounter cannot be deleted')
  const ruknReadAllow =
    settingsBlock.match(/allow read: if isAdministrator\(\)[\s\S]*?request\.auth\.uid\s*\n\s*\)\);/)?.[0] ??
    ''
  assert(ruknReadAllow.length > 0, 'settings read rule located')
  assert(!ruknReadAllow.includes('aRuknCounter'), 'Rukn cannot read aRuknCounter')
  const ruknCreateAllow = settingsBlock.match(/allow create: if isAdministrator\(\)[\s\S]*?;/)?.[0] ?? ''
  assert(!ruknCreateAllow.includes('aRuknCounter') || ruknCreateAllow.includes('isAdministrator()'), 'settings create stays Admin for counter')
}

{
  const firestoreRepo = read('src/repositories/firestore/firestoreRepositories.ts')
  assert(
    firestoreRepo.includes("scope.role === 'rukn'") &&
      firestoreRepo.includes('Only an administrator can allocate an A Rukn identity.'),
    'Rukn client cannot allocate AR ids',
  )
  assert(firestoreRepo.includes('runTransaction'), 'Firestore AR allocate is transactional')
}

{
  const matcher = read('src/lib/officerMobileEligibility.ts')
  assert(matcher.includes('isActiveOfficerForRuknClaims'), 'AR## Active officers are eligible')
  const handler = read('src/server/ruknClaims/provisionHandler.ts')
  assert(handler.includes('buildOfficerRuknClaims'), 'provisioner uses shared claims helper')
  assert(handler.includes('matchRuknOfficersByNormalizedMobileFromDb'), 'AR## Active officers are eligible')
  assert(!handler.includes("role: 'a_rukn'"), 'provisioner must not mint a_rukn role')
  const identity = read('src/lib/officerIdentity.ts')
  assert(identity.includes("role: 'rukn'"), 'claims helper grants rukn role')
  assert(identity.includes("ruknId"), 'claims helper copies officer id including AR##')
}

{
  const routes = read('src/constants/routes.ts')
  const nav = read('src/constants/adminNavigation.ts')
  const provisioner = read('src/server/ruknClaims/provisionHandler.ts')
  assert(routes.includes('ADMIN_A_RUKN'), 'Increment 3 A Rukn registry route')
  assert(nav.includes('عازمِ رکن'), 'Increment 3 A Rukn Admin nav')
  assert(!provisioner.includes("role: 'a_rukn'"), 'JWT role remains rukn, not a_rukn')
}

console.log('verify-a-rukn-identity: OK')
