/**
 * KC-035R1 — Full voice pipeline stage diagnostics (development + console).
 * Logging only for production; overlay consumes snapshot in DEV.
 */

export type PipelineStageName =
  | 'voice_input'
  | 'speech_to_text'
  | 'conversation_engine'
  | 'intent_engine'
  | 'workflow_engine'
  | 'execution'
  | 'secretary_response'
  | 'text_to_speech'

export type PipelineStageRecord = {
  stage: PipelineStageName
  input: unknown
  output: unknown
  success: boolean
  failure: string | null
  processingMs: number
}

export type PipelineDiagSnapshot = {
  transcript: string
  intent: string
  confidence: number | null
  confidenceBand: string | null
  workflow: string | null
  action: string | null
  executionResult: string | null
  secretaryReply: string
  ttsStatus: 'idle' | 'speaking' | 'done' | 'skipped' | 'failed' | 'interrupted'
  stages: PipelineStageRecord[]
  stoppedAt: PipelineStageName | null
  updatedAt: number
}

const emptySnapshot = (): PipelineDiagSnapshot => ({
  transcript: '',
  intent: '',
  confidence: null,
  confidenceBand: null,
  workflow: null,
  action: null,
  executionResult: null,
  secretaryReply: '',
  ttsStatus: 'idle',
  stages: [],
  stoppedAt: null,
  updatedAt: Date.now(),
})

let snapshot: PipelineDiagSnapshot = emptySnapshot()
const listeners = new Set<(s: PipelineDiagSnapshot) => void>()

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
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const t = pipelineEpochMs > 0 ? Math.round(now - pipelineEpochMs) : null
  console.info(`[rafeeq-voice-pipe +${t ?? '?'}ms] ${event}`, detail)
}

export function resetPipelineDiag(): void {
  snapshot = emptySnapshot()
  emitDiag()
}

export function getPipelineDiagSnapshot(): PipelineDiagSnapshot {
  return snapshot
}

export function subscribePipelineDiag(
  listener: (s: PipelineDiagSnapshot) => void,
): () => void {
  listeners.add(listener)
  listener(snapshot)
  return () => {
    listeners.delete(listener)
  }
}

function emitDiag(): void {
  for (const listener of listeners) listener(snapshot)
}

export function beginPipelineTurn(transcript: string): void {
  snapshot = {
    ...emptySnapshot(),
    transcript,
    updatedAt: Date.now(),
  }
  emitDiag()
  voicePipelineLog('turn:begin', { transcript })
}

export function recordPipelineStage(input: {
  stage: PipelineStageName
  stageInput: unknown
  stageOutput: unknown
  success: boolean
  failure?: string | null
  startedAt: number
}): void {
  const processingMs = Math.max(0, Date.now() - input.startedAt)
  const record: PipelineStageRecord = {
    stage: input.stage,
    input: input.stageInput,
    output: input.stageOutput,
    success: input.success,
    failure: input.failure ?? null,
    processingMs,
  }
  snapshot = {
    ...snapshot,
    stages: [...snapshot.stages, record],
    stoppedAt: input.success ? snapshot.stoppedAt : input.stage,
    updatedAt: Date.now(),
  }
  emitDiag()
  voicePipelineLog(`stage:${input.stage}`, {
    success: input.success,
    failure: record.failure,
    processingMs,
    input: input.stageInput,
    output: input.stageOutput,
  })
}

export function patchPipelineDiag(
  patch: Partial<PipelineDiagSnapshot>,
): void {
  snapshot = { ...snapshot, ...patch, updatedAt: Date.now() }
  emitDiag()
}
