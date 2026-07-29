/**
 * Universal search hit shapes (MVP v1.0).
 */

import type { RafeeqEntityType } from './types'

export type UniversalSearchHit = {
  readonly id: string
  readonly entityType: RafeeqEntityType
  readonly name: string
  readonly description: string
  readonly route: string
  readonly score: number
  readonly tier: string
  /** People-only extras */
  readonly personId?: string
  readonly mobile?: string
}

export const ENTITY_TYPE_LABEL_UR: Record<RafeeqEntityType, string> = {
  karkun: 'کارکن',
  muttafiq: 'متفق',
  rukn: 'رکن',
  campaign: 'مہم',
  assignment: 'تفویض',
  report: 'رپورٹ',
  module: 'ماڈیول',
  dashboard: 'ڈیش بورڈ',
  settings: 'ترتیبات',
  attendance: 'حاضری',
  weekly_ijtema: 'ہفتہ وار اجتماع',
}
