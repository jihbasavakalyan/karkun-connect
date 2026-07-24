#!/usr/bin/env node
/**
 * KC-0101.1 — Production bootstrap timing capture (read-only observation).
 *
 * Measures:
 * 1) Production Firestore critical/background read wall-clock (Admin SDK)
 * 2) Browser bootstrap lifecycle via Playwright + custom-token Admin login
 *    against Vite (same Firebase project as production) so DEV timing marks
 *    and window.__KC027G_LIFECYCLE__ are available.
 *
 * Does not modify production data or implement dashboard fixes.
 *
 * Usage:
 *   npx playwright install chromium   # once
 *   # terminal A: npm run dev
 *   node --env-file=.env.local scripts/admin/kc0101-1-capture-bootstrap-timing.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT_DIR = resolve(ROOT, 'production-data/exports')
const BASE_URL = process.env.KC0101_1_BASE_URL ?? 'http://127.0.0.1:5173'
const PROD_URL = process.env.KC0101_1_PROD_URL ?? 'https://karkun-connect.vercel.app'
const API_KEY = process.env.VITE_FIREBASE_API_KEY
const ADMIN_UID = process.env.KC0101_1_ADMIN_UID ?? 'VQkrDSDGoQUptRlyghtlFxmcJN03'
const RUKN_UID = process.env.KC0101_1_RUKN_UID ?? 'IUP8qiPLPVYJ5rAFAiDhwhpKeLC2' // R026

function nowIso() {
  return new Date().toISOString()
}

async function timeAsync(label, fn) {
  const t0 = performance.now()
  try {
    const result = await fn()
    return {
      label,
      ok: true,
      durationMs: Math.round(performance.now() - t0),
      detail: result && typeof result === 'object' ? result : undefined,
    }
  } catch (error) {
    return {
      label,
      ok: false,
      durationMs: Math.round(performance.now() - t0),
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function measureFirestoreHydrateQueries(db) {
  const results = []

  results.push(
    await timeAsync('critical.campaigns', async () => {
      const snap = await db.collection('campaigns').get()
      return { docs: snap.size }
    }),
  )
  results.push(
    await timeAsync('critical.rukns', async () => {
      const snap = await db.collection('rukns').get()
      return { docs: snap.size }
    }),
  )
  results.push(
    await timeAsync('critical.karkuns', async () => {
      const snap = await db.collection('karkuns').get()
      return { docs: snap.size }
    }),
  )
  results.push(
    await timeAsync('critical.settings.karkunCounter', async () => {
      const snap = await db.collection('settings').doc('karkunCounter').get()
      return { exists: snap.exists }
    }),
  )
  results.push(
    await timeAsync('critical.connections', async () => {
      const snap = await db.collection('connections').get()
      return { docs: snap.size }
    }),
  )
  results.push(
    await timeAsync('critical.settings.connectionMeta', async () => {
      const snap = await db.collection('settings').doc('connectionMeta').get()
      return { exists: snap.exists }
    }),
  )

  // Parallel critical (as app does)
  const parallelCritical = await timeAsync('critical.Promise.all(6)', async () => {
    const [campaigns, rukns, karkuns, counter, connections, meta] = await Promise.all([
      db.collection('campaigns').get(),
      db.collection('rukns').get(),
      db.collection('karkuns').get(),
      db.collection('settings').doc('karkunCounter').get(),
      db.collection('connections').get(),
      db.collection('settings').doc('connectionMeta').get(),
    ])
    return {
      campaigns: campaigns.size,
      rukns: rukns.size,
      karkuns: karkuns.size,
      connections: connections.size,
      counter: counter.exists,
      meta: meta.exists,
    }
  })
  results.push(parallelCritical)

  // Background-ish
  results.push(
    await timeAsync('background.activityLogs', async () => {
      const snap = await db.collection('activityLogs').limit(500).get()
      return { docs: snap.size }
    }),
  )
  results.push(
    await timeAsync('background.executions', async () => {
      const snap = await db.collection('executions').get()
      return { docs: snap.size }
    }),
  )
  results.push(
    await timeAsync('background.followUps', async () => {
      const snap = await db.collection('followUps').get()
      return { docs: snap.size }
    }),
  )
  results.push(
    await timeAsync('background.compliance', async () => {
      const snap = await db.collection('compliance').get()
      return { docs: snap.size }
    }),
  )
  results.push(
    await timeAsync('background.settings.collection', async () => {
      const snap = await db.collection('settings').get()
      return { docs: snap.size }
    }),
  )
  results.push(
    await timeAsync('extra.settings.karkunRequests', async () => {
      const snap = await db.collection('settings').doc('karkunRequests').get()
      return { exists: snap.exists }
    }),
  )

  const parallelBackground = await timeAsync('background.Promise.all(approx)', async () => {
    const [activity, executions, followUps, compliance, settings] = await Promise.all([
      db.collection('activityLogs').limit(500).get(),
      db.collection('executions').get(),
      db.collection('followUps').get(),
      db.collection('compliance').get(),
      db.collection('settings').get(),
    ])
    return {
      activity: activity.size,
      executions: executions.size,
      followUps: followUps.size,
      compliance: compliance.size,
      settings: settings.size,
    }
  })
  results.push(parallelBackground)

  return results
}

async function exchangeCustomToken(customToken) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  )
  const body = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(body))
  return body
}

async function captureBrowserBootstrap({ baseUrl, customToken, roleLabel }) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  const firestoreRequests = []
  const consoleTiming = []

  page.on('console', (msg) => {
    const text = msg.text()
    if (text.includes('[KC-027A][timing]') || text.includes('[KC-027G]')) {
      consoleTiming.push({ type: msg.type(), text, at: nowIso() })
    }
  })

  page.on('requestfinished', async (req) => {
    const url = req.url()
    if (!/firestore\.googleapis\.com|firebaselogging/i.test(url)) return
    const timing = req.timing()
    firestoreRequests.push({
      url: url.slice(0, 180),
      method: req.method(),
      resourceType: req.resourceType(),
      timing,
    })
  })

  const navStart = Date.now()
  await page.goto(baseUrl + '/login', { waitUntil: 'networkidle', timeout: 120_000 })

  // Sign in via page Firebase Auth using Vite prebundles (bare specifiers fail in evaluate).
  await page.evaluate(async (token) => {
    const authMod = await import('/src/lib/firebase/firebase.ts')
    const authBundle = await import('/node_modules/.vite/deps/firebase_auth.js')
    const auth = authMod.getFirebaseAuth()
    await authBundle.signInWithCustomToken(auth, token)
  }, customToken)

  const homePath = roleLabel === 'rukn' ? '/rukn' : '/admin'
  await page.goto(baseUrl + homePath, { waitUntil: 'domcontentloaded', timeout: 120_000 })

  // Wait until lifecycle shows dashboard gate or timeout
  await page.waitForFunction(
    () => {
      const life = window.__KC027G_LIFECYCLE__
      if (!Array.isArray(life) || life.length === 0) return false
      return life.some(
        (e) =>
          e.label === 'dashboard.rendered' ||
          e.label === 'ProtectedRoute.canRender' ||
          e.label === 'dashboard.firstInteractive' ||
          e.label === 'criticalHydrate.complete' ||
          e.label === 'stores.hydrate.complete' ||
          e.label === 'backgroundHydrate.complete',
      )
    },
    { timeout: 90_000 },
  ).catch(() => null)

  // Extra settle for background hydrate + snapshot rebuilds
  await page.waitForTimeout(6000)

  const captured = await page.evaluate(async () => {
    let timingMarks = []
    try {
      const diag = await import('/src/lib/startupDiagnostics.ts')
      timingMarks = diag.getStartupTimingMarks()
    } catch {
      timingMarks = []
    }
    const life = window.__KC027G_LIFECYCLE__ ?? []
    const resources = performance.getEntriesByType('resource').map((r) => ({
      name: String(r.name).slice(0, 200),
      duration: Math.round(r.duration),
      transferSize: r.transferSize,
      initiatorType: r.initiatorType,
    }))
    const firestoreResources = resources.filter((r) =>
      /firestore\.googleapis\.com/i.test(r.name),
    )
    const paint = performance.getEntriesByType('paint').map((p) => ({
      name: p.name,
      startTime: Math.round(p.startTime),
    }))
    const nav = performance.getEntriesByType('navigation')[0]
    const builds = life.filter((e) => String(e.label).includes('commandCenter.snapshot.build')).length
    const cacheHits = life.filter((e) => String(e.label).includes('commandCenter.snapshot.cache_hit')).length
    return {
      lifecycle: life,
      timingMarks,
      commandCenterBuilds: builds,
      commandCenterCacheHits: cacheHits,
      paint,
      navigation: nav
        ? {
            domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
            loadEventEnd: Math.round(nav.loadEventEnd),
            responseEnd: Math.round(nav.responseEnd),
            duration: Math.round(nav.duration),
          }
        : null,
      firestoreResourceCount: firestoreResources.length,
      firestoreResources: firestoreResources.slice(0, 80),
      hydrationAttr: document.querySelector('[data-hydration]')?.getAttribute('data-hydration') ?? null,
      ariaBusy: document.querySelector('[aria-busy]')?.getAttribute('aria-busy') ?? null,
      bodyTextSample: (document.body?.innerText ?? '').slice(0, 400),
      path: window.location.pathname,
    }
  })

  const totalMs = Date.now() - navStart
  await browser.close()

  return {
    roleLabel,
    baseUrl,
    totalWallClockMs: totalMs,
    consoleTiming,
    firestoreRequestsObserved: firestoreRequests.length,
    firestoreRequestTimings: firestoreRequests.slice(0, 60),
    ...captured,
  }
}

function deriveStageTable(lifecycle) {
  if (!Array.isArray(lifecycle) || lifecycle.length === 0) return []
  const interesting = [
    'auth.authStateReady',
    'auth.ready',
    'auth.token.refreshed',
    'auth.claims.available',
    'auth.token.ready',
    'repository.initialized',
    'firestore.first_critical_read.start',
    'firestore.first_critical_read.complete',
    'criticalHydrate.complete',
    'stores.rebuild.after_critical_success',
    'firestore.hydrate.complete',
    'backgroundHydrate.complete',
    'ProtectedRoute.shellVisible',
    'ProtectedRoute.canRender',
    'dashboard.firstInteractive',
    'dashboard.rendered',
    'commandCenter.snapshot.build',
    'commandCenter.snapshot.cache_hit',
  ]
  return lifecycle
    .filter((e) => interesting.some((k) => e.label.includes(k) || e.label === k))
    .map((e) => ({
      tMs: e.t,
      deltaMs: e.deltaMs,
      label: e.label,
      detail: e.detail ?? null,
    }))
}

function findLife(life, label) {
  return (life ?? []).find((e) => e.label === label)
}

function stageGaps(life) {
  const claims = findLife(life, 'auth.claims.available')
  const authReady = findLife(life, 'auth.authStateReady')
  const repoInit = findLife(life, 'repository.initialized')
  const firstCriticalStart = findLife(life, 'firestore.first_critical_read.start')
  const firstCriticalComplete = findLife(life, 'firestore.first_critical_read.complete')
  const criticalComplete = findLife(life, 'criticalHydrate.complete')
  const backgroundComplete = findLife(life, 'backgroundHydrate.complete')
  const dashboardRendered = findLife(life, 'dashboard.rendered')
  const canRender = findLife(life, 'ProtectedRoute.canRender')
  return {
    authRestoreToClaimsMs:
      authReady && claims ? claims.t - authReady.t : null,
    claimsToFirstCriticalStartMs:
      claims && firstCriticalStart ? firstCriticalStart.t - claims.t : null,
    firstCriticalDurationMs:
      firstCriticalStart && firstCriticalComplete
        ? firstCriticalComplete.t - firstCriticalStart.t
        : null,
    claimsToCriticalCompleteMs:
      claims && criticalComplete ? criticalComplete.t - claims.t : null,
    criticalToBackgroundCompleteMs:
      criticalComplete && backgroundComplete
        ? backgroundComplete.t - criticalComplete.t
        : null,
    criticalToDashboardMs:
      criticalComplete && dashboardRendered
        ? dashboardRendered.t - criticalComplete.t
        : null,
    repoInitAtMs: repoInit?.t ?? null,
    canRenderAtMs: canRender?.t ?? null,
    dashboardRenderedAtMs: dashboardRendered?.t ?? null,
    backgroundCompleteAtMs: backgroundComplete?.t ?? null,
  }
}

function correlate(firestoreQueryTimings, browserCapture, thresholds) {
  const parallelCritical = firestoreQueryTimings.find((r) => r.label.startsWith('critical.Promise.all'))
  const parallelBackground = firestoreQueryTimings.find((r) => r.label.startsWith('background.Promise.all'))
  const settingsCollection = firestoreQueryTimings.find((r) => r.label === 'background.settings.collection')
  const karkunRequests = firestoreQueryTimings.find((r) => r.label === 'extra.settings.karkunRequests')
  const sequentialCritical = firestoreQueryTimings.filter(
    (r) => r.label.startsWith('critical.') && !r.label.includes('Promise.all'),
  )
  const sumSequential = sequentialCritical.reduce((s, r) => s + (r.durationMs || 0), 0)
  const maxSequential = Math.max(...sequentialCritical.map((r) => r.durationMs || 0), 0)

  const life = browserCapture?.lifecycle ?? []
  const builds =
    browserCapture?.commandCenterBuilds ??
    life.filter((e) => String(e.label).includes('commandCenter.snapshot.build')).length
  const cacheHits =
    browserCapture?.commandCenterCacheHits ??
    life.filter((e) => String(e.label).includes('commandCenter.snapshot.cache_hit')).length
  const gaps = stageGaps(life)
  const firestoreDupHint =
    (browserCapture?.firestoreResourceCount ?? 0) > 13 ||
    (browserCapture?.firestoreRequestsObserved ?? 0) > 20

  const exceeded = []
  if ((parallelCritical?.durationMs ?? 0) >= thresholds.criticalParallelWarn) {
    exceeded.push({
      stage: 'critical.Promise.all',
      durationMs: parallelCritical.durationMs,
      threshold: thresholds.criticalParallelWarn,
      severity: parallelCritical.durationMs >= thresholds.criticalParallelFail ? 'fail' : 'warn',
    })
  }
  if ((parallelBackground?.durationMs ?? 0) >= thresholds.backgroundParallelWarn) {
    exceeded.push({
      stage: 'background.Promise.all',
      durationMs: parallelBackground.durationMs,
      threshold: thresholds.backgroundParallelWarn,
      severity: 'warn',
    })
  }
  if ((gaps.dashboardRenderedAtMs ?? 0) >= thresholds.dashboardInteractiveWarn) {
    exceeded.push({
      stage: 'dashboard.rendered',
      durationMs: gaps.dashboardRenderedAtMs,
      threshold: thresholds.dashboardInteractiveWarn,
      severity:
        gaps.dashboardRenderedAtMs >= thresholds.dashboardInteractiveFail ? 'fail' : 'warn',
    })
  }

  return {
    settingsReRead: {
      confirmed: Boolean(settingsCollection?.ok),
      evidence: settingsCollection,
      note: 'Background path re-reads settings collection after critical already read two settings docs',
    },
    pendingQueueExtraGetDoc: {
      confirmed: Boolean(karkunRequests?.ok),
      evidence: karkunRequests,
      note: 'settings/karkunRequests exists and is an extra getDoc cost on Admin Pending queue mount',
    },
    duplicateInMemoryAggregation: {
      confirmed: builds > 1,
      commandCenterBuilds: builds,
      cacheHits,
      note: 'Multiple commandCenter.snapshot.build events indicate rebuild thrash / duplicate aggregation work',
    },
    missingWidgetIsolation: {
      confirmedByCode: true,
      confirmedByRuntime: Boolean(
        browserCapture?.bodyTextSample?.includes('Unable to load') ||
          browserCapture?.hydrationAttr === 'failed',
      ),
      ruknFullPageGateLikely: browserCapture?.roleLabel === 'rukn',
      note: 'Runtime cannot prove ErrorBoundary absence; code evidence from KC-0101 stands.',
    },
    repositoryInitBottleneck: {
      confirmed: Boolean(parallelCritical?.ok) && maxSequential >= 400,
      slowestCriticalSequential: [...sequentialCritical]
        .sort((a, b) => b.durationMs - a.durationMs)
        .slice(0, 3),
      parallelCriticalMs: parallelCritical?.durationMs ?? null,
      sumSequentialCriticalMs: sumSequential,
      maxSequentialCriticalMs: maxSequential,
      parallelizationEfficiency:
        maxSequential > 0 ? Number((maxSequential / (parallelCritical?.durationMs || 1)).toFixed(2)) : null,
      note: 'If parallelCritical ≈ max(individual), parallelization works; bottleneck is largest collection',
    },
    bootstrapSerialization: {
      ...gaps,
      sequentialByDesign: ['auth.authStateReady', 'auth.claims.available', 'criticalHydrate'],
      parallelByDesign: ['critical.6reads', 'background.softReads'],
      note: 'Claims must precede critical reads (serial by design). Critical unlocks metricsReady; background completes later.',
    },
    duplicateFirestoreRequests: {
      suspected: firestoreDupHint,
      firestoreResourceCount: browserCapture?.firestoreResourceCount ?? null,
      firestoreRequestsObserved: browserCapture?.firestoreRequestsObserved ?? null,
      note: 'Client channel multiplexing can under/over-count HTTP resources; use lifecycle hydrate cycles + settings re-read as primary duplicate evidence',
    },
    stagesExceedingThresholds: exceeded,
  }
}

async function main() {
  if (!API_KEY) throw new Error('VITE_FIREBASE_API_KEY required')

  mkdirSync(OUT_DIR, { recursive: true })
  const { auth, db, projectId } = initFirebaseAdmin()

  console.error('[KC-0101.1] measuring Firestore hydrate queries…')
  const firestoreQueryTimings = await measureFirestoreHydrateQueries(db)

  console.error('[KC-0101.1] minting Admin custom token…')
  const adminCustom = await auth.createCustomToken(ADMIN_UID, { role: 'administrator' })
  // Prefer custom token directly in page signInWithCustomToken

  let adminBrowser = null
  let ruknBrowser = null
  let browserError = null
  try {
    console.error('[KC-0101.1] capturing Admin browser bootstrap at', BASE_URL)
    adminBrowser = await captureBrowserBootstrap({
      baseUrl: BASE_URL,
      customToken: adminCustom,
      roleLabel: 'administrator',
    })
  } catch (error) {
    browserError = error instanceof Error ? error.message : String(error)
    console.error('[KC-0101.1] Admin browser capture failed:', browserError)
  }

  try {
    console.error('[KC-0101.1] capturing Rukn browser bootstrap…')
    const ruknCustom = await auth.createCustomToken(RUKN_UID)
    ruknBrowser = await captureBrowserBootstrap({
      baseUrl: BASE_URL,
      customToken: ruknCustom,
      roleLabel: 'rukn',
    })
  } catch (error) {
    console.error(
      '[KC-0101.1] Rukn browser capture failed:',
      error instanceof Error ? error.message : String(error),
    )
  }

  const thresholdsMs = {
    criticalParallelWarn: 1500,
    criticalParallelFail: 4000,
    backgroundParallelWarn: 2000,
    dashboardInteractiveWarn: 5000,
    dashboardInteractiveFail: 10000,
  }
  const correlation = correlate(firestoreQueryTimings, adminBrowser, thresholdsMs)
  const ruknCorrelation = ruknBrowser
    ? correlate(firestoreQueryTimings, ruknBrowser, thresholdsMs)
    : null

  const report = {
    ticket: 'KC-0101.1',
    generatedAt: nowIso(),
    projectId,
    expectedProject: 'karkun-connect-75c68',
    baseUrl: BASE_URL,
    prodUrlReference: PROD_URL,
    note:
      'Browser capture uses Vite + production Firebase project (same data plane as production). CDN asset timing differs; Firestore/Auth/lifecycle timings are production-project authentic.',
    thresholdsMs,
    firestoreQueryTimings,
    adminBrowser: adminBrowser
      ? {
          ...adminBrowser,
          stageTable: deriveStageTable(adminBrowser.lifecycle),
          stageGaps: stageGaps(adminBrowser.lifecycle),
        }
      : { error: browserError },
    ruknBrowser: ruknBrowser
      ? {
          ...ruknBrowser,
          stageTable: deriveStageTable(ruknBrowser.lifecycle),
          stageGaps: stageGaps(ruknBrowser.lifecycle),
        }
      : null,
    correlation,
    ruknCorrelation,
  }

  const stamp = nowIso().replace(/[:.]/g, '-')
  const outPath = resolve(OUT_DIR, `kc0101-1-bootstrap-timing-${stamp}.json`)
  writeFileSync(outPath, JSON.stringify(report, null, 2))
  writeFileSync(resolve(OUT_DIR, 'kc0101-1-bootstrap-timing-latest.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ outPath, correlation, parallelCritical: firestoreQueryTimings.find(r => r.label.startsWith('critical.Promise.all')), adminStages: report.adminBrowser?.stageTable?.slice?.(0, 20) ?? report.adminBrowser }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
