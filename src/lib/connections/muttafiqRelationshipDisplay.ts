/**
 * Bidirectional Muttafiq ↔ Rukn display rows from `muttafiqRelationships`.
 * Live person/officer names are resolved for presentation; records are not written.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import {
  adminARuknDetailPath,
  adminKarkunProfilePath,
  adminRuknDetailPath,
} from '@/constants/routes'
import { getRuknById } from '@/data/ruknMaster'
import {
  presentMuttafiqConnectionView,
  type MuttafiqConnectionView,
} from '@/lib/connections/muttafiqConnectionView'
import { isARuknId, resolveOfficerKind } from '@/lib/officerIdentity'
import { getMuttafiqDisplayNumber, getPersonCategory } from '@/lib/peopleClassification'
import { UI_LABELS } from '@/lib/uiTerminology'
import type { MuttafiqRuknRelationship } from '@/types/muttafiqRelationship.types'
import { formatPersonNameForDisplay } from '@/utils/formatPersonDisplay'

export const MUTTAFIQ_PERSON_NOT_FOUND_LABEL = 'Person not found'
export const MUTTAFIQ_RUKN_NOT_FOUND_LABEL = 'Rukn not found'

export type MuttafiqRuknConnectionVisual = 'muttafiq' | 'rukn'

export type MuttafiqRuknConnectionDisplayRow = {
  relationshipId: string
  statusLabel: 'Active'
  counterpartId: string
  counterpartName: string
  counterpartIdentifier: string
  categoryLabel: string
  initials: string
  missing: boolean
  profileHref: string | null
  visual: MuttafiqRuknConnectionVisual
}

function initialsFrom(name: string, fallbackId: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  if (parts.length === 1 && parts[0]!.length >= 2) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }
  const id = fallbackId.trim()
  return id.slice(0, 2).toUpperCase() || '?'
}

function storedNameIsUseful(stored: string, id: string): boolean {
  const trimmed = stored.trim()
  return trimmed.length > 0 && trimmed !== id
}

export function presentConnectedMuttafiqRow(
  relationship: MuttafiqRuknRelationship,
): MuttafiqRuknConnectionDisplayRow {
  const person = getKarkunById(relationship.personId)
  const identifier =
    (person ? getMuttafiqDisplayNumber(person) : undefined) || relationship.personId
  if (!person) {
    const fallbackName = storedNameIsUseful(relationship.personName, relationship.personId)
      ? formatPersonNameForDisplay(relationship.personName)
      : MUTTAFIQ_PERSON_NOT_FOUND_LABEL
    return {
      relationshipId: relationship.id,
      statusLabel: 'Active',
      counterpartId: relationship.personId,
      counterpartName: fallbackName,
      counterpartIdentifier: relationship.personId,
      categoryLabel: 'Muttafiq',
      initials: initialsFrom(fallbackName, relationship.personId),
      missing: fallbackName === MUTTAFIQ_PERSON_NOT_FOUND_LABEL,
      profileHref: adminKarkunProfilePath(relationship.personId),
      visual: 'muttafiq',
    }
  }
  const name = formatPersonNameForDisplay(person.name || relationship.personName || relationship.personId)
  return {
    relationshipId: relationship.id,
    statusLabel: 'Active',
    counterpartId: person.id,
    counterpartName: name,
    counterpartIdentifier: identifier,
    categoryLabel: getPersonCategory(person) === 'Muttafiq' ? 'Muttafiq' : getPersonCategory(person),
    initials: initialsFrom(name, person.id),
    missing: false,
    profileHref: adminKarkunProfilePath(person.id),
    visual: 'muttafiq',
  }
}

export function presentConnectedRuknRow(
  relationship: MuttafiqRuknRelationship,
): MuttafiqRuknConnectionDisplayRow {
  const officer = getRuknById(relationship.ruknId)
  const kind = officer
    ? resolveOfficerKind(officer)
    : isARuknId(relationship.ruknId)
      ? 'a_rukn'
      : 'rukn'
  const categoryLabel = kind === 'a_rukn' ? UI_LABELS.aRukn : 'Rukn'
  const profileHref =
    kind === 'a_rukn'
      ? adminARuknDetailPath(relationship.ruknId)
      : adminRuknDetailPath(relationship.ruknId)

  if (officer?.name.trim()) {
    const name = formatPersonNameForDisplay(officer.name)
    return {
      relationshipId: relationship.id,
      statusLabel: 'Active',
      counterpartId: officer.id,
      counterpartName: name,
      counterpartIdentifier: officer.id,
      categoryLabel,
      initials: initialsFrom(name, officer.id),
      missing: false,
      profileHref,
      visual: 'rukn',
    }
  }

  if (storedNameIsUseful(relationship.ruknName, relationship.ruknId)) {
    const name = formatPersonNameForDisplay(relationship.ruknName)
    return {
      relationshipId: relationship.id,
      statusLabel: 'Active',
      counterpartId: relationship.ruknId,
      counterpartName: name,
      counterpartIdentifier: relationship.ruknId,
      categoryLabel,
      initials: initialsFrom(name, relationship.ruknId),
      missing: officer == null,
      profileHref,
      visual: 'rukn',
    }
  }

  return {
    relationshipId: relationship.id,
    statusLabel: 'Active',
    counterpartId: relationship.ruknId,
    counterpartName: MUTTAFIQ_RUKN_NOT_FOUND_LABEL,
    counterpartIdentifier: relationship.ruknId,
    categoryLabel,
    initials: initialsFrom(relationship.ruknId, relationship.ruknId),
    missing: true,
    profileHref,
    visual: 'rukn',
  }
}

export function applyLiveCounterpartNames(view: MuttafiqConnectionView): MuttafiqConnectionView {
  if (view.status !== 'one' || !view.current) return view
  const row = presentConnectedRuknRow(view.current)
  return {
    ...view,
    connectedRuknLabel: row.counterpartName,
  }
}

export function presentMuttafiqConnectionViewWithLiveNames(input: {
  activeLinks: readonly MuttafiqRuknRelationship[]
  hasPendingLink?: boolean
}): MuttafiqConnectionView {
  return applyLiveCounterpartNames(presentMuttafiqConnectionView(input))
}

export function presentActiveMuttafiqRowsForRukn(
  activeLinks: readonly MuttafiqRuknRelationship[],
): MuttafiqRuknConnectionDisplayRow[] {
  return activeLinks
    .filter((row) => row.status === 'Active')
    .map((row) => presentConnectedMuttafiqRow(row))
}
