/**
 * KC-035D — Compose dialogue engine.
 */

import type { WorkflowEngine } from '@/workflows'
import { DialogueManager } from '../manager/DialogueManager'

export type DialogueEngine = {
  readonly manager: DialogueManager
}

export function createDialogueEngine(options?: {
  workflows?: WorkflowEngine
}): DialogueEngine {
  return {
    manager: new DialogueManager(options?.workflows),
  }
}

let singleton: DialogueEngine | null = null

export function getDialogueEngine(): DialogueEngine {
  if (!singleton) singleton = createDialogueEngine()
  return singleton
}

export function resetDialogueEngineForTests(): void {
  singleton = null
}
