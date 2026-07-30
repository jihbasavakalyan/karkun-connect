/**
 * KC-027 aggregate verify — secretary + voice + campaign-intel + reliability + search (dups).
 * Run: npm run verify:kc-027
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

type CaseResult = { name: string; passed: boolean; detail: string }

function assert(condition: boolean, message: string): asserts condition {
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

function runNpmScript(script: string): void {
  const result = spawnSync('npm', ['run', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: true,
    env: process.env,
  })
  if (result.status !== 0) {
    const tail = [result.stdout, result.stderr]
      .filter(Boolean)
      .join('\n')
      .split('\n')
      .slice(-20)
      .join('\n')
    throw new Error(`${script} failed (exit ${result.status})\n${tail}`)
  }
}

const cases: CaseResult[] = []

cases.push(
  run('ARCH-009 gate doc present', () => {
    assert(
      existsSync(resolve('docs/architecture/kc-027-arch009-gate.md')),
      'kc-027-arch009-gate.md',
    )
    const gate = readFileSync(
      resolve('docs/architecture/kc-027-arch009-gate.md'),
      'utf8',
    )
    assert(/Phase 0/.test(gate), 'Phase 0')
    assert(/Go \/ No-Go/.test(gate), 'Go/No-Go')
    assert(/docId == 'guidance'/.test(gate) || /guidance/.test(gate), 'guidance smoke')
  }),
)

cases.push(
  run('package script verify:kc-027 registered', () => {
    const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as {
      scripts: Record<string, string>
    }
    assert(typeof pkg.scripts['verify:kc-027'] === 'string', 'script')
  }),
)

cases.push(
  run('firestore.rules guidance exception', () => {
    const rules = readFileSync(resolve('firestore.rules'), 'utf8')
    assert(rules.includes("docId == 'guidance'"), 'guidance exception in repo rules')
  }),
)

cases.push(
  run('npm run verify:rafeeq-secretary', () => {
    runNpmScript('verify:rafeeq-secretary')
  }),
)

cases.push(
  run('npm run verify:rafeeq-voice', () => {
    runNpmScript('verify:rafeeq-voice')
  }),
)

cases.push(
  run('npm run verify:rafeeq-campaign-intelligence', () => {
    runNpmScript('verify:rafeeq-campaign-intelligence')
  }),
)

cases.push(
  run('npm run verify:reliability', () => {
    runNpmScript('verify:reliability')
  }),
)

cases.push(
  run('npm run verify:rafeeq-search (soft-removed + same-mobile)', () => {
    runNpmScript('verify:rafeeq-search')
  }),
)

const failed = cases.filter((c) => !c.passed)
for (const c of cases) {
  console.log(`${c.passed ? '✓' : '✗'} ${c.name}${c.passed ? '' : ` — ${c.detail}`}`)
}
console.log(
  failed.length === 0
    ? `\nKC-027 verify: READY (${cases.length}/${cases.length})`
    : `\nKC-027 verify: NOT READY (${cases.length - failed.length}/${cases.length})`,
)
process.exit(failed.length === 0 ? 0 : 1)
