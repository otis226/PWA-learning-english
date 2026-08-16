# Architecture and Product Decisions

This file records decisions that long-running agents must not silently revisit. Add a new dated entry when a decision changes; do not erase history.

## D-001 — Local-first static web application

**Status:** Accepted  
**Date:** 2026-08-16

The initial product is a static PWA with no required application backend.

Reasoning:

- target use is personal/small-scale;
- avoid server/database/auth operations before product value is proven;
- local learning data should remain usable offline;
- users may bring their own AI endpoint and credentials.

Revisit when:

- a feature truly requires trusted server secrets;
- multi-user collaboration becomes a real requirement;
- reliable arbitrary webpage ingestion becomes essential;
- cross-device sync semantics justify backend infrastructure.

## D-002 — IndexedDB through Dexie is the primary database

**Status:** Accepted  
**Date:** 2026-08-16

IndexedDB is the local source of truth. Dexie provides the typed persistence/migration layer.

Google Drive/other cloud stores are backup/sync layers, not the live primary database.

Revisit only if real data/query complexity demonstrates that another local database is materially better.

## D-003 — Request persistent browser storage

**Status:** Accepted  
**Date:** 2026-08-16

The app should use the Storage API to detect/request persistent storage when supported, while still treating explicit export/backup as required because users can clear site data themselves.

## D-004 — OpenAI-style Chat Completions is the compatibility baseline

**Status:** Accepted  
**Date:** 2026-08-16

The first provider adapter targets:

```text
POST {baseUrl}/chat/completions
```

Rationale: many low-cost third-party providers advertise OpenAI compatibility at this endpoint, while newer optional surfaces such as Responses or provider-specific SDK features are less universal.

Responses API may be added as another adapter/capability later; it must not replace the compatibility baseline unless real provider usage proves otherwise.

## D-005 — Model names are free text

**Status:** Accepted  
**Date:** 2026-08-16

Do not require a hard-coded model catalog.

A provider may expose arbitrary names such as vendor-specific aliases or private routing identifiers. `/models` support is optional.

## D-006 — Provider capability, not provider brand, controls behavior

**Status:** Accepted  
**Date:** 2026-08-16

Business logic must not contain behavior like `if provider === OpenAI` for normal generation decisions.

Capabilities such as JSON Schema, JSON object mode, vision, Responses, or streaming are represented explicitly and consumed only where needed.

## D-007 — All LLM domain output is runtime validated

**Status:** Accepted  
**Date:** 2026-08-16

Use Zod/runtime schemas at the AI/domain boundary.

Structured-output fallback priority:

1. JSON Schema/strict mode when supported;
2. JSON object mode when supported;
3. strict JSON prompt + extraction + validation + bounded repair retry.

Raw model output never directly becomes persisted domain state.

## D-008 — Browser API keys are BYOK credentials, not server-grade secrets

**Status:** Accepted with explicit risk  
**Date:** 2026-08-16

The product intentionally allows a user to enter their own AI credential in the local PWA.

Rules:

- session-only should be the safe/default mode where practical;
- remember-on-device is explicit opt-in;
- secret storage is separated from provider profile/domain data;
- API keys are excluded from export and cloud backup by default;
- no credentials in logs;
- high-value shared production keys should use a future backend/local bridge.

This decision does **not** claim that browser-held credentials are equivalent to server secrets.

## D-009 — Export format exists before cloud backup

**Status:** Accepted  
**Date:** 2026-08-16

The stable portability boundary is a versioned JSON export schema.

Cloud backup adapters consume that application-level backup representation rather than inventing their own canonical data model.

## D-010 — Google Drive is optional backup via app data storage

**Status:** Accepted direction, implementation deferred to M7  
**Date:** 2026-08-16

Preferred implementation:

- browser Google Identity Services authorization;
- narrow Drive app-data scope;
- backup files in `appDataFolder`;
- manual backup/restore first;
- no live bidirectional sync initially.

## D-011 — Arbitrary URL ingestion is not an MVP reliability promise

**Status:** Accepted  
**Date:** 2026-08-16

A backend-free browser cannot reliably fetch/extract arbitrary articles because remote sites may block cross-origin reads.

Reliable MVP inputs:

- paste text;
- paste vocabulary/list;
- custom topic;
- local files later.

Direct URL ingestion may be offered as best-effort for CORS-compatible URLs. Reliable arbitrary webpage capture requires a later browser extension, local bridge, configurable extractor, or product architecture change.

## D-012 — FSRS owns review scheduling

**Status:** Accepted  
**Date:** 2026-08-16

Use `ts-fsrs` for due dates/review state.

AI may create or vary practice content but does not decide when a learner should review a concept.

Exact mapping from learner answer/result to FSRS ratings remains a product decision to lock before M4 exits.

## D-013 — Source-grounded learning content preserves evidence

**Status:** Accepted  
**Date:** 2026-08-16

Questions generated from a source should preserve source evidence/segment references where applicable.

Reading-comprehension facts should be answerable from the supplied source unless explicitly labeled as external/general knowledge.

## D-014 — Attempt history is not mastery state

**Status:** Accepted  
**Date:** 2026-08-16

Attempts/review logs are historical records. Current mastery is a derived/current projection and must not overwrite history.

This supports later re-analysis, debugging, scheduling, and model changes.

## D-015 — The same concept can recur across sources

**Status:** Accepted conceptually; detailed identity rules deferred to M3  
**Date:** 2026-08-16

Do not assume `concept = source-specific generated item`.

The system should eventually recognize recurring learning targets while retaining per-source occurrences/context. Avoid aggressive semantic merging until M3 defines safe identity/deduplication rules.

## D-016 — Initial exercise progression is broader than flashcards

**Status:** Accepted  
**Date:** 2026-08-16

Initial closed-form practice supports flashcard, MCQ, cloze, and true/false. Later progression should include recall and production-oriented formats such as error correction, transformation, and free production.

Exercise format is chosen to serve the learning target rather than being the primary product taxonomy.

## D-017 — No paid live AI dependency in normal CI

**Status:** Accepted  
**Date:** 2026-08-16

Automated tests use provider fixtures/mocks. Real endpoints can be used manually or in explicitly opt-in integration checks, but standard CI must be deterministic and not require an API key or incur model cost.
