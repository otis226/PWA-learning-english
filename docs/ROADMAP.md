# Execution Roadmap

This roadmap is written for long-running coding agents. Work one active milestone at a time. Every milestone has an exit gate; do not advance merely because most code exists.

Status legend:

- `[ ]` not started
- `[~]` active / partial
- `[x]` complete and exit gate passed
- `[!]` blocked or decision required

## Release strategy

The product should be built as vertical slices, not as isolated infrastructure layers.

Target checkpoints:

- **Prototype useful loop:** after M2
- **Personal daily-use MVP:** after M4
- **Durable first release:** after M5
- **Rich input release:** after M6
- **Optional cloud-backup release:** after M7

---

# M0 — Foundation and product contracts

**Status:** `[x] COMPLETE` (exit gate passed 2026-08-16)

## Objective

Create a stable local-first application foundation and contracts so later agents can implement features without changing architecture underneath them.

## Scope

### M0.1 Repository and toolchain

- [x] Initialize React + TypeScript + Vite application.
- [x] Use pnpm and require Node.js >= 20.
- [x] Add formatting/linting/typecheck scripts.
- [x] Add Vitest and React Testing Library.
- [x] Add Playwright dependency only if a first meaningful E2E smoke flow is created in this milestone; otherwise defer to M1/M2.
- [x] Configure Vite PWA integration and basic manifest.
- [x] Create installable app shell with an explicit update/offline-ready UX rather than invisible service-worker behavior.

### M0.2 Source boundaries

Create the baseline module boundaries:

```text
src/
  app/
  features/
  learning/
  ai/
    gateway/
    providers/
    schemas/
    prompts/
  db/
    schema/
    repositories/
    migrations/
  sync/
    export/
  shared/
```

- [x] React components do not directly call IndexedDB tables or raw provider `fetch()` calls.
- [x] Domain-facing interfaces exist for AI gateway and repositories.

### M0.3 IndexedDB foundation

- [x] Add Dexie.
- [x] Define DB version 1 with only tables needed by M0/M1; do not prematurely create every future table.
- [x] Establish migration conventions and migration test pattern.
- [x] Add local database health/open test.
- [x] Add browser storage status service using `navigator.storage.persisted()` when supported.
- [x] Add explicit persistent-storage request using `navigator.storage.persist()` behind sensible UX.

### M0.4 AI provider profile and credential boundary

Implement provider configuration without implementing learning generation yet.

Provider profile fields:

- [x] id;
- [x] display name;
- [x] base URL;
- [x] model free-text value;
- [x] protocol = Chat Completions initially;
- [x] optional capability overrides only where needed.

Credential behavior:

- [x] API key stored separately from exportable provider profile data;
- [x] session-only mode supported;
- [x] remember-on-device is explicit opt-in;
- [x] no secrets logged;
- [x] no credentials included in export.

### M0.5 OpenAI-compatible HTTP adapter

Implement the minimum portable provider adapter:

```text
POST {normalizedBaseUrl}/chat/completions
```

- [x] Normalize base URL/trailing slash safely.
- [x] Do not require `/models`.
- [x] Implement request timeout/abort.
- [x] Parse provider error bodies defensively.
- [x] Distinguish at least: network/CORS-like failure, unauthorized, model/not-found/provider error, invalid response.
- [x] Add a `Test connection` action using a minimal inexpensive request.
- [x] All tests use mocks/fixtures, not paid live endpoints.

### M0.6 Structured-data compatibility contract

Create the interfaces and runtime validator utilities needed later.

- [x] Zod boundary validation.
- [x] Capability representation for JSON Schema / JSON object mode.
- [x] Fallback architecture documented in code.
- [x] Bounded repair retry contract exists but does not need full learning prompts yet.
- [x] Invalid model output can never be silently stored as domain data.

### M0.7 Minimal app UX

Routes/views:

- [x] Home shell;
- [x] Settings > AI Provider;
- [x] Settings > Data/Storage skeleton.

The UI should already expose:

- [x] provider connection state;
- [x] model/base URL configuration;
- [x] storage persistence state where browser supports it;
- [x] clearly worded browser-key warning.

### M0.8 Backup contract skeleton

- [x] Define versioned export envelope and Zod schema.
- [x] Implement export of current non-secret DB data even if there is little data yet.
- [x] Confirm API key is absent from generated export.
- [x] Import may be read/validate-only in M0 if destructive restore UX is deferred.

## M0 exit gate

All of the following must be true:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

And manually/automated where appropriate:

- app runs and is installable as a PWA;
- Settings can save a provider profile and a user-entered arbitrary model name;
- credential can be session-only and optional remember-on-device;
- `Test connection` handles success and representative failure fixtures;
- closing/reopening the app preserves non-secret settings in IndexedDB;
- export is versioned and contains no API key;
- storage persistence capability/status is surfaced;
- repository docs reflect the actual implementation.

Do not start M1 before this gate passes.

---

# M1 — Source intake and AI analysis vertical slice

**Status:** `[~] ACTIVE`

## Objective

Prove the first half of the core loop:

```text
input -> learning objective -> validated AI analysis -> saved Learning Pack draft
```

No full practice engine yet.

## Scope

### M1.1 Reliable input types

Support exactly these initial input types:

- [ ] pasted text/article;
- [ ] pasted vocabulary/list;
- [ ] custom learning topic/instruction.

Do **not** make arbitrary URL fetch a dependency of M1.

### M1.2 Source model

- [ ] Source entity/repository.
- [ ] content normalization.
- [ ] content hash.
- [ ] source type/title/created timestamp.
- [ ] safe limits for extremely large pasted input.

### M1.3 Learning objective UX

Support goals:

- [ ] vocabulary;
- [ ] grammar;
- [ ] prepositions;
- [ ] collocations/expressions;
- [ ] reading comprehension;
- [ ] mixed/everything important;
- [ ] custom goal.

The user chooses **what to learn**. Exercise format remains engine-controlled.

### M1.4 Analysis contract

Define a versioned schema containing only data needed now, e.g.:

- estimated level/CEFR metadata when inferable;
- concepts;
- learning objectives;
- skills;
- evidence/context for source-derived items;
- suggested practice progression.

- [ ] Provider response is runtime validated.
- [ ] Structured-output fallback works through mocked provider variants.
- [ ] Invalid JSON/schema mismatch produces recoverable UX.
- [ ] Generation records provider profile id, model, schema/prompt version, source hash, timestamp.

### M1.5 Learning Pack draft

- [ ] LearningPack entity/repository.
- [ ] Concept and ConceptOccurrence minimal models.
- [ ] Pack preview page showing what AI found.
- [ ] User can remove unwanted generated objectives/concepts before exercise generation.

### M1.6 Failure states

Explicitly cover:

- [ ] offline;
- [ ] CORS/network/provider unreachable;
- [ ] bad API key;
- [ ] unknown/bad model;
- [ ] rate limit/provider error;
- [ ] invalid AI structured output.

## M1 exit gate

- paste each supported source type;
- choose objective;
- generate analysis from mocked integration plus at least one optional manually configured real compatible endpoint during development;
- persisted pack survives refresh/reopen;
- invalid provider output does not corrupt DB;
- relevant unit/integration tests pass;
- lint/typecheck/test/build pass.

---

# M2 — Exercise generation and core practice

**Status:** `[ ]`

## Objective

Complete a useful end-to-end learning loop for closed-form exercises.

```text
source -> analysis -> exercises -> answer -> feedback -> attempt saved
```

## Scope

### M2.1 Exercise contract

Initial types:

- [ ] flashcard;
- [ ] multiple choice;
- [ ] cloze;
- [ ] true/false.

Short answer is intentionally deferred until grading/mistake semantics are stronger.

Exercise data includes:

- target concept ids;
- skill;
- prompt/question;
- options where applicable;
- canonical answer/accepted answers;
- explanation;
- source evidence/segment for source-grounded exercises;
- difficulty metadata;
- generation provenance/version.

### M2.2 Generation pipeline

Prefer an explicit pipeline:

```text
Source
 -> Analyze
 -> Learning plan
 -> Generate exercises
 -> Validate
 -> Persist
```

- [ ] Avoid one giant prompt returning an uncontrolled full product state.
- [ ] Validate answer/options consistency.
- [ ] Detect duplicate/near-duplicate exercises within a pack where practical.
- [ ] Reject unsupported source-grounded comprehension questions lacking evidence.

### M2.3 Practice session

- [ ] one-question-at-a-time UI;
- [ ] progress indicator;
- [ ] submit/flip behavior by type;
- [ ] explanation after answer;
- [ ] keyboard usability for desktop;
- [ ] responsive usability for phone-sized screens.

### M2.4 Deterministic scoring

For closed-form exercise types, correctness should be application logic whenever possible.

- [ ] MCQ deterministic;
- [ ] true/false deterministic;
- [ ] cloze normalization rules documented/tested;
- [ ] flashcard self-evaluation semantics explicit.

Do not call AI merely to score an answer that can be scored locally.

### M2.5 Attempt history

- [ ] immutable Attempt records;
- [ ] StudySession record;
- [ ] pack completion summary;
- [ ] attempts survive reload.

## M2 exit gate

A new user can configure AI, paste content, create a pack, generate exercises, complete a practice session, see explanations, and reopen the app with the session history retained.

Tests must cover each initial exercise type and malformed generated exercise data.

---

# M3 — Mistake memory, concept reuse, and open-answer intelligence

**Status:** `[ ]`

## Objective

Turn isolated quiz attempts into a learner model.

## Scope

### M3.1 Concept identity

- [ ] concept normalization/deduplication strategy;
- [ ] same concept across different sources can link to one canonical Concept where confidence is high;
- [ ] preserve ConceptOccurrence per source/context;
- [ ] avoid unsafe over-merging of distinct meanings/usages.

### M3.2 Mistake model

- [ ] capture wrong-answer pattern/signals;
- [ ] distinguish exercise failure from a reusable misconception where possible;
- [ ] examples: `despite + clause`, `since vs for`, `in/on/at` confusion.

### M3.3 Concept mastery

- [ ] current mastery/strength projection derived from history;
- [ ] weak concepts view;
- [ ] pack/session contributes to mastery without rewriting history.

### M3.4 Short answer

- [ ] add short-answer exercise type;
- [ ] deterministic normalization first where appropriate;
- [ ] AI grading only when semantic evaluation is genuinely needed;
- [ ] grading output schema includes score/correctness, explanation, and bounded misconception tags;
- [ ] uncertain grading can be surfaced instead of pretending certainty.

### M3.5 Explanation behavior

- [ ] explanations reference source evidence when source-grounded;
- [ ] wrong answers can explain both correct rule and learner-specific mistake;
- [ ] explanation generation can be lazy/on-demand to control API cost.

## M3 exit gate

The app can demonstrate that repeated mistakes affect a concept-level weakness view and that the same concept encountered in another source does not necessarily become an unrelated learning identity.

---

# M4 — FSRS and daily review

**Status:** `[ ]`

## Objective

Make the app useful repeatedly without requiring a new source every session.

## Scope

### M4.1 Scheduling model

- [ ] integrate `ts-fsrs`;
- [ ] ReviewCard persistence;
- [ ] immutable ReviewLog persistence;
- [ ] due calculation independent of AI;
- [ ] scheduler configuration serialized/validated.

### M4.2 Rating UX

Design and test how exercise results map to FSRS ratings.

Do not blindly equate `correct = Good` and `wrong = Again` without UX consideration. A likely initial design is:

- incorrect -> Again;
- correct -> learner can choose Hard / Good / Easy, or the app can use a documented simplified rule.

Lock the selected behavior in `docs/DECISIONS.md` before shipping M4.

### M4.3 Daily review queue

- [ ] due count;
- [ ] review session;
- [ ] use existing exercise when appropriate;
- [ ] generate a fresh contextual exercise only when needed and network/provider is available;
- [ ] offline review still works with already-stored material.

### M4.4 Dashboard

Show useful, non-gamified state:

- reviews due;
- continue recent pack;
- weak concepts;
- recent learning activity.

### M4.5 Review without AI dependency

The user must be able to complete due stored reviews offline when the exercise material already exists.

## M4 exit gate — Personal daily-use MVP

A learner can use the app across multiple days and receive due reviews based on persisted FSRS state. Review scheduling remains stable across refresh/restart and is covered by deterministic tests.

---

# M5 — Data durability, migrations, offline hardening, and release quality

**Status:** `[ ]`

## Objective

Make the local-first promise trustworthy enough for real personal use.

## Scope

### M5.1 Export/import complete flow

- [ ] export all supported non-secret user data;
- [ ] schema version/migrations;
- [ ] import validation before mutation;
- [ ] clear replace-vs-merge semantics; initial release may support replace only;
- [ ] backup/restore round-trip automated test;
- [ ] API credentials never included by default.

### M5.2 DB migrations

- [ ] migration tests from every released DB schema version;
- [ ] rollback/failure behavior understood;
- [ ] no destructive schema change without migration.

### M5.3 Storage UX

- [ ] persistence status;
- [ ] estimated storage usage where available;
- [ ] warning when browser storage is not persistent;
- [ ] backup reminder based on meaningful data changes rather than nagging on every launch.

### M5.4 PWA/offline/update testing

- [ ] app shell works offline;
- [ ] local packs/reviews work offline;
- [ ] generation/cloud actions fail gracefully offline;
- [ ] service-worker update prompt tested;
- [ ] app update cannot silently strand DB migrations.

### M5.5 Security hardening

- [ ] no raw model HTML execution;
- [ ] safe markdown/text rendering;
- [ ] dependency/runtime-script review;
- [ ] credential logs scrubbed;
- [ ] Content Security Policy/deployment guidance documented;
- [ ] public repository contains no real credentials or user exports.

### M5.6 Critical E2E suite

Playwright covers at least:

- configure mocked provider;
- create source/pack;
- practice;
- reload and retain data;
- review due flow;
- export/restore representative dataset.

## M5 exit gate — Durable first release

All critical local-first flows are tested and data can be exported, cleared, restored, and used again without loss or secret leakage.

---

# M6 — Rich local-file ingestion

**Status:** `[ ]`

## Objective

Accept useful learning materials without introducing a backend.

## Scope

### M6.1 Text files

- [ ] `.txt`;
- [ ] `.md`;
- [ ] size limits and encoding/error UX.

### M6.2 PDF

- [ ] client-side PDF text extraction using PDF.js;
- [ ] preserve page/segment provenance sufficient for evidence links;
- [ ] handle scanned/no-text PDFs as unsupported or route to vision when capability exists;
- [ ] large PDF chunking strategy.

### M6.3 Images

Only when configured provider capability supports vision:

- [ ] image upload/local preview;
- [ ] image-to-learning analysis;
- [ ] explicit capability error when provider lacks vision.

### M6.4 URL ingestion — best effort only

- [ ] allow direct fetch only for CORS-compatible URLs;
- [ ] explain failure clearly;
- [ ] do not use insecure public CORS proxies by default;
- [ ] retain paste-text as reliable fallback.

Potential future options belong to M9: browser extension, local bridge, or configurable extractor service.

## M6 exit gate

Text and normal text-based PDFs can be turned into source-grounded packs entirely client-side, with provenance retained.

---

# M7 — Google Drive manual backup

**Status:** `[ ]`

## Objective

Provide optional off-device backup without changing the local-first source of truth.

## Scope

- [ ] Google Identity Services browser authorization;
- [ ] least-privilege Drive app-data scope;
- [ ] store backups in `appDataFolder`;
- [ ] manual `Backup now`;
- [ ] manual restore with backup metadata/preview;
- [ ] no API credential in Drive backup by default;
- [ ] disconnected/expired-token UX;
- [ ] cloud failure never blocks local learning.

Do not implement bidirectional live sync in M7.

## M7 exit gate

A user can authorize Drive, back up a versioned dataset, clear/use another clean browser profile, restore the backup, and continue learning with equivalent non-secret state.

---

# M8 — Adaptive personalized learning

**Status:** `[ ]`

## Objective

Use the learner model to create useful practice even without a new source.

## Scope

- [ ] `Practice weak spots`;
- [ ] personalized daily lesson planning based on due + weak concepts;
- [ ] preferred/interested source topics can influence example context without changing the target skill;
- [ ] progression from recognition to recall to production;
- [ ] generation budget/cost controls;
- [ ] avoid over-practicing one concept merely because the model keeps generating it.

Potential exercise additions:

- error correction;
- transformation;
- sentence reorder;
- production.

## M8 exit gate

The app can create a coherent personalized session from learner history alone and show why the selected concepts were chosen.

---

# M9 — Optional advanced infrastructure

**Status:** `[ ]`

This milestone is intentionally deferred. Only activate a sub-track when real usage justifies it.

Possible tracks:

### Local AI bridge

For providers that do not support browser CORS or for safer secret handling:

```text
PWA -> localhost bridge -> AI provider
```

The bridge must remain optional; do not make the hosted backend-free experience unusable without it.

### Reliable webpage ingestion

Options to evaluate:

- browser extension/share flow;
- local bridge extractor;
- user-configured extraction endpoint;
- optional hosted service if product direction changes.

### Multi-device sync

Only after conflict semantics are explicitly designed. Start from append-friendly history and deterministic merge rules; do not treat Google Drive file overwrite as sync.

### Speech/pronunciation

Only after text-learning core demonstrates real usage.

---

# Cross-cutting acceptance rules

These apply to every milestone.

## AI output

- runtime validate all domain-shaped AI output;
- never trust model-provided IDs blindly;
- bounded retry/repair only;
- preserve generation provenance;
- do not let provider brand leak into learning business logic.

## Persistence

- migration required for persisted schema changes;
- history should be append/immutable where practical;
- backups exclude secrets;
- tests cover persistence behavior, not just UI rendering.

## UX

- every network action has loading/error/retry/cancel behavior where meaningful;
- offline behavior is explicit;
- phone and desktop layouts remain usable;
- do not expose internal AI architecture jargon unnecessarily to learners.

## Cost

- deterministic local logic before AI calls;
- no AI call for FSRS scheduling;
- no AI call for scoring simple closed-form questions;
- cache/reuse generated content appropriately;
- do not regenerate an unchanged pack automatically.

## Scope discipline

If an agent discovers a valuable future feature:

1. record it in `docs/CURRENT_FOCUS.md` under `Later / discovered`;
2. add to roadmap only if it materially changes planned scope;
3. do not implement it during the wrong milestone.
