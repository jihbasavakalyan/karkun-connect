/**
 * Digital Rafeeq Conversation Domain Model — KC-0131.2 public API.
 *
 * Canonical shared vocabulary and structures for Intent Engine, Secretary Engine,
 * Voice Layer, Confirmation Layer, and future AI adapters.
 *
 * Extends KC-0131.1 foundation via mappers; does not change foundation behaviour.
 * Pure domain: no React, AI, voice I/O, Firestore, or repository access.
 *
 * @see docs/architecture/conversation-domain-model.md
 */

export * from './enums'
export * from './value-objects'
export * from './entities'
export * from './factories'
export * from './validators'
export * from './mappers'
