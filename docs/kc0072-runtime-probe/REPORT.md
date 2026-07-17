# KC-007.2 — Runtime React Tree Investigation

**Date:** 18 July 2026  
**Constraint:** No application code changes.  
**Goal:** Resolve conflict between static analysis (`ConnectionJourneyPage` on `/rukn/visit/:id`) and observed UI (`RuknHomePage` Mission Control).

---

## Blocker — authenticated Rukn session required

React DevTools / fiber inspection of `/rukn/visit/:id` **requires a logged-in Rukn session**.

This agent environment:

- Can open local `http://127.0.0.1:5173` and production `https://karkun-connect.vercel.app`
- **Cannot** complete Rukn login (Firebase **phone OTP** — no SMS/OTP available here)
- **Cannot** attach to the user’s already-open browser DevTools session (no browser MCP / CDP session provided)

Therefore items **1–6 and 10 (DevTools screenshots of Mission Control / visit tree)** could **not** be completed against a live authenticated Visit page from this agent.

---

## Runtime evidence obtained (unauthenticated)

### Direct navigation to Visit URL

| Target | Requested URL | Final URL | UI |
|--------|---------------|-----------|-----|
| Local Vite | `/rukn/visit/K001` | `/login` | Login (Administrator / Rukn) |
| Production | `/rukn/visit/K001` | `/login` | Login |

**Screenshot:** `docs/kc0072-runtime-probe/02-direct-visit-url.png`  
Shows login only — **no** Today’s Mission, Connect/Connected/Record/Record Visit, or Digital Rafeeq.

**Interpretation:** `ProtectedRoute` is active. Without auth, Visit never mounts any home or journey page in this probe.

### Console (local)

- Vite connected  
- React DevTools install hint (info)  
- Firestore `WebChannelConnection` transport warning  
- **No** React Router warnings  
- **No** hydration warnings  
- **No** React errors related to Mission Control / Visit

---

## Router match evidence (same route table as `AppRouter`)

Using `matchRoutes` against the Rukn branch (identical paths to `src/routes/AppRouter.tsx`):

| Pathname | Leaf mounted element |
|----------|----------------------|
| `/rukn` | **RuknHomePage** |
| `/rukn/visit/K001` | **ConnectionJourneyPage** |
| `/rukn/visit/:id` (literal `:id`) | **ConnectionJourneyPage** (`params.karkunId = ":id"`) |
| `/rukn/my-karkun` | MyKarkunPage |
| `/rukn/available-karkun` | AvailableKarkunPage |

Router **does** switch: Visit path does **not** match the index `RuknHomePage` route.

If the browser URL is truly `/rukn/visit/<karkunId>` and React Router is healthy, the leaf page **must** be `ConnectionJourneyPage`, which does **not** render `RuknMissionControlHero` / `MissionControlQuickActions`.

---

## Answers mapped to requested tasks

| # | Task | Result |
|---|------|--------|
| 1 | React tree on `/rukn/visit/:id` | **Blocked** — auth. Unauthenticated → Login only. |
| 2 | Who renders “Today’s Mission” | In source: `RuknMissionControlHero` on **`RuknHomePage` only**. Not on Visit. |
| 3 | Who renders Connect / Connected / Record / Record Visit chips | `MissionControlQuickActions` via `RuknMissionControlHero` on **`RuknHomePage` only**. |
| 4 | Is `MissionControlQuickActions` mounted on Visit? | **Should not be** per router + source. **Not verified in authenticated DevTools** here. |
| 5 | onClick / navigate | Source has `onClick` → `navigate(route)` in `MissionControlQuickActions`. **Click not exercised** on authenticated Visit (blocked). |
| 6 | Alternate identical UI | Only live duplicate-ish UI: bottom nav Connect/Connected/Record in `RuknLayout` (no Record Visit, no Today’s Mission). FAB on home only. |
| 7 | URL / matched route / mounted page | Unauthenticated probe: URL→`/login`, page=`LoginPage`. Authenticated Visit: **not observed**. `matchRoutes` says Visit→`ConnectionJourneyPage`. |
| 8 | URL Visit but Home mounted? | **Not reproduced.** Would be a live-session anomaly; needs user’s DevTools. |
| 9 | Console | See above — no Router/hydration/React MC errors in probe. |
| 10 | DevTools screenshots | **Not available** without authenticated browser session. Login redirect screenshot saved. |

---

## How to finish this investigation on the running app (2 minutes)

While the broken screen is visible (URL shows Visit + Mission Control UI):

1. Open **React DevTools → Components**.
2. Select the **“Today’s Mission”** text node; walk parents.
3. Record whether ancestors include:
   - `RuknHomePage` + `RuknMissionControlHero` + `MissionControlQuickActions`, **or**
   - `ConnectionJourneyPage`
4. Open **React DevTools → Profiler / Components** or install **React Router DevTools** / check address bar vs `useLocation()` in a temporary console hook — or Components search for `ConnectionJourneyPage` / `RuknHomePage` (only one should be under `Outlet`).
5. Screenshot:
   - Full component stack for “Today’s Mission”
   - Address bar
   - Console

Paste those three values:

- Current URL  
- Mounted page component name  
- Whether `MissionControlQuickActions` appears in the tree  

---

## Working hypothesis (pending your DevTools)

Observed UI set (Today’s Mission + four chips + Digital Rafeeq) is **exactly** `RuknHomePage`.  

Static + `matchRoutes` say Visit mounts **`ConnectionJourneyPage`**.  

So either:

1. The visible URL is not the active React Router location (stale bar / misread), or  
2. Home is still under `Outlet` despite Visit URL (live Router anomaly — **not reproduced** unauthenticated), or  
3. A different surface is being described as Visit.

No code should change until authenticated DevTools confirms which of these is true.
