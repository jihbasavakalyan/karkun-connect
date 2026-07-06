import { useMemo, useState } from 'react'
import { ruknMaster, searchRukn } from '@/data/ruknMaster'

export function useRuknMaster() {
  const [query, setQuery] = useState('')

  const filteredRukn = useMemo(() => searchRukn(query), [query])

  return {
    query,
    setQuery,
    ruknList: filteredRukn,
    totalCount: ruknMaster.length,
  }
}
