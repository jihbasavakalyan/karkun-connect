import { useState } from 'react'
import {
  createInitialAnnexure1FormState,
  type Annexure1FormState,
  type JihAppRegistrationStatus,
} from '@/types/annexure1.types'

export function useAnnexure1Form(initial?: Partial<Annexure1FormState>) {
  const [form, setForm] = useState<Annexure1FormState>({
    ...createInitialAnnexure1FormState(),
    ...initial,
  })

  const setField = <K extends keyof Annexure1FormState>(
    key: K,
    value: Annexure1FormState[K],
  ) => {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

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
