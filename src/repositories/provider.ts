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

export type RepositoryBundle = {
  campaign: CampaignRepository
  rukn: RuknRepository
  karkun: KarkunRepository
  connection: ConnectionRepository
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
    execution: new ExecutionLocalRepository(),
    communication: new CommunicationLocalRepository(),
    compliance: new ComplianceLocalRepository(),
    settings: new SettingsLocalRepository(),
  }
}

/**
 * Central repository provider.
 * Returns local implementations today; Firestore implementations will plug in here.
 */
export function getRepositories(): RepositoryBundle {
  if (!bundle) {
    bundle = createLocalRepositories()
  }
  return bundle
}

/** Test-only reset — not used in production UI. */
export function resetRepositoryProviderForTests(): void {
  bundle = null
}

export type RepositoryProviderMode = 'local' | 'firestore'

export function getRepositoryProviderMode(): RepositoryProviderMode {
  return 'local'
}
