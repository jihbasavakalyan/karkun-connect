/**
 * KC-035C — Centralized workflow secretary Urdu (extends KC-035A tone).
 */

import { SECRETARY_URDU } from '@/conversation/engine'

export const WORKFLOW_URDU = {
  acknowledge: SECRETARY_URDU.acknowledge,
  saved: SECRETARY_URDU.saved,
  cancelled: SECRETARY_URDU.cancelled,
  completed: SECRETARY_URDU.completed,
  denied: 'معذرت، اس کارروائی کی اجازت نہیں۔',
  failed: 'معذرت، یہ کارروائی مکمل نہیں ہو سکی۔',
  askConfirm: 'اگر درست ہے تو تصدیق کر دیجئے۔',
  suggestPrefix: 'اب',
  suggestSuffix: 'کیا اسے بھی درج کر دوں؟',
  onlyRemaining: (label: string) => `اب صرف ${label} باقی ہے۔`,
  remainingNow: (label: string) => `اب ${label} باقی ہے۔`,
  allClear: 'الحمد للہ، اس کارکن کے اہم امور مکمل ہیں۔',
  personMissing: SECRETARY_URDU.noActivePerson,
  visitSaved: 'جی، ملاقات محفوظ کر دی گئی۔',
  appSaved: 'جی، ایپ رجسٹریشن محفوظ کر دی گئی۔',
  ijtemaSaved: 'جی، ہفتہ وار اجتماع کی حاضری محفوظ کر دی گئی۔',
  baitulSaved: 'جی، بیت المال محفوظ کر دیا گیا۔',
  situationHeader: (name: string) => `${name} کی موجودہ صورتحال یہ ہے۔`,
  doneLine: (label: string) => `${label} مکمل ہے۔`,
  pendingLine: (label: string) => `${label} باقی ہے۔`,
} as const
