import { useEffect, useState } from 'react'
import { subscribeToGuidanceStore } from '@/stores/guidanceStore'
import { buildMorningBrief } from '@/lib/guidance/morningBriefEngine'
import { getKarkunGuidance } from '@/lib/guidance/guidanceEngine'
import type { KarkunGuidance, MorningBrief } from '@/types/guidance'

export function useGuidance(ruknId?: string) {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    return subscribeToGuidanceStore(() => setVersion((current) => current + 1))
  }, [])

  void version

  const morningBrief: MorningBrief | null = ruknId ? buildMorningBrief(ruknId) : null

  return {
    version,
    morningBrief,
    getKarkunGuidance: (karkunId: string) =>
      ruknId ? getKarkunGuidance(karkunId, ruknId) : getKarkunGuidance(karkunId),
  }
}

export type { KarkunGuidance, MorningBrief }
