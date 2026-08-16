# PWA Learning English

A local-first, AI-assisted English learning PWA that turns user-provided content into structured learning packs, exercises, review sessions, and long-term mastery data.

## Product idea

**Turn anything into something you can learn.**

Users paste text, vocabulary lists, or a topic, choose what they want to learn, and let an OpenAI-compatible AI provider generate a structured learning pack. The application owns learning state locally: attempts, mistakes, mastery, and FSRS scheduling do not live in AI chat history.

## Architecture

- Static React + TypeScript PWA (Vite)
- No required application backend
- IndexedDB (Dexie) as the primary local database
- User-configurable OpenAI-compatible base URL, API key, and free-text model
- Chat Completions compatibility baseline + structured-output fallback
- `ts-fsrs` for spaced repetition
- Versioned JSON export/import (schema v2, secrets excluded)
- Google Drive backup deferred (M7)

## Requirements

- Node.js >= 20
- pnpm

## Scripts

```bash
pnpm install
pnpm dev          # local dev server
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm preview      # preview production build (PWA/service worker)
pnpm verify       # lint + typecheck + test + build
pnpm test:e2e     # Playwright critical loop (needs chromium: pnpm exec playwright install chromium)
```

## App routes (RC1)

| Route | Purpose |
|-------|---------|
| `/` | Dashboard: due, recent packs, weak concepts, activity |
| `/learn/new` | Paste material + learning goal → AI analysis |
| `/packs/:packId` | Pack preview, concept edit, generate exercises, start practice |
| `/practice/:sessionId` | One-at-a-time practice / review session |
| `/review` | Due FSRS queue |
| `/settings/ai` | Provider profile, credential mode, test connection |
| `/settings/data` | Storage persistence, export, replace restore, clear |

## Manual smoke test

1. Open `/settings/ai`, save any OpenAI-compatible base URL + model + API key (session-only is fine).
2. `/learn/new` → paste a short paragraph → goal **Mixed** → **Analyze with AI**.
3. On the pack page, optionally remove a concept → **Generate exercises** → **Start practice**.
4. Answer items (flashcard ratings / MCQ / cloze). Confirm explanations appear.
5. Reload the app — pack, attempts, and dashboard activity remain.
6. Answer something wrong → weak concepts update; review cards are scheduled.
7. `/review` uses stored exercises offline-capable when material exists.
8. `/settings/data` → export JSON (confirm no API key) → clear learning data → restore replace → pack returns.

## Project docs

1. `AGENTS.md`
2. `docs/PROJECT_CONTEXT.md`
3. `docs/ROADMAP.md`
4. `docs/CURRENT_FOCUS.md`
5. `docs/DECISIONS.md`
6. `docs/DEPLOYMENT_AND_CSP.md`

**RC1 (M1–M5)** is implemented on `feature/mvp-release-candidate` for holistic review.
