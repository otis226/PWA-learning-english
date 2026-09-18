# PWA Learning English

A local-first, AI-assisted English learning PWA that turns user-provided content into structured learning packs, exercises, review sessions, and long-term mastery data.

## Product idea

**Build English that stays with you.**

Users can create material from text, vocabulary lists, or a topic using an OpenAI-compatible API, then study it with flashcards, quizzes, listening dictation, pronunciation/shadowing, reading, and FSRS review. The application owns learning state locally: attempts, mistakes, mastery, skill history, and review scheduling do not live in AI chat history.

## Architecture

- Static React + TypeScript PWA (Vite)
- No required application backend
- IndexedDB (Dexie) as the primary local database
- User-configurable OpenAI-compatible base URL, API key, and free-text model
- Chat Completions compatibility baseline + structured-output fallback
- `ts-fsrs` for spaced repetition
- Browser speech synthesis + optional speech recognition with graceful fallback
- Versioned JSON export/import (schema v3, secrets excluded)
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

## App routes

| Route | Purpose |
|-------|---------|
| `/` | Today dashboard: due review, memory strength, recent packs, study modes |
| `/study` | Study Studio: Flashcards, Quiz, Listening, Pronunciation, Reading |
| `/study/listening` | Hear English, type what you heard, persist score history |
| `/study/pronunciation` | Hear, repeat, optionally compare browser-recognized transcript |
| `/study/reading` | Reading Room with read-aloud, focus mode, completion history |
| `/learn/new` | Paste material + learning goal → AI analysis |
| `/memory` | Long-term Memory Center: mastery + FSRS + skill history |
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
5. Open `/study` and run listening/pronunciation/reading against the same pack/source.
6. Reload the app — pack, attempts, skill history, and dashboard state remain.
7. Answer something wrong → weak concepts update; review cards are scheduled.
8. `/memory` shows mastery and durable multimodal practice history.
9. `/review` uses stored exercises offline-capable when material exists.
10. `/settings/data` → export JSON (confirm no API key) → clear learning data → restore replace → learning + skill history return.

## Project docs

1. `AGENTS.md`
2. `docs/PROJECT_CONTEXT.md`
3. `docs/ROADMAP.md`
4. `docs/CURRENT_FOCUS.md`
5. `docs/DECISIONS.md`
6. `docs/DEPLOYMENT_AND_CSP.md`

The active multimodal candidate is tracked in `docs/CURRENT_FOCUS.md`.
