import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { ROUTES } from '@/constants/routes'
import { changeKarkunRuknAssignment } from '@/lib/assignmentEngine'
import {
  getMuttafiqDisplayNumber,
  getPersonCategory,
  getRemovedRegistryLabel,
  isMuttafiq as isMuttafiqPerson,
  isPromotedToARukn,
  isSoftRemoved,
} from '@/lib/peopleClassification'
import { persistKarkunDurable, updateKarkun } from '@/lib/peopleStore'
import {
  getMuttafiqConnectedRuknDisplayForPerson,
  getActiveMuttafiqRelationshipsForPerson,
} from '@/stores/muttafiqRelationshipStore'
import { useMuttafiqRelationshipStore } from '@/hooks/useMuttafiqRelationshipStore'
import { getRuknById } from '@/data/ruknMaster'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { useRepositoryHydrationStatus } from '@/hooks/useRepositoryHydration'
import { CommunicationActions } from '@/components/communication/CommunicationActions'
import { useCommunication } from '@/hooks/useCommunication'
import { RegistryMaintenancePanel } from '@/components/admin/RegistryMaintenancePanel'
import { PromoteToARuknAction } from '@/components/admin/PromoteToARuknAction'
import { PersonIdentityChrome } from '@/components/personDetail/PersonIdentityChrome'
import { PersonOrganisationalReporting } from '@/components/personDetail/PersonOrganisationalReporting'
import { Person360Overview } from '@/components/personProfile/Person360Overview'
import { ConfirmDialog, PersonFormModal } from '@/components/forms/people'
import type { PersonFormValues } from '@/components/forms/people'
import { MuttafiqRuknConnectionRow } from '@/components/relationship/MuttafiqRuknConnectionRow'
import { ConnectRuknForMuttafiqModal } from '@/components/relationship'
import { EmptyState, ListSkeleton, PageShell, PrimaryButton, SecondaryButton, StatusBadge } from '@/components/ui'
import { formatPersonStatus, getFatherHusbandLabel } from '@/types/people.types'
import { formatPersonNameForDisplay } from '@/utils/formatPersonDisplay'
import {
  rufaqaCategoryLabel,
  rufaqaCategoryPath,
} from '@/lib/rufaqa/rufaqaPresentation'
import type { MobileLookupResult } from '@/lib/peopleStore'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export function KarkunProfilePage() {
  const { karkunId } = useParams<{ karkunId: string }>()
  const navigate = useNavigate()
  useAssignmentEngine()
  usePeopleStore()
  const hydration = useRepositoryHydrationStatus()
  const { sendIndividualMessage } = useCommunication()
  const muttafiqRelationshipVersion = useMuttafiqRelationshipStore()
  void muttafiqRelationshipVersion

  const karkun = karkunId ? getKarkunById(karkunId) : undefined

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [saveNotice, setSaveNotice] = useState('')
  const [pendingFormValues, setPendingFormValues] = useState<PersonFormValues | null>(null)
  const [mobileOwner, setMobileOwner] = useState<MobileLookupResult | null>(null)
  const [connectPerson, setConnectPerson] = useState<KarkunRegistryRecord | null>(null)

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

  if (!karkun || !karkunId) {
    return (
      <PageShell variant="narrow">
        <EmptyState
          icon="search"
          title="Person not found"
          description="This identity record is not in Rufaqa."
          primaryAction={{ label: rufaqaCategoryLabel('karkun'), href: rufaqaCategoryPath('karkun') }}
          secondaryAction={{
            label: rufaqaCategoryLabel('muttafiqeen'),
            href: rufaqaCategoryPath('muttafiqeen'),
          }}
        />
      </PageShell>
    )
  }

  const category = getPersonCategory(karkun)
  const softRemoved = isSoftRemoved(karkun)
  const removedLabel = getRemovedRegistryLabel(karkun)
  const isMuttafiq = isMuttafiqPerson(karkun)
  const rufaqaCategory = isMuttafiq ? 'muttafiqeen' : 'karkun'
  const { view, row } = getMuttafiqConnectedRuknDisplayForPerson(karkunId)

  const handleFormSubmit = (
    values: PersonFormValues,
    options?: { confirmMobileOverwrite?: boolean },
  ) => {
    setFormError('')
    setSaveNotice('')
    const { assignedRuknId, ...karkunPayload } = values
    const result = updateKarkun(karkunId, karkunPayload, 'Administrator', options)
    if (!result.success) {
      if (result.needsMobileConfirm && result.existingOwner) {
        setMobileOwner(result.existingOwner)
        setPendingFormValues(values)
        return
      }
      setFormError(result.error ?? `Unable to save ${isMuttafiq ? 'Muttafiq' : 'Karkun'} details.`)
      return
    }

    setFormLoading(true)
    void (async () => {
      const durable = await persistKarkunDurable(karkunId)
      if (!durable.success) {
        setFormLoading(false)
        setFormError(
          durable.error ??
            `Unable to save ${isMuttafiq ? 'Muttafiq' : 'Karkun'} details. Please try again.`,
        )
        return
      }

      if (!isMuttafiq && assignedRuknId !== undefined) {
        const assignmentResult = await changeKarkunRuknAssignment(karkunId, assignedRuknId)
        if (!assignmentResult.success) {
          setFormLoading(false)
          setFormError(assignmentResult.error ?? 'Unable to update connection.')
          return
        }
      }

      setFormLoading(false)
      setIsFormOpen(false)
      setPendingFormValues(null)
      setMobileOwner(null)
      setSaveNotice('Identity saved.')
    })()
  }

  const connectedRuknValue = isMuttafiq ? (
    <div className="space-y-2">
      {row ? (
        <ul className="space-y-2">
          <MuttafiqRuknConnectionRow row={row} />
        </ul>
      ) : view.status === 'duplicate' ? (
        <p role="status">
          Needs review
          {view.diagnosticRuknIds.length > 0 ? ` · ${view.diagnosticRuknIds.join(', ')}` : ''}
        </p>
      ) : (
        <p>{view.status === 'none' ? 'Not Connected' : view.connectedRuknLabel}</p>
      )}
      <p className="text-secondary">Connected Count: {view.activeCount}</p>
      <p className="text-secondary">Relationship: {view.relationshipLabel}</p>
      {!softRemoved && view.status === 'none' ? (
        <SecondaryButton
          type="button"
          className="px-3 py-1.5 text-sm"
          onClick={() => setConnectPerson(karkun)}
        >
          Connect Rukn
        </SecondaryButton>
      ) : null}
    </div>
  ) : karkun.assignedRuknId ? (
    formatPersonNameForDisplay(getRuknById(karkun.assignedRuknId)?.name ?? karkun.assignedRukn)
  ) : (
    'Not Connected'
  )

  const identityFacts: Array<{ label: string; value: ReactNode }> = [
    { label: 'Gender', value: karkun.gender },
    { label: 'Status', value: formatPersonStatus(karkun.status) },
    { label: 'Mobile', value: karkun.mobile || '—' },
    { label: 'WhatsApp', value: karkun.whatsapp || '—' },
    {
      label: getFatherHusbandLabel(karkun.gender),
      value: karkun.fatherHusbandName?.trim() || '—',
    },
    { label: 'Address', value: karkun.address?.trim() || '—' },
    { label: 'Area', value: karkun.area?.trim() || '—' },
    { label: 'Place', value: karkun.place?.trim() || '—' },
    { label: 'Education', value: karkun.education?.trim() || '—' },
    { label: 'Profession', value: karkun.profession?.trim() || '—' },
    {
      label: 'Referred By:',
      value: karkun.referredByRuknId
        ? formatPersonNameForDisplay(
            getRuknById(karkun.referredByRuknId)?.name ?? karkun.referredByRuknId,
          )
        : '—',
    },
    { label: 'Connected Rukn', value: connectedRuknValue },
    { label: 'Identity ID', value: karkun.id },
  ]

  if (softRemoved) {
    const preserved = getActiveMuttafiqRelationshipsForPerson(karkunId)
    identityFacts.push({
      label: 'Relationship history',
      value: preserved.length > 0
        ? 'Existing Muttafiq ↔ Rukn relationship records remain on file and were not ended. This person is not an active registry counterpart.'
        : 'No active operational relationship is shown because this person is removed from the registry.',
    })
  }

  return (
    <PageShell className="max-w-5xl overflow-hidden">
      <PersonIdentityChrome
        backHref={rufaqaCategoryPath(rufaqaCategory)}
        categoryLabel={rufaqaCategoryLabel(rufaqaCategory)}
        name={karkun.name}
        badges={
          <>
            {softRemoved && removedLabel ? (
              <StatusBadge variant="dormant">{removedLabel}</StatusBadge>
            ) : (
              <StatusBadge
                variant={isMuttafiq ? 'info' : isPromotedToARukn(karkun) ? 'info' : 'connected'}
              >
                {isPromotedToARukn(karkun) ? 'عازمِ رکن' : category}
              </StatusBadge>
            )}
            {softRemoved ? (
              <span className="text-xs font-medium text-secondary">
                Removed by: {karkun.archivedBy?.trim() || karkun.updatedBy || 'Administrator'}
              </span>
            ) : null}
            {isPromotedToARukn(karkun) && karkun.promotedToARuknId ? (
              <span className="text-xs font-medium text-secondary">{karkun.promotedToARuknId}</span>
            ) : null}
            {isMuttafiq && getMuttafiqDisplayNumber(karkun) ? (
              <span className="text-xs font-medium text-secondary">
                {getMuttafiqDisplayNumber(karkun)}
              </span>
            ) : null}
            {karkun.needsReview && !karkun.isArchived ? (
              <StatusBadge variant="warning">Needs Review</StatusBadge>
            ) : null}
          </>
        }
        facts={identityFacts}
        actions={
          <>
            {!softRemoved ? (
              <PrimaryButton
                type="button"
                className="px-4 py-2 text-sm"
                onClick={() => {
                  setFormError('')
                  setSaveNotice('')
                  setIsFormOpen(true)
                }}
              >
                Edit
              </PrimaryButton>
            ) : null}
            <CommunicationActions
              personId={karkunId}
              personKind="karkun"
              name={karkun.name}
              mobile={karkun.mobile}
              whatsapp={karkun.whatsapp}
              onSend={async (input) => {
                const result = await sendIndividualMessage({
                  channel: 'whatsapp',
                  recipient: {
                    personId: karkunId,
                    personKind: 'karkun',
                    name: karkun.name,
                    mobile: karkun.mobile,
                    whatsapp: karkun.whatsapp,
                  },
                  templateId: input.templateId,
                  message: input.message,
                })
                return result.success
                  ? { success: true }
                  : { success: false, error: result.error }
              }}
            />
            {!isMuttafiq && !softRemoved ? (
              <PromoteToARuknAction
                person={karkun}
                variant="button"
                onSuccess={() => navigate(ROUTES.ADMIN_A_RUKN)}
              />
            ) : null}
          </>
        }
      />

      {saveNotice ? (
        <div className="ds-banner-success mb-4" role="status">
          {saveNotice}
        </div>
      ) : null}

      <Person360Overview personId={karkunId} omitRelationship />

      {!softRemoved ? (
        <div className="mt-8">
          <PersonOrganisationalReporting key={karkunId} karkunId={karkunId} />
        </div>
      ) : null}

      <div className="mt-8">
        <RegistryMaintenancePanel karkun={karkun} karkunId={karkunId} />
      </div>

      <PersonFormModal
        isOpen={isFormOpen}
        kind="karkun"
        mode="edit"
        personLabel={isMuttafiq ? 'Muttafiq' : 'Karkun'}
        karkunId={karkunId}
        loading={formLoading}
        initialValues={{
          name: karkun.name,
          gender: karkun.gender,
          mobile: karkun.mobile,
          whatsapp: karkun.whatsapp,
          status: karkun.status,
          fatherHusbandName: karkun.fatherHusbandName,
          address: karkun.address,
          area: karkun.area,
          place: karkun.place,
          education: karkun.education,
          profession: karkun.profession,
          assignedRuknId: karkun.assignedRuknId,
        }}
        error={formError}
        onClose={() => {
          if (formLoading) return
          setIsFormOpen(false)
          setFormError('')
          setMobileOwner(null)
          setPendingFormValues(null)
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

      <ConnectRuknForMuttafiqModal
        isOpen={connectPerson !== null}
        person={connectPerson}
        onClose={() => setConnectPerson(null)}
        onAssigned={() => setConnectPerson(null)}
      />
    </PageShell>
  )
}
