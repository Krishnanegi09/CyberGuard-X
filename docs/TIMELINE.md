# TIMELINE

> **Fill in the real dates first.** The week plan below assumes a start on **Mon 2026-11-23** and a final demo around **late April 2027** (22 weeks). Shift the rows to fit your department's calendar.

## Fixed deadlines (fill in)
| Event | Date | What must be demonstrable |
|---|---|---|
| Synopsis / proposal approval | ____ | Problem, architecture diagram, roadmap |
| Mid-semester review | ____ | **Phase 2 vertical slice running live** |
| Pre-final review | ____ | Phases 3–6 MVP, the ML report |
| Report submission | ____ | Full report (see `ACADEMIC_MAPPING.md`) |
| Final demo / viva | ____ | `DEMO_RUNBOOK.md`, run twice from a reset lab |

## Week plan (default)
| Weeks | Dates (from 2026-11-23) | Phase | M1 | M2 | M3 |
|---|---|---|---|---|---|
| 1 | Nov 23 – Nov 29 | 0 Audit | audit (c), lab sketch | audit (a, f) | audit (b, d, e), kit, CI |
| 2–3 | Nov 30 – Dec 13 | 1 Foundation | 1.8 lab v1 | dataset research, rule design | 1.1–1.7 migration, auth, RLS, queue, contracts |
| 4–6 | Dec 14 – Jan 3 | 2 Vertical slice | 2.1 scans, 2.2 sensor | 2.3 rule, 2.4 twin, 2.5 risk v1 | 2.6 actions (notify), 2.7 dashboard |
| 7–9 | Jan 4 – Jan 24 | 3 + 4 | 3.1–3.4 observe depth | 4.1–4.5 understand depth | findings and investigation UI support, hardening |
| 10–11 | Jan 25 – Feb 7 | 5 Twin | lab scenarios + pcaps for ML | 5.1–5.3 twin depth | twin UI, simulation mode |
| 12–14 | Feb 8 – Feb 28 | 6 ML | labelled lab captures (all scenarios) | 6.1–6.5 ML pipeline + report | 7.1 action framework |
| 15–16 | Mar 1 – Mar 14 | 7 Defend | `fw_block` helper on lab gw | risk v2 integration | 7.2–7.3 |
| 17 | Mar 15 – Mar 21 | 8 Learn | — | 8.1–8.2 | feedback UI |
| 18–19 | Mar 22 – Apr 4 | 9 Polish | PERF measurements | ML report polish | 9.1–9.4 |
| 20–22 | Apr 5 – Apr 25 | 9 Delivery | demo rehearsal | report chapters | report, slides, rehearsal |

## Buffer and cut line
- About 15% buffer is built in through the weeks shared with Phase 9. If a phase runs **> 1 week late**, apply the cut line from the top down. These items are dropped first and never block the MVP:
  1. All `[STRETCH]` milestones (Zeek, SHAP, calibration, autonomous mode, container isolation, PDF reports, drift, retraining)
  2. 4.6 incident correlation
  3. 5.3 what-if scenarios beyond `close_port`
  4. 3.4 topology polish (keep a basic graph)
  5. 8.1–8.2 Learn (keep the verdict buttons only)
- **Never cut:** Phase 1 security (RLS, auth, scope), the Phase 2 slice, honest ML evaluation, the defense guardrails, the demo fallback.

## Weekly ritual (15 min, all three)
1. Each member: what was merged, the gate status, any blocker.
2. Update the `PROGRESS.md` "Active parallel sessions" table.
3. Decide on contract or schema changes for next week (M3 merges them first).
4. Check the timeline. Apply the cut line if you're behind.
