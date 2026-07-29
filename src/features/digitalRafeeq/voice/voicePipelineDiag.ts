/**
 * Diagnostic-only timestamps for Digital Rafeeq voice pipeline (iOS Safari investigations).
 * Logging only — never changes control flow.
 */

let pipelineEpochMs = 0

export function markVoicePipelineEpoch(label = 'epoch'): number {
  pipelineEpochMs = typeof performance !== 'undefined' ? performance.now() : Date.now()
  voicePipelineLog(label, {})
  return pipelineEpochMs
}

export function voicePipelineLog(
  event: string,
  detail: Record<string, unknown> = {},
): void {
  if (typeof console === 'undefined' || typeof console.info !== 'function') return
  const now =
    typeof performance !== 'undefined' ? performance.now() : Date.now()
  const t = pipelineEpochMs > 0 ? Math.round(now - pipelineEpochMs) : null
  console.info(`[rafeeq-voice-pipe +${t ?? '?'}ms] ${event}`, detail)
}
