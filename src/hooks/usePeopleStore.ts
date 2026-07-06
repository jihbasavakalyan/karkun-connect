import { useEffect, useState } from 'react'
import { subscribeToPeopleStore } from '@/lib/peopleStore'

export function usePeopleStore(): number {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    return subscribeToPeopleStore(() => setVersion((current) => current + 1))
  }, [])

  return version
}
