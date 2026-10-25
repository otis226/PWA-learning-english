---
name: pwa-mini-app-development
description: >-
  Use when creating or extending a focused PWA/mini app, especially from the reusable pwa-mini-app-base. Owns the local-first architecture, PWA lifecycle, browser capability boundaries, offline/sync defaults, and lean verification contract.
---

# PWA Mini App Development

Use this capability for small product-focused PWAs where browser delivery and installability are advantages and deep native integration is not the core requirement.

## 1. Default source-base contract

When a project has no stronger stack authority, start from `otis226/pwa-mini-app-base` rather than rebuilding PWA plumbing.

Default baseline:

```text
TypeScript + Vite + React
vite-plugin-pwa / Workbox-generated service worker
IndexedDB via idb
Vitest + static lint/type/build gate
```

Keep the product small, but preserve explicit seams that become expensive to retrofit:

```text
src/features/  = product/domain behavior
src/platform/  = install/update, persistence, sync queue, device/browser capabilities
App shell      = composition only
```

Do not make auth, cloud sync, analytics, AI, or a backend mandatory base dependencies. Add them only when the product requires them.

## 2. Local-first and persistence

For data that should survive reload/offline use, prefer IndexedDB over component state or large structured `localStorage` payloads.

```text
user action
-> durable local state
-> render success locally
-> optional network synchronization
```

Network sync is a separate adapter. Retryable writes should use deterministic idempotency/dedupe keys when the server contract supports them. A queue is not conflict resolution: products with multi-device concurrent editing need an explicit merge/version policy.

IndexedDB schema changes belong in versioned upgrade logic and must preserve existing user data unless a destructive migration is explicitly authorized.

## 3. Service worker and update discipline

Precache the application shell and static build assets. Do not add broad runtime API caching by habit.

For authenticated, private, or rapidly changing data, define freshness/privacy rules first. Cache only the exact resource classes whose offline value justifies the stale-data/privacy risk.

Prefer prompt-based service-worker activation for interactive apps so a new worker does not silently replace a running UI/state contract mid-session. Auto-update is acceptable only when the product can prove that activation is safe.

## 4. Progressive enhancement

Treat browser/OS APIs as optional capabilities unless the target matrix explicitly makes them required.

Detect before use for features such as install prompt, Web Share, File System Access, Media Session, background APIs, wake lock, notifications, or native file handlers. Keep a browser-safe fallback when the core job does not fundamentally require that API.

Installability is an enhancement. The normal browser path remains first-class.

## 5. UI delivery for this mini-app initiative

Do not require Figma as an implementation prerequisite. Code-native UI is acceptable and preferred for fast mini-app delivery; generated visual references may be used when a visual exploration materially helps, but the maintained source remains the implementation authority unless a project defines an accepted design reference.

Use mobile-first responsive layout, safe-area insets, keyboard-safe interaction, clear offline/update states, and touch targets suitable for installed standalone mode.

For user-facing accessibility, preserve browser-native semantics wherever the framework allows it and verify the browser result rather than source intent alone. Material risks include semantic roles/names/state, keyboard and visible focus, browser zoom and layout reflow, readable contrast, non-color-only cues, reduced motion, and validation/error association. When a rendering framework abstracts the DOM, prove the accessibility output exposed to the browser instead of assuming widget/component semantics are sufficient.

## 6. Verification

For the reusable base or changes to PWA plumbing, verify at minimum:

```text
lint/type/build
-> persistence tests
-> sync queue retry/dedupe tests when affected
-> production manifest exists
-> production service worker exists
-> local production-preview smoke
```

Add browser E2E only around real product risk: offline cold start, install/update lifecycle, critical import/export, media controls, or capability fallback. Do not force heavy E2E ceremony on every small domain change.

## 7. PWA versus native boundary

Prefer another delivery model such as Flutter/native when the product fundamentally depends on capabilities that are unavailable or unreliable across the required browsers, sustained background execution, deep OS integrations, or native-store/runtime guarantees that progressive enhancement cannot satisfy.

Project-specific product rules always override this reusable baseline.
