/**
 * KC-035C — Workflow identifiers.
 */

export const WorkflowId = {
  SHOW_PERSON_DETAILS: 'SHOW_PERSON_DETAILS',
  RECORD_VISIT: 'RECORD_VISIT',
  RECORD_APP_REGISTRATION: 'RECORD_APP_REGISTRATION',
  RECORD_WEEKLY_IJTEMA: 'RECORD_WEEKLY_IJTEMA',
  RECORD_BAITUL_MAAL: 'RECORD_BAITUL_MAAL',
} as const

export type WorkflowId = (typeof WorkflowId)[keyof typeof WorkflowId]
