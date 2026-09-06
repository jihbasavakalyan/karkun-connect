/**
 * Admin Connect Rukn — direct Active Muttafiq↔Rukn assignment (no Inbox Pending).
 * Rukn-initiated links continue via ConnectMuttafiqRequestModal → pending request path.
 */

import { useState } from 'react'
import { Modal, ModalFormFooter } from '@/components/common'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS, FORM_SELECT_CLASS } from '@/components/ui/formStyles'
import { getRuknById } from '@/data/ruknMaster'
import { useAuth } from '@/hooks/useAuth'
import { useMuttafiqRelationshipStore } from '@/hooks/useMuttafiqRelationshipStore'
import { useWriteLifecycle } from '@/hooks/useWriteLifecycle'
import { getAllRukns, normalizePersonGender } from '@/lib/peopleStore'
import { formatPersonNameForDisplay } from '@/utils/formatPersonDisplay'
import { assignMuttafiqRuknLinkAsAdmin } from '@/services/karkunRequestService'
import { getActiveMuttafiqRelationshipsForPerson } from '@/stores/muttafiqRelationshipStore'
import { pickUniqueNewestActive } from '@/lib/connections/oneActiveRukn'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

type ConnectRuknForMuttafiqModalProps = {
  isOpen: boolean
  person: KarkunRegistryRecord | null
  onClose: () => void
  onAssigned: () => void
}

export function ConnectRuknForMuttafiqModal({
  isOpen,
  person,
  onClose,
  onAssigned,
}: ConnectRuknForMuttafiqModalProps) {
  const { user } = useAuth()
  const relationshipVersion = useMuttafiqRelationshipStore()
  const [ruknId, setRuknId] = useState('')
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')
  const { busy: submitting, progressMessage, run } = useWriteLifecycle()

  void relationshipVersion
  const ruknOptions = (() => {
    if (!person) return []
    const personGender = normalizePersonGender(person.gender)
    const linkedIds = new Set(
      (() => {
        const pick = pickUniqueNewestActive(getActiveMuttafiqRelationshipsForPerson(person.id))
        return pick.status === 'one' ? [pick.current.ruknId] : []
      })(),
    )
    return getAllRukns()
      .filter((rukn) => rukn.status === 'active' && !rukn.isArchived)
      .filter((rukn) => {
        if (!personGender) return true
        return normalizePersonGender(rukn.gender) === personGender
      })
      .filter((rukn) => !linkedIds.has(rukn.id))
      .sort((a, b) => a.name.localeCompare(b.name))
  })()

  const reset = () => {
    setRuknId('')
    setRemarks('')
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = () => {
    setError('')
    if (!person) {
      setError('Muttafiq not found.')
      return
    }
    if (!ruknId.trim()) {
      setError('Select a Rukn to connect.')
      return
    }
    const selected = getRuknById(ruknId)
    if (!selected || selected.status !== 'active') {
      setError('Selected Rukn is not valid.')
      return
    }

    void run({
      key: `muttafiq-rukn-assign-admin:${person.id}:${ruknId}`,
      queueLabels: ['muttafiqRelationships'],
      work: async () => {
        const result = await assignMuttafiqRuknLinkAsAdmin({
          personId: person.id,
          ruknId,
          remarks,
          establishedBy: user?.displayName ?? user?.uid ?? 'Administrator',
        })
        if (!result.ok) {
          setError(result.error)
          throw Object.assign(new Error(result.error), { code: result.code ?? 'unknown' })
        }
        return result
      },
    }).then((lifecycle) => {
      if (!lifecycle?.ok) return
      reset()
      onAssigned()
      onClose()
    })
  }

  const muttafiqName = person ? formatPersonNameForDisplay(person.name) : '—'
  const selectedRuknName = ruknId
    ? formatPersonNameForDisplay(getRuknById(ruknId)?.name ?? ruknId)
    : '—'

  return (
    <Modal
      isOpen={isOpen}
      title="Connect Rukn"
      onClose={handleClose}
      size="md"
      footer={
        <ModalFormFooter
          onCancel={handleClose}
          primaryLabel={
            submitting ? progressMessage || 'محفوظ کیا جا رہا ہے...' : 'Confirm Connection'
          }
          onPrimaryClick={() => handleSubmit()}
          primaryDisabled={submitting || !person}
        />
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-secondary">
          Connect this Muttafiq to a Rukn now. The person stays a Muttafiq — this is not a campaign
          Karkun connection and does not require Inbox approval.
        </p>
        {error ? (
          <div className="ds-banner-error" role="alert">
            {error}
          </div>
        ) : null}
        <div>
          <p className={FORM_LABEL_CLASS}>Muttafiq</p>
          <p className="text-sm font-medium text-text-heading">{muttafiqName}</p>
        </div>
        <label className="block">
          <span className={FORM_LABEL_CLASS}>Rukn</span>
          <select
            className={FORM_SELECT_CLASS}
            value={ruknId}
            onChange={(event) => setRuknId(event.target.value)}
            disabled={submitting}
            required
          >
            <option value="">Select Rukn</option>
            {ruknOptions.map((rukn) => (
              <option key={rukn.id} value={rukn.id}>
                {formatPersonNameForDisplay(rukn.name)}
              </option>
            ))}
          </select>
        </label>
        {ruknId ? (
          <p className="text-sm text-secondary">
            Connect <span className="font-medium text-text-heading">{muttafiqName}</span> to{' '}
            <span className="font-medium text-text-heading">{selectedRuknName}</span>
          </p>
        ) : null}
        <label className="block">
          <span className={FORM_LABEL_CLASS}>Notes (optional)</span>
          <input
            className={FORM_INPUT_CLASS}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            disabled={submitting}
          />
        </label>
        {ruknOptions.length === 0 ? (
          <p className="text-sm text-secondary">
            No available Rukns to connect (already linked or none active for this gender).
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
