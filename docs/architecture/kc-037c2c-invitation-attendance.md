# KC-037C2C — Weekly Ijtema Invitation Workflow (Option A)

**Status:** Implemented  
**Gate:** [kc-037c2c-arch009-gate.md](./kc-037c2c-arch009-gate.md)

## Rules

| Action | Invitation | Attendance |
|--------|------------|------------|
| Invited (Matrix) | Invited | Pending |
| Present | Invited (auto) | Present |
| Absent | Invited (auto) | Absent |
| Present ↔ Absent | Persists Invited | Updates mark |

Matrix **Invited for Weekly Ijtema** remains the independent campaign invitation SoR (KC-037C2A).

## Metrics (KC-033)

- **Invitation %** = InvitedTotal ÷ Connected  
- **Attendance %** = Present ÷ InvitedTotal  
- Dashboard Pending = Connected − InvitedOnly − Present − Absent  

## Verify

```bash
npm run verify:kc-037c2c
npm run verify:kc-037c2a
```
