# Current Focus

Last updated: 2026-08-16

## Active milestone

**M1 — Source intake and AI analysis vertical slice**

Roadmap source: `docs/ROADMAP.md`.

## Current repository state

M0 foundation is complete. A post-exit **M0 review-hardening** pass landed on `feature/m0-foundation` (no M1 domain work).

Verified gate:

```bash
pnpm verify
```

(`verify` = lint + typecheck + test + build; 53 tests passing.)

Implemented in M0 (including hardening):

- Vite + React + TypeScript + pnpm app with ESLint, Vitest, RTL, and `vite-plugin-pwa`
- Module boundaries under `src/` (`app`, `features`, `ai`, `db`, `sync`, `shared`, `learning` placeholder)
- Dexie DB v1: `providerProfiles`, `appSettings`, `meta` + repositories
- Migration test pattern: `src/db/migrations/migration-chain.test.ts` (fake-indexeddb + Dexie version chain; ready for M1 v2)
- Storage persistence status/request service (`navigator.storage`)
- Non-secret `AIProviderProfile` + separate credential store (session default, remember opt-in)
- Blank API-key field preserves existing secret when switching session ↔ remember
- Provider base URL validated as absolute http(s) at save (matches adapter contract)
- OpenAI-compatible Chat Completions `fetch` adapter; optional/configurable timeout (no hard 30s default ceiling)
- `Test connection` is a minimal probe (model + tiny message only; no temperature/max_tokens)
- Structured-output fallback runner (json_schema → json_object → extract/validate/repair); **no** fallback on terminal AI errors (auth, rate limit, timeout, offline, network/CORS, aborted, missing credential)
- Home + Settings AI + Data/Storage UX wired through services (no direct IDB/fetch in components)
- Versioned JSON export envelope (no secrets) + import validate/preview only

## Mission for the next coding agent

Implement **M1** only: paste text / vocabulary list / custom topic → learning objective → validated AI analysis → Learning Pack draft persisted.

Do not start M2 exercise generation until M1 exit gate passes.

## Recommended M1 next actions

1. Add Source entity + repository and DB migration (new Dexie version; keep v1 chain — follow `migration-chain.test.ts`).
2. Build intake UX for the three reliable input types (no arbitrary URL fetch).
3. Define versioned analysis Zod schema + prompt contract using existing structured-output runner.
4. Persist Learning Pack draft + Concept / ConceptOccurrence minimal models.
5. Pack preview with ability to remove unwanted concepts before M2 generation.
6. Cover offline/CORS/auth/invalid-output failure states in UX + mocked tests.

## Important constraints (still in force)

- UI must not call IndexedDB or raw provider `fetch` directly.
- No paid live AI in normal CI; mock fixtures only.
- Credentials stay out of exports/backups.
- No Google Drive (M7). No FSRS (M4). No full practice engine (M2).

## Blockers

None for starting M1.

### Environment notes from M0 run

- `pnpm` was installed via `npm install -g pnpm` because Corepack hit EPERM on this Windows/nvm host.
- `gh` CLI was not available on PATH; close GitHub issue #1 manually or after installing `gh` if still open.
- If `vite build` fails resolving `workbox-window`, ensure the dependency is installed (declared in `package.json`).

## Later / discovered

- Need a later UX/design pass for the learner-facing visual system before polishing M2 practice screens.
- Need to decide exact FSRS rating UX before M4 release.
- Need to evaluate concept identity/deduplication semantics before M3.
- Need to decide how much provider capability auto-probing is worth versus manual toggles after testing real cheap providers.
- Need to evaluate reliable article capture options only after paste/local-file loop proves useful.
