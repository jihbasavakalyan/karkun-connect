/**
 * KC-035C — Workflow definitions (registry entries).
 */

import { IntentCode } from '@/intents'
import type { WorkflowDefinition } from '../models'
import { WorkflowId } from '../models'

export const SHOW_PERSON_DETAILS_DEF: WorkflowDefinition = {
  id: WorkflowId.SHOW_PERSON_DETAILS,
  triggerIntent: IntentCode.SHOW_PERSON_DETAILS,
  requiredEntities: ['person'],
  allowedRoles: ['administrator', 'rukn'],
  requiresConfirmationBelowExecuteBand: false,
  labelUrdu: 'کارکن کی تفصیلات',
}

export const RECORD_VISIT_DEF: WorkflowDefinition = {
  id: WorkflowId.RECORD_VISIT,
  triggerIntent: IntentCode.RECORD_VISIT,
  requiredEntities: ['person'],
  allowedRoles: ['administrator', 'rukn'],
  requiresConfirmationBelowExecuteBand: true,
  labelUrdu: 'ملاقات درج',
}

export const RECORD_APP_REGISTRATION_DEF: WorkflowDefinition = {
  id: WorkflowId.RECORD_APP_REGISTRATION,
  triggerIntent: IntentCode.RECORD_APP_REGISTRATION,
  requiredEntities: ['person'],
  allowedRoles: ['administrator', 'rukn'],
  requiresConfirmationBelowExecuteBand: true,
  labelUrdu: 'ایپ رجسٹریشن',
}

export const RECORD_WEEKLY_IJTEMA_DEF: WorkflowDefinition = {
  id: WorkflowId.RECORD_WEEKLY_IJTEMA,
  triggerIntent: IntentCode.RECORD_ATTENDANCE,
  requiredEntities: ['person'],
  allowedRoles: ['administrator', 'rukn'],
  requiresConfirmationBelowExecuteBand: true,
  labelUrdu: 'ہفتہ وار اجتماع',
}

export const RECORD_BAITUL_MAAL_DEF: WorkflowDefinition = {
  id: WorkflowId.RECORD_BAITUL_MAAL,
  triggerIntent: IntentCode.RECORD_BAITUL_MAAL,
  requiredEntities: ['person'],
  allowedRoles: ['administrator', 'rukn'],
  requiresConfirmationBelowExecuteBand: true,
  labelUrdu: 'بیت المال',
}

export const DEFAULT_WORKFLOW_DEFINITIONS: readonly WorkflowDefinition[] = [
  SHOW_PERSON_DETAILS_DEF,
  RECORD_VISIT_DEF,
  RECORD_APP_REGISTRATION_DEF,
  RECORD_WEEKLY_IJTEMA_DEF,
  RECORD_BAITUL_MAAL_DEF,
]
