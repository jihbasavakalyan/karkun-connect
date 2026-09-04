import { useEffect, useState } from 'react'
import { subscribeToMuttafiqRelationshipStore } from '@/stores/muttafiqRelationshipStore'

/** Bumps when muttafiqRelationships persistence is reloaded / mutated in-memory. */
export function useMuttafiqRelationshipStore(): number {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    return subscribeToMuttafiqRelationshipStore(() => setVersion((current) => current + 1))
  }, [])

  return version
}
