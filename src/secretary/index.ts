/**
 * KC-035G — Secretary Personality & Conversational Refinement.
 *
 * @see docs/architecture/kc-035-digital-rafeeq-2.md
 * @see docs/architecture/kc-035g-arch009-gate.md
 */

export {
  SECRETARY_ACK_VARIANTS,
  SECRETARY_TEMPLATES,
  nextAcknowledgement,
  resetSecretaryVariationForTests,
  composeSecretaryResponse,
  polishSavedLine,
  polishCompletedWithNext,
} from './personality/secretaryPersonality'
