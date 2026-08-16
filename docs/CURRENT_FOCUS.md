# Current Focus

Last updated: 2026-08-16

## Active release target

**RC1 — Durable personal-use MVP (M1 → M5 continuously)**

Roadmap source: `docs/ROADMAP.md`.

Current internal milestone: **M1 — Source intake and AI analysis vertical slice**.

## Execution policy for this release run

This branch is intentionally a long-running release branch.

**Do not stop for user review after M1, M2, M3, or M4.** Each milestone remains a real quality gate, but it is an internal checkpoint only. When a milestone gate passes:

1. mark that milestone complete in `docs/ROADMAP.md`;
2. update this file with exact repository state;
3. run `pnpm verify`;
4. continue immediately into the next milestone included in RC1.

Stop only when:

- the **RC1 final acceptance** below passes;
- a genuine blocker prevents safe progress;
- continuing risks data loss, credential exposure, security regression, or requires an irreversible product decision that cannot safely use a reversible default.

Do not open one PR per milestone. Keep coherent, resumable commits on `feature/mvp-release-candidate`; prepare one overall RC1 PR only after the end-to-end release target is ready.

## Current repository state

M0 is merged to `main` at squash commit `3723650` and forms the foundation for this branch.

M0 includes:

- Vite + React + TypeScript + PWA shell;
- Dexie/IndexedDB local-first persistence foundation;
- migration-chain test pattern;
- replaceable OpenAI-compatible Chat Completions gateway;
- BYOK credential separation with session/remember modes;
- minimal provider connection probe;
- structured-output validation and bounded repair;
- fallback only on concrete unsupported structured-output evidence;
- provider/storage settings UX;
- versioned secret-free export skeleton;
- `pnpm verify` quality gate.

No M1 domain implementation exists yet.

## RC1 product outcome

The release is not complete until a user can perform this entire loop in one installed/static PWA:

```text
Configure AI provider
      ↓
Paste text / vocabulary / custom topic
      ↓
Choose what to learn
      ↓
AI analyzes into a validated Learning Pack
      ↓
Generate exercises
      ↓
Practice and receive feedback
      ↓
Attempts are saved
      ↓
Mistakes affect concept mastery
      ↓
Due concepts enter FSRS review
      ↓
Daily review works across restart/offline where stored material exists
      ↓
All non-secret learning data can be exported, cleared, restored, and used again
```

The final result must be usable enough for a holistic product/UX review rather than merely proving isolated infrastructure pieces.

## Internal milestone sequence

### Stage 1 — M1: Intake + AI analysis

Implement the complete M1 roadmap gate:

- pasted text/article;
- pasted vocabulary/list;
- custom topic/instruction;
- learning-goal selection;
- Source persistence + content hash/normalization;
- versioned validated AI analysis contract;
- LearningPack + minimal Concept/ConceptOccurrence persistence;
- pack preview/edit-before-generation;
- explicit provider/offline/invalid-output failure UX.

After M1 passes, **continue directly to M2**.

### Stage 2 — M2: Exercise generation + practice

Complete a real useful learning loop:

- flashcard;
- MCQ;
- cloze;
- true/false;
- validated exercise generation pipeline;
- deterministic scoring where possible;
- one-question-at-a-time practice UX;
- StudySession + immutable Attempt history;
- retained state after reload.

After M2 passes, **continue directly to M3**.

### Stage 3 — M3: Learner memory

Add:

- canonical concept identity with conservative deduplication;
- ConceptOccurrence preservation;
- mistake/misconception signals;
- concept mastery / weak concepts;
- short-answer exercise with deterministic-first and AI grading only when needed;
- source-grounded, learner-specific explanations.

Prefer conservative correctness over clever over-merging.

After M3 passes, **continue directly to M4**.

### Stage 4 — M4: FSRS + daily review

Add:

- `ts-fsrs` scheduling;
- ReviewCard + immutable ReviewLog;
- explicit rating UX decision recorded in `docs/DECISIONS.md`;
- due queue and review session;
- dashboard with due reviews, recent packs, weak concepts, recent activity;
- offline review of already-stored material.

After M4 passes, **continue directly to M5**.

### Stage 5 — M5: Durable release quality

Complete:

- full non-secret export/import round trip;
- DB migration tests for every shipped schema version;
- storage durability UX;
- PWA/offline/update hardening;
- security review/no unsafe model HTML;
- credential/log scrubbing;
- deployment/CSP guidance;
- Playwright critical E2E flows;
- representative restore-after-clear test.

Only after M5/RC1 passes should this run stop for overall product review.

## Horizontal quality workstream — AI learning quality

Do not treat “schema-valid model response” as equivalent to “good learning material”. Beginning in M1 and expanded in M2/M3, maintain deterministic golden fixtures under a test/eval area for representative learning inputs, including at minimum:

- vocabulary list;
- `despite` vs `although` grammar;
- preposition-focused input;
- short article / reading comprehension;
- mixed learning goal.

The eval layer should catch obvious quality failures where deterministic checks are possible:

- unsupported source claims;
- missing source evidence for grounded reading questions;
- duplicate/near-duplicate exercises;
- multiple-correct-answer MCQs;
- answer/options inconsistency;
- empty or malformed explanations;
- target concept mismatch.

Do not require paid live models in normal CI. Golden provider fixtures/mocks must make the quality pipeline deterministic. Real provider smoke checks remain optional/manual.

## Important constraints for all RC1 stages

- No required backend.
- IndexedDB remains source of truth.
- React UI must not call raw IndexedDB tables or raw provider `fetch` directly.
- Provider/model names remain configurable; no product behavior keyed to specific model names.
- All AI-shaped domain data is runtime validated before persistence.
- Closed-form scoring stays deterministic when possible.
- AI never owns mastery or scheduling state.
- FSRS, not AI, owns review dates.
- Credentials stay out of exports/backups and logs.
- No arbitrary URL ingestion dependency.
- No Google Drive in RC1.
- No PDF/image ingestion in RC1.
- No M6/M7+ feature creep unless required to fix a blocker in the M1–M5 core loop.

## Verification discipline

During work, run focused tests frequently. At every milestone boundary run:

```bash
pnpm verify
```

By M5, add and run Playwright for the critical end-to-end flows from the roadmap.

If a milestone gate fails, fix it before advancing. Do **not** ask for user review merely because a milestone completed.

## RC1 final acceptance — stop here for holistic review

All of the following must be demonstrably true:

1. A fresh user can configure an arbitrary OpenAI-compatible provider/model.
2. They can paste content or a topic, choose a learning goal, and obtain a validated saved pack.
3. They can generate and complete a mixed practice session with explanations.
4. Attempts persist across reload/restart.
5. Wrong answers produce concept-level weakness/mistake state.
6. Due review is scheduled with FSRS and can be completed later.
7. Stored review material remains usable offline.
8. Dashboard reflects real recent/due/weak state.
9. Export contains all supported non-secret learning state and no credential.
10. Data can be cleared, restored from export, and the representative learning/review state survives correctly.
11. Critical E2E tests cover the main loop.
12. `pnpm verify` passes.
13. `docs/ROADMAP.md`, `docs/DECISIONS.md`, and this file accurately describe the shipped behavior.

When these pass, prepare one overall RC1 PR and stop for a holistic user review of functionality, UX, learning quality, and product direction.

## Current next action

Begin **M1** implementation now. After the M1 gate passes, continue into M2 without asking for review.

## Blockers

None.
