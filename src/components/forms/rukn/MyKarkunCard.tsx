import { ConnectedKarkunCard } from '@/components/relationship'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

type MyKarkunCardProps = {
  karkun: KarkunRegistryRecord
  ruknId: string
}

/** @deprecated Prefer ConnectedKarkunCard — kept for existing imports. */
export function MyKarkunCard({ karkun, ruknId }: MyKarkunCardProps) {
  return <ConnectedKarkunCard karkun={karkun} ruknId={ruknId} />
}
