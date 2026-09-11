/**
 * Coalesced Admin publish trigger. Kept import-light so Firestore hydrate
 * can call it without pulling peopleStore during provider initialization.
 */

let publishTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleJamaatReadModelPublish(): void {
  if (publishTimer) clearTimeout(publishTimer)
  publishTimer = setTimeout(() => {
    publishTimer = null
    void import('@/lib/jamaat/publishJamaatReadModels').then((mod) => {
      void mod.publishJamaatReadModelsIfAdministrator()
    })
  }, 400)
}
