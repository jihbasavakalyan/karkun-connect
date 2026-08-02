import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

mkdirSync('public/pwa', { recursive: true })
const src = 'public/pwa-icon.svg'
const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
for (const size of sizes) {
  await sharp(src).resize(size, size).png().toFile(`public/pwa/icon-${size}.png`)
  console.log(`wrote icon-${size}.png`)
}
await sharp(src).resize(180, 180).png().toFile('public/pwa/apple-touch-icon.png')
console.log('wrote apple-touch-icon.png')
