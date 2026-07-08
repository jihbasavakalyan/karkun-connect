# M6 Phase 2 — Visual Acceptance Evidence

Presentation-only connection workflow redesign. No engine or business-logic changes.

> **Capture live screenshots:** `npm run dev` then visit the routes below. Recommended viewport: 390×844 (mobile) and 1280×800 (desktop).

---

## Administrator

### 1. Connection Desk — Before / After

| Before | After |
|--------|-------|
| Two scrollable columns; select Rukn → scroll Karkun workload list → select row → scroll to Connection Preview → Confirm | Select Rukn → **searchable compact rows** with ➕ Connect → **one confirmation modal** → success banner; stay on page to connect more |
| Dropdown-based Connect modal (Karkunan page) | Searchable **AvailableKarkunRow** list + Rukn picker |

**Route:** `/admin/assignments`

**Annotated improvements:**
1. **Search-first** — instant filter by name, father/husband, mobile, area, ID
2. **Fewer clicks** — Connect → Confirm (removed intermediate preview section)
3. **Continuous workflow** — green success banner; Rukn selection preserved

---

### 2. Connections View (Mapping)

| Before | After |
|--------|-------|
| Basic search; sort by count/alpha/date only | Sort by **Needs Attention**, **Healthy**, **Most Active**, Recently/Oldest Connected |
| Visit: "Pending" labels | Humanized: *"{Name} is waiting for your visit."* |
| No journey/health on mapping rows | **Journey stage** + **health badges** per Karkun |

**Route:** `/admin/assignments?view=mapping`

---

### 3. Connected Karkun (Admin Journey)

| Before | After |
|--------|-------|
| Header with name only | **Relationship Summary** panel at top: Connected Karkun, Connected To, Journey, Health, Next Action, Connection # |

**Route:** `/admin/annexure-1/:karkunId`

---

## Rukn

### 4. Connect Karkun — Before / After

| Before | After |
|--------|-------|
| Large stacked cards; full-width Connect inside each card | **Compact rows** — all fields visible; **➕ Connect** on the right |
| Search below title | **Sticky search** with live match count |
| Confirm inside each card component | Shared **ConnectKarkunConfirmModal**; success banner; list refreshes for next connection |

**Route:** `/rukn/available-karkun`

---

### 5. Connected Karkuns — Before / After

| Before | After |
|--------|-------|
| Journey + health + separate contact bar + Open Journey + Release/Replace split | **Single enhanced card**: journey, health, humanized next action, **last visit**, inline **Call / WhatsApp / Record Visit / Schedule** |
| No search | **Search + urgency sort** (needs attention first) |
| Replace/Release buried below | **Unified Relationship Action Bar** (🔄 Replace · ❌ Release) |

**Route:** `/rukn/my-karkun`

---

### 6. Relationship Summary (Connection Journey)

| Before | After |
|--------|-------|
| Name header; health below | **RelationshipSummaryPanel** first: Connected Karkun, Connected To, Journey, Health, Next Action |
| Replace/Release only on list page | **RelationshipActionBar** on journey page (Rukn) |

**Route:** `/rukn/visit/:karkunId`

---

### 7. Mobile View

| Improvement | Detail |
|-------------|--------|
| Touch targets | `min-h-11` / `min-h-12` on search, Connect, quick actions |
| Less scrolling | Compact rows vs full cards on Connect page |
| One-hand actions | Quick action grid (2×2) on connected cards |
| Sticky search | Search stays visible while filtering long lists |

**Route:** `/rukn/available-karkun` and `/rukn/my-karkun` at 390px width

---

## Humanized Messaging

| Technical | Humanized |
|-----------|-----------|
| Connection Pending | This Karkun is ready to be connected. |
| Connection confirmed. ASN-… | Connected successfully. Connection number ASN-…. |
| Disconnected / Unassigned | No active Rukn is currently guiding this Karkun. |
| Visit Pending | {Name} is waiting for your visit. |
| Release | Connection released successfully. |

---

## Screenshot Checklist

- [ ] Admin Connection Desk — row layout + confirm modal
- [ ] Admin Mapping View — sort + journey badges
- [ ] Admin Connection Journey — relationship summary
- [ ] Rukn Connect — sticky search + compact rows
- [ ] Rukn Connected — quick actions + action bar
- [ ] Rukn Journey — summary panel
- [ ] Mobile — Connect + Connected pages
