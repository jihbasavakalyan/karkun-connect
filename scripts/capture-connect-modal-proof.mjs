import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const outPath = process.argv[2] ?? 'docs/release/connect-karkun-modal-proof.png'
mkdirSync(dirname(outPath), { recursive: true })

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Connect Modal Proof</title>
  <style>
    :root {
      --border: #d9dee8;
      --bg: #f4f6fb;
      --surface: #ffffff;
      --text: #1b2430;
      --sub: #4f5d75;
      --primary: #1456ff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Segoe UI, Arial, sans-serif;
      background: linear-gradient(180deg, #eef3ff 0%, #f6f9ff 100%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(14, 26, 43, 0.45);
    }
    .modal {
      position: relative;
      z-index: 2;
      width: min(100%, 42rem);
      max-height: min(92svh, 40rem);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 18px 56px rgba(0,0,0,0.22);
    }
    .header {
      border-bottom: 1px solid var(--border);
      padding: 16px 20px;
      font-size: 24px;
      font-weight: 700;
      flex: 0 0 auto;
      background: #fff;
    }
    .body {
      min-height: 0;
      flex: 1 1 auto;
      overflow-y: auto;
      padding: 16px 20px;
    }
    .card {
      border: 1px solid var(--border);
      background: #f9fbff;
      border-radius: 12px;
      padding: 12px;
      margin-top: 12px;
      line-height: 1.5;
    }
    .line { margin: 8px 0; color: var(--sub); }
    .footer {
      flex: 0 0 auto;
      border-top: 1px solid var(--border);
      padding: 16px 20px;
      background: #fff;
      display: grid;
      gap: 10px;
    }
    button {
      height: 44px;
      border-radius: 10px;
      font-weight: 700;
      border: 1px solid transparent;
      cursor: pointer;
    }
    .primary { background: var(--primary); color: #fff; }
    .secondary { background: #fff; border-color: var(--border); color: var(--text); }
  </style>
</head>
<body>
  <div class="overlay"></div>
  <div class="modal" role="dialog" aria-modal="true">
    <div class="header">Connect Karkun</div>
    <div class="body">
      <p class="line">Do you want to connect with this Karkun?</p>
      <div class="card">
        <div class="line"><strong>Name:</strong> Very Long Demo Karkun Name To Force Wrapping Across Multiple Lines In Narrow Viewports</div>
        <div class="line"><strong>Father/Husband:</strong> Example Relative Name That Also Wraps For Overflow Testing</div>
        <div class="line"><strong>Mobile:</strong> 9876543210</div>
        <div class="line"><strong>Area:</strong> Very Long Area Label To Simulate Real Data And Ensure Body Scroll Instead Of Footer Push</div>
      </div>
      <div class="card">
        <p class="line">Extra content block 1</p>
        <p class="line">Extra content block 2</p>
        <p class="line">Extra content block 3</p>
        <p class="line">Extra content block 4</p>
        <p class="line">Extra content block 5</p>
        <p class="line">Extra content block 6</p>
        <p class="line">Extra content block 7</p>
        <p class="line">Extra content block 8</p>
        <p class="line">Extra content block 9</p>
      </div>
    </div>
    <div class="footer">
      <button class="primary">Confirm Connection</button>
      <button class="secondary">Cancel</button>
    </div>
  </div>
</body>
</html>`

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.setContent(html, { waitUntil: 'domcontentloaded' })
  await page.screenshot({ path: outPath, fullPage: false })
  await browser.close()
  console.log(outPath)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
