import type {
  CampaignRepository,
  CommunicationRepository,
  ComplianceRepository,
  ConnectionRepository,
  ExecutionRepository,
  KarkunRepository,
  RuknRepository,
  SettingsRepository,
} from '@/repositories/interfaces'
import type { ConnectionLedgerRepository } from '@/repositories/interfaces/ConnectionLedgerRepository'
import type { AssignmentReviewRepository } from '@/repositories/interfaces/AssignmentReviewRepository'
import { isFirebaseConfigured } from '@/lib/firebase/firebase'
import {
  CampaignLocalRepository,
  CommunicationLocalRepository,
  ComplianceLocalRepository,
  ConnectionLocalRepository,
  ExecutionLocalRepository,
  KarkunLocalRepository,
  RuknLocalRepository,
  SettingsLocalRepository,
} from '@/repositories/local/localRepositories'
import { ConnectionLedgerLocalRepository } from '@/repositories/local/connectionLedgerLocalRepository'
import { AssignmentReviewLocalRepository } from '@/repositories/local/assignmentReviewLocalRepository'
import {
  CampaignFirestoreRepository,
  CommunicationFirestoreRepository,
  ComplianceFirestoreRepository,
  ConnectionFirestoreRepository,
  ExecutionFirestoreRepository,
  KarkunFirestoreRepository,
  RuknFirestoreRepository,
  SettingsFirestoreRepository,
} from '@/repositories/firestore/firestoreRepositories'
import { ConnectionLedgerFirestoreRepository } from '@/repositories/firestore/connectionLedgerFirestoreRepository'
import { AssignmentReviewFirestoreRepository } from '@/repositories/firestore/assignmentReviewFirestoreRepository'

export type RepositoryBundle = {
  campaign: CampaignRepository
  rukn: RuknRepository
  karkun: KarkunRepository
  connection: ConnectionRepository
  connectionLedger: ConnectionLedgerRepository
  assignmentReview: AssignmentReviewRepository
  execution: ExecutionRepository
  communication: CommunicationRepository
  compliance: ComplianceRepository
  settings: SettingsRepository
}

let bundle: RepositoryBundle | null = null

function createLocalRepositories(): RepositoryBundle {
  return {
    campaign: new CampaignLocalRepository(),
    rukn: new RuknLocalRepository(),
    karkun: new KarkunLocalRepository(),
    connection: new ConnectionLocalRepository(),
    connectionLedger: new ConnectionLedgerLocalRepository(),
    assignmentReview: new AssignmentReviewLocalRepository(),
    execution: new ExecutionLocalRepository(),
    communication: new CommunicationLocalRepository(),
    compliance: new ComplianceLocalRepository(),
    settings: new SettingsLocalRepository(),
  }
}

function createFirestoreRepositories(): RepositoryBundle {
  return {
    campaign: new CampaignFirestoreRepository(),
    rukn: new RuknFirestoreRepository(),
    karkun: new KarkunFirestoreRepository(),
    connection: new ConnectionFirestoreRepository(),
    connectionLedger: new ConnectionLedgerFirestoreRepository(),
    assignmentReview: new AssignmentReviewFirestoreRepository(),
    execution: new ExecutionFirestoreRepository(),
    communication: new CommunicationFirestoreRepository(),
    compliance: new ComplianceFirestoreRepository(),
    settings: new SettingsFirestoreRepository(),
  }
}

export type RepositoryProviderMode = 'local' | 'firestore'

export function getRepositoryProviderMode(): RepositoryProviderMode {
  if (typeof window === 'undefined') {
    return 'local'
  }

  const configuredMode = import.meta.env.VITE_REPOSITORY_PROVIDER
  if (configuredMode === 'firestore' && isFirebaseConfigured()) {
    return 'firestore'
  }

  return 'local'
}

function createRepositories(): RepositoryBundle {
  return getRepositoryProviderMode() === 'firestore'
    ? createFirestoreRepositories()
    : createLocalRepositories()
}

/**
 * Central repository provider.
 * Returns local or Firestore implementations based on configuration.
 */
export function getRepositories(): RepositoryBundle {
  if (!bundle) {
    bundle = createRepositories()
  }
  return bundle
}

/** Test-only reset — not used in production UI. */
export function resetRepositoryProviderForTests(): void {
  bundle = null
}
