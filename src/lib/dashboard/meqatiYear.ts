/**
 * Meqati cycle: April → March (Asia/Karachi civil date).
 * Year is an implementation-history dimension of سرگرمی — not a new planning parent.
 * Plan window: April 2023 → March 2027.
 */

import { useMemo, useState } from 'react'
import { karachiDateKey, MANSOOBA_REPORT_TIMEZONE } from '@/lib/mansoobaReporting/periods'
import type { MansoobaReportPeriod } from '@/lib/mansoobaReporting/periods'

/** First Meqati start year in the current plan (Apr 2023). */
export const MEQATI_PLAN_START_YEAR = 2023
/** Last Meqati start year in the current plan (Apr 2026 → Mar 2027). */
export const MEQATI_PLAN_END_START_YEAR = 2026

export type MeqatiYear = {
  /** e.g. 2026-27 */
  key: string
  /** Civil start year (April). */
  startYear: number
  /** Civil end year (March). */
  endYear: number
  /** 2026–27 */
  label: string
  /** Apr 2026 – Mar 2027 */
  rangeLabel: string
  startDate: string
  endDate: string
}

export type MeqatiYearSelection = {
  year: MeqatiYear
  years: readonly MeqatiYear[]
  setYearKey: (key: string) => void
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function buildMeqatiYear(startYear: number): MeqatiYear {
  const endYear = startYear + 1
  const yy = pad2(endYear % 100)
  return {
    key: `${startYear}-${yy}`,
    startYear,
    endYear,
    label: `${startYear}–${yy}`,
    rangeLabel: `Apr ${startYear} – Mar ${endYear}`,
    startDate: `${startYear}-04-01`,
    endDate: `${endYear}-03-31`,
  }
}

/** Resolve the Meqati year containing a Karachi civil date (default: today). */
export function resolveMeqatiYear(asOf?: Date | string): MeqatiYear {
  const dateKey = typeof asOf === 'string' ? asOf.slice(0, 10) : karachiDateKey(asOf)
  const y = Number(dateKey.slice(0, 4))
  const m = Number(dateKey.slice(5, 7))
  const startYear = m >= 4 ? y : y - 1
  return buildMeqatiYear(startYear)
}

export function listMeqatiPlanYears(): MeqatiYear[] {
  const years: MeqatiYear[] = []
  for (let startYear = MEQATI_PLAN_START_YEAR; startYear <= MEQATI_PLAN_END_START_YEAR; startYear += 1) {
    years.push(buildMeqatiYear(startYear))
  }
  return years
}

export function getMeqatiYearByKey(key: string): MeqatiYear | undefined {
  return listMeqatiPlanYears().find((year) => year.key === key)
}

/** Period consumed by buildMansoobaActivityReport (uses startDate/endDate only). */
export function meqatiYearToReportPeriod(year: MeqatiYear): MansoobaReportPeriod {
  return {
    kind: 'yearly',
    startDate: year.startDate,
    endDate: year.endDate,
    periodKey: year.key,
    timezone: MANSOOBA_REPORT_TIMEZONE,
  }
}

export function useMeqatiYearSelection(asOf?: Date | string): MeqatiYearSelection {
  const years = useMemo(() => listMeqatiPlanYears(), [])
  const current = useMemo(() => resolveMeqatiYear(asOf), [asOf])
  const [yearKey, setYearKey] = useState(current.key)
  const year = years.find((row) => row.key === yearKey) ?? current
  return { year, years, setYearKey }
}
