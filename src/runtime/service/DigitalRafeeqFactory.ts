/**
 * Digital Rafeeq Service factory (KC-005 Sprint 2.4).
 *
 * Purpose: Construct and optionally singleton-cache the public service façade.
 */

import {
  DigitalRafeeqService,
  type DigitalRafeeqServiceOptions,
} from './DigitalRafeeqService'

let singleton: DigitalRafeeqService | null = null

export function createDigitalRafeeqService(
  options: DigitalRafeeqServiceOptions = {},
): DigitalRafeeqService {
  return new DigitalRafeeqService(options)
}

/**
 * Application singleton entry point.
 * Prefer createDigitalRafeeqService() in tests for isolation.
 */
export function getDigitalRafeeqService(): DigitalRafeeqService {
  if (!singleton) {
    singleton = createDigitalRafeeqService()
  }
  return singleton
}

export function resetDigitalRafeeqServiceForTests(): void {
  singleton?.resetForTests()
  singleton = null
}
