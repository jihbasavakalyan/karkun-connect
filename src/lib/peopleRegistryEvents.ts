/**
 * People-registry change bus.
 * Kept separate from peopleStore / persistence to avoid circular imports when
 * loadPeopleRegistryFromPersistence must notify after mutating in-memory masters.
 */
type PeopleListener = () => void

const listeners = new Set<PeopleListener>()

export function subscribeToPeopleStore(listener: PeopleListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Wake React subscribers after any in-memory registry mutation. */
export function emitPeopleRegistryChange(): void {
  listeners.forEach((listener) => listener())
}
