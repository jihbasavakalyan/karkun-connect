/**
 * KC-035D — Dialogue secretary Urdu (extends KC-035A tone).
 */

import { SECRETARY_URDU } from '@/conversation/engine'

export const DIALOGUE_URDU = {
  acknowledge: SECRETARY_URDU.acknowledge,
  cancelled: SECRETARY_URDU.cancelled,
  clarified: SECRETARY_URDU.clarified,
  waiting: SECRETARY_URDU.waiting,
  completed: SECRETARY_URDU.completed,
  help: 'میں آپ کی مہم کی کارروائیوں میں مدد کے لیے حاضر ہوں — حکم دیجئیے۔',
  nothingToRepeat: 'ابھی دہرانے کے لیے کوئی بات محفوظ نہیں۔',
  switchedPerson: (name: string) => `جی، اب ${name} پر توجہ ہے۔`,
  interrupted: 'جی، پچھلی کارروائی روک کر نیا حکم لے رہا ہوں۔',
  corrected: 'ٹھیک ہے — درست کر لیا۔ کس کی بات کر رہے ہیں؟',
  repaired: SECRETARY_URDU.clarified,
  unknown: 'معذرت، سمجھ نہیں آیا۔ ذرا اور وضاحت کر دیجئے۔',
  nextPrompt: 'اگلا حکم دیجئیے۔',
  resumed: 'جی، جہاں سے چھوڑا تھا وہیں سے جاری ہے۔',
  restarted: 'ٹھیک ہے، نئے سرے سے شروع کرتے ہیں۔',
} as const
