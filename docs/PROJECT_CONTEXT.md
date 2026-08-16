# Project Context

## Product thesis

PWA Learning English is a local-first, AI-assisted learning application that converts arbitrary user-provided learning material into structured practice and long-term review.

The core loop is:

```text
Input something
  -> choose what to learn
  -> analyze into concepts/skills
  -> generate a Learning Pack
  -> practice
  -> record attempts/mistakes
  -> update mastery
  -> schedule future review
  -> practice weak/due concepts later
```

The product is not merely an AI flashcard generator. Its durable value is the learner model: the application remembers what the learner has seen, what they confuse, what they are weak at, and what should be reviewed next.

## Primary users

Initial target:

- one learner using the app personally;
- a small number of friends/family using their own browser/device and their own AI provider credentials;
- no class/team/admin workflow in the initial product.

## Core product principles

### 1. Ask what the learner wants to learn, not only how they want to practice

Learning goals are primary:

- vocabulary;
- grammar;
- prepositions;
- collocations/expressions;
- reading comprehension;
- mixed / "everything important";
- custom goal.

Exercise formats are selected by the learning engine based on the goal and current learner state.

### 2. One concept can be practiced in many forms

Example progression for `despite`:

1. recognition / MCQ;
2. choose-in-context;
3. cloze recall;
4. error correction;
5. transformation;
6. free production.

Do not equate a concept with a single flashcard.

### 3. The application owns learning state

AI may:

- analyze content;
- extract concepts;
- create a learning plan;
- generate exercises;
- validate/explain answers;
- classify mistakes;
- generate personalized practice content.

AI must not own:

- canonical attempt history;
- mastery state;
- review scheduling;
- backup state;
- user configuration source of truth.

### 4. Review is deterministic application logic

Use FSRS for review scheduling. AI may generate the content of a review exercise, but the application decides which concept/card is due and when.

## Initial application architecture

```text
Static React/TypeScript PWA
        |
        +-- IndexedDB (primary data)
        |
        +-- Learning Engine
        |     +-- concepts
        |     +-- exercise selection
        |     +-- mastery
        |     +-- FSRS
        |
        +-- AI Gateway
        |     +-- OpenAI-style Chat Completions adapter
        |     +-- optional Responses adapter later
        |     +-- capability detection/fallback
        |
        +-- Import/Export JSON
        |
        +-- Google Drive backup later
```

There is no required application backend in the initial product.

## Technology baseline

Planned baseline unless a recorded decision changes it:

- React + TypeScript;
- Vite;
- PWA via Vite PWA / Workbox integration;
- pnpm;
- Node.js >= 20;
- IndexedDB through Dexie;
- Zod for runtime boundary validation;
- Zustand only for ephemeral/app UI state that does not belong in IndexedDB;
- React Hook Form for complex forms where helpful;
- `ts-fsrs` for scheduling;
- Vitest + React Testing Library;
- Playwright for critical end-to-end flows once they exist.

Avoid introducing a second state/database abstraction without a concrete need.

## AI-provider contract

Users provide:

- provider display name;
- base URL;
- API key;
- model string;
- protocol/capability settings when auto-detection is insufficient;
- optional custom headers later if needed.

The model field is free text. Do not hard-code a model catalog as a requirement.

### Compatibility baseline

Primary baseline:

```text
POST {baseUrl}/chat/completions
Authorization: Bearer <key>
```

The exact URL builder must normalize trailing slashes and avoid accidental `/v1/v1/...` duplication.

Do not require `/models` support. A provider may work even if model listing does not.

### Capability model

Provider capabilities should be represented independently from provider brand, for example:

```ts
type AIProviderCapabilities = {
  chatCompletions: boolean
  responses: boolean
  jsonSchema: boolean
  jsonObject: boolean
  streaming: boolean
  vision: boolean
  fileInput: boolean
}
```

Only add capabilities that the app actually consumes.

### Structured-output strategy

Domain data from an LLM must pass runtime validation.

Fallback order:

1. strict JSON Schema when supported;
2. JSON object mode when supported;
3. prompt-enforced JSON + extraction + Zod validation and bounded repair retry.

Never let raw unvalidated LLM JSON enter the database.

## Browser-only threat model

This product intentionally supports user-owned AI credentials in a browser-only app, but this has limits.

Important rules:

- an API key available to browser JavaScript cannot be treated like a server secret;
- default credential mode should favor session-only storage;
- remembering a credential on-device is an explicit opt-in;
- backups/exports exclude credentials by default;
- high-value shared/production keys should use a future trusted backend or local bridge instead;
- no Authorization headers in logs;
- no model-generated raw HTML rendering;
- minimize third-party runtime JavaScript because XSS or malicious dependencies could expose browser-held credentials.

## Browser CORS constraint

Direct browser calls work only when the target endpoint allows the application's origin through CORS.

This affects two areas:

1. AI providers;
2. arbitrary webpage/article URL ingestion.

Therefore:

- AI Settings must have a clear connection test and distinguish authentication/model failure from CORS/network failure where possible;
- MVP source ingestion must not depend on arbitrary URL fetch;
- paste text and local files are the reliable ingestion primitives;
- URL ingestion can be best-effort for CORS-friendly URLs later;
- a browser extension, user-configurable extractor, or local bridge can be considered later if reliable arbitrary webpage extraction becomes important.

## Local persistence model

IndexedDB is the source of truth for user learning data.

The application should request persistent browser storage with `navigator.storage.persist()` when supported and expose storage status in Settings. Persistent storage reduces eviction risk, but users can still explicitly clear site data, so export/backup remains mandatory.

### Persistence categories

Durable learning data:

- Source;
- LearningPack;
- Concept;
- ConceptOccurrence / source evidence;
- Exercise;
- Attempt;
- Mistake / misconception signal;
- ConceptMastery;
- ReviewCard;
- ReviewLog;
- StudySession;
- non-secret AI provider profile;
- app settings;
- backup metadata.

Secret/local-only data:

- AI API credential.

Ephemeral UI state:

- active dialogs;
- unsaved form state;
- transient generation progress;
- selected tabs/filters when persistence is unnecessary.

## Initial domain model

Names may evolve, but preserve these conceptual boundaries.

### Source

Original learning input.

Examples:

- pasted article text;
- pasted vocabulary list;
- custom topic description;
- PDF text later;
- image/textbook page later.

Important metadata:

- id;
- type;
- title;
- raw/normalized content as appropriate;
- content hash;
- createdAt;
- optional source URL metadata;
- parser/version metadata.

### LearningPack

A generated learning unit based on one source or an explicitly generated topic.

Contains/links:

- learning objectives;
- selected skills;
- estimated difficulty/CEFR metadata when available;
- concept set;
- exercise set;
- generation version metadata.

### Concept

A durable learning target that can recur across sources.

Examples:

- vocabulary lemma `widespread`;
- grammar pattern `despite + noun/V-ing`;
- contrast `since vs for`;
- collocation `rapid adoption`.

Do not create a completely separate canonical concept merely because the same concept appears in a new source.

### ConceptOccurrence

Links a concept to a source/pack occurrence and preserves provenance/context/evidence.

### Exercise

A practice instance targeting one or more concepts.

Initial exercise types:

- flashcard;
- multiple choice;
- cloze;
- true/false;
- short answer.

Later types may include matching, reorder, error correction, transformation, production, listening, speaking, pronunciation, dictation, and shadowing.

### Attempt

An immutable learner interaction record as much as practical.

Store enough information to understand what happened later:

- exercise id/version;
- answer;
- correctness/score;
- timestamps;
- response time if useful;
- evaluated misconception tags/signals;
- rating mapped to review scheduling when applicable.

Do not overwrite historical attempts to represent current mastery.

### ConceptMastery

Derived/current state for fast product behavior. It can be rebuilt from history where practical.

### ReviewCard / ReviewLog

FSRS scheduling state and immutable review history.

Keep scheduling data separate from AI-generated exercise wording so a concept can be reviewed through different exercise forms over time.

## Generation provenance

Generated domain artifacts should carry enough metadata to debug provider/prompt changes:

- provider profile id (not API key);
- model string;
- prompt/schema version;
- generation timestamp;
- source hash/version;
- optional generation request id when safe/available.

This is especially important because model behavior changes independently of application releases.

## Source-grounding rule

For source-based reading/content questions, preserve evidence.

A generated question should be able to point back to a source segment or evidence excerpt. The validator should reject or flag questions whose answer cannot be supported by the provided source unless the question is intentionally classified as external/general knowledge.

## Import/export contract

Export is a product feature, not a debug dump.

Requirements:

- explicit format identifier;
- schema version;
- exportedAt;
- validated data payload;
- no API credentials by default;
- forward migration strategy;
- import preview/validation before destructive replacement or merge.

Initial restore may be whole-dataset replace with explicit confirmation. Multi-device merge is a later feature.

## Google Drive direction

Google Drive is planned as optional backup, not the primary database.

Preferred direction:

- Google Identity Services in the browser;
- narrow Drive app-data scope;
- `appDataFolder` for hidden application backup files;
- manual backup/restore first;
- automatic snapshots second;
- true multi-device merge/sync only after conflict semantics are designed.

Do not implement real-time or bidirectional sync early.

## PWA behavior

The app shell and local study data should remain usable offline.

AI generation and cloud backup naturally require network access.

The PWA must clearly distinguish:

- app is offline but local practice is available;
- AI provider is unreachable;
- provider rejected credentials/model;
- provider is blocked by CORS;
- cloud backup is disconnected.

PWA updates should not silently risk data/schema inconsistency. Database migrations must be versioned and tested.

## Non-goals for initial product

Do not build these until roadmap explicitly activates them:

- application backend;
- username/password account system;
- teacher/admin portal;
- classrooms/teams;
- payments/subscriptions;
- social/community features;
- real-time collaboration;
- native mobile applications;
- server-owned AI keys;
- arbitrary reliable webpage scraping;
- complex multi-device conflict-free sync;
- speech/pronunciation engine.

## Success definition for first useful release

A learner can:

1. open/install the PWA;
2. configure an OpenAI-compatible provider and arbitrary model name;
3. paste text, a vocabulary list, or a learning topic;
4. choose a learning objective;
5. generate a validated Learning Pack;
6. practice through several exercise types;
7. receive explanations and record mistakes;
8. close/reopen the browser and retain learning data;
9. see due/weak items and review them with FSRS scheduling;
10. export their data and restore it successfully.

Google Drive backup is valuable but is not required to prove the core learning loop.
