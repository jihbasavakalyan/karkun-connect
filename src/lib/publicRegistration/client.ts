import type {
  PublicLookupResult,
  PublicPersonProfile,
  TrainingRegistrationAdminRow,
  TrainingRegistrationRecord,
  TrainingRegistrationSummary,
  TrainingRuknProgressView,
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
  const json = await readTrainingRegistrationJson(response)
  if (!response.ok || json.ok === false) {
    throw new Error(String(json.error || 'Request failed. Please try again.'))
  }
  return json
}

async function readTrainingRegistrationJson(
  response: Response,
): Promise<Record<string, unknown>> {
  const text = await response.text()
  const contentType = response.headers.get('content-type') || ''
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new Error(
      `Registration API returned non-JSON (${response.status} ${contentType || 'unknown type'}): ${text.slice(0, 180)}`,
    )
  }
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
  paymentChoice: import('@/lib/publicRegistration/types').TrainingPublicPaymentChoice
  utr?: string
  cashPaidToId?: string
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

async function adminJson(
  token: string,
  action: string,
  body: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const response = await fetch('/api/training-registration', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...body }),
  })
  const json = await readTrainingRegistrationJson(response)
  if (!response.ok || json.ok === false) {
    throw new Error(String(json.error || 'Unable to complete administrator action.'))
  }
  return json
}

export async function fetchTrainingRegistrationAdmin(token: string): Promise<{
  ok: true
  summary: TrainingRegistrationSummary
  registrations: TrainingRegistrationAdminRow[]
}> {
  return (await adminJson(token, 'admin_summary')) as unknown as {
    ok: true
    summary: TrainingRegistrationSummary
    registrations: TrainingRegistrationAdminRow[]
  }
}

export async function confirmTrainingRegistrationUpiPaid(input: {
  token: string
  registrationId: string
}): Promise<{ ok: true; registration: TrainingRegistrationRecord }> {
  return (await adminJson(input.token, 'admin_confirm_upi_paid', {
    registrationId: input.registrationId,
  })) as unknown as { ok: true; registration: TrainingRegistrationRecord }
}

export async function setTrainingOnlinePaymentEnabled(input: {
  token: string
  onlinePaymentEnabled: boolean
}): Promise<{ ok: true; onlinePaymentEnabled: boolean }> {
  return (await adminJson(input.token, 'admin_set_online_payment', {
    onlinePaymentEnabled: input.onlinePaymentEnabled,
  })) as unknown as { ok: true; onlinePaymentEnabled: boolean }
}

export async function exportTrainingRegistrationCsv(token: string): Promise<{
  ok: true
  csv: string
  filename: string
}> {
  return (await adminJson(token, 'admin_export_csv')) as unknown as {
    ok: true
    csv: string
    filename: string
  }
}

export async function fetchTrainingRegistrationRuknProgress(token: string): Promise<{
  ok: true
  progress: TrainingRuknProgressView
}> {
  const response = await fetch('/api/training-registration', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'rukn_registration_progress' }),
  })
  const json = await readTrainingRegistrationJson(response)
  if (!response.ok || json.ok === false) {
    throw new Error(String(json.error || 'Unable to load registration progress.'))
  }
  const progress = json.progress
  if (!progress || typeof progress !== 'object') {
    throw new Error('Unable to load registration progress.')
  }
  return { ok: true, progress: progress as TrainingRuknProgressView }
}
