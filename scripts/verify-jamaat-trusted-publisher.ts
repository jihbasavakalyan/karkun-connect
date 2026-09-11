/**
 * Trusted Jamaat read-model publisher.
 * Run: npx vite-node scripts/verify-jamaat-trusted-publisher.ts
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { computeJamaatCurrentSituationCounts } from '@/lib/jamaat/computeJamaatCurrentSituation'
import { computeJamaatSituationCountsFromRecords } from '@/lib/jamaat/jamaatSituationMetrics'
import { handleJamaatCurrentSituationPublish } from '@/server/jamaat/publishHandler'
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { getAllRukns } from '@/lib/peopleStore'
import { getAllAssignments } from '@/stores/assignmentStore'

const root = resolve(process.cwd())

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `expected ${label}: ${needle}`)
}

function assertNotIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(!haystack.includes(needle), `did not expect ${label}: ${needle}`)
}

const fixtureSource = {
  officers: [
    { id: 'R001', name: 'Officer One', officerKind: 'rukn' },
    { id: 'AR01', name: 'Aazim One', officerKind: 'a_rukn' },
  ],
  people: [
    { id: 'kr-001', category: 'Karkun' },
    { id: 'kr-002', category: 'Karkun' },
    { id: 'mt-001', category: 'Muttafiq' },
    { id: 'kr-gone', category: 'Karkun', isArchived: true, archiveKind: 'admin_delete' },
  ],
  connections: [
    {
      status: 'Active',
      karkunId: 'kr-001',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
    {
      status: 'Unassigned',
      karkunId: 'kr-002',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
}

console.log('▶ A — authentication')
{
  const unauth = await handleJamaatCurrentSituationPublish({ method: 'POST' })
  assert.equal(unauth.status, 401)
  assert.equal(unauth.body.ok, false)

  const forbidden = await handleJamaatCurrentSituationPublish(
    { method: 'POST', authorizationHeader: 'Bearer token' },
    {
      verifyIdToken: async () => ({ role: 'visitor' }),
      loadSource: async () => fixtureSource,
      writeReadModels: async () => {
        throw new Error('must not write')
      },
      nowIso: () => '2026-09-11T00:00:00.000Z',
    },
  )
  assert.equal(forbidden.status, 403)

  let wrote = 0
  const ruknOk = await handleJamaatCurrentSituationPublish(
    { method: 'POST', authorizationHeader: 'Bearer token' },
    {
      verifyIdToken: async () => ({ role: 'rukn' }),
      loadSource: async () => fixtureSource,
      writeReadModels: async () => {
        wrote += 1
      },
      nowIso: () => '2026-09-11T00:00:00.000Z',
    },
  )
  assert.equal(ruknOk.status, 200)
  assert.equal(ruknOk.body.ok, true)
  assert.equal(ruknOk.body.generatedAt, '2026-09-11T00:00:00.000Z')
  assert.equal(wrote, 1)
}

console.log('▶ B — computation matches Admin client path')
{
  const expected = computeJamaatSituationCountsFromRecords(fixtureSource)
  assert.deepEqual(expected, {
    rukns: 1,
    aRukns: 1,
    karkuns: 2,
    muttafiqeen: 1,
    connections: 1,
  })
  const client = computeJamaatCurrentSituationCounts()
  const fromRecords = computeJamaatSituationCountsFromRecords({
    officers: getAllRukns(),
    people: MOCK_KARKUN_REGISTRY,
    connections: getAllAssignments(),
  })
  assert.deepEqual(client, fromRecords)
}

console.log('▶ C — security: ignore client counts; allowlisted writes only')
{
  let payload: { generatedAt: string; counts: { rukns: number } } | null = null
  const result = await handleJamaatCurrentSituationPublish(
    {
      method: 'POST',
      authorizationHeader: 'Bearer token',
      body: { rukns: 999, generatedAt: '1999-01-01T00:00:00.000Z', path: 'settings/karkunRequests' },
    },
    {
      verifyIdToken: async () => ({ role: 'rukn' }),
      loadSource: async () => fixtureSource,
      writeReadModels: async (input) => {
        payload = { generatedAt: input.generatedAt, counts: input.counts }
      },
      nowIso: () => '2026-09-11T12:00:00.000Z',
    },
  )
  assert.equal(result.status, 200)
  assert.equal(payload?.generatedAt, '2026-09-11T12:00:00.000Z')
  assert.equal(payload?.counts.rukns, 1)
  assert.notEqual(payload?.generatedAt, '1999-01-01T00:00:00.000Z')

  const api = read('api/jamaat-current-situation-publish.ts')
  assertNotIncludes(api, "from '@/", 'API has no Vite alias imports')
  const handler = read('src/server/jamaat/publishHandler.ts')
  assertIncludes(handler, "settings/jamaatCurrentSituation", 'writes situation doc')
  assertIncludes(handler, "settings/ruknNameDirectory", 'writes names doc')
  assertIncludes(handler, 'void input.body', 'client body is ignored')
  const rules = read('firestore.rules')
  const update = rules.slice(rules.indexOf('allow update:'))
  const ruknUpdate = update.slice(0, update.indexOf('allow delete:'))
  assertNotIncludes(ruknUpdate, "docId == 'jamaatCurrentSituation'", 'Rukn cannot update aggregate')
}

console.log('▶ D — connection flow invokes publisher after commit')
{
  const store = read('src/stores/assignmentStore.ts')
  assertIncludes(store, 'refreshJamaatReadModelsAfterConnectionWrite', 'post-commit publisher hook')
  const commitIdx = store.indexOf("connectStepExit(span, 'repo.connection.commitDocuments', { ok: true")
  const hookIdx = store.indexOf('refreshJamaatReadModelsAfterConnectionWrite')
  assert.ok(commitIdx >= 0 && hookIdx > commitIdx, 'publisher runs after successful commit')
  assert.ok(!store.includes('commit(records)\n      void import'), 'does not publish before commit result')
  const client = read('src/lib/jamaat/requestJamaatCurrentSituationPublish.ts')
  assertIncludes(client, "token.claims.role !== 'rukn'", 'Admin client publisher skipped')
  assertIncludes(client, '/api/jamaat-current-situation-publish', 'uses trusted endpoint')
  assertIncludes(client, 'JSON.stringify({})', 'does not send counts')
  const adminPublisher = read('src/lib/jamaat/publishJamaatReadModels.ts')
  assertIncludes(adminPublisher, 'requestJamaatCurrentSituationPublish', 'Admin uses trusted endpoint')
  assertNotIncludes(adminPublisher, 'persistJamaatCurrentSituation', 'Admin does not persist situation locally')
  assertNotIncludes(adminPublisher, 'persistRuknNameDirectory', 'Admin does not persist names locally')
  const persistRepo = read('src/repositories/firestore/jamaatReadModelFirestore.ts')
  assertNotIncludes(persistRepo, 'export async function persistJamaatCurrentSituation', 'client persist helper removed')
  assertNotIncludes(persistRepo, 'export async function persistRuknNameDirectory', 'client name persist helper removed')
}

console.log('▶ E — publisher failure does not imply connection rollback')
{
  const failed = await handleJamaatCurrentSituationPublish(
    { method: 'POST', authorizationHeader: 'Bearer token' },
    {
      verifyIdToken: async () => ({ role: 'rukn' }),
      loadSource: async () => fixtureSource,
      writeReadModels: async () => {
        throw new Error('firestore write denied')
      },
      nowIso: () => '2026-09-11T00:00:00.000Z',
    },
  )
  assert.equal(failed.status, 500)
  assert.equal(failed.body.ok, false)
  const store = read('src/stores/assignmentStore.ts')
  assertIncludes(store, 'void mod.refreshJamaatReadModelsAfterConnectionWrite()', 'refresh is fire-and-forget after ok')
  const client = read('src/lib/jamaat/requestJamaatCurrentSituationPublish.ts')
  assertIncludes(client, 'JAMAAT_READ_MODEL_REFRESH_FAILED', 'diagnosable refresh failure copy')
}

console.log('▶ F — Rukn document listeners remain')
{
  const repos = read('src/repositories/firestore/firestoreRepositories.ts')
  assertIncludes(repos, 'watchJamaatReadModelDocs', 'Rukn listens to published docs')
  assertIncludes(repos, 'applyJamaatSettingsDocumentSnapshot', 'listener applies aggregate')
}

console.log('▶ G — serverless bundle has no @/ aliases')
{
  const esbuildJs = resolve(root, 'node_modules/esbuild/bin/esbuild')
  assert.ok(existsSync(esbuildJs), 'local esbuild binary exists')
  const dir = mkdtempSync(join(tmpdir(), 'kc-jamaat-publish-bundle-'))
  const outfile = join(dir, 'out.cjs')
  try {
    execFileSync(
      process.execPath,
      [
        esbuildJs,
        resolve(root, 'api/jamaat-current-situation-publish.ts'),
        '--bundle',
        '--platform=node',
        '--format=cjs',
        `--outfile=${outfile}`,
        '--external:@vercel/node',
        '--external:firebase-admin',
      ],
      { stdio: 'pipe' },
    )
    const bundle = readFileSync(outfile, 'utf8')
    assert.ok(bundle.length > 0, 'bundle not empty')
    assert.ok(!bundle.includes('@/lib/'), 'no unresolved @/lib')
    assert.ok(!bundle.includes('@/stores/'), 'no unresolved @/stores')
    assert.ok(!bundle.includes('peopleStore'), 'serverless graph does not include peopleStore')
    assert.ok(!bundle.includes('mockKarkunRegistry'), 'serverless graph does not include mockKarkunRegistry')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

console.log('verify-jamaat-trusted-publisher: ok')
