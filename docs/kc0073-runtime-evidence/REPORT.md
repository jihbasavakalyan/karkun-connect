# KC-007.3 — Runtime Click Evidence

**Harness:** `scripts/kc0073-runtime-evidence.ts` + `scripts/kc0073-onclick-probe.ts`  
**Method:** Real `RuknLayout` + page components, mocked Rukn `AuthContext`, `MemoryRouter`, React fiber walk from DOM.

Raw JSON: `docs/kc0073-runtime-evidence/evidence.json`

---

## 1. Runtime component tree

### `/rukn` (Home) — Mission Control chips **are** mounted

```
MemoryRouter
 └─ RuknLayout
     ├─ (chrome header)
     ├─ Outlet
     │   └─ RuknHomePage
     │       └─ RuknMissionControlHero
     │           └─ MissionControlQuickActions
     │               └─ button.mc-quick-action × 4
     │                   Connect | Connected | Record | Record Visit
     └─ nav[aria-label="Rukn navigation"]  (NavLink × 4)
         Home | Connect | Connected | Record
```

Fiber chain captured on each quick-action button (runtime):

`MissionControlQuickActions` → `RuknMissionControlHero` → `RuknHomePage` → `Outlet` → `RuknLayout` → `Router`

### `/rukn/visit/K001` and `/rukn/visit/:id` — Mission Control chips **are not** mounted

```
MemoryRouter
 └─ RuknLayout
     ├─ Outlet
     │   └─ ConnectionJourneyPage
     │       └─ ("Karkun Not Found" in this harness — no registry hit for K001)
     │       └─ **no** `.mc-hero`
     │       └─ **no** `.mc-quick-actions`
     │       └─ **no** “Today’s Mission”
     │       └─ **no** Ask Digital Rafeeq
     └─ nav[aria-label="Rukn navigation"]  (still present)
         Home | Connect | Connected | Record
```

| Marker | `/rukn` | `/rukn/visit/:id` |
|--------|---------|-------------------|
| `hasMcHero` | true | **false** |
| `hasMcQuickActions` | true | **false** |
| `hasTodaysMissionCopy` | true | **false** |
| `hasAskRafeeq` | true | **false** |
| Bottom nav Connect/Connected/Record | true | true |

---

## 2. Button implementation (Home — only place MC chips exist)

| Label | React component | HTML | disabled | onClick | navigate | Destination |
|-------|-----------------|------|----------|---------|----------|-------------|
| Connect | `MissionControlQuickActions` | `BUTTON` | false | **yes** | via onClick | `/rukn/available-karkun` |
| Connected | `MissionControlQuickActions` | `BUTTON` | false | **yes** | via onClick | `/rukn/my-karkun` |
| Record | `MissionControlQuickActions` | `BUTTON` | false | **yes** | via onClick | `/rukn/campaign-record` |
| Record Visit | `MissionControlQuickActions` | `BUTTON` | false | **yes** | via onClick | `/rukn/visit/...` (or Connected fallback) |

Bottom nav (works on Visit):

| Label | Component | HTML | Mechanism |
|-------|-----------|------|-----------|
| Connect / Connected / Record | `RuknLayout` → `NavLink` | `A` with `href` | Declarative `href` + RR |

---

## 3. Click lifecycle

### A. Invoke React `onClick` directly (isolated probe)

```
before: /rukn
hasOnClick: function
after onClick: /rukn/available-karkun   ← navigate() ran
after navigate(): /rukn/my-karkun
```

**Stage reached:** onClick → navigate() → Router transition. **Handler is not empty.**

### B. Native `.click()` inside full Home tree (happy-dom)

Stages seen: `click-capture`, `click-bubble`. Path stayed `/rukn` (happy-dom + React 19 delegation limitation — not trusted as browser proof of “dead handler”).

### C. Visit path

No `.mc-quick-action` Connect to click. Bottom-nav Connect `href="/rukn/available-karkun"` remains.

---

## 4. Pointer-event interception

On Visit: no MC hero to cover. No overlay candidates over hero.

On Home: no `pointer-events: none` ancestor found on quick-action nodes in harness. Bottom nav `z-10` fixed; FABs are corner-only.

**No CSS interceptor proven** for Visit MC chips — those chips are not in the Visit tree.

---

## 5. Home vs Visit comparison

| Aspect | `/rukn` | `/rukn/visit/:id` |
|--------|---------|-------------------|
| Page | `RuknHomePage` | `ConnectionJourneyPage` |
| MC quick actions | mounted | **not mounted** |
| Props/handlers | onClick→navigate present | n/a |
| Wrappers | `RuknMissionControlHero` | none for MC |
| Shared chrome | `RuknLayout` bottom nav | same bottom nav |

---

## 6–7. DevTools / console

Harness is fiber-equivalent to DevTools Components panel (not a Chrome DevTools screenshot of a live OTP session).

No Router warnings in isolated onClick probe. Full tree had React `act(...)` test warnings only (harness noise).

---

## Root cause (proven)

1. **`/rukn/visit/:karkunId` does not render the Mission Control quick-action buttons.** Runtime tree mounts `ConnectionJourneyPage` only. The four chips (`MissionControlQuickActions`) mount exclusively under `RuknHomePage`.

2. **Labels that remain on Visit and still work** are the **bottom navigation** `NavLink`s (`<a href>`), not MC chips. That matches “bottom nav works.”

3. **The MC chip handlers themselves are not empty:** when `onClick` runs, `navigate()` updates the location.

4. Therefore the reported state “Visit URL + Mission Control hero + dead Connect/Connected/Record/Record Visit” cannot be produced by `ConnectionJourneyPage`. It requires either:
   - observing **Home** (`RuknHomePage`) while believing the route is Visit, or
   - a **live session where Home remains the Outlet child despite a Visit URL** (not reproduced in harness; Router switches correctly here).

5. Architectural difference explaining “chips dead / bottom nav alive” **when both are visible (i.e. on Home):** chips are `<button>` + `navigate()` only (no `href`); bottom nav is `<a href>`. If client-side `navigate()` were impaired in a given browser session, bottom nav can still work via `href`; chips cannot.

---

## Smallest possible fix (propose only — not applied)

**Do not add Mission Control to Visit.**

**Fix the chip interaction the same way bottom nav works:**

In `MissionControlQuickActions` (and `MissionControlActionButton`), render React Router `Link` (or `NavLink`) with `to={action.route}` and className `mc-quick-action` instead of `<button onClick={() => navigate(...)}>`.

- Restores `href`-based navigation (same mechanism as working bottom nav)
- Keeps KC-007.1 styling classes
- No route redesign, no moving the hero, no Visit-page MC

Optional hardening in `RuknLayout`: `<Outlet key={location.pathname} />` only if a live DevTools session proves Home stays mounted under a Visit URL.
