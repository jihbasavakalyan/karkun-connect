/**
 * Admin SDK read of `rukns` for login eligibility / claims provision.
 * Returns only the fields needed to match an active officer by mobile.
 */

import {
  matchActiveOfficersByMobile,
  matchActiveOfficersByNormalizedMobile,
  type OfficerLoginCandidate,
} from '../../lib/officerMobileEligibility.js'
import type { Firestore } from 'firebase-admin/firestore'

export async function listRuknOfficersForLogin(db: Firestore): Promise<OfficerLoginCandidate[]> {
  const snap = await db.collection('rukns').get()
  return snap.docs.map((doc) => {
    const data = doc.data() as {
      mobile?: string
      name?: string
      status?: string
      isArchived?: boolean
    }
    return {
      id: doc.id,
      mobile: data.mobile,
      name: data.name,
      status: data.status,
      isArchived: data.isArchived,
    }
  })
}

export async function matchRuknOfficersByMobileFromDb(db: Firestore, mobile: string) {
  const officers = await listRuknOfficersForLogin(db)
  return matchActiveOfficersByMobile(officers, mobile)
}

export async function matchRuknOfficersByNormalizedMobileFromDb(db: Firestore, mobile10: string) {
  const officers = await listRuknOfficersForLogin(db)
  return matchActiveOfficersByNormalizedMobile(officers, mobile10)
}
