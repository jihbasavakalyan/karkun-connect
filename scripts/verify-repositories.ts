/**
 * M6.9 — Repository layer verification.
 * Run: npm run verify:repositories
 */
import assert from 'node:assert/strict'
import { getRepositories, resetRepositoryProviderForTests } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'
import { STORAGE_KEYS } from '@/repositories/storageKeys'
import { removeFromStorage } from '@/lib/browserStorage'

function clearAllStorageKeys(): void {
  for (const value of Object.values(STORAGE_KEYS)) {
    if (typeof value === 'string') {
      removeFromStorage(value)
    }
  }
  removeFromStorage(STORAGE_KEYS.migrationBackup('test-backup'))
}

function reset(): void {
  clearAllStorageKeys()
  resetRepositoryProviderForTests()
}

console.log('▶ provider returns all repositories')
{
  reset()
  const repos = getRepositories()
  assert.ok(repos.campaign)
  assert.ok(repos.rukn)
  assert.ok(repos.karkun)
  assert.ok(repos.connection)
  assert.ok(repos.execution)
  assert.ok(repos.communication)
  assert.ok(repos.compliance)
  assert.ok(repos.settings)
}

console.log('▶ campaign repository reads static library')
{
  reset()
  const campaigns = unwrapRepository(getRepositories().campaign.getAll(), [])
  assert.ok(campaigns.length > 0)
  const active = unwrapRepository(getRepositories().campaign.getActive(), undefined)
  assert.ok(active)
}

console.log('▶ karkun + rukn round-trip')
{
  reset()
  const repos = getRepositories()
  repos.karkun.saveState({
    karkuns: [
      {
        id: 'kr-repo-test',
        name: 'Repo Test',
        gender: 'Male',
        mobile: '9876543210',
        place: 'Test',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        updatedBy: 'Test',
        address: '',
        area: 'Central',
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
      },
    ],
    nextKarkunNum: 42,
  })
  repos.rukn.saveAll([
    {
      id: 'R999',
      name: 'Repo Rukn',
      gender: 'Male',
      mobile: '9876543211',
      place: 'Basavakalyan',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      updatedBy: 'Test',
    },
  ])

  const karkunState = unwrapRepository(repos.karkun.loadState(), { karkuns: [], nextKarkunNum: 1 })
  assert.equal(karkunState.nextKarkunNum, 42)
  assert.equal(karkunState.karkuns[0]?.id, 'kr-repo-test')

  const rukns = unwrapRepository(repos.rukn.loadAll(), [])
  assert.equal(rukns[0]?.id, 'R999')
}

console.log('▶ connection state round-trip')
{
  reset()
  const repos = getRepositories()
  repos.connection.saveState({
    assignments: [
      {
        assignmentId: 'asgn-repo-1',
        assignmentNumber: 'ASN-000001',
        ruknId: 'R001',
        karkunId: 'kr-repo-test',
        status: 'Active',
        assignedDate: '2026-01-01',
        effectiveFrom: '2026-01-01',
        assignedBy: 'Administrator',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    nextSequence: 2,
  })

  const state = unwrapRepository(repos.connection.loadState(), { assignments: [], nextSequence: 1 })
  assert.equal(state.assignments.length, 1)
  assert.equal(state.nextSequence, 2)
}

console.log('▶ settings migration version + backup index')
{
  reset()
  const repos = getRepositories()
  repos.settings.setMigrationVersion(3)
  assert.equal(unwrapRepository(repos.settings.getMigrationVersion(), null), 3)

  repos.settings.saveMigrationBackupIndex([
    { id: 'backup-1', timestamp: '2026-01-01T00:00:00.000Z', label: 'Test' },
  ])
  const index = unwrapRepository(repos.settings.loadMigrationBackupIndex(), [])
  assert.equal(index.length, 1)
  assert.equal(index[0]?.id, 'backup-1')
}

console.log('Repository layer verification passed.')
