# KC-037C4 — Evidence

Weekly Ijtema Attendance Report (Composer → KC-033 → presentation → PDF HTML).

**Note:** Product brief labeled this “KC-037C2”; repository id is **KC-037C4** (C2 = Individual Rukn).

## Artifacts

| File | Purpose |
|------|---------|
| `preview-desktop.html` | Live Composer model rendered in PDF shell (local data may be empty) |
| `preview-mobile.html` | Same, narrow frame |
| `pdf-fixture-desktop.html` | Visual fixture (mixed Present/Absent/Pending + ranking) |
| `pdf-fixture-mobile.html` | Visual fixture · mobile width |
| `composed-document.json` | Composer output summary from live providers |
| `kc-037c4-pdf-desktop.png` | Desktop viewport screenshot |
| `kc-037c4-pdf-desktop-full.png` | Desktop full-page screenshot |
| `kc-037c4-pdf-mobile.png` | Mobile viewport screenshot |
| `kc-037c4-rukn-ranking.png` | Rukn Performance ranking (Top/Bottom 5) |

Fixture HTML is **layout evidence only** — not live campaign KPIs.

## Regenerate

```bash
npx vite-node scripts/generate-kc-037c4-evidence.ts
npx vite-node scripts/generate-kc-037c4-fixture-html.ts
```
