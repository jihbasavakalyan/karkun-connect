/**
 * KC-0118 — Static contract checks for Context-Aware Communication Engine.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())
const engine = readFileSync(
  resolve(root, 'src/lib/communication/contextAware/engine.ts'),
  'utf8',
)
const builder = readFileSync(
  resolve(root, 'src/lib/communication/contextAware/messageBuilder.ts'),
  'utf8',
)
const modal = readFileSync(
  resolve(root, 'src/components/communication/ContextAwareCommunicationPreviewModal.tsx'),
  'utf8',
)
const ports = readFileSync(
  resolve(root, 'src/lib/communication/contextAware/deliveryPorts.ts'),
  'utf8',
)

assert(engine.includes('composeContextAwareCommunication'), 'engine composes communication')
assert(builder.includes('السلام علیکم ورحمۃ اللہ وبرکاتہ'), 'Urdu greeting present')
assert(builder.includes('والسلام'), 'Urdu closing present')
assert(!builder.includes('ٹاسک'), 'prohibited vocabulary absent')
assert(!builder.includes('ریمائنڈر'), 'prohibited vocabulary absent')
assert(modal.includes('Communication Preview'), 'preview modal title')
assert(modal.includes('Delivery Channel'), 'channel selection')
assert(ports.includes('whatsAppWebDeliveryPort'), 'WhatsApp adapter present')
assert(ports.includes('smsStubDeliveryPort'), 'SMS stub adapter present')

console.log(
  JSON.stringify(
    {
      ok: true,
      checks: [
        'Context-aware engine compose',
        'Urdu editorial greeting/closing',
        'Preview modal fields',
        'Abstract WhatsApp + SMS delivery ports',
      ],
    },
    null,
    2,
  ),
)
