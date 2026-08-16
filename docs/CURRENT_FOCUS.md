# Current Focus

Last updated: 2026-08-16

## Active milestone

**M0 — Foundation and product contracts**

Roadmap source: `docs/ROADMAP.md`.

## Current repository state

The repository has project documentation but application code has not yet been bootstrapped.

Completed foundation documentation:

- `README.md`
- `AGENTS.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/ROADMAP.md`
- `docs/CURRENT_FOCUS.md`
- `docs/DECISIONS.md` (expected companion decision log)

## Mission for the next coding agent

Implement **all of M0** to its exit gate. Do not stop after generating a Vite scaffold.

The goal of this run is to leave the repository in a state where the next agent can immediately begin M1 source intake and AI analysis without revisiting foundational architecture.

## Recommended execution order

### Batch A — Bootstrap and quality gates

1. Initialize React + TypeScript + Vite using pnpm.
2. Pin/declare Node.js >= 20.
3. Add scripts for lint, typecheck, test, and build.
4. Add Vitest + React Testing Library.
5. Add PWA integration and a minimal installable manifest.
6. Establish the folder boundaries from `PROJECT_CONTEXT.md`.
7. Run all available gates and fix bootstrap failures before proceeding.

Checkpoint this file after Batch A.

### Batch B — Local database foundation

1. Add Dexie and typed database wrapper.
2. Create DB v1 only for M0-needed state, likely:
   - provider profiles;
   - app settings;
   - backup/export metadata only if needed.
3. Put DB access behind repository/service boundaries.
4. Add migration/versioning test convention.
5. Implement storage persistence status + request service.
6. Add unit tests.

Checkpoint this file after Batch B.

### Batch C — AI configuration boundary

1. Define non-secret `AIProviderProfile`.
2. Define separate credential store abstraction.
3. Support:
   - base URL;
   - arbitrary model string;
   - Chat Completions protocol;
   - session-only API key;
   - explicit remember-on-device.
4. Never include credentials in profile export shape.
5. Add runtime schemas.

Checkpoint this file after Batch C.

### Batch D — OpenAI-compatible adapter

1. Implement normalized Chat Completions URL construction.
2. Implement fetch with AbortController/timeout.
3. Implement defensive response/error parsing.
4. Define user-facing error categories:
   - offline/network/CORS-like;
   - unauthorized;
   - model/provider error;
   - rate limit;
   - malformed response.
5. Implement minimal `Test connection` request.
6. Mock all tests; do not require a real paid endpoint.
7. Do not require `/models`.

Checkpoint this file after Batch D.

### Batch E — Structured data boundary

1. Add Zod-backed parse/validate helpers.
2. Define provider capability structure needed by M1.
3. Implement the architecture for structured-output fallback:
   - json schema when configured/supported;
   - json object mode when configured/supported;
   - prompt JSON + extract + validate + bounded repair.
4. Add tests for malformed JSON and schema mismatch.

Do not write the full learning-analysis prompt yet; that belongs to M1.

Checkpoint this file after Batch E.

### Batch F — Settings and data UX

Build usable pages:

- Home shell;
- Settings > AI Provider;
- Settings > Data & Storage.

Required behaviors:

- save/edit provider profile;
- arbitrary model input;
- session/persisted key choice;
- test connection;
- display useful error states;
- display persistent-storage status/request;
- display browser credential warning without making the app unusable.

Checkpoint this file after Batch F.

### Batch G — Export contract and M0 release gate

1. Define versioned export envelope.
2. Export all current non-secret local data.
3. Assert credential/API key is absent.
4. Implement import parse/validate preview or validation path; full destructive restore can remain later if roadmap allows.
5. Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

6. Manually verify the complete M0 exit gate from `docs/ROADMAP.md`.
7. Update roadmap M0 to complete only when every gate genuinely passes.
8. Rewrite this file for M1 with exact remaining state and next action.

## Important implementation notes

### Do not use the official OpenAI SDK as an architectural requirement

The target is arbitrary OpenAI-compatible providers in a browser. A small HTTP adapter around `fetch()` is likely more portable and keeps provider behavior explicit. If an SDK is introduced, it must not make custom base URLs/models or browser-only behavior harder.

### Do not build arbitrary URL ingestion in M0

Browser CORS makes it unreliable without a server/bridge. M1 starts with pasted text/list/topic.

### Do not build Google Drive in M0

Export contract first. Drive is M7.

### Do not create every future DB table now

Create persisted schema only when a milestone needs it. Keep migrations real and incremental.

### Avoid accidental secret export

Prefer a type/model split where secret credentials cannot accidentally be spread into normal persisted/export payloads.

## Known risks to watch during M0

1. **CORS ambiguity:** browser `fetch()` often cannot prove whether a generic network failure was truly CORS. UI wording should say something like "Network or CORS blocked the request" unless evidence is stronger.
2. **Credential persistence:** `remember on this device` is convenience, not server-grade secret storage.
3. **PWA caching:** service workers can make development/debugging confusing; keep update strategy explicit and test production build behavior.
4. **IndexedDB migrations:** schema changes after release must keep prior versions/migration logic as required by Dexie.
5. **Provider variance:** even nominally OpenAI-compatible APIs may diverge in error shape and optional structured-output fields.

## Blockers

None. M0 can begin immediately.

## Later / discovered

Keep future findings here rather than implementing them during M0.

- Need a later UX/design pass for the learner-facing visual system before polishing M2 practice screens.
- Need to decide exact FSRS rating UX before M4 release.
- Need to evaluate concept identity/deduplication semantics before M3.
- Need to decide how much provider capability auto-probing is worth versus manual toggles after testing real cheap providers.
- Need to evaluate reliable article capture options only after paste/local-file loop proves useful.
