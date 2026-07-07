import type {
  BulkUpdateIjtemaAttendanceInput,
  IjtemaAttendanceStatus,
  UpdateIjtemaAttendanceInput,
} from '@/types/ijtemaAttendance'

export type IjtemaAttendanceValidationResult =
  | { valid: true }
  | { valid: false; error: string }

export function validateIjtemaAttendanceUpdate(
  input: UpdateIjtemaAttendanceInput,
): IjtemaAttendanceValidationResult {
  if (!input.status) {
    return { valid: false, error: 'Attendance status is required.' }
  }

  return { valid: true }
}

export function validateBulkIjtemaAttendanceUpdate(
  karkunIds: string[],
  status: IjtemaAttendanceStatus,
): IjtemaAttendanceValidationResult {
  if (karkunIds.length === 0) {
    return { valid: false, error: 'Select at least one Karkun.' }
  }

  if (!status) {
    return { valid: false, error: 'Attendance status is required.' }
  }

  return { valid: true }
}

export function validateBulkIjtemaAttendanceInput(
  input: BulkUpdateIjtemaAttendanceInput,
): IjtemaAttendanceValidationResult {
  return validateBulkIjtemaAttendanceUpdate(input.karkunIds, input.status)
}
