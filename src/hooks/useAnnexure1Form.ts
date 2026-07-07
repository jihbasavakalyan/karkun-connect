import { useCallback, useState } from 'react'
import { tomorrowIsoDate } from '@/lib/annexure1Dates'
import {
  createInitialAnnexure1FormState,
  type Annexure1FormState,
  type JihAppRegistrationStatus,
} from '@/types/annexure1.types'

function applyDisclosureRules(
  previous: Annexure1FormState,
  key: keyof Annexure1FormState,
  value: Annexure1FormState[keyof Annexure1FormState],
): Annexure1FormState {
  const next: Annexure1FormState = { ...previous, [key]: value } as Annexure1FormState

  if (key === 'visitConducted') {
    if (value === 'no') {
      next.discussionSummary = ''
      next.commitmentMade = false
      next.commitmentDetails = ''
      next.jihAppRegistrationStatus = previous.jihAppRegistrationStatus
      next.followUpRequired = 'no'
      next.followUpDate = ''
      next.followUpPurpose = ''
    } else if (value === 'yes') {
      next.notConductedReason = ''
    }
  }

  if (key === 'commitmentMade') {
    if (!value) {
      next.commitmentDetails = ''
      next.followUpRequired = 'no'
      next.followUpDate = ''
      next.followUpPurpose = ''
    } else if (next.followUpRequired === '') {
      next.followUpRequired = 'no'
    }
  }

  if (key === 'followUpRequired') {
    if (value === 'no') {
      next.followUpDate = ''
      next.followUpPurpose = ''
    } else if (value === 'yes' && !next.followUpDate) {
      next.followUpDate = tomorrowIsoDate()
    }
  }

  return next
}

export function useAnnexure1Form(initial?: Partial<Annexure1FormState>) {
  const [form, setForm] = useState<Annexure1FormState>({
    ...createInitialAnnexure1FormState(),
    followUpRequired: 'no',
    ...initial,
  })

  const setField = useCallback(<K extends keyof Annexure1FormState>(
    key: K,
    value: Annexure1FormState[K],
  ) => {
    setForm((previous) => applyDisclosureRules(previous, key, value))
  }, [])

  const visitStopped = form.visitConducted === 'no'

  return {
    form,
    setField,
    visitStopped,
    reset: () => setForm(createInitialAnnexure1FormState()),
  }
}

export type Annexure1FormFieldUpdater = ReturnType<typeof useAnnexure1Form>['setField']

export type { Annexure1FormState, JihAppRegistrationStatus }
