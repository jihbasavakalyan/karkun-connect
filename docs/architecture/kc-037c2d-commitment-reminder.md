# KC-037C2D — Weekly Ijtema Commitment vs Reminder/Attendance

Supersedes KC-037C2C Option A for Matrix coupling: Present/Absent **no longer** write `Campaign: Invited` on legacy `ijtema_*`.

## SoRs

| Surface | SoR | Notes |
|---------|-----|-------|
| Matrix — Weekly Ijtema Commitment | Legacy `ijtema_*` + campaign remarks | Ladder: Not Discussed → Discussed → Committed → Deferred → Not Interested |
| Dashboard — Today's Weekly Ijtema | Event marks `reminded?` + `status?: Present\|Absent` | Per open event |

## Legacy mapping (no migration)

| Legacy | Commitment |
|--------|------------|
| `Campaign: Invited` / sticky Present | Committed |
| `Campaign: Not Invited` | Not Interested |
| `Campaign: Excused` / Excused | Deferred |

## Metrics (single helper)

- Reminder % = RemindedTotal ÷ Connected  
- Attendance % = Present ÷ RemindedTotal  

Verify: `npm run verify:kc-037c2d`
