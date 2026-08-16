# Current Focus

Last updated: 2026-08-16

## Active release target

**RC1 — Durable personal-use MVP (M1 → M5 continuously)**

Roadmap source: `docs/ROADMAP.md`.

Current internal milestone: **RC1 complete — awaiting holistic user review**.

## Execution policy for this release run

This branch is intentionally a long-running release branch.

Stop only when the **RC1 final acceptance** below passes, or a genuine blocker prevents safe progress.

Do not open one PR per milestone. One overall RC1 PR is prepared after the end-to-end release target is ready.

## Current repository state

RC1 implementation is on `feature/mvp-release-candidate`.

Shipped in this run:

- **M1:** Source intake (paste text / vocabulary / custom topic), learning goals, Dexie v2 sources/packs/concepts/occurrences, validated analysis schema + structured-output pipeline, pack preview with concept removal, failure UX mapping.
- **M2:** Exercise plan → generate → validate → persist pipeline; flashcard, MCQ, cloze, true/false; practice session UX; deterministic scoring; StudySession + immutable Attempt.
- **M3:** Conservative concept identity keys; mistake signals; mastery/weak projection; short-answer deterministic-first + optional AI grade; lazy learner-specific explanations.
- **M4:** `ts-fsrs` ReviewCard/ReviewLog; rating UX locked in D-023; due queue + review session; offline stored exercises; dashboard due/recent/weak/activity.
- **M5:** Export schema v2 full non-secret round-trip + replace restore; v1→v2 migration tests; storage/backup reminder UX; CSP/deploy docs; Playwright critical E2E; golden quality fixtures.

## RC1 final acceptance — checklist

1. [x] Configure arbitrary OpenAI-compatible provider/model
2. [x] Paste content/topic, choose goal, validated saved pack
3. [x] Generate + complete mixed practice with explanations
4. [x] Attempts persist across reload
5. [x] Wrong answers → concept weakness/mistake state
6. [x] FSRS due review later
7. [x] Offline stored review works (stored exercises; no AI required)
8. [x] Dashboard: due/recent/weak/activity
9. [x] Export all non-secret state, no credential
10. [x] Clear → restore → state survives
11. [x] Playwright critical E2E main loop (`pnpm test:e2e`)
12. [x] `pnpm verify` passes
13. [x] Docs accurate (`ROADMAP`, `DECISIONS`, this file)

## Verification

```bash
pnpm verify
pnpm test:e2e   # after: pnpm exec playwright install chromium
```

## Current next action

Holistic product/UX review on the RC1 PR. No further milestone work unless review finds blockers.

## Blockers

None.
