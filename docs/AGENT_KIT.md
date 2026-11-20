# CYBERGUARD-X Agent Kit

This kit replaces the single long master prompt. It is a set of small files that you copy into the repo, so each AI session loads only what it needs.

> *Predict. Protect. Respond. Before Threats Strike.*

## Why a kit instead of one prompt
- Agents load `CLAUDE.md` (or `AGENTS.md`) automatically on every turn, so it stays short and holds only the hard rules.
- Detailed design lives in `docs/design/`, and an agent reads a file only when its task needs it.
- Each phase has its own brief in `docs/phases/` with a runnable exit check.
- Repeated procedures live in skills under `.claude/skills/`, so every session runs them the same way.
- To start a session, paste one short prompt from `kickoff/`.

## Install into the repo (one time, on the Mac)
```bash
cd ~/Documents/Projects/CYBERGUARD-X
git checkout -b chore/agent-kit
# copy the kit contents (not the kit folder itself) into the repo root
rsync -av --ignore-existing /path/to/cyberguard-x-kit/ ./ --exclude README.md
cp /path/to/cyberguard-x-kit/README.md docs/AGENT_KIT.md
ln -s CLAUDE.md AGENTS.md            # Antigravity / other tools read AGENTS.md
chmod +x scripts/check-phase.sh scripts/verify-all.sh
git add -A && git commit -m "chore: add agent kit (rules, design docs, phases, skills)"
```
`--ignore-existing` keeps any file the repo already has, such as an existing `CLAUDE.md`. Merge those by hand.

## Layout
```
CLAUDE.md                     ← hard rules, commands, map of everything (auto-loaded)
PROGRESS.md                   ← live status; updated every session
docs/
  DEFINITION_OF_DONE.md       ← what "done" means: checklists, banned phrases, evidence format
  CONTRACTS.md                ← enums, API conventions, payload shapes
  DECISIONS.md                ← ADR log (seeded with the v2 design decisions)
  TIMELINE.md                 ← week plan, deadlines, cut line
  ACADEMIC_MAPPING.md         ← report chapters ← build artifacts
  DEMO_RUNBOOK.md             ← demo script + fallback plan
  design/
    01-architecture.md        02-data-model.md        03-observe-understand.md
    04-twin-ml.md             05-defense.md           06-threat-model.md
    07-nfr.md                 08-lab.md               09-ethics-legal.md
    10-ui.md
  phases/phase-0.md … phase-9.md
  HANDOFF/                    ← per-session handoff briefs
.claude/skills/               ← safe-migration, verify-all, new-api-endpoint,
                                no-fake-data-audit, rls-check, ml-experiment, session-close
scripts/
  verify-all.sh               ← lint + types + tests + build, both stacks
  check-phase.sh              ← `./scripts/check-phase.sh N` = milestone exit gate
kickoff/                      ← prompts to paste when starting a session
```

## How to use it day to day
| You want to… | Paste this into a new session |
|---|---|
| Start the project (first time) | `kickoff/00-audit.md` |
| Continue where the last session stopped | `kickoff/01-resume.md` |
| Run M1's (network) workstream | `kickoff/m1-network.md` |
| Run M2's (intel / twin / ML) workstream | `kickoff/m2-intel.md` |
| Run M3's (platform / defense) workstream | `kickoff/m3-platform.md` |
| Get an independent review of a branch | `kickoff/review.md` |

**Golden rule:** nothing is done until it meets `docs/DEFINITION_OF_DONE.md` with pasted evidence. A phase is done when `./scripts/check-phase.sh N` passes on the integration branch, the result is recorded in `PROGRESS.md`, and you have confirmed it. An agent saying it's done doesn't count.
