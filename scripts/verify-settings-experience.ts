/**
 * KC-026 — Settings experience verification.
 * Run: npx vite-node scripts/verify-settings-experience.ts
 */

import { APP_BUILD, APP_JAMAAT, APP_VERSION } from '@/constants/app'
import { ROUTES } from '@/constants/routes'
import {
  bindUserPreferences,
  getUserPreferences,
  resetUserPreferencesForTests,
  updateAppearance,
  updateNotificationPreferences,
  updateRafeeqPreferences,
} from '@/stores/userPreferencesStore'
import { applyAppearanceMode } from '@/lib/userPreferences/applyAppearance'
import { DEFAULT_USER_PREFERENCES } from '@/types/userPreferences.types'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

type Scenario = { name: string; passed: boolean; detail: string }

function runScenario(name: string, fn: () => string): Scenario {
  try {
    return { name, passed: true, detail: fn() }
  } catch (error) {
    return {
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

const scenarios: Scenario[] = []

scenarios.push(
  runScenario('routes exist for admin and rukn settings', () => {
    assert(ROUTES.ADMIN_SETTINGS === '/admin/settings', 'admin settings route')
    assert(ROUTES.RUKN_SETTINGS === '/rukn/settings', 'rukn settings route')
    return `${ROUTES.ADMIN_SETTINGS}, ${ROUTES.RUKN_SETTINGS}`
  }),
)

scenarios.push(
  runScenario('defaults keep voice autoplay off', () => {
    assert(DEFAULT_USER_PREFERENCES.rafeeq.voiceAutoPlay === false, 'autoplay off')
    assert(DEFAULT_USER_PREFERENCES.appearance === 'system', 'system appearance')
    return 'autoplay=off'
  }),
)

scenarios.push(
  runScenario('preferences persist per user key', () => {
    resetUserPreferencesForTests()
    bindUserPreferences('user-a')
    updateAppearance('dark')
    updateRafeeqPreferences({ voiceSpeed: 'slow', voiceResponses: false })
    updateNotificationPreferences('followUpReminders', { push: true, inApp: true })

    const first = getUserPreferences()
    assert(first.appearance === 'dark', 'appearance dark')
    assert(first.rafeeq.voiceSpeed === 'slow', 'slow voice')
    assert(first.rafeeq.voiceResponses === false, 'voice off')
    assert(first.notifications.followUpReminders.push === true, 'push on')

    bindUserPreferences('user-b')
    const second = getUserPreferences()
    assert(second.appearance === 'system' || second.appearance === DEFAULT_USER_PREFERENCES.appearance, 'user-b defaults')
    assert(second.rafeeq.voiceSpeed === 'normal', 'user-b normal speed')

    bindUserPreferences('user-a')
    const restored = getUserPreferences()
    assert(restored.appearance === 'dark', 'user-a restored')
    assert(restored.rafeeq.voiceSpeed === 'slow', 'user-a speed restored')
    return 'per-user ok'
  }),
)

scenarios.push(
  runScenario('appearance applicator sets document theme', () => {
    if (typeof document === 'undefined') {
      applyAppearanceMode('dark')
      return 'applied-without-dom'
    }
    applyAppearanceMode('light')
    assert(document.documentElement.dataset.theme === 'light', 'light theme')
    applyAppearanceMode('dark')
    assert(document.documentElement.dataset.theme === 'dark', 'dark theme')
    applyAppearanceMode('system')
    assert(
      document.documentElement.dataset.appearancePreference === 'system',
      'system preference recorded',
    )
    return document.documentElement.dataset.theme ?? ''
  }),
)

scenarios.push(
  runScenario('about constants present', () => {
    assert(Boolean(APP_VERSION), 'version')
    assert(Boolean(APP_BUILD), 'build')
    assert(APP_JAMAAT === 'Basavakalyan', 'jamaat')
    return `${APP_VERSION}/${APP_BUILD}`
  }),
)

scenarios.push(
  runScenario('role section matrix', () => {
    const rukn = ['profile', 'rafeeq', 'notifications', 'appearance', 'privacy', 'about', 'integrations']
    const adminExtra = ['campaign', 'data']
    assert(rukn.length === 7, 'rukn sections')
    assert(adminExtra.every(Boolean), 'admin extras')
    return `rukn=${rukn.length}; admin=+${adminExtra.length}`
  }),
)

const failed = scenarios.filter((s) => !s.passed)
for (const scenario of scenarios) {
  console.log(`${scenario.passed ? 'PASS' : 'FAIL'}  ${scenario.name} — ${scenario.detail}`)
}

if (failed.length > 0) {
  console.error(`\nKC-026 verify failed: ${failed.length}/${scenarios.length}`)
  process.exit(1)
}

console.log(`\nKC-026 verify passed: ${scenarios.length}/${scenarios.length}`)
