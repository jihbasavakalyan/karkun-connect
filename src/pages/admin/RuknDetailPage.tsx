import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getRuknById } from '@/data/ruknMaster'
import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { ROUTES } from '@/constants/routes'
import { AssignedKarkunList } from '@/components/forms/rukn'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

export function RuknDetailPage() {
  const { ruknId } = useParams<{ ruknId: string }>()
  const rukn = ruknId ? getRuknById(ruknId) : undefined
  useAssignmentEngine()
  const assignedKarkunan = useMemo(
    () => (ruknId ? getAssignedKarkunanForRukn(ruknId) : []),
    [ruknId],
  )

  if (!rukn) {
    return (
      <div className="rounded-(--radius-card) border border-border bg-surface p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold text-text-heading">Rukn Not Found</h1>
        <Link to={ROUTES.ADMIN_RUKN} className="mt-6 inline-block">
          <SecondaryButton type="button">Back to Rukn</SecondaryButton>
        </Link>
      </div>
    )
  }

  const mobileLabel = rukn.mobile.trim() ? rukn.mobile : 'Mobile Not Added'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link to={ROUTES.ADMIN_RUKN} className="text-sm font-medium text-primary hover:underline">
          ← Back to Rukn
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-text-heading">{rukn.name}</h1>
        <p className="mt-2 text-secondary">
          {rukn.place} · {mobileLabel}
        </p>
      </div>

      <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Assigned Karkun</h2>
        <p className="mt-1 text-sm text-secondary">
          Select a Karkun to view profile, meeting history, and reports.
        </p>
        <div className="mt-4">
          <AssignedKarkunList karkunan={assignedKarkunan} />
        </div>
      </section>
    </div>
  )
}
