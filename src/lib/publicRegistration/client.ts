import type {
  PublicLookupResult,
  PublicPersonProfile,
  TrainingPaymentMethod,
  TrainingRegistrationRecord,
  TrainingRegistrationSummary,
} from '@/lib/publicRegistration/types'
import { publicRegistrationPhoneAuth } from '@/lib/publicRegistration/phoneAuth'

async function authorizedJson(
  action: string,
  body: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const token = await publicRegistrationPhoneAuth.getIdToken()
  if (!token) {
    throw new Error('Please verify your mobile number first.')
  }
  const response = await fetch('/api/training-registration', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...body }),
  })
  const json = (await response.json()) as Record<string, unknown>
  if (!response.ok || json.ok === false) {
    throw new Error(String(json.error || 'Request failed. Please try again.'))
  }
  return json
}

export async function lookupPublicRegistration(): Promise<PublicLookupResult> {
  return (await authorizedJson('session')) as unknown as PublicLookupResult
}

export async function savePublicRegistrationProfile(
  profile: PublicPersonProfile,
): Promise<{ ok: true; savedToMaster: boolean }> {
  return (await authorizedJson('save_profile', { profile })) as unknown as {
    ok: true
    savedToMaster: boolean
  }
}

export async function submitPublicRegistration(input: {
  profile: PublicPersonProfile
  paymentMethod: TrainingPaymentMethod
}): Promise<{
  ok: true
  registration: TrainingRegistrationRecord
  newCandidate: boolean
}> {
  return (await authorizedJson('submit', input)) as unknown as {
    ok: true
    registration: TrainingRegistrationRecord
    newCandidate: boolean
  }
}

export async function fetchTrainingRegistrationAdmin(token: string): Promise<{
  ok: true
  summary: TrainingRegistrationSummary
  registrations: TrainingRegistrationRecord[]
}> {
  const response = await fetch('/api/training-registration', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'admin_summary' }),
  })
  const json = (await response.json()) as Record<string, unknown>
  if (!response.ok || json.ok === false) {
    throw new Error(String(json.error || 'Unable to load registration summary.'))
  }
  return json as unknown as {
    ok: true
    summary: TrainingRegistrationSummary
    registrations: TrainingRegistrationRecord[]
  }
}

export async function markTrainingRegistrationCashPaid(input: {
  token: string
  registrationId: string
}): Promise<{ ok: true; registration: TrainingRegistrationRecord }> {
  const response = await fetch('/api/training-registration', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'admin_mark_cash_paid', registrationId: input.registrationId }),
  })
  const json = (await response.json()) as Record<string, unknown>
  if (!response.ok || json.ok === false) {
    throw new Error(String(json.error || 'Unable to mark cash paid.'))
  }
  return json as unknown as { ok: true; registration: TrainingRegistrationRecord }
}
