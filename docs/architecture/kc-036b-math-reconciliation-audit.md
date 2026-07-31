# KC-036B — Mathematical Reconciliation Audit

**Status:** Investigation complete (read-only)  
**Constraint:** No Firestore writes · No data modifications · No behavioural app changes  
**Evidence:** `production-data/exports/kc036b-math-audit-latest.json`  
**Generated:** 2026-07-31T14:29:52.198Z  
**Project:** `karkun-connect-75c68`  
**Script:** `npm run admin:kc036b:math-audit` → `scripts/admin/kc036b-math-reconciliation-audit.mjs`

### Definitions (canonical)

| Term | Definition |
|------|------------|
| **Registry** | All `karkuns` documents |
| **Eligible (Active Karkun)** | `category = Karkun`, not archived, not soft-removed (`KC-0101` `isCampaignEligible`) |
| **Connected** | Unique eligible `karkunId` with ≥1 Active, non-archived `connections` row |
| **Unconnected** | Eligible minus Connected |
| **Rukn connected count** | Unique eligible Active connections for that `ruknId` |

---

## 1. Executive Summary

Production connection mathematics **reconcile perfectly**.

| Proof | Result |
|-------|--------|
| Status totals = Registry | **663 = 663** |
| Connected + Unconnected = Eligible | **586 + 7 = 593** |
| Σ (all Rukn connected) = Total Connected | **586 = 586** |
| Difference | **0** |
| Multi-Active / multi-Rukn / dup ASN / dup assignmentId | **0** |
| Integrity (orphans, broken refs, invalid Rukn IDs) | **PASS** |

**Operational note (not a math failure):** 7 eligible female Karkuns remain Available (not connected). Distribution is uneven (median 10; R007 = 53, one high outlier). 26 Active connection rows belong to Muttafiq (ineligible) and are excluded from eligible Connected totals by design.

**Verdict:** The production database is **mathematically consistent** for the connection model.  
**Confidence: High**

---

## 2. Complete Rukn Distribution Table (49 Rukns)

Sorted by Connected descending.

| Rank | Rukn ID | Rukn Name | Gender | Connected | % of Total Connected | % of Total Registry |
| ---: | ------- | --------- | ------ | --------: | -------------------: | ------------------: |
| 1 | R007 | Ruksana Tahsin | female | 53 | 9.04% | 7.99% |
| 2 | R047 | Mubashira Begum | female | 24 | 4.1% | 3.62% |
| 3 | R010 | Shahida Banu Qureshi | female | 20 | 3.41% | 3.02% |
| 4 | R043 | Sabiha Sultana | female | 20 | 3.41% | 3.02% |
| 5 | R015 | Farzana Nazmi | female | 19 | 3.24% | 2.87% |
| 6 | R039 | Nadira Begum | female | 18 | 3.07% | 2.71% |
| 7 | R048 | Rahmat Khanam | female | 18 | 3.07% | 2.71% |
| 8 | R016 | Shamsunnisa | female | 17 | 2.9% | 2.56% |
| 9 | R017 | Shah Jahan Begum | female | 17 | 2.9% | 2.56% |
| 10 | R028 | Salma Naaz | female | 17 | 2.9% | 2.56% |
| 11 | R037 | Shaheen Tabassum | female | 17 | 2.9% | 2.56% |
| 12 | R046 | Asadulla Khan Zaki | male | 17 | 2.9% | 2.56% |
| 13 | R012 | Syeda Sumaiya Parveen | female | 16 | 2.73% | 2.41% |
| 14 | R029 | Zeenat Anjum | female | 16 | 2.73% | 2.41% |
| 15 | R030 | Shahla Anjum | female | 16 | 2.73% | 2.41% |
| 16 | R034 | Fazeelat Saleha | female | 16 | 2.73% | 2.41% |
| 17 | R045 | Yasmin Sultana | female | 16 | 2.73% | 2.41% |
| 18 | R005 | Shoukat Begum | female | 15 | 2.56% | 2.26% |
| 19 | R033 | Ayesha Siddiqa | female | 14 | 2.39% | 2.11% |
| 20 | R006 | Md Ehtesham Akhtar | male | 12 | 2.05% | 1.81% |
| 21 | R018 | Md Yousufuddin | male | 12 | 2.05% | 1.81% |
| 22 | R004 | Syeda Zainab Ghazala | female | 11 | 1.88% | 1.66% |
| 23 | R019 | Mohammed Nayeemuddin | male | 11 | 1.88% | 1.66% |
| 24 | R042 | Ishrat Khanum | female | 11 | 1.88% | 1.66% |
| 25 | R003 | Mohd Minhajuddin | male | 10 | 1.71% | 1.51% |
| 26 | R023 | Syeda Atiya Rabi | female | 10 | 1.71% | 1.51% |
| 27 | R008 | Zulfiqar Ahmed | male | 9 | 1.54% | 1.36% |
| 28 | R032 | Mir Mukaram Ali Jamadar | male | 9 | 1.54% | 1.36% |
| 29 | R038 | M Althaf Amjad | male | 9 | 1.54% | 1.36% |
| 30 | R044 | Izhar ul Haque | male | 9 | 1.54% | 1.36% |
| 31 | R002 | Amir Khan | male | 8 | 1.37% | 1.21% |
| 32 | R026 | Syed Sher Ali | male | 8 | 1.37% | 1.21% |
| 33 | R031 | Abdul Khaleel Gobre | male | 8 | 1.37% | 1.21% |
| 34 | R035 | Md Arafat Ahmad | male | 8 | 1.37% | 1.21% |
| 35 | R040 | Mohammed Ghulam Rasool | male | 8 | 1.37% | 1.21% |
| 36 | R001 | Ruqia Tahaniyat | female | 7 | 1.19% | 1.06% |
| 37 | R011 | Mohammad Faizuddin (Imran) | male | 7 | 1.19% | 1.06% |
| 38 | R020 | Mohammad Aslam | male | 7 | 1.19% | 1.06% |
| 39 | R022 | Mohammed Alauddin | male | 7 | 1.19% | 1.06% |
| 40 | R041 | Aejaz Ahmed Gobre | male | 7 | 1.19% | 1.06% |
| 41 | R009 | Muhammad Faruq | male | 6 | 1.02% | 0.9% |
| 42 | R027 | Riyaz Patel | male | 6 | 1.02% | 0.9% |
| 43 | R013 | Tafheemuddin | male | 5 | 0.85% | 0.75% |
| 44 | R024 | Abdul Khader Er | male | 5 | 0.85% | 0.75% |
| 45 | R049 | Mujahid Pasha Qureshi | male | 5 | 0.85% | 0.75% |
| 46 | R021 | Qyamuddin Baagh | male | 3 | 0.51% | 0.45% |
| 47 | R036 | Moulvi Abdul Qadir | male | 2 | 0.34% | 0.3% |
| 48 | R014 | Syeda Amatul Azeez Kokab | female | 0 | 0% | 0% |
| 49 | R025 | Bushra Fathima | female | 0 | 0% | 0% |

**Σ Connected = 586**

---

## 3. Registry Mathematical Reconciliation

### Phase 1 — Status totals

| Status bucket | Count |
|---------------|------:|
| Active | 660 |
| Inactive | 0 |
| Archived | 0 |
| Deleted | 0 |
| Soft-removed (duplicate_merge / admin_delete) | 3 |
| Pending | 0 |
| Suspended | 0 |
| Unknown status | 0 |
| **Registry total** | **663** |
| **Sum of buckets** | **663** |
| **Match** | **PASS** |

Soft-removed examples: `kr-494` Bismilla, `kr-496` Shaik Haji, `kr-503` Azhar Artist (`archiveKind: duplicate_merge`).

### Category (informative)

| Category | Count |
|----------|------:|
| Karkun | 593 |
| Muttafiq | 67 |
| Soft-removed (excluded from category lens above when archived) | accounted in soft-removed |

Eligible Active Karkuns = **593** (all category Karkun, not archived).

### Phase 2 — Connection mathematics

| Metric | Value |
|--------|------:|
| Eligible Active Karkuns | 593 |
| Connected (eligible) | 586 |
| Unconnected (eligible) | 7 |
| Connected + Unconnected | 593 |
| **Match** | **PASS** |

Active connection **rows** (all statuses Active, any category): **612**.  
Of these, **26** are Active connections to Muttafiq (ineligible) — excluded from Connected eligible. They do **not** create double-counting across Rukns for eligible math.

### Phase 4 — Rukn sum

| Check | Value |
|-------|------:|
| Σ Rukn Connected | 586 |
| Total Connected | 586 |
| Difference | **0** |
| **Match** | **PASS** |

### Phase 10 — Final proof

```
Registry Total (663)           = Status Sum (663)                    ✓
Eligible (593)                 = Connected (586) + Not Connected (7) ✓
Connected Total (586)          = Σ Rukn (586)                        ✓
Difference                     = 0                                   ✓
```

---

## 4. Integrity Report

| Validation | Result |
|------------|--------|
| P1 Status sum = registry | **PASS** |
| P2 Connected + Unconnected = Eligible | **PASS** |
| P4 Σ Rukn = Connected | **PASS** |
| P5 Zero multi-Active assignments | **PASS** (0) |
| P5 Zero multiple assigned Rukns | **PASS** (0) |
| P5 Zero duplicate ASNs (Active) | **PASS** (0) |
| P5 Zero duplicate assignment IDs | **PASS** (0) |
| P5 Zero duplicate connected Karkun IDs | **PASS** (0) |
| P5 Zero duplicate mobiles (registry DQ) | **PASS** (0) |
| P9 No orphan Active (missing Karkun) | **PASS** (0) |
| P9 No orphan Active (missing Rukn) | **PASS** (0) |
| P9 No invalid `assignedRuknId` on eligible | **PASS** (0) |
| P9 Every connection → existing Karkun | **PASS** |
| P9 Every connection → existing Rukn | **PASS** |
| P9 Circular refs (bipartite model) | **PASS** (N/A by schema) |

**Overall integrity: PASS**

---

## 5. Statistical Report

Per-Rukn Connected counts (n = 49):

| Statistic | Value |
|-----------|------:|
| Minimum | 0 |
| Maximum | 53 |
| Average | 11.96 |
| Median | 10 |
| Mode | 7 (appears 5 times) |
| Standard deviation | 8.12 |
| 25th percentile (P25) | 7 |
| 75th percentile (P75) | 16 |
| Coefficient of variation | 0.68 |
| Balanced range (IQR fence) | 7 – 16 |
| Zero-connected Rukns | 2 (R014, R025) |

### Histogram (bucket size 5)

| Bucket | Rukns |
|--------|------:|
| 0–4 | 4 |
| 5–9 | 19 |
| 10–14 | 8 |
| 15–19 | 14 |
| 20–24 | 3 |
| 50–54 | 1 |

### Outliers (Tukey: > P75 + 1.5×IQR)

| Type | Result |
|------|--------|
| High | **R007** Ruksana Tahsin — **53** |
| Low | none |

```
Connected count (ASCII)
0-4   ████
5-9   ███████████████████
10-14 ████████
15-19 ██████████████
20-24 ███
50-54 █  ← R007
```

### Gender analysis (eligible Karkuns)

| Gender | Total | Connected | Not connected | Connection % | Rukns | Avg / Rukn | Highest | Lowest |
|--------|------:|----------:|--------------:|-------------:|------:|-----------:|--------:|-------:|
| Male | 198 | 198 | 0 | 100% | 25 | 7.92 | 17 | 2 |
| Female | 395 | 388 | 7 | 98.23% | 24 | 16.17 | 53 | 0 |
| Unknown | 0 | 0 | 0 | — | 0 | — | — | — |

---

## 6. Exceptions Report

### Math mismatches

**None.** Difference = 0 on all reconciliation equations.

### Duplicate audit

| Check | Count |
|-------|------:|
| Duplicate Active assignments | 0 |
| Duplicate ASNs | 0 |
| Duplicate mobile numbers | 0 |
| Duplicate Karkun IDs (connected) | 0 |
| Duplicate connection records | 0 |
| Multiple assigned Rukns | 0 |

### Missing (eligible Active, not connected) — 7

ASN is not assigned until Connect; identifier = `karkunId`.

| Karkun ID | Name | Gender | Status | Reason |
|-----------|------|--------|--------|--------|
| kr-213 | BE | female | active | Available / not connected |
| kr-319 | SADIYA ,D/O SHAIKH AHMED SAB | female | active | Available / not connected |
| kr-417 | ISRAT BEGUM | female | active | Available / not connected |
| kr-426 | MARYAM ABDUL KAREEM | female | active | Available / not connected |
| kr-473 | Shabana begum | female | active | Available / not connected |
| kr-474 | ZEBA AQTER | female | active | Available / not connected |
| kr-475 | SABA TABASSUM | female | active | Available / not connected |

### Non-exception operational notes

1. **26** Active Muttafiq connection rows exist outside eligible Connected — intentional exclusion from campaign-eligible math.
2. **R007** is a statistical high outlier (workload concentration), not a uniqueness integrity failure (see [KC-036A](./kc-036a-r007-forensics.md)).
3. **R014** and **R025** have zero eligible connections.

---

## 7. Final Conclusion

| Question | Answer |
|----------|--------|
| Is every eligible Active Karkun accounted for (connected XOR unconnected)? | **Yes** (593 = 586 + 7) |
| Does every connected eligible Karkun belong to exactly one Rukn? | **Yes** (0 multi-Rukn / multi-Active) |
| Do Rukn totals sum to Connected? | **Yes** (586 = 586) |
| Do status totals equal registry? | **Yes** (663 = 663) |
| Is Difference = 0? | **Yes** |
| Mathematically consistent? | **Yes** |
| **Confidence** | **High** |

**Quantitative basis:** Full production snapshot via Admin SDK; all Phase 1–10 equations closed with Difference 0; all integrity and uniqueness checks zero-failure; single high-outlier distribution fact is operational, not a reconciliation break.

**Out of scope for KC-036B:** rebalancing R007, connecting the 7 Available Karkuns, Muttafiq connection policy, application code changes.

---

## Reproduce

```bash
npm run admin:kc036b:math-audit
```

Outputs:

- `production-data/exports/kc036b-math-audit-latest.json`
- `production-data/exports/kc036b-rukn-distribution-table.md`
