/**
 * KC-0058.4 — Administrator permission investigation instrumentation ONLY.
 * Do not use for product behavior. Safe to remove after the investigation closes.
 */

import { getFirebaseAuth } from '@/lib/firebase/firebase'
import { markStartupLifecycle } from '@/lib/startupLifecycleTrace'

export type Kc00584AuthSnapshot = {
  capturedAt: string
  performanceNow: number
  uid: string | null
  email: string | null
  authCurrentUserPresent: boolean
  tokenIssuedAtTime: string | null
  tokenAuthTime: string | null
  tokenExpirationTime: string | null
  claims: Record<string, unknown>
  resolvedScope: { role: string | null; ruknId: string | null }
}

export type Kc00584OpRecord = {
  seq: number
  label: string
  repository: string
  method: string
  firestoreApi: string
  collection: string
  query: string
  documentPath: string | null
  startedAtMs: number
  finishedAtMs: number
  durationMs: number
  result: 'PASS' | 'FAIL'
  errorCode?: string
  errorMessage?: string
}

export type Kc00584Report = {
  ticket: 'KC-0058.4'
  authBeforeCritical: Kc00584AuthSnapshot | null
  operations: Kc00584OpRecord[]
  firstFailure: Kc00584OpRecord | null
  ruleCorrelation: {
    rulePath: string
    rulePredicate: string
    requiredClaim: string
    actualClaimValue: unknown
  } | null
}

const report: Kc00584Report = {
  ticket: 'KC-0058.4',
  authBeforeCritical: null,
  operations: [],
  firstFailure: null,
  ruleCorrelation: null,
}

let opSeq = 0

function publish(): void {
  try {
    if (typeof window !== 'undefined') {
      window.__KC0058_4__ = {
        ...report,
        operations: [...report.operations],
        firstFailure: report.firstFailure ? { ...report.firstFailure } : null,
        authBeforeCritical: report.authBeforeCritical
          ? { ...report.authBeforeCritical, claims: { ...report.authBeforeCritical.claims } }
          : null,
      }
    }
  } catch {
    // non-browser
  }
}

function ruleForOperation(op: Pick<Kc00584OpRecord, 'collection' | 'documentPath'>): {
  rulePath: string
  rulePredicate: string
  requiredClaim: string
} {
  if (op.collection === 'campaigns') {
    return {
      rulePath: 'match /campaigns/{campaignId}',
      rulePredicate: 'allow read: if isSignedIn()',
      requiredClaim: 'request.auth != null',
    }
  }
  if (op.collection === 'rukns') {
    return {
      rulePath: 'match /rukns/{docId}',
      rulePredicate:
        "allow read: if isAdministrator() || (isRukn() && docId == ruknId())",
      requiredClaim: "request.auth.token.role == 'administrator' (for unfiltered list)",
    }
  }
  if (op.collection === 'karkuns') {
    return {
      rulePath: 'match /karkuns/{karkunId}',
      rulePredicate:
        "allow read: if isAdministrator() || (isRukn() && assigned/available)",
      requiredClaim: "request.auth.token.role == 'administrator' (for unfiltered list)",
    }
  }
  if (op.collection === 'connections') {
    return {
      rulePath: 'match /connections/{assignmentId}',
      rulePredicate: 'allow read: if isAdministrator() || assignedToRukn(resource.data)',
      requiredClaim: "request.auth.token.role == 'administrator' (for unfiltered list)",
    }
  }
  if (op.collection === 'settings') {
    return {
      rulePath: 'match /settings/{docId}',
      rulePredicate:
        "allow read: if isAdministrator() || (isRukn() && allowlisted docId)",
      requiredClaim: "request.auth.token.role == 'administrator' (or Rukn allowlisted doc)",
    }
  }
  return {
    rulePath: `match /${op.collection}/{id}`,
    rulePredicate: 'see firestore.rules',
    requiredClaim: 'unknown',
  }
}

/** Capture auth + claims once before critical Promise.all (no force refresh). */
export async function kc00584CaptureAuthBeforeCritical(
  resolvedScope: { role: string | null; ruknId: string | null },
): Promise<Kc00584AuthSnapshot> {
  const auth = getFirebaseAuth()
  const user = auth.currentUser
  let claims: Record<string, unknown> = {}
  let issuedAt: string | null = null
  let authTime: string | null = null
  let expiration: string | null = null

  if (user) {
    // Natural token read — do NOT pass forceRefresh=true.
    const tokenResult = await user.getIdTokenResult()
    claims = { ...(tokenResult.claims as Record<string, unknown>) }
    issuedAt = tokenResult.issuedAtTime
    authTime = tokenResult.authTime
    expiration = tokenResult.expirationTime
  }

  const snapshot: Kc00584AuthSnapshot = {
    capturedAt: new Date().toISOString(),
    performanceNow: typeof performance !== 'undefined' ? performance.now() : 0,
    uid: user?.uid ?? null,
    email: user?.email ?? null,
    authCurrentUserPresent: Boolean(user),
    tokenIssuedAtTime: issuedAt,
    tokenAuthTime: authTime,
    tokenExpirationTime: expiration,
    claims,
    resolvedScope: { ...resolvedScope },
  }

  report.authBeforeCritical = snapshot
  markStartupLifecycle('KC-0058.4.AUTH-01', {
    uid: snapshot.uid,
    email: snapshot.email,
    claimsRole: snapshot.claims.role ?? null,
    claimsKeys: Object.keys(snapshot.claims),
    scope: snapshot.resolvedScope,
    issuedAt: snapshot.tokenIssuedAtTime,
    authTime: snapshot.tokenAuthTime,
  })
  console.info('[KC-0058.4][AUTH-01]', snapshot)
  publish()
  return snapshot
}

export async function kc00584ProbeCriticalOp<T>(input: {
  label: string
  repository: string
  method: string
  firestoreApi: string
  collection: string
  query: string
  documentPath?: string | null
  run: () => Promise<T>
}): Promise<T> {
  const startedAtMs = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const seq = ++opSeq
  try {
    const data = await input.run()
    const finishedAtMs = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const record: Kc00584OpRecord = {
      seq,
      label: input.label,
      repository: input.repository,
      method: input.method,
      firestoreApi: input.firestoreApi,
      collection: input.collection,
      query: input.query,
      documentPath: input.documentPath ?? null,
      startedAtMs,
      finishedAtMs,
      durationMs: Math.round(finishedAtMs - startedAtMs),
      result: 'PASS',
    }
    report.operations.push(record)
    markStartupLifecycle('KC-0058.4.OP-PASS', {
      label: input.label,
      collection: input.collection,
      durationMs: record.durationMs,
    })
    publish()
    return data
  } catch (error) {
    const finishedAtMs = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: string }).code)
        : 'unknown'
    const message = error instanceof Error ? error.message : String(error)
    const record: Kc00584OpRecord = {
      seq,
      label: input.label,
      repository: input.repository,
      method: input.method,
      firestoreApi: input.firestoreApi,
      collection: input.collection,
      query: input.query,
      documentPath: input.documentPath ?? null,
      startedAtMs,
      finishedAtMs,
      durationMs: Math.round(finishedAtMs - startedAtMs),
      result: 'FAIL',
      errorCode: code,
      errorMessage: message,
    }
    report.operations.push(record)
    if (!report.firstFailure) {
      report.firstFailure = record
      const rule = ruleForOperation(record)
      const actualClaimValue = report.authBeforeCritical?.claims.role ?? null
      report.ruleCorrelation = {
        ...rule,
        actualClaimValue,
      }
      markStartupLifecycle('KC-0058.4.FIRST-DENY', {
        label: record.label,
        method: record.method,
        collection: record.collection,
        query: record.query,
        errorCode: record.errorCode,
        errorMessage: record.errorMessage,
        rulePath: rule.rulePath,
        requiredClaim: rule.requiredClaim,
        actualClaimValue,
      })
      console.error('[KC-0058.4][FIRST-DENY]', {
        record,
        authBeforeCritical: report.authBeforeCritical,
        ruleCorrelation: report.ruleCorrelation,
      })
    } else {
      markStartupLifecycle('KC-0058.4.OP-FAIL', {
        label: record.label,
        collection: record.collection,
        errorCode: record.errorCode,
      })
      console.error('[KC-0058.4][OP-FAIL]', record)
    }
    publish()
    throw error
  }
}

export function kc00584GetReport(): Kc00584Report {
  return {
    ...report,
    operations: [...report.operations],
    firstFailure: report.firstFailure ? { ...report.firstFailure } : null,
    authBeforeCritical: report.authBeforeCritical
      ? { ...report.authBeforeCritical, claims: { ...report.authBeforeCritical.claims } }
      : null,
    ruleCorrelation: report.ruleCorrelation ? { ...report.ruleCorrelation } : null,
  }
}

declare global {
  interface Window {
    __KC0058_4__?: Kc00584Report
  }
}
