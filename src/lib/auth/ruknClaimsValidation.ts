/**
 * KC-0100.2 — Client-side Rukn JWT claims validation against Rukn Master.
 * Used for structured logging after OTP; does not bypass KC-0100 fail-closed auth.
 */
export type RuknClaimsExpected = {
  ruknId: string
  mobile: string
  name?: string
}

export type RuknClaimsActual = {
  uid: string
  phoneNumber: string | null
  role: unknown
  ruknId: unknown
}

export type RuknClaimsValidationResult = {
  ok: boolean
  reasons: string[]
  expected: { role: 'rukn'; ruknId: string; mobile: string; name?: string }
  actual: RuknClaimsActual
}

export function validateRuknJwtClaimsAgainstMaster(
  expected: RuknClaimsExpected,
  actual: RuknClaimsActual,
): RuknClaimsValidationResult {
  const reasons: string[] = []

  if (!actual.uid) {
    reasons.push('Firebase Auth user missing (no uid)')
  }

  if (actual.role !== 'rukn') {
    reasons.push(
      `role claim mismatch: expected "rukn", actual ${JSON.stringify(actual.role ?? null)}`,
    )
  }

  if (typeof actual.ruknId !== 'string' || !actual.ruknId.trim()) {
    reasons.push(
      `ruknId claim missing: expected "${expected.ruknId}", actual ${JSON.stringify(actual.ruknId ?? null)}`,
    )
  } else if (actual.ruknId !== expected.ruknId) {
    reasons.push(
      `ruknId claim mismatch: expected "${expected.ruknId}", actual "${actual.ruknId}"`,
    )
  }

  return {
    ok: reasons.length === 0,
    reasons,
    expected: {
      role: 'rukn',
      ruknId: expected.ruknId,
      mobile: expected.mobile,
      name: expected.name,
    },
    actual,
  }
}

export function formatRuknClaimsValidationFailure(
  result: RuknClaimsValidationResult,
): string {
  return result.reasons.join('; ')
}
