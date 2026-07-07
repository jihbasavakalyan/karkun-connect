import { ruknMaster } from '@/data/ruknMaster'
import type { PersonGender } from '@/types/people.types'

export type DemoRuknAccount = {
  email: string
  label: string
  ruknId: string
  ruknName: string
}

function getActiveRuknsByGender(gender: PersonGender) {
  return ruknMaster.filter((rukn) => rukn.gender === gender && rukn.status === 'active')
}

function buildDemoRuknAccounts(): DemoRuknAccount[] {
  const maleRukns = getActiveRuknsByGender('Male')
  const femaleRukns = getActiveRuknsByGender('Female')

  const slots: { email: string; label: string; rukn: (typeof ruknMaster)[number] | undefined }[] =
    [
      { email: 'rukn1@demo.com', label: 'First Male Rukn', rukn: maleRukns[0] },
      { email: 'rukn2@demo.com', label: 'Second Male Rukn', rukn: maleRukns[1] },
      { email: 'rukn3@demo.com', label: 'First Female Rukn', rukn: femaleRukns[0] },
      { email: 'rukn4@demo.com', label: 'Second Female Rukn', rukn: femaleRukns[1] },
    ]

  return slots
    .filter((slot): slot is typeof slot & { rukn: (typeof ruknMaster)[number] } => Boolean(slot.rukn))
    .map((slot) => ({
      email: slot.email,
      label: slot.label,
      ruknId: slot.rukn.id,
      ruknName: slot.rukn.name,
    }))
}

export const DEMO_RUKN_ACCOUNTS: DemoRuknAccount[] = buildDemoRuknAccounts()

/** Fallback when session lacks ruknId (should not occur for authenticated Rukn users). */
export const DEFAULT_DEMO_RUKN_ID = DEMO_RUKN_ACCOUNTS[0]?.ruknId ?? ruknMaster[0]?.id ?? ''

export function getDemoRuknIdForEmail(email: string): string | undefined {
  const normalizedEmail = email.trim().toLowerCase()
  return DEMO_RUKN_ACCOUNTS.find((account) => account.email === normalizedEmail)?.ruknId
}
