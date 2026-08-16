# Current Focus

Last updated: 2026-08-17

## Active release target

**RC1.1 — Stabilization of the durable personal-use MVP**

Roadmap source: `docs/ROADMAP.md`.

Current internal milestone: **RC1.1 correctness/compatibility fixes**. Do **not** start M6.

## Execution policy for this release run

Stay inside the four RC1.1 findings. Do not add PDF/image ingestion, Google Drive, UX redesign, or unrelated polish.

Stop only when the RC1.1 exit gate below passes, or a genuine blocker prevents safe progress.

## Current repository state

RC1 (M1–M5) is on `main`. This run is `fix/rc1-stabilization`.

RC1.1 locks:

- Pack detail and **new** practice sessions load `LearningPack.exerciseIds` only. Historical exercises/attempts stay in IndexedDB.
- Generated exercises must resolve `targetConceptLabel`s explicitly. No silent fallback to the first pack concept.
- Reading/source-comprehension evidence is required by domain semantics, not only when the model sets `groundedInSource=true`.
- Structured-output requests do not inject `temperature` unless a caller configures it (extends D-022).

## RC1.1 exit gate

1. [x] Regenerated pack practice uses only current `exerciseIds`
2. [x] Unresolved target concepts are rejected; mastery/FSRS cannot update a fallback concept
3. [x] Reading exercises without the model grounding flag still require valid evidence
4. [x] Structured-output request body has no `temperature` unless configured
5. [x] `pnpm verify`
6. [x] `pnpm test:e2e`
7. [x] Docs accurate (`DECISIONS` D-026, this file)

## Verification

```bash
pnpm verify
pnpm test:e2e   # after: pnpm exec playwright install chromium
```

## Current next action

Open/land the RC1.1 PR to `main`. Do not start M6.

## Blockers

None.

## Later / discovered

- M6 rich local-file ingestion (not this run)
- M7 Google Drive backup
