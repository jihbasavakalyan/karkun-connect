import { useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { getRuknById } from '@/data/ruknMaster'
import { getRuknAssignmentSummary } from '@/services/assignmentService'
import { useMuttafiqRelationshipStore } from '@/hooks/useMuttafiqRelationshipStore'
import { getConnectedMuttafiqDisplayRowsForRukn } from '@/stores/muttafiqRelationshipStore'
import { getAuditLogForPerson } from '@/lib/peopleAuditLog'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { useRepositoryHydrationStatus } from '@/hooks/useRepositoryHydration'
import { ROUTES, adminAssignmentsPath, adminKarkunProfilePath } from '@/constants/routes'
import { UI_LABELS } from '@/lib/uiTerminology'
import { AssignmentHistoryTimeline } from '@/components/forms/assignment/AssignmentHistoryTimeline'
import { ConnectedAssignmentDeskCard } from '@/components/forms/assignment/ConnectedAssignmentDeskCard'
import { RemoveAssignmentModal } from '@/components/forms/assignment/RemoveAssignmentModal'
import { TransferConnectionModal } from '@/components/forms/assignment/TransferConnectionModal'
import { CommunicationActions } from '@/components/communication/CommunicationActions'
import { useCommunication } from '@/hooks/useCommunication'
import { getConnectionStatusLabel } from '@/lib/connectionLabels'
import { changeKarkunRuknAssignment } from '@/lib/assignmentEngine'
import {
  toOperatorDisconnectError,
  toOperatorTransferError,
} from '@/lib/assignment/operatorFacingError'
import { formatPersonStatus } from '@/types/people.types'
import {
  EmptyState,
  PageShell,
  Icon,
  ListSkeleton,
  StatusBadge,
  PrimaryButton,
} from '@/components/ui'
import { MuttafiqRuknConnectionRow } from '@/components/relationship/MuttafiqRuknConnectionRow'
import { PersonIdentityChrome } from '@/components/personDetail/PersonIdentityChrome'
import { ConfirmDialog, PersonFormModal } from '@/components/forms/people'
import type { PersonFormValues } from '@/components/forms/people'
import { updateRukn, type MobileLookupResult } from '@/lib/peopleStore'
import { formatPersonNameForDisplay } from '@/utils/formatPersonDisplay'
import {
  rufaqaCategoryLabel,
  rufaqaCategoryPath,
} from '@/lib/rufaqa/rufaqaPresentation'

type ModalMode = 'remove' | 'transfer' | null

export function RuknDetailPage() {
  const { ruknId } = useParams<{ ruknId: string }>()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const hydration = useRepositoryHydrationStatus()
  const rukn = ruknId ? getRuknById(ruknId) : undefined
  const isARuknContext =
    rukn?.officerKind === 'a_rukn' || location.pathname.startsWith(`${ROUTES.ADMIN_A_RUKN}/`) ||
    location.pathname === ROUTES.ADMIN_A_RUKN
  const rufaqaCategory = isARuknContext ? 'a-rukn' : 'rukn'
  const registryLabel = rufaqaCategoryLabel(rufaqaCategory)
  const { removeAssignment, assignmentVersion } = useAssignmentEngine()
  const { sendIndividualMessage } = useCommunication()
  const muttafiqRelationshipVersion = useMuttafiqRelationshipStore()
  void assignmentVersion
  void muttafiqRelationshipVersion
  const summary = ruknId ? getRuknAssignmentSummary(ruknId) : null
  const connectedMuttafiqRows = ruknId ? getConnectedMuttafiqDisplayRowsForRukn(ruknId) : []
  const connectedMuttafiqCount = connectedMuttafiqRows.length

  const tab = searchParams.get('tab') === 'connections' ? 'connections' : 'overview'
  const setTab = (next: 'overview' | 'connections') => {
    const nextParams = new URLSearchParams(searchParams)
    if (next === 'overview') nextParams.delete('tab')
    else nextParams.set('tab', 'connections')
    setSearchParams(nextParams, { replace: true })
  }

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [removingKarkun, setRemovingKarkun] = useState<{ id: string; name: string } | null>(null)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [pendingFormValues, setPendingFormValues] = useState<PersonFormValues | null>(null)
  const [mobileOwner, setMobileOwner] = useState<MobileLookupResult | null>(null)

  if (hydration.failed) {
    return (
      <PageShell variant="narrow">
        <EmptyState
          icon="warning"
          title="Unable to load identity"
          description={hydration.error ?? 'Organisational records could not be loaded.'}
        >
          <PrimaryButton type="button" className="mt-3" onClick={hydration.retry}>
            Retry
          </PrimaryButton>
        </EmptyState>
      </PageShell>
    )
  }

  if (!hydration.ready) {
    return (
      <PageShell variant="narrow">
        <ListSkeleton rows={5} />
      </PageShell>
    )
  }

  if (!rukn) {
    return (
      <PageShell variant="narrow">
        <EmptyState
          icon="search"
          title={`${registryLabel} not found`}
          description={`This ${registryLabel} record does not exist or may have been removed.`}
          primaryAction={{ label: registryLabel, href: rufaqaCategoryPath(rufaqaCategory) }}
        />
      </PageShell>
    )
  }

  const mobileLabel = rukn.mobile.trim() ? rukn.mobile : 'Mobile Not Added'
  const auditLog = getAuditLogForPerson('rukn', rukn.id)
  const activeAssignments = summary?.activeAssignments ?? []
  const referringName = rukn.referredByRuknId
    ? formatPersonNameForDisplay(
        getRuknById(rukn.referredByRuknId)?.name ?? rukn.referredByRuknId,
      )
    : '—'

  const closeModal = () => {
    setModalMode(null)
    setActionError('')
  }

  const handleRemove = async (input: {
    effectiveFrom: string
    removalReason: import('@/types/assignment').RemovalReason
    remarks?: string
  }) => {
    if (!removingKarkun) return
    const result = await removeAssignment({
      ruknId: rukn.id,
      karkunId: removingKarkun.id,
      effectiveFrom: input.effectiveFrom,
      removalReason: input.removalReason,
      remarks: input.remarks,
      assignedBy: 'Administrator',
    })
    if (!result.success) {
      setActionError(toOperatorDisconnectError(result.error))
      return
    }
    setRemovingKarkun(null)
    setActionSuccess('Disconnected successfully.')
    closeModal()
  }

  const handleTransfer = async (input: {
    newRuknId: string
    effectiveFrom: string
    transferReason: import('@/types/assignment').RemovalReason
    remarks?: string
  }) => {
    if (!removingKarkun) {
      setActionError('No Karkun selected for transfer.')
      return
    }
    setTransferLoading(true)
    setActionError('')
    try {
      const result = await changeKarkunRuknAssignment(
        removingKarkun.id,
        input.newRuknId,
        'Administrator',
        {
          removalReason: input.transferReason,
          remarks: input.remarks,
          effectiveFrom: input.effectiveFrom,
        },
      )
      if (!result.success) {
        setActionError(toOperatorTransferError(result.error))
        return
      }
      setRemovingKarkun(null)
      setActionSuccess('Transferred successfully.')
      closeModal()
    } catch (error) {
      setActionError(
        toOperatorTransferError(error instanceof Error ? error.message : String(error)),
      )
    } finally {
      setTransferLoading(false)
    }
  }

  const handleFormSubmit = (
    values: PersonFormValues,
    options?: { confirmMobileOverwrite?: boolean },
  ) => {
    const result = updateRukn(rukn.id, values, 'Administrator', options)
    if (!result.success) {
      if (result.needsMobileConfirm && result.existingOwner) {
        setPendingFormValues(values)
        setMobileOwner(result.existingOwner)
        setFormError('')
        return
      }
      setFormError(result.error ?? 'Unable to save identity.')
      return
    }
    setIsFormOpen(false)
    setFormError('')
    setPendingFormValues(null)
    setMobileOwner(null)
    setActionSuccess('Identity saved.')
  }

  return (
    <PageShell variant="narrow" className="max-w-4xl">
      <PersonIdentityChrome
        backHref={isARuknContext ? ROUTES.ADMIN_A_RUKN : ROUTES.ADMIN_RUKN}
        categoryLabel={registryLabel}
        name={rukn.name}
        badges={
          <>
            <StatusBadge variant={isARuknContext ? 'info' : 'connected'}>
              {isARuknContext ? UI_LABELS.aRukn : 'Rukn'}
            </StatusBadge>
            <StatusBadge variant={rukn.status === 'active' ? 'healthy' : 'dormant'}>
              {formatPersonStatus(rukn.status)}
            </StatusBadge>
            <span className="text-xs font-medium text-secondary">{rukn.id}</span>
          </>
        }
        facts={[
          { label: 'Gender', value: rukn.gender },
          { label: 'Place', value: rukn.place || '—' },
          { label: 'Mobile', value: mobileLabel },
          { label: 'WhatsApp', value: rukn.whatsapp ?? '—' },
        ]}
        actions={
          <>
            <PrimaryButton
              type="button"
              className="px-4 py-2 text-sm"
              onClick={() => {
                setFormError('')
                setIsFormOpen(true)
              }}
            >
              Edit
            </PrimaryButton>
            <CommunicationActions
              personId={rukn.id}
              personKind="rukn"
              name={rukn.name}
              mobile={rukn.mobile}
              whatsapp={rukn.whatsapp}
              onSend={async (input) => {
                const result = await sendIndividualMessage({
                  channel: 'whatsapp',
                  recipient: {
                    personId: rukn.id,
                    personKind: 'rukn',
                    name: rukn.name,
                    mobile: rukn.mobile,
                    whatsapp: rukn.whatsapp,
                  },
                  templateId: input.templateId,
                  message: input.message,
                })
                return result.success
                  ? { success: true }
                  : { success: false, error: result.error }
              }}
            />
          </>
        }
      />

      <nav className="ds-tab-nav mb-6 border-b border-border pb-px" aria-label="Identity sections">
        <button
          type="button"
          className={`ds-tab border-b-2 rounded-none px-4 ${
            tab === 'overview' ? 'border-primary text-primary ds-tab-active' : 'border-transparent'
          }`}
          onClick={() => setTab('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          className={`ds-tab border-b-2 rounded-none px-4 ${
            tab === 'connections'
              ? 'border-primary text-primary ds-tab-active'
              : 'border-transparent'
          }`}
          onClick={() => setTab('connections')}
        >
          Connections
        </button>
      </nav>

      {actionSuccess ? (
        <div className="ds-banner-success mb-4" role="status">
          {actionSuccess}
        </div>
      ) : null}

      {tab === 'overview' ? (
        <>
          <section className="kc-person-detail-section">
            <h2 className="kc-person-detail-section-title">Organisational information</h2>
            <dl className="kc-person-detail-facts">
              <div className="kc-person-detail-fact">
                <dt>Officer kind</dt>
                <dd>{isARuknContext ? UI_LABELS.aRukn : 'Rukn'}</dd>
              </div>
              <div className="kc-person-detail-fact">
                <dt>Referred By:</dt>
                <dd>{referringName}</dd>
              </div>
              {isARuknContext ? (
                <div className="kc-person-detail-fact">
                  <dt>Source Karkun</dt>
                  <dd>
                    {rukn.sourcePersonId ? (
                      <Link
                        to={adminKarkunProfilePath(rukn.sourcePersonId)}
                        className="font-medium text-primary hover:underline"
                      >
                        {rukn.sourcePersonId}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              ) : null}
              <div className="kc-person-detail-fact">
                <dt>Created</dt>
                <dd>{rukn.createdAt.slice(0, 10)}</dd>
              </div>
              <div className="kc-person-detail-fact">
                <dt>Updated</dt>
                <dd>
                  {rukn.updatedAt.slice(0, 10)} by {rukn.updatedBy}
                </dd>
              </div>
            </dl>
            {rukn.notes ? (
              <p className="mt-4 text-sm text-secondary">
                <span className="font-medium text-text-heading">Notes: </span>
                {rukn.notes}
              </p>
            ) : null}
          </section>

          {auditLog.length > 0 ? (
            <section className="kc-person-detail-section">
              <h2 className="kc-person-detail-section-title">Audit Log</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {auditLog.slice(0, 10).map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-lg border border-border bg-surface-muted px-3 py-2"
                  >
                    <span className="font-medium text-text-heading">{entry.action}</span>
                    <span className="text-secondary">
                      {' '}
                      · {entry.timestamp.slice(0, 16).replace('T', ' ')} · {entry.updatedBy}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        summary && (
          <section>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="kc-person-detail-section-title">باہمی ربط</h2>
                <p className="mt-1 text-sm text-secondary">
                  Connection desk for this Rukn. Canonical Admin destination remains باہمی ربط.
                </p>
              </div>
              <Link
                to={adminAssignmentsPath({ ruknId: rukn.id, view: 'manage' })}
              >
                <PrimaryButton
                  type="button"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm"
                >
                  <Icon name="plus" size="sm" />
                  Connect Karkun
                </PrimaryButton>
              </Link>
            </div>

            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-secondary">Connection Status</dt>
                <dd className="mt-1 font-medium text-text-heading">
                  {getConnectionStatusLabel(summary.assignmentStatus)}
                </dd>
              </div>
              <div>
                <dt className="text-secondary">Connected Count</dt>
                <dd className="mt-1 font-medium text-text-heading">{summary.assignedKarkunCount}</dd>
              </div>
              <div>
                <dt className="text-secondary">Connected Muttafiqeen</dt>
                <dd className="mt-1 font-medium text-text-heading">{connectedMuttafiqCount}</dd>
              </div>
              <div>
                <dt className="text-secondary">Connection Since</dt>
                <dd className="mt-1 font-medium text-text-heading">
                  {summary.assignmentSince?.slice(0, 10) ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-secondary">Last Connection Change</dt>
                <dd className="mt-1 font-medium text-text-heading">
                  {summary.lastAssignmentChange?.slice(0, 10) ?? '—'}
                </dd>
              </div>
            </dl>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-text-heading">
                Connected Karkuns ({summary.assignedKarkunCount})
              </h3>
              {activeAssignments.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {activeAssignments.map((assignment) => (
                    <ConnectedAssignmentDeskCard
                      key={assignment.assignmentId}
                      assignment={assignment}
                      variant="detail"
                      onTransfer={(karkun) => {
                        setActionSuccess('')
                        setRemovingKarkun(karkun)
                        setModalMode('transfer')
                      }}
                      onDisconnect={(karkun) => {
                        setActionSuccess('')
                        setRemovingKarkun(karkun)
                        setModalMode('remove')
                      }}
                    />
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-secondary">Not Connected</p>
              )}
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-text-heading">
                {UI_LABELS.connectedMuttafiqeen} ({connectedMuttafiqCount})
              </h3>
              {connectedMuttafiqRows.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {connectedMuttafiqRows.map((row) => (
                    <MuttafiqRuknConnectionRow key={row.relationshipId} row={row} />
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-secondary">{UI_LABELS.notConnected}</p>
              )}
            </div>

            <div className="mt-6">
              <AssignmentHistoryTimeline
                history={summary.assignmentHistory}
                currentAssignment={summary.currentAssignment}
                activeAssignments={summary.activeAssignments}
                perspective="rukn"
                showCurrent={false}
              />
            </div>
          </section>
        )
      )}

      <RemoveAssignmentModal
        isOpen={modalMode === 'remove'}
        rukn={rukn}
        currentKarkunName={removingKarkun?.name ?? 'Unknown'}
        error={actionError}
        onClose={() => {
          setRemovingKarkun(null)
          closeModal()
        }}
        onSubmit={handleRemove}
      />

      <TransferConnectionModal
        key={`transfer-${removingKarkun?.id ?? 'closed'}-${rukn.id}`}
        isOpen={modalMode === 'transfer'}
        karkunName={removingKarkun?.name ?? 'Unknown'}
        currentRukn={rukn}
        error={actionError}
        loading={transferLoading}
        onClose={() => {
          if (transferLoading) return
          setRemovingKarkun(null)
          setActionError('')
          closeModal()
        }}
        onSubmit={handleTransfer}
      />

      <PersonFormModal
        isOpen={isFormOpen}
        kind="rukn"
        mode="edit"
        title={isARuknContext ? `Edit ${UI_LABELS.aRukn}` : 'Edit Rukn'}
        initialValues={{
          name: rukn.name,
          gender: rukn.gender,
          mobile: rukn.mobile,
          whatsapp: rukn.whatsapp,
          status: rukn.status,
          referredByRuknId: rukn.referredByRuknId,
        }}
        error={formError}
        onClose={() => {
          setIsFormOpen(false)
          setFormError('')
        }}
        onSubmit={(values) => handleFormSubmit(values)}
      />

      <ConfirmDialog
        isOpen={Boolean(mobileOwner)}
        title="Overwrite Mobile Number?"
        message={
          <>
            This mobile number is already used by <strong>{mobileOwner?.name}</strong> (
            {mobileOwner?.kind}). Overwriting may affect contact uniqueness. Continue?
          </>
        }
        confirmLabel="Overwrite"
        onConfirm={() => {
          if (!pendingFormValues) return
          handleFormSubmit(pendingFormValues, { confirmMobileOverwrite: true })
        }}
        onClose={() => {
          setMobileOwner(null)
          setPendingFormValues(null)
        }}
      />
    </PageShell>
  )
}
