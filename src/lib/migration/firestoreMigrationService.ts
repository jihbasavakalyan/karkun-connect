import { getRepositories, getRepositoryProviderMode } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'
import type { FirestoreMigrationSummary } from '@/types/firestoreMigration'

export async function migrateLocalStorageToFirestore(): Promise<FirestoreMigrationSummary> {
  if (getRepositoryProviderMode() !== 'firestore') {
    return {
      success: false,
      migratedCollections: [],
      error: 'Firestore provider is not active. Set VITE_REPOSITORY_PROVIDER=firestore.',
    }
  }

  const localBundle = await import('@/repositories/local/localRepositories')
  const firestoreBundle = getRepositories()

  const summary: FirestoreMigrationSummary = {
    success: true,
    migratedCollections: [],
  }

  try {
    const rukns = unwrapRepository(new localBundle.RuknLocalRepository().loadAll(), [])
    unwrapRepository(firestoreBundle.rukn.saveAll(rukns), undefined)
    summary.migratedCollections.push('rukns')

    const karkunState = unwrapRepository(new localBundle.KarkunLocalRepository().loadState(), {
      karkuns: [],
      nextKarkunNum: 1,
    })
    unwrapRepository(firestoreBundle.karkun.saveState(karkunState), undefined)
    summary.migratedCollections.push('karkuns')

    const connectionState = unwrapRepository(new localBundle.ConnectionLocalRepository().loadState(), {
      assignments: [],
      nextSequence: 1,
    })
    unwrapRepository(firestoreBundle.connection.saveState(connectionState), undefined)
    const activityLog = unwrapRepository(
      new localBundle.ConnectionLocalRepository().loadActivityLog(),
      [],
    )
    unwrapRepository(firestoreBundle.connection.saveActivityLog(activityLog), undefined)
    summary.migratedCollections.push('connections', 'activityLogs')

    const annexure = unwrapRepository(new localBundle.ExecutionLocalRepository().loadAnnexureForms(), [])
    unwrapRepository(firestoreBundle.execution.saveAnnexureForms(annexure), undefined)
    const followUps = unwrapRepository(new localBundle.ExecutionLocalRepository().loadFollowUps(), [])
    unwrapRepository(firestoreBundle.execution.saveFollowUps(followUps), undefined)
    const guidance = unwrapRepository(new localBundle.ExecutionLocalRepository().loadGuidanceState(), {
      commitments: [],
      timelineEvents: [],
    })
    unwrapRepository(firestoreBundle.execution.saveGuidanceState(guidance), undefined)
    summary.migratedCollections.push('executions', 'followUps')

    const communication = unwrapRepository(
      new localBundle.CommunicationLocalRepository().loadState({
        templates: [],
        history: [],
        automationRules: [],
        scheduledMessages: [],
        whatsappSettings: {
          businessName: '',
          phoneNumber: '',
          phoneNumberId: '',
          webhookStatus: 'pending',
          apiStatus: 'disconnected',
          tokenStatus: 'missing',
          tokenMasked: '',
        },
      }),
      {
        templates: [],
        history: [],
        automationRules: [],
        scheduledMessages: [],
        whatsappSettings: {
          businessName: '',
          phoneNumber: '',
          phoneNumberId: '',
          webhookStatus: 'pending',
          apiStatus: 'disconnected',
          tokenStatus: 'missing',
          tokenMasked: '',
        },
      },
    )
    unwrapRepository(firestoreBundle.communication.saveState(communication), undefined)
    summary.migratedCollections.push('communications')

    const baitulMaal = unwrapRepository(new localBundle.ComplianceLocalRepository().loadBaitulMaal(), [])
    unwrapRepository(firestoreBundle.compliance.saveBaitulMaal(baitulMaal), undefined)
    const ijtema = unwrapRepository(new localBundle.ComplianceLocalRepository().loadIjtema(), [])
    unwrapRepository(firestoreBundle.compliance.saveIjtema(ijtema), undefined)
    const jihPortal = unwrapRepository(new localBundle.ComplianceLocalRepository().loadJihPortal(), {
      registrations: {},
      monthlyReports: {},
    })
    unwrapRepository(firestoreBundle.compliance.saveJihPortal(jihPortal), undefined)
    summary.migratedCollections.push('compliance')

    const migrationVersion = unwrapRepository(
      new localBundle.SettingsLocalRepository().getMigrationVersion(),
      null,
    )
    if (migrationVersion !== null) {
      unwrapRepository(firestoreBundle.settings.setMigrationVersion(migrationVersion), undefined)
    }
    const broadcastLists = unwrapRepository(
      new localBundle.SettingsLocalRepository().loadBroadcastLists(),
      [],
    )
    unwrapRepository(firestoreBundle.settings.saveBroadcastLists(broadcastLists), undefined)
    const backupIndex = unwrapRepository(
      new localBundle.SettingsLocalRepository().loadMigrationBackupIndex(),
      [],
    )
    unwrapRepository(firestoreBundle.settings.saveMigrationBackupIndex(backupIndex), undefined)
    summary.migratedCollections.push('settings')

    const { hydrateFirestoreCaches } = await import('@/repositories/firestore/firestoreRepositories')
    await hydrateFirestoreCaches()
  } catch (error) {
    return {
      success: false,
      migratedCollections: summary.migratedCollections,
      error: error instanceof Error ? error.message : 'Migration failed.',
    }
  }

  return summary
}
