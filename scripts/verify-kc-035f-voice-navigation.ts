/**
 * KC-035F — Voice Navigation verification (UI routing only).
 */
import { IntentCode } from '../src/intents'
import {
  intentToNavigationTarget,
  resolveVoiceNavigation,
  resetVoiceNavigationEngineForTests,
  getVoiceNavigationEngine,
} from '../src/navigation'

type CaseResult = { name: string; passed: boolean; detail: string }

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function run(name: string, fn: () => void): CaseResult {
  try {
    fn()
    return { name, passed: true, detail: 'ok' }
  } catch (error) {
    return {
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

function testTargets(): void {
  assert(intentToNavigationTarget(IntentCode.NAVIGATE_DASHBOARD) === 'dashboard', 'dash')
  assert(intentToNavigationTarget(IntentCode.NAVIGATE_WORKERS) === 'registry', 'workers')
  assert(intentToNavigationTarget(IntentCode.NAVIGATE_REPORTS) === 'reports', 'reports')
  assert(intentToNavigationTarget(IntentCode.NAVIGATE_SETTINGS) === 'settings', 'settings')
  assert(intentToNavigationTarget(IntentCode.NAVIGATE_ATTENDANCE) === 'attendance', 'att')
  assert(intentToNavigationTarget(IntentCode.NAVIGATE_PAYMENT) === 'baitul_maal', 'pay')
  assert(intentToNavigationTarget(IntentCode.NAVIGATE_HOME) === 'home', 'home')
  assert(intentToNavigationTarget(IntentCode.NAVIGATE_BACK) === 'back', 'back')
}

function testResolveAdmin(): void {
  resetVoiceNavigationEngineForTests()
  const dash = resolveVoiceNavigation({
    intent: IntentCode.NAVIGATE_DASHBOARD,
    role: 'administrator',
  })
  assert(dash.ok && dash.route === '/admin', `dash route=${dash.route}`)
  assert(dash.responseUrdu.includes('ڈیش') || dash.responseUrdu.includes('کھول'), 'dash urdu')

  const att = resolveVoiceNavigation({
    intent: IntentCode.NAVIGATE_ATTENDANCE,
    role: 'rukn',
  })
  assert(att.ok && att.route?.includes('weekly-ijtema'), `att=${att.route}`)

  const pay = resolveVoiceNavigation({
    intent: IntentCode.NAVIGATE_PAYMENT,
    role: 'administrator',
  })
  assert(pay.ok && pay.route?.includes('baitul'), `pay=${pay.route}`)

  const back = resolveVoiceNavigation({
    intent: IntentCode.NAVIGATE_BACK,
    role: 'rukn',
  })
  assert(back.action === 'back', 'back action')

  const home = getVoiceNavigationEngine().resolve({
    intent: IntentCode.NAVIGATE_HOME,
    role: 'rukn',
  })
  assert(home.action === 'home' && home.route === '/rukn', `home=${home.route}`)
}

function testNoWrite(): void {
  const a = resolveVoiceNavigation({
    intent: IntentCode.NAVIGATE_SETTINGS,
    role: 'administrator',
  })
  const b = resolveVoiceNavigation({
    intent: IntentCode.NAVIGATE_SETTINGS,
    role: 'administrator',
  })
  assert(a.route === b.route, 'stable routes')
}

const cases = [
  run('intent → target map', testTargets),
  run('resolve dashboard/attendance/payment/home/back', testResolveAdmin),
  run('navigation is read-only', testNoWrite),
]

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-035F',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
if (failed.length > 0) process.exit(1)
