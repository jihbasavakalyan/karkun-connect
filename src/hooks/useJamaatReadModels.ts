import { useEffect, useState } from 'react'
import type { JamaatCurrentSituation } from '@/lib/jamaat/jamaatCurrentSituation'
import type { RuknNameDirectory } from '@/lib/jamaat/ruknNameDirectory'
import {
  getJamaatCurrentSituationFromCache,
  getRuknNameDirectoryFromCache,
  subscribeJamaatReadModels,
} from '@/repositories/firestore/jamaatReadModelFirestore'

export function useJamaatReadModels(): {
  situation: JamaatCurrentSituation | null
  nameDirectory: RuknNameDirectory | null
} {
  const [version, setVersion] = useState(0)
  useEffect(() => subscribeJamaatReadModels(() => setVersion((n) => n + 1)), [])
  void version
  return {
    situation: getJamaatCurrentSituationFromCache(),
    nameDirectory: getRuknNameDirectoryFromCache(),
  }
}
