/**
 * KC-007 addendum — measure Ijtema effect stability (before vs after pattern).
 */
import { createElement, useEffect, useMemo, useState, act } from 'react'
import { createRoot } from 'react-dom/client'
import { Window } from 'happy-dom'
import { getAssignedKarkunanForRukn as realGetAssigned } from '../src/lib/assignmentEngine'

const happy = new Window({ url: 'http://localhost/rukn' })
Object.assign(globalThis, {
  window: happy,
  document: happy.document,
  HTMLElement: happy.HTMLElement,
  Node: happy.Node,
  Text: happy.Text,
  MutationObserver: happy.MutationObserver,
  requestAnimationFrame: (cb: FrameRequestCallback) =>
    setTimeout(() => cb(Date.now()), 0) as unknown as number,
  cancelAnimationFrame: (id: number) => clearTimeout(id),
  IS_REACT_ACT_ENVIRONMENT: true,
})

type Counters = {
  homeRenders: number
  panelRenders: number
  effectRuns: number
}

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

async function measure(
  label: string,
  Panel: (props: { ruknId: string; bump: number; counters: Counters }) => ReturnType<
    typeof createElement
  >,
  parentBumps = 5,
): Promise<Counters> {
  const counters: Counters = { homeRenders: 0, panelRenders: 0, effectRuns: 0 }
  const rootEl = happy.document.createElement('div')
  happy.document.body.appendChild(rootEl)
  const root = createRoot(rootEl)

  function Home({ bump }: { bump: number }) {
    counters.homeRenders += 1
    return createElement(Panel, { ruknId: 'R001', bump, counters })
  }

  for (let bump = 0; bump <= parentBumps; bump += 1) {
    await act(async () => {
      root.render(createElement(Home, { bump }))
    })
    await flush()
  }

  root.unmount()
  rootEl.remove()
  console.log(`[${label}]`, { ...counters })
  return counters
}

/** Broken pattern: new array every render as effect dep (capped to avoid hang). */
function BrokenPanel({
  ruknId,
  counters,
}: {
  ruknId: string
  bump: number
  counters: Counters
}) {
  counters.panelRenders += 1
  const [, setDraft] = useState<Record<string, string>>({})
  const connected = realGetAssigned(ruknId)

  useEffect(() => {
    counters.effectRuns += 1
    if (counters.effectRuns > 40) return
    const next: Record<string, string> = {}
    for (const k of connected) next[k.id] = 'Not recorded'
    setDraft(next)
  }, [connected, counters])

  return createElement('div', null, `broken-${connected.length}`)
}

/** Fixed pattern: memoize on assignmentVersion */
function FixedPanel({
  ruknId,
  bump,
  counters,
}: {
  ruknId: string
  bump: number
  counters: Counters
}) {
  counters.panelRenders += 1
  const assignmentVersion = 0
  const [, setDraft] = useState<Record<string, string>>({})
  const connected = useMemo(() => realGetAssigned(ruknId), [ruknId, assignmentVersion])

  useEffect(() => {
    counters.effectRuns += 1
    const next: Record<string, string> = {}
    for (const k of connected) next[k.id] = 'Not recorded'
    setDraft(next)
  }, [connected, counters])

  void bump
  return createElement('div', null, `fixed-${connected.length}`)
}

const before = await measure('BEFORE (unstable connected)', BrokenPanel, 5)
const after = await measure('AFTER (useMemo + assignmentVersion)', FixedPanel, 5)

const ok = after.effectRuns <= 2 && before.effectRuns >= 10

if (!ok) {
  console.error('Measurement failed acceptance', { before, after })
  process.exit(1)
}

console.log('[PASS] Effect stabilized: runs only when assignment identity changes')
console.log(
  ` before effects=${before.effectRuns} panel=${before.panelRenders} home=${before.homeRenders}`,
)
console.log(
  ` after  effects=${after.effectRuns} panel=${after.panelRenders} home=${after.homeRenders}`,
)
