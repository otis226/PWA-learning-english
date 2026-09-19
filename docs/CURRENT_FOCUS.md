# Current Focus

Last updated: 2026-09-19

## Active release target

**Learning Studio R2 — multimodal personal English learning**

The user explicitly activated the broader product scope after RC1.1: flashcards, quiz, pronunciation, listening, reading, long-term memory, and AI-generated content through user-configured APIs.

## Product contract

- Keep the app **local-first** and installable as a PWA.
- Reuse the existing learning core: attempts, mastery, mistakes and FSRS remain the concept-memory authority.
- Flashcards and quiz are focused launch modes over the existing practice engine, not parallel scoring systems.
- Listening, pronunciation and reading write durable `skillAttempts` history to IndexedDB.
- Speech synthesis/recognition are progressive browser capabilities. Pronunciation transcript similarity is practical feedback, **not** a phonetic/accent-quality score.
- AI is optional content generation through the existing OpenAI-compatible adapter. AI never owns review scheduling or durable learner memory.
- Figma is not required for this product workflow; maintained code is the implementation authority unless a later accepted visual reference says otherwise.

## R2 implemented candidate

- [x] Today dashboard with daily review/study entry points
- [x] Study Studio with Flashcard and Quiz launchers
- [x] Listening dictation with speech playback and durable score history
- [x] Pronunciation/shadowing with playback + optional browser speech recognition
- [x] Reading Room with read-aloud, focus mode and completion history
- [x] Memory Center combining FSRS/mastery with multimodal skill history
- [x] AI lesson presets layered on the existing BYOK/OpenAI-compatible generation flow
- [x] IndexedDB v3 migration for `skillAttempts`
- [x] export/import schema v4 with multimodal history + non-secret provider auth metadata, no credentials
- [x] route code-splitting so the production entry chunk remains below the Vite 500 kB warning threshold
- [x] app-first shell: compact app bar, persistent bottom tabs, daily-plan Today screen, focused Study/session screens
- [x] low-input UX pass: single-composer Create, compact Memory, progressive AI settings, immersive sessions, fixed primary Create CTA

## Exit gate

1. [x] `pnpm verify` — lint, typecheck, 94 tests, production PWA build
2. [x] `pnpm test:e2e` — AI pack -> practice -> listening -> pronunciation surface -> Memory Center -> export/clear/restore
3. [x] production manifest + service worker generated
4. [x] legacy v1 database migration reaches v3 without data loss
5. [x] legacy export v1/v2/v3 payloads migrate into export schema v4
6. [x] current docs and decisions describe R2 truth

## Current next action

Product/manual review of the R2 candidate, then land it according to repository merge policy.

## Known limitations

- Browser speech recognition availability varies by browser/OS and may use browser/vendor services; the UI must retain a playback-only fallback.
- Transcript similarity is not IPA/phoneme assessment.
- Speech synthesis voice quality depends on installed/browser voices.
- Multi-device sync and trusted server-side secret storage remain deferred.

## Later / discovered

- richer pronunciation feedback only if a trustworthy phoneme-level engine is selected;
- personalized daily lesson generation from due + weak concepts (existing M8 direction);
- rich local-file ingestion (M6);
- optional Google Drive backup (M7);
- explicit multi-device sync only after conflict semantics are designed.
