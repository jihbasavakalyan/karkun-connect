/**
 * KC-0077.2.1 — Compose editable subject + body for preview/send.
 * Presentation helper only; does not change mail-merge or delivery engines.
 */
export function combineSubjectAndBody(subject: string, body: string): string {
  const trimmedSubject = subject.trim()
  if (!trimmedSubject) return body
  const trimmedBody = body.trim()
  if (!trimmedBody) return trimmedSubject
  return `${trimmedSubject}\n\n${body}`
}
