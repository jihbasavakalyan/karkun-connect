/**
 * KC-020 — Digital Rafeeq presentation for automation Next Best Actions.
 *
 * Automation Engine generates structured recommendations.
 * Digital Rafeeq only converts them into natural Urdu — it does not invent actions.
 */

import type { NextBestAction, NextBestActionCode } from '../nextBestAction'

export type RafeeqNextBestActionPresentation = {
  actionCode: NextBestActionCode
  urdu: string
  priority: NextBestAction['priority']
  routeHint?: string
  suggestedDelayMinutes?: number
}

export const RAFEEQ_ACTION_URDU_BY_CODE: Record<string, string> = {
  SCHEDULE_MEETING: 'اب ملاقات کا وقت طے کرنا مناسب معلوم ہوتا ہے۔',
  CREATE_FOLLOW_UP: 'اس ملاقات کے بعد فالو اپ درج کرنا مفید ہوگا۔',
  RETRY_CONTACT: 'اس کارکن سے دوبارہ رابطے کا مناسب وقت معلوم ہوتا ہے۔',
  VERIFY_CONTACT: 'رابطے کی تفصیلات درست کرنے کی ضرورت محسوس ہوتی ہے۔',
  CONTINUE_DEVELOPMENT: 'کارکن کی ترقی کے اگلے قدم پر توجہ دینا مناسب ہے۔',
  RECORD_IJTEMA: 'اجتماعی شرکت کی تصدیق اور اگلا قدم طے کرنا مفید ہوگا۔',
  UPDATE_COMPLIANCE: 'ریکارڈ کی تازہ کاری مکمل کر کے اگلا قدم دیکھیں۔',
  CLOSE_LOOP: 'یہ مرحلہ مکمل ہوا؛ مہم کے مقصد کے مطابق اگلا کام طے کریں۔',
  REVIEW_OUTCOME: 'نتیجے کا جائزہ لے کر اگلا مناسب اقدام منتخب کریں۔',
  FOLLOW_UP_DUE: 'اس کارکن سے دوبارہ رابطے کا مناسب وقت معلوم ہوتا ہے۔',
  RECORD_PENDING_ACTIVITY: 'باقی کام مکمل کرنا اب مناسب قدم ہے۔',
  NO_EVALUATION_ACTION: 'اس مقصد کے لیے ابھی کوئی عملی قدم طے نہیں ہوا۔',
}

export function urduForRafeeqActionCode(code: string): string {
  return (
    RAFEEQ_ACTION_URDU_BY_CODE[code] ??
    'اگلا مناسب عملی قدم طے کرنا مفید معلوم ہوتا ہے۔'
  )
}

/**
 * Present a structured Next Best Action as Urdu guidance text.
 * Never invents a new action code — only localizes what automation produced.
 */
export function presentNextBestActionForRafeeq(
  action: NextBestAction,
): RafeeqNextBestActionPresentation {
  const urdu = urduForRafeeqActionCode(String(action.code))

  return {
    actionCode: action.code,
    urdu,
    priority: action.priority,
    routeHint: action.routeHint,
    suggestedDelayMinutes: action.suggestedDelayMinutes,
  }
}
