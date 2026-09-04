import type {
  CampaignRepository,
  CommunicationRepository,
  ComplianceRepository,
  ConnectionRepository,
  ExecutionRepository,
  KarkunRepository,
  LocalProgrammeRepository,
  MeqatiMansoobaRepository,
  ObjectiveRepository,
  OccurrenceRepository,
  ResponsibilityRepository,
  RuknRepository,
  WorkRepository,
  SettingsRepository,
  ShobahRepository,
  UnitRepository,
} from '@/repositories/interfaces'
import type { ConnectionLedgerRepository } from '@/repositories/interfaces/ConnectionLedgerRepository'
import type { AssignmentReviewRepository } from '@/repositories/interfaces/AssignmentReviewRepository'
import type { MuttafiqRelationshipRepository } from '@/repositories/interfaces/MuttafiqRelationshipRepository'
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
import { MuttafiqRelationshipLocalRepository } from '@/repositories/local/muttafiqRelationshipLocalRepository'
import {
  MeqatiMansoobaLocalRepository,
  ObjectiveLocalRepository,
  ShobahLocalRepository,
  UnitLocalRepository,
} from '@/repositories/local/planningLocalRepositories'
import { LocalProgrammeLocalRepository } from '@/repositories/local/localProgrammeLocalRepositories'
import { OccurrenceLocalRepository } from '@/repositories/local/occurrenceLocalRepositories'
import { ResponsibilityLocalRepository } from '@/repositories/local/responsibilityLocalRepositories'
import { WorkLocalRepository } from '@/repositories/local/workLocalRepositories'
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
import { MuttafiqRelationshipFirestoreRepository } from '@/repositories/firestore/muttafiqRelationshipFirestoreRepository'
import {
  MeqatiMansoobaFirestoreRepository,
  ObjectiveFirestoreRepository,
  ShobahFirestoreRepository,
  UnitFirestoreRepository,
} from '@/repositories/firestore/planningFirestoreRepositories'
import { LocalProgrammeFirestoreRepository } from '@/repositories/firestore/localProgrammeFirestoreRepositories'
import { OccurrenceFirestoreRepository } from '@/repositories/firestore/occurrenceFirestoreRepositories'
import { ResponsibilityFirestoreRepository } from '@/repositories/firestore/responsibilityFirestoreRepositories'
import { WorkFirestoreRepository } from '@/repositories/firestore/workFirestoreRepositories'

export type RepositoryBundle = {
  campaign: CampaignRepository
  rukn: RuknRepository
  karkun: KarkunRepository
  connection: ConnectionRepository
  connectionLedger: ConnectionLedgerRepository
  assignmentReview: AssignmentReviewRepository
  muttafiqRelationship: MuttafiqRelationshipRepository
  execution: ExecutionRepository
  communication: CommunicationRepository
  compliance: ComplianceRepository
  settings: SettingsRepository
  meqatiMansooba: MeqatiMansoobaRepository
  shobah: ShobahRepository
  objective: ObjectiveRepository
  unit: UnitRepository
  localProgramme: LocalProgrammeRepository
  occurrence: OccurrenceRepository
  responsibility: ResponsibilityRepository
  work: WorkRepository
}

let bundle: RepositoryBundle | null = null

function createLocalRepositories(): RepositoryBundle {
  const campaign = new CampaignLocalRepository()
  const objective = new ObjectiveLocalRepository()
  const localProgramme = new LocalProgrammeLocalRepository(objective, campaign)
  const rukn = new RuknLocalRepository()
  const unit = new UnitLocalRepository()
  const responsibility = new ResponsibilityLocalRepository(unit, rukn)
  return {
    campaign,
    rukn,
    karkun: new KarkunLocalRepository(),
    connection: new ConnectionLocalRepository(),
    connectionLedger: new ConnectionLedgerLocalRepository(),
    assignmentReview: new AssignmentReviewLocalRepository(),
    muttafiqRelationship: new MuttafiqRelationshipLocalRepository(),
    execution: new ExecutionLocalRepository(),
    communication: new CommunicationLocalRepository(),
    compliance: new ComplianceLocalRepository(),
    settings: new SettingsLocalRepository(),
    meqatiMansooba: new MeqatiMansoobaLocalRepository(),
    shobah: new ShobahLocalRepository(),
    objective,
    unit,
    localProgramme,
    occurrence: new OccurrenceLocalRepository(localProgramme),
    responsibility,
    work: new WorkLocalRepository(unit, rukn, responsibility),
  }
}

function createFirestoreRepositories(): RepositoryBundle {
  const campaign = new CampaignFirestoreRepository()
  const objective = new ObjectiveFirestoreRepository()
  const localProgramme = new LocalProgrammeFirestoreRepository(objective, campaign)
  const rukn = new RuknFirestoreRepository()
  const unit = new UnitFirestoreRepository()
  const responsibility = new ResponsibilityFirestoreRepository(unit, rukn)
  return {
    campaign,
    rukn,
    karkun: new KarkunFirestoreRepository(),
    connection: new ConnectionFirestoreRepository(),
    connectionLedger: new ConnectionLedgerFirestoreRepository(),
    assignmentReview: new AssignmentReviewFirestoreRepository(),
    muttafiqRelationship: new MuttafiqRelationshipFirestoreRepository(),
    execution: new ExecutionFirestoreRepository(),
    communication: new CommunicationFirestoreRepository(),
    compliance: new ComplianceFirestoreRepository(),
    settings: new SettingsFirestoreRepository(),
    meqatiMansooba: new MeqatiMansoobaFirestoreRepository(),
    shobah: new ShobahFirestoreRepository(),
    objective,
    unit,
    localProgramme,
    occurrence: new OccurrenceFirestoreRepository(localProgramme),
    responsibility,
    work: new WorkFirestoreRepository(unit, rukn, responsibility),
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
