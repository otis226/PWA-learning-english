# PWA Learning English

A local-first, AI-assisted English learning PWA that turns user-provided content into structured learning packs, exercises, review sessions, and long-term mastery data.

## Product idea

**Turn anything into something you can learn.**

Users can paste text, vocabulary lists, or a topic, choose what they want to learn, and let an OpenAI-compatible AI provider generate a structured learning pack. The application owns learning state locally: attempts, mistakes, mastery, and spaced-repetition scheduling do not live in AI chat history.

## Architecture direction

- Static React + TypeScript PWA
- No application backend for the initial product
- IndexedDB as the primary local database
- User-configurable OpenAI-compatible base URL, API key, and model
- Chat Completions as the compatibility baseline; other protocols are capability-driven
- FSRS for spaced repetition (later milestone)
- Versioned JSON export/import from day one
- Google Drive backup later; cloud is not the primary database

## Requirements

- Node.js >= 20
- pnpm (recommended: `npm install -g pnpm`)

## Scripts

```bash
pnpm install
pnpm dev          # local dev server
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm preview      # preview production build (PWA/service worker)
```

## App routes (M0)

| Route | Purpose |
|-------|---------|
| `/` | Home shell |
| `/settings/ai` | AI provider profile, credential mode, test connection |
| `/settings/data` | Storage persistence status, export download, import validate/preview |

## Project docs

Read these before implementation:

1. `AGENTS.md`
2. `docs/PROJECT_CONTEXT.md`
3. `docs/ROADMAP.md`
4. `docs/CURRENT_FOCUS.md`
5. `docs/DECISIONS.md`

**M0 — Foundation and product contracts** is complete. Active work is **M1 — Source intake and AI analysis**.
