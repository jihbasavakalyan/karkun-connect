#!/usr/bin/env node
/**
 * KC-037C2G — Authenticated production smoke after canonical bind deploy.
 * Usage: node --env-file=.env.local scripts/admin/kc-037c2g-prod-smoke.mjs
 */
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const PROD = process.env.KC037C2G_PROD_URL ?? 'https://karkun-connect.vercel.app'
const ADMIN_UID = process.env.KC0102E_ADMIN_UID ?? 'VQkrDSDGoQUptRlyghtlFxmcJN03'
const CANONICAL = 'wij_msb2iz7w_5gvbtq'
const REPORT_DIR = resolve('production-data/exports')

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

async function signIn(page, token) {
  await page.goto(PROD + '/login', { waitUntil: 'domcontentloaded', timeout: 90_000 })
  return page.evaluate(
    async ({ config, token }) => {
      const appMod = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js')
      const authMod = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js')
      const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(config)
      const auth = authMod.getAuth(app)
      await authMod.setPersistence(auth, authMod.browserLocalPersistence)
      const cred = await authMod.signInWithCustomToken(auth, token)
      return { uid: cred.user.uid }
    },
    { config: firebaseConfig, token },
  )
}

async function visit(page, path, waitMs = 12_000) {
  await page.goto(PROD + path, { waitUntil: 'domcontentloaded', timeout: 90_000 })
  await page.waitForTimeout(waitMs)
  if (page.url().includes('/login')) {
    await page.waitForTimeout(4000)
    await page.goto(PROD + path, { waitUntil: 'domcontentloaded', timeout: 90_000 })
    await page.waitForTimeout(waitMs)
  }
  const text = await page.evaluate(() => document.body?.innerText ?? '')
  return {
    path: new URL(page.url()).pathname,
    onLogin: page.url().includes('/login'),
    textSample: text.slice(0, 2500),
    text,
  }
}

function extractIjtemaSignals(text) {
  const lower = text.toLowerCase()
  const has = (s) => lower.includes(s.toLowerCase())
  // Prefer labeled metrics near Weekly Ijtema / Connected
  const connectedMatches = [...text.matchAll(/Connected[^\d]{0,40}(\d{1,4})/gi)].map((m) =>
    Number(m[1]),
  )
  const presentMatches = [...text.matchAll(/Present[^\d]{0,40}(\d{1,4})/gi)].map((m) =>
    Number(m[1]),
  )
  const absentMatches = [...text.matchAll(/Absent[^\d]{0,40}(\d{1,4})/gi)].map((m) =>
    Number(m[1]),
  )
  return {
    hasWeeklyIjtema: has('Weekly Ijtema'),
    hasCampaignHealth: has('Campaign Health'),
    hasConnected: has('Connected'),
    hasPresent: has('Present'),
    mentionsCanonicalId: text.includes(CANONICAL),
    mentionsAug2: /2\s*Aug|Aug(?:ust)?\s*2|2026-08-02/i.test(text),
    connectedMatches,
    presentMatches,
    absentMatches,
    // Inflated Connected would show 800 if still summing 4 Opens
    suspiciousConnected800: connectedMatches.includes(800),
    healthyConnected200: connectedMatches.includes(200),
  }
}

async function main() {
  if (!firebaseConfig.apiKey) throw new Error('VITE_FIREBASE_API_KEY required')
  const { auth } = initFirebaseAdmin()
  const customToken = await auth.createCustomToken(ADMIN_UID)

  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(String(err)))

  const signInResult = await signIn(page, customToken)

  const pages = {}
  for (const [key, path] of [
    ['adminDashboard', '/admin'],
    ['weeklyIjtemaManagement', '/admin/weekly-ijtema'],
    ['weeklyIjtemaReport', `/admin/weekly-ijtema/${CANONICAL}/report`],
    ['reportCenter', '/admin/reports'],
    ['ruknDashboard', '/rukn'],
  ]) {
    const visited = await visit(page, path, key === 'adminDashboard' ? 14_000 : 10_000)
    pages[key] = {
      path: visited.path,
      onLogin: visited.onLogin,
      signals: extractIjtemaSignals(visited.text),
      sample: visited.textSample,
    }
  }

  await browser.close()

  const reportChecks = pages.weeklyIjtemaReport.signals
  const management = pages.weeklyIjtemaManagement.signals
  const admin = pages.adminDashboard.signals

  const failures = []
  if (pages.adminDashboard.onLogin) failures.push('adminDashboard still on login')
  if (pages.weeklyIjtemaManagement.onLogin) failures.push('weeklyIjtemaManagement still on login')
  if (pages.weeklyIjtemaReport.onLogin) failures.push('weeklyIjtemaReport still on login')
  if (!admin.hasCampaignHealth && !admin.hasWeeklyIjtema) {
    failures.push('admin dashboard missing Campaign Health / Weekly Ijtema signals')
  }
  if (!management.hasWeeklyIjtema) failures.push('management missing Weekly Ijtema')
  if (management.suspiciousConnected800 || reportChecks.suspiciousConnected800) {
    failures.push('Connected still inflated to 800')
  }
  // Report page for canonical should show Present ~41 / Connected ~200 when hydrated
  if (
    pages.weeklyIjtemaReport.path.includes(CANONICAL) &&
    reportChecks.presentMatches.length > 0 &&
    !reportChecks.presentMatches.includes(41) &&
    !reportChecks.presentMatches.some((n) => n >= 40 && n <= 42)
  ) {
    failures.push(`report Present not near 41: ${reportChecks.presentMatches.join(',')}`)
  }

  const result = {
    ticket: 'KC-037C2G',
    generatedAt: new Date().toISOString(),
    prodUrl: PROD,
    canonicalEventId: CANONICAL,
    signInResult,
    deploymentAlias: 'https://karkun-connect.vercel.app',
    pages,
    consoleErrorCount: consoleErrors.length,
    consoleErrors: consoleErrors.slice(0, 15),
    failures,
    passed: failures.length === 0,
  }

  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true })
  const out = resolve(REPORT_DIR, 'kc-037c2g-prod-smoke-latest.json')
  writeFileSync(out, JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
  console.log('Wrote', out)
  if (failures.length) {
    console.error('SMOKE FAIL', failures)
    process.exit(1)
  }
  console.log('KC-037C2G production smoke passed.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
