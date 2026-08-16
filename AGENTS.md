# AGENTS.md

This repository is designed for long-running AI-assisted implementation. Treat these files as the project memory.

## Mandatory read order

Before changing code, read:

1. `AGENTS.md`
2. `docs/PROJECT_CONTEXT.md`
3. `docs/ROADMAP.md`
4. `docs/CURRENT_FOCUS.md`
5. `docs/DECISIONS.md`

Then inspect the relevant source and tests. Never implement from chat history alone when repository docs exist.

## Operating rules

### 1. Execute the active release target continuously

`docs/CURRENT_FOCUS.md` defines the active **release target** and the current internal milestone.

Milestones are internal quality checkpoints, not mandatory user-review stops. When the current milestone exit gate genuinely passes, update the repository docs and continue immediately to the next milestone included in the active release target. Do not wait for user review between milestones unless `docs/CURRENT_FOCUS.md` explicitly says to stop.

Stop the long run only when one of these is true:

- the active release target exit gate is complete;
- a genuine blocker prevents safe progress;
- continuing risks data loss, credential exposure, security regression, or an irreversible product decision requiring user input;
- the repository instruction explicitly requests a review checkpoint.

Do not implement work beyond the active release target merely because it is easy or interesting. If a later concern affects today's architecture, create the smallest extension point needed without implementing the later feature.

### 2. Preserve the core architecture

Non-negotiable unless an explicit decision change is recorded:

- local-first static web application;
- no required application backend for the initial product;
- IndexedDB is the primary user-data store;
- AI providers are replaceable and OpenAI-compatible at the boundary;
- model names are user-entered, not hard-coded;
- learning state belongs to the app/database, never to model conversation history;
- cloud storage is backup/sync, never the source of truth;
- FSRS owns review scheduling; AI does not decide review dates;
- provider credentials are secrets and are excluded from exports/backups by default.

### 3. Keep boundaries explicit

Business logic must not live inside React components.

Preferred boundaries:

```text
src/
  app/
  features/
  learning/
  ai/
  db/
  sync/
  shared/
```

UI calls use-cases/services. Use-cases call repositories, schedulers, parsers, and AI gateway interfaces. Provider-specific request/response shapes stay inside `src/ai/providers/`.

### 4. Provider compatibility beats provider cleverness

The compatibility baseline is OpenAI-style Chat Completions over HTTP.

Do not assume every provider supports:

- `/models`;
- Responses API;
- JSON Schema structured outputs;
- tool calling;
- vision;
- streaming;
- file upload.

Capabilities must be probed or explicitly configured. The app must degrade deliberately rather than silently break.

Preferred structured-output fallback order:

1. JSON Schema / strict structured output when confirmed supported;
2. JSON-object mode when confirmed supported;
3. strict prompt contract + JSON extraction + runtime validation/repair.

All AI output crossing into domain data must be runtime-validated.

### 5. Browser-only constraints are product constraints

Do not hide browser limitations with hacks.

- Cross-origin AI and URL fetches require provider/server CORS support.
- Do not disable browser security or recommend launching Chrome with CORS disabled.
- Arbitrary article URL ingestion is not guaranteed in a backend-free app.
- Prefer paste-text and local-file ingestion for reliable MVP behavior.
- A future local bridge/proxy may be added, but it is not part of the active release target unless roadmap status changes.

### 6. API-key handling

Never commit API keys or example real credentials.

For the browser-only BYOK mode:

- default to session-only credential storage where practical;
- "remember on this device" must be an explicit user choice;
- keep secret credential storage separate from exportable provider profile metadata;
- never include API keys in JSON export or Google Drive backup by default;
- never log Authorization headers;
- never send credentials to analytics or error-reporting services;
- minimize third-party runtime scripts and avoid unsafe HTML rendering.

This mode is intended for personal/user-owned credentials. High-value shared production keys require a trusted backend or local bridge.

### 7. Data durability is a first-class feature

IndexedDB is local-first, not magically permanent.

Implementation must include:

- schema versioning and migrations;
- `navigator.storage.persist()` request/status when supported;
- versioned JSON export/import;
- import validation before mutation;
- deterministic backup schema version;
- no secrets in backups by default.

Never change persisted schemas without a migration plan and tests.

### 8. Source-grounded exercises

Exercises generated from a source must carry provenance where applicable:

- source id;
- evidence text/range or source segment id;
- target concept/skill;
- generation metadata/prompt version.

Do not generate factual reading-comprehension questions that require knowledge absent from the provided source unless the exercise is explicitly labeled as external/general knowledge.

### 9. Testing and quality gates

Every milestone defines an exit gate in `docs/ROADMAP.md`. Do not mark a milestone complete until its gate passes. However, passing a milestone gate means **advance to the next milestone in the active release target**, not stop for external review.

Use the repository verification command:

```bash
pnpm verify
```

Run narrower checks during a batch when useful, but run `pnpm verify` before declaring a milestone complete. Add Playwright for critical end-to-end flows once those flows exist.

Prefer deterministic tests with mocked AI responses. Do not make normal CI depend on a paid live model endpoint.

### 10. Long-running checkpoint discipline

After every meaningful batch of work:

1. run the relevant checks;
2. update `docs/CURRENT_FOCUS.md` with completed work, remaining work, blockers, and exact next action;
3. update `docs/DECISIONS.md` if an architectural/product decision changed;
4. update `docs/ROADMAP.md` only when milestone status or scope actually changes;
5. continue working if the active release target is not yet complete.

If context is reset, the next agent must be able to continue using repository state alone.

### 11. Failure handling

If an approach fails repeatedly:

- stop repeating the same attempt;
- record the failure and evidence in `docs/CURRENT_FOCUS.md`;
- choose the smallest safe alternative;
- continue independent tasks when possible.

Never mark a workaround as a complete implementation unless it meets acceptance criteria.

### 12. Definition of done for a task

A task is done only when:

- implementation exists;
- relevant tests exist or an explicit reason is recorded;
- lint/typecheck/test/build relevant to the change pass;
- persisted-data impact is handled;
- user-visible failure states are handled;
- `docs/CURRENT_FOCUS.md` reflects reality.

A release run is done only when the release target exit gate in `docs/CURRENT_FOCUS.md` is satisfied end-to-end.

## Git discipline

- Keep changes scoped to one coherent batch inside the release target.
- Prefer small, resumable commits; do not create a PR or stop solely because an internal milestone ended.
- Do not mix unrelated refactors with feature work.
- Never rewrite persisted-data history merely to make migrations look cleaner.
- Do not commit generated secrets, local database dumps, or personal learning exports.

## When uncertain

Use this priority order:

1. current repository/user instruction;
2. `AGENTS.md`;
3. `docs/CURRENT_FOCUS.md` active release target;
4. `docs/DECISIONS.md`;
5. current milestone acceptance criteria;
6. `docs/PROJECT_CONTEXT.md`;
7. smallest reversible implementation.

Record material uncertainty instead of silently inventing product rules.
