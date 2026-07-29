/**
 * KC-BUG-0130A — WhatsApp launch must navigate pre-opened tabs to wa.me (not about:blank).
 */

import {
  launchWhatsAppWebMessage,
  logWhatsAppLaunchDiagnostics,
  resolveRecipientWhatsAppNumber,
} from '../src/lib/communication/whatsappWebLaunch'
import { buildWhatsAppLink } from '../src/utils/personContactLinks'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const source = readFileSync(
  resolve('src/lib/communication/whatsappWebLaunch.ts'),
  'utf8',
)
const prepareBlock = source.match(
  /export function prepareWhatsAppLaunchWindows[\s\S]*?^}/m,
)?.[0]
assert(prepareBlock, 'prepareWhatsAppLaunchWindows not found')
assert(
  !prepareBlock!.includes('noopener'),
  'prepareWhatsAppLaunchWindows must not use noopener (blocks navigation from about:blank)',
)
assert(
  !prepareBlock!.includes('noreferrer'),
  'prepareWhatsAppLaunchWindows must not use noreferrer (can block opener navigation)',
)
assert(
  /navigatePreopenedWindow|location\.replace/.test(source),
  'Must navigate pre-opened window to final URL',
)

const recipient = {
  personId: 'R035',
  personKind: 'rukn' as const,
  name: 'Md Arafat Ahmad',
  mobile: '9632017069',
  whatsapp: '',
}

const message = 'السلام علیکم — test briefing'
const phone = resolveRecipientWhatsAppNumber(recipient)
const url = buildWhatsAppLink(phone, message)

assert(phone === '9632017069', `phone ${phone}`)
assert(url !== null, 'URL must be built')
assert(url!.startsWith('https://wa.me/'), `URL must be wa.me: ${url}`)
assert(url!.includes('919632017069'), `URL must include country+digits: ${url}`)
assert(url!.includes('text='), 'URL must include encoded text param')
assert(!url!.includes('about:blank'), 'URL must never be about:blank')
assert(!url!.includes('undefined'), 'URL must never contain undefined')

// launch without window (node) — should return url but not launched
const result = launchWhatsAppWebMessage(recipient, message)
assert(result.url === url, 'launch returns same wa.me URL')
assert(result.url?.startsWith('https://wa.me/'), 'result URL valid')

logWhatsAppLaunchDiagnostics(recipient, message, url)

console.log('KC-BUG-0130A verify: OK')
console.log(
  JSON.stringify(
    {
      phone: '919632017069',
      url,
      rootCauseFix: 'removed noopener/noreferrer from prepareWhatsAppLaunchWindows',
    },
    null,
    2,
  ),
)
