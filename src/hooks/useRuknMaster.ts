import { useMemo, useState } from 'react'
import { ruknMaster, searchRukn } from '@/data/ruknMaster'
import { usePeopleStore } from '@/hooks/usePeopleStore'

export function useRuknMaster() {
  const peopleVersion = usePeopleStore()
  const [query, setQuery] = useState('')

  const filteredRukn = useMemo(
    () => searchRukn(query),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registry is module state
    [query, peopleVersion],
  )

  return {
    query,
    setQuery,
    ruknList: filteredRukn,
    totalCount: ruknMaster.length,
  }
}
