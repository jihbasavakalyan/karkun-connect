/**
 * KC-035B — Natural Urdu Intent Recognition Engine.
 *
 * Understands utterances into typed intents + entities + confidence.
 * Independent of UI, STT, workflows, and repositories.
 * Reads KC-035A conversation context; never mutates it.
 *
 * @see docs/architecture/kc-035b-arch009-gate.md
 */

export * from './models'
export * from './confidence'
export * from './urdu'
export * from './registry'
export * from './matchers'
export * from './extractors'
export * from './engine'
