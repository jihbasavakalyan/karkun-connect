import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

type VisitFormHeaderProps = {
  karkun: KarkunRegistryRecord
  assignmentNumber?: string
}

export function VisitFormHeader({ karkun, assignmentNumber }: VisitFormHeaderProps) {
  return (
    <header className="space-y-1">
      <p className="text-sm font-medium text-primary">Annexure-1</p>
      <h1 className="text-xl font-semibold text-text-heading sm:text-2xl">{karkun.name}</h1>
      <p className="text-sm text-secondary">
        {assignmentNumber && <span>{assignmentNumber} · </span>}
        {karkun.area} · Rukn: {karkun.assignedRukn}
      </p>
    </header>
  )
}
