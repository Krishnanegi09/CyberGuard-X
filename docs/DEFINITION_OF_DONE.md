# DEFINITION OF DONE — CYBERGUARD-X

> **Purpose:** stop anyone, human or AI, from marking unfinished work as done.
> **Rule of thumb:** if you can't paste the evidence, it isn't done.

"Done" is a claim, and every claim needs **evidence**: real command output, a file path, a commit sha or a screenshot, produced *in this session* or linked to a dated record. Confidence, intent and "it should work" are not evidence.

---

## 1. Status vocabulary (use only these words)

| Status | Meaning | Allowed when |
|---|---|---|
| `NOT STARTED` | No code written | — |
| `IN PROGRESS` | Code being written; may not run | Any time |
| `IMPLEMENTED` | Code written and it runs, but **not yet verified** against the DoD | Code compiles and imports; no checklist yet |
| `VERIFYING` | Running the checks in §3–§5 | Checks in flight |
| `BLOCKED` | Can't continue without a person or decision | Blocker written in `PROGRESS.md` |
| `DONE` | **Every** item of the matching checklist below is ticked **with evidence** | Only then |
| `DONE WITH EXCEPTIONS` | Done except named items the **user explicitly accepted** in chat | User approval quoted in `PROGRESS.md` |

**Banned phrases** in status reports, because they hide unfinished work: "should work", "basically done", "mostly done", "done (untested)", "done, just needs tests", "ready" without evidence, "fixed" without a re-run, "all tests pass" without the output.

If you used "implemented" or "added" for something you didn't run, say **`IMPLEMENTED — not verified`**.

---

## 2. Levels of done

| Level | Scope | Checklist | Who can declare it |
|---|---|---|---|
| **Task** | One change (a function, endpoint, component, fix) | §3 | The agent, with evidence |
| **Milestone** | A numbered item such as `2.3` in `docs/phases/` | §3 + §4 | The agent, with evidence, **plus** an independent review |
| **Phase** | All `[MVP]` milestones of a phase | §3 + §4 + §5 | Only after `./scripts/check-phase.sh N` passes **and** the user confirms |

A higher level is never done while any lower-level item inside it isn't.

---

## 3. Task checklist (every change)

**Works**
- [ ] The code runs. I executed it (test, script, curl or UI) and saw it do the intended thing. *Evidence: command and output.*
- [ ] Failure paths are handled: invalid input, missing permission, DB error, timeout, empty result. *Evidence: tests or a manual check per path.*
- [ ] No `TODO`, `FIXME`, `pass`, `NotImplementedError`, `console.log`, commented-out code or placeholder return values left in the changed lines, unless they're recorded as a known limitation.

**Tested**
- [ ] There are new or updated tests for the new behaviour. They **fail without the change** (I checked by reverting or reasoning explicitly) and pass with it.
- [ ] No test was skipped, deleted, weakened or marked `xfail` to get green.
- [ ] `./scripts/verify-all.sh` SUMMARY is pasted, and every row is PASS or a pre-existing baseline failure listed in `docs/AUDIT.md`.

**Safe** (where it applies)
- [ ] An endpoint follows the `new-api-endpoint` skill: org scope, role check, provenance, error envelope, and cross-org and wrong-role tests.
- [ ] A schema change followed the `safe-migration` skill, with evidence in `PROGRESS.md`; `rls-check` passes.
- [ ] Scans and executors validate scope in **both** the API and the worker; argv lists only.
- [ ] No secrets in the diff (`git diff --cached | gitleaks stdin`, or the pre-commit hook passed).

**Truthful**
- [ ] UI and API changes: `no-fake-data-audit` is CLEAN.
- [ ] Every new data view has loading, empty and error states. *Evidence: screenshot, or a test for each.*
- [ ] Every new response item carries `provenance`.

**Recorded**
- [ ] Committed on a feature branch. *Evidence: sha.*
- [ ] `PROGRESS.md` updated with an evidence line.
- [ ] `CONTRACTS.md` / `DECISIONS.md` / `PERF.md` updated if they're affected.

---

## 4. Milestone checklist (on top of §3)

- [ ] **Every exit criterion** in the milestone's `docs/phases/phase-N.md` entry is met, each with its own evidence line.
- [ ] The milestone's named **acceptance tests exist** in `backend/tests/acceptance/`, carry the `phaseN` marker, and pass: `pytest -m phaseN -v` output is pasted, showing the test names.
- [ ] **End-to-end proof:** the feature was exercised through the real path (UI or API → worker → DB → back to the UI), not only through unit tests. For anything network-related, against the **lab**. *Evidence: command transcript or screenshot with a timestamp.*
- [ ] **Integration:** works with the code merged from other workstreams (rebased on the integration branch; verify-all re-run after the rebase).
- [ ] **Generated client** is regenerated and committed if the API changed (`git diff --exit-code src/api` is clean after `npm run gen:api`).
- [ ] **NFRs** tied to the milestone (see the phase brief) are measured and recorded in `docs/PERF.md`, *even if they miss the target*.
- [ ] **Independent review** was run (`kickoff/review.md` in a fresh session or subagent). Every finding is fixed or explicitly accepted by the user. *Evidence: the review table and its resolutions.*
- [ ] **Docs:** the user-visible behaviour is described where a teammate would look for it (the phase brief, `LAB.md`, the API docs).
- [ ] **Placeholder audit:** anything stubbed, mocked or deferred is listed under "Real vs placeholder" in the session report. An empty list must be a true statement.

---

## 5. Phase checklist (on top of §3 and §4)

- [ ] Every `[MVP]` milestone in the phase is `DONE` (or `DONE WITH EXCEPTIONS` with the user's approval quoted).
- [ ] `./scripts/check-phase.sh N` prints `PHASE N GATE: PASS`. Paste the full output. This run must be on the **integration branch**, not a feature branch.
- [ ] Gates of earlier phases still pass (the script is cumulative, so this is covered if the step above passes).
- [ ] The demo steps for this phase in `docs/DEMO_RUNBOOK.md` run by hand from a reset lab with **no manual DB edits**.
- [ ] Threat-model rows touched by this phase have a passing test or a documented residual risk.
- [ ] The "Phase gates" table in `PROGRESS.md` is filled in with the date and result.
- [ ] **The user confirmed** the phase is complete. Quote their message in `PROGRESS.md`.

---

## 6. Things that are NOT done (common false positives)

| Looks done… | …but isn't, because | What is needed |
|---|---|---|
| "Build passes" | A build only proves it compiles | Run the feature and show its behaviour |
| "Tests pass" (no output shown) | Unverifiable claim | Paste the output with the test count |
| Tests pass but test only mocks | Real integration is unproven | At least one test through the real DB and worker path |
| New test written, never seen failing | It may test nothing | Show it fails without the change |
| UI looks right with sample data | Possible fake data in production | `no-fake-data-audit` CLEAN plus the real API wired |
| Endpoint works for my org | Isolation unproven | Cross-org and wrong-role tests pass |
| Migration ran on the dev DB | Data preservation unproven | `safe-migration` evidence (counts, UUIDs, downgrade) |
| Works on the feature branch | May break after merge | Re-verify after the rebase on integration |
| Happy path demoed | Failure modes unknown | Failure-path tests (§3) |
| "Fixed" | Not re-run | Re-run the failing check and paste it passing |
| Model trained, accuracy 99% | Likely leakage or training-set metric | `ml-experiment` report with held-out, session-split, 3-table results |
| Scan works on localhost | Scope and lab behaviour unproven | Run against the lab CIDR; out-of-scope target rejected |
| Action executed | Effect unverified | `verify()` result plus a successful rollback |
| TODO left "for later" | Unfinished work hidden | Finish it, or record it as a limitation or in `[STRETCH]` |
| Agent says "done" at the end of a long session | Context drift; checks may be stale | Re-run verify-all at the end, after the last edit |

---

## 7. Evidence block format

Every `DONE` claim in `PROGRESS.md` or a session report uses this block:

```markdown
### DONE: <level> <id> — <name>   (YYYY-MM-DD, <branch>@<sha>)
- Checklist: §3 ✓ · §4 ✓ · §5 n/a
- verify-all: `<SUMMARY lines pasted>`
- Acceptance: `pytest -m phase2 -v` → 7 passed (test_vertical_slice_e2e, …)
- E2E proof: <command transcript / screenshot path>
- Review: kickoff/review.md run → 2 findings, both fixed (<sha>)
- NFR: P3 detection latency p95 = 6.2 s (target ≤ 10 s) → docs/PERF.md
- Real vs placeholder: Real — all. Placeholder — none.
- Exceptions (user-approved): none
```

If any line can't be filled in truthfully, the status is **not** `DONE`. Use `IMPLEMENTED — not verified`, `VERIFYING` or `BLOCKED` instead and say what's missing.

---

## 8. Self-check before saying "done"

Answer these honestly in your reply:
1. Did I **run** it after my **last** edit? (If I edited after the last test run, the answer is no.)
2. Can I paste output for every checkbox I ticked?
3. Is anything stubbed, mocked, hard-coded or deferred? Is it listed?
4. Would the test still pass if my feature were deleted? (If yes, it isn't testing the feature.)
5. Did I check the failure paths, the other org and the wrong role?
6. Would a teammate reviewing cold agree, without my explanation?

Any "no" or "not sure" means the work isn't done. Report the honest status.
