#!/usr/bin/env node
/**
 * KC-0100.5 — Prove whether production client includes auto-provision.
 */
const base = process.argv[2] ?? 'https://karkun-connect.vercel.app'

const needles = [
  'rukn-claims-provision',
  'KC-0100.3',
  'attempting auto claim provision',
  'Your Rukn access is not activated yet',
  'Your account is not authorized for Karkun Connect',
  'not activated',
  'Claim provisioning',
]

async function fetchText(path) {
  const url = path.startsWith('http') ? path : `${base}${path}`
  const r = await fetch(url)
  return { status: r.status, text: await r.text(), url }
}

const html = (await fetchText('/login')).text
const htmlAssets = [...html.matchAll(/\/assets\/[^"'\\s>]+\.js/g)].map((m) => m[0])
const entry = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1]
console.log(JSON.stringify({ base, entry, htmlAssetCount: new Set(htmlAssets).size }, null, 2))

const queue = [...new Set([...(entry ? [entry] : []), ...htmlAssets])]
const seen = new Set()
const hits = []
const large = []

while (queue.length) {
  const path = queue.shift()
  if (!path || seen.has(path)) continue
  seen.add(path)
  const body = await fetchText(path)
  if (body.status !== 200) continue
  if (body.text.length > 15000) {
    large.push({ path, len: body.text.length })
  }
  const found = needles.filter((n) => body.text.includes(n))
  if (found.length) hits.push({ path, len: body.text.length, found })

  for (const m of body.text.matchAll(/\/?assets\/[A-Za-z0-9_.-]+\.js/g)) {
    const next = m[0].startsWith('/') ? m[0] : `/${m[0]}`
    if (!seen.has(next)) queue.push(next)
  }
}

console.log(
  JSON.stringify(
    {
      scanned: seen.size,
      large: large.sort((a, b) => b.len - a.len).slice(0, 15),
      hits,
      provisionPresent: hits.some((h) => h.found.includes('rukn-claims-provision')),
      activationMessagePresent: hits.some((h) =>
        h.found.some((f) => f.includes('not activated') || f.includes('not authorized')),
      ),
    },
    null,
    2,
  ),
)
