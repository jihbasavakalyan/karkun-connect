/**
 * KC-035D — Digital Rafeeq Dialogue Manager.
 *
 * Manages multi-turn dialogue: interruptions, context switches,
 * corrections, repair, resume / cancel / restart.
 * Orchestrates Conversation + Intent + Workflow — no business rules.
 *
 * @see docs/architecture/kc-035-digital-rafeeq-2.md
 * @see docs/architecture/kc-035d-arch009-gate.md
 */

export * from './models'
export { DIALOGUE_URDU } from './responses/dialogueUrduCopy'
export { isCorrectionUtterance } from './policies/correctionPatterns'
export {
  classifyDialogueMove,
  isOperationalIntent,
} from './policies/dialogueMoves'
export { DialogueManager, type DialogueTurnInput } from './manager/DialogueManager'
export {
  createDialogueEngine,
  getDialogueEngine,
  resetDialogueEngineForTests,
  type DialogueEngine,
} from './engine/createDialogueEngine'
