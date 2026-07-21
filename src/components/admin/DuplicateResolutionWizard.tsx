/**
 * KC-0070 — Admin Duplicate Resolution Wizard (business workflow only).
 * Compare → recommend → preview → archive (never delete).
 */

import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import {
  buildMergePreview,
  getArchivedDuplicateRecords,
  getDuplicateResolutionSummary,
  listDuplicateGroups,
  resolveDuplicateByArchive,
  type DuplicateGroup,
  type DuplicateRecordSnapshot,
  type MergePreview,
} from '@/services/duplicateResolutionService'

type Step = 'list' | 'compare' | 'preview' | 'done'

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function ComparisonTable({
  master,
  duplicate,
  masterId,
  onSelectMaster,
}: {
  master: DuplicateRecordSnapshot
  duplicate: DuplicateRecordSnapshot
  masterId: string
  onSelectMaster: (id: string) => void
}) {
  const rows: { label: string; left: string; right: string }[] = [
    { label: 'Name', left: master.name, right: duplicate.name },
    { label: 'Mobile', left: master.mobile, right: duplicate.mobile },
    {
      label: 'Connected Rukn',
      left: master.connectedRuknName,
      right: duplicate.connectedRuknName,
    },
    { label: 'Status', left: master.displayStatus, right: duplicate.displayStatus },
    { label: 'Created Date', left: formatDate(master.createdAt), right: formatDate(duplicate.createdAt) },
    { label: 'ASN', left: master.asn, right: duplicate.asn },
    {
      label: 'Activity Count',
      left: String(master.activityCount),
      right: String(duplicate.activityCount),
    },
    {
      label: 'Visit Count',
      left: String(master.visitCount),
      right: String(duplicate.visitCount),
    },
    {
      label: 'Follow-ups',
      left: String(master.followUpCount),
      right: String(duplicate.followUpCount),
    },
    {
      label: 'Compliance / execution',
      left: master.complianceHints,
      right: duplicate.complianceHints,
    },
    {
      label: 'History (connections)',
      left: String(master.historyCount),
      right: String(duplicate.historyCount),
    },
  ]

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted text-left">
            <th className="px-3 py-2 font-semibold text-text-heading">Field</th>
            <th className="px-3 py-2">
              <button
                type="button"
                className={`w-full rounded-md px-2 py-1 text-left font-semibold ${
                  masterId === master.id
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'text-text-heading hover:bg-surface'
                }`}
                onClick={() => onSelectMaster(master.id)}
              >
                {masterId === master.id ? 'MASTER · ' : 'Select · '}
                {master.id}
              </button>
            </th>
            <th className="px-3 py-2">
              <button
                type="button"
                className={`w-full rounded-md px-2 py-1 text-left font-semibold ${
                  masterId === duplicate.id
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'text-text-heading hover:bg-surface'
                }`}
                onClick={() => onSelectMaster(duplicate.id)}
              >
                {masterId === duplicate.id ? 'MASTER · ' : 'Duplicate · '}
                {duplicate.id}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-border/70">
              <td className="px-3 py-2 font-medium text-text-heading">{row.label}</td>
              <td className="px-3 py-2 text-secondary">{row.left}</td>
              <td className="px-3 py-2 text-secondary">{row.right}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DuplicateResolutionWizard() {
  const { user } = useAuth()
  const peopleVersion = usePeopleStore()
  void peopleVersion

  const [step, setStep] = useState<Step>('list')
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null)
  const [masterId, setMasterId] = useState<string>('')
  const [duplicateId, setDuplicateId] = useState<string>('')
  const [reason, setReason] = useState('')
  const [preview, setPreview] = useState<MergePreview | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const groups = useMemo(() => listDuplicateGroups(), [peopleVersion])
  const summary = useMemo(() => getDuplicateResolutionSummary(), [peopleVersion])
  const resolved = useMemo(() => getArchivedDuplicateRecords(), [peopleVersion])

  const openGroup = (group: DuplicateGroup) => {
    setSelectedGroup(group)
    const recommended =
      group.recommendedMasterId &&
      group.members.some((m) => m.id === group.recommendedMasterId)
        ? group.recommendedMasterId
        : group.members[0]?.id ?? ''
    const other =
      group.members.find((m) => m.id !== recommended)?.id ?? group.members[1]?.id ?? ''
    setMasterId(recommended)
    setDuplicateId(other)
    setReason('')
    setPreview(null)
    setError('')
    setNotice('')
    setStep('compare')
  }

  const swapRoles = () => {
    setMasterId(duplicateId)
    setDuplicateId(masterId)
    setPreview(null)
    setError('')
  }

  const goPreview = () => {
    const next = buildMergePreview(masterId, duplicateId)
    if ('error' in next) {
      setError(next.error)
      setPreview(null)
      return
    }
    setError(next.blockers[0] ?? '')
    setPreview(next)
    setStep('preview')
  }

  const confirmArchive = () => {
    const result = resolveDuplicateByArchive({
      masterId,
      duplicateId,
      reason,
      resolvedBy: user?.displayName ?? user?.uid ?? 'Administrator',
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setNotice(
      `Archived ${result.archivedId} as Archived Duplicate. Master ${result.masterId} unchanged. Document retained in Firestore.`,
    )
    setError('')
    setPreview(null)
    setSelectedGroup(null)
    setStep('done')
  }

  const resetToList = () => {
    setStep('list')
    setSelectedGroup(null)
    setPreview(null)
    setError('')
  }

  return (
    <section
      className="rounded-2xl border border-border bg-surface-muted px-4 py-4"
      aria-label="Duplicate Resolution"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text-heading">Duplicate Resolution</h3>
          <p className="mt-1 text-sm text-secondary">
            Review duplicate Karkun documents side-by-side. Archive duplicates only — never delete.
            Administrator decides; system assists.
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-4 text-sm">
        <div className="rounded-lg border border-border bg-surface px-3 py-2">
          <p className="text-secondary">Duplicate Groups</p>
          <p className="font-semibold text-text-heading">{summary.duplicateGroups}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-3 py-2">
          <p className="text-secondary">Needs Review</p>
          <p className="font-semibold text-text-heading">{summary.needsReview}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-3 py-2">
          <p className="text-secondary">Resolved</p>
          <p className="font-semibold text-text-heading">{summary.resolved}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-3 py-2">
          <p className="text-secondary">Archived</p>
          <p className="font-semibold text-text-heading">{summary.archived}</p>
        </div>
      </div>

      {error ? (
        <div className="ds-banner-error mt-3" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="ds-banner-success mt-3" role="status">
          {notice}
        </div>
      ) : null}

      {step === 'list' || step === 'done' ? (
        <div className="mt-4 space-y-3">
          {groups.length === 0 ? (
            <p className="text-sm text-secondary">No open duplicate mobile groups in the registry.</p>
          ) : (
            <ul className="space-y-2">
              {groups.map((group) => (
                <li
                  key={group.mobileKey}
                  className="rounded-xl border border-border bg-surface px-3 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-text-heading">
                        {group.members[0]?.name ?? 'Duplicate group'} · {group.mobile}
                      </p>
                      <p className="mt-1 text-xs text-secondary">
                        {group.members.map((m) => m.id).join(' · ')}
                      </p>
                      <p className="mt-1 text-xs text-secondary">{group.recommendationReason}</p>
                    </div>
                    <PrimaryButton type="button" className="px-3 py-1.5 text-sm" onClick={() => openGroup(group)}>
                      Review
                    </PrimaryButton>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {resolved.length > 0 ? (
            <div className="pt-2">
              <h4 className="text-sm font-semibold text-text-heading">
                Recently archived duplicates ({resolved.length})
              </h4>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-secondary">
                {resolved.slice(0, 20).map((row) => (
                  <li key={row.id}>
                    {row.name} ({row.id}) → {row.mergedInto ?? '—'} · {row.displayStatus}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 'compare' && selectedGroup ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-text-heading">
                Side-by-side · {selectedGroup.mobile}
              </h4>
              <p className="mt-1 text-xs text-secondary">{selectedGroup.recommendationReason}</p>
            </div>
            <SecondaryButton type="button" onClick={resetToList}>
              Cancel
            </SecondaryButton>
          </div>

          {selectedGroup.members.length === 2 ? (
            <ComparisonTable
              master={
                selectedGroup.members.find((m) => m.id === masterId) ?? selectedGroup.members[0]!
              }
              duplicate={
                selectedGroup.members.find((m) => m.id === duplicateId) ?? selectedGroup.members[1]!
              }
              masterId={masterId}
              onSelectMaster={(id) => {
                const other = selectedGroup.members.find((m) => m.id !== id)?.id
                setMasterId(id)
                if (other) setDuplicateId(other)
                setError('')
              }}
            />
          ) : (
            <div className="space-y-2 text-sm">
              <p className="text-secondary">
                This group has {selectedGroup.members.length} records. Select master and duplicate.
              </p>
              <label className={FORM_LABEL_CLASS} htmlFor="dup-master">
                Master
              </label>
              <select
                id="dup-master"
                className={FORM_INPUT_CLASS}
                value={masterId}
                onChange={(e) => setMasterId(e.target.value)}
              >
                {selectedGroup.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} · {m.name} · {m.displayStatus}
                  </option>
                ))}
              </select>
              <label className={FORM_LABEL_CLASS} htmlFor="dup-dup">
                Duplicate to archive
              </label>
              <select
                id="dup-dup"
                className={FORM_INPUT_CLASS}
                value={duplicateId}
                onChange={(e) => setDuplicateId(e.target.value)}
              >
                {selectedGroup.members
                  .filter((m) => m.id !== masterId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} · {m.name} · {m.displayStatus}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <SecondaryButton type="button" onClick={swapRoles}>
              Swap Master / Duplicate
            </SecondaryButton>
            <PrimaryButton type="button" onClick={goPreview}>
              Continue to Preview
            </PrimaryButton>
          </div>
        </div>
      ) : null}

      {step === 'preview' && preview ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-text-heading">Merge Preview</h4>
            <SecondaryButton
              type="button"
              onClick={() => {
                setStep('compare')
                setPreview(null)
                setError('')
              }}
            >
              Back
            </SecondaryButton>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-3 text-sm">
            <p>
              <span className="font-semibold">Master:</span> {preview.master.name} (
              {preview.masterId})
            </p>
            <p className="mt-1">
              <span className="font-semibold">Duplicate:</span> {preview.duplicate.name} (
              {preview.duplicateId})
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-secondary">
              {preview.actions.map((action) => (
                <li key={action}>✓ {action}</li>
              ))}
            </ul>
            {preview.blockers.length > 0 ? (
              <p className="mt-3 font-medium text-rose-800">
                Blocked: {preview.blockers.join(' ')}
              </p>
            ) : (
              <p className="mt-3 text-secondary">
                Nothing has changed yet. Confirm to soft-archive the duplicate only.
              </p>
            )}
          </div>

          <div>
            <label className={FORM_LABEL_CLASS} htmlFor="merge-reason">
              Merge reason (optional)
            </label>
            <input
              id="merge-reason"
              className={FORM_INPUT_CLASS}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Same person created twice during approval"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <SecondaryButton type="button" onClick={resetToList}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="button"
              disabled={preview.blockers.length > 0}
              onClick={confirmArchive}
            >
              Confirm Archive Duplicate
            </PrimaryButton>
          </div>
        </div>
      ) : null}
    </section>
  )
}
