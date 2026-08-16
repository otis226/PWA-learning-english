# Deployment and Content Security Policy

Guidance for hosting the static RC1 PWA safely.

## Hosting

- Build with `pnpm build` and serve the `dist/` directory as static files.
- Prefer HTTPS always (required for reliable service workers and storage durability).
- Configure SPA fallback so unknown paths serve `index.html` (Vite preview and common static hosts already do this).
- Do not inject third-party analytics/error SDKs that could receive credentials or learning content without an explicit product decision.

## Content Security Policy (recommended baseline)

This app is a static SPA that:

- loads its own JS/CSS/assets;
- talks to a **user-configured** OpenAI-compatible HTTPS endpoint;
- does **not** render model output as HTML.

Suggested starting CSP (adjust to your host/CDN):

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self' data:;
  connect-src 'self' https: http://127.0.0.1:* http://localhost:*;
  worker-src 'self' blob:;
  manifest-src 'self';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  object-src 'none'
```

Notes:

- `connect-src` must allow the learner’s AI provider origin(s). Because base URLs are user-entered, a strict fixed allow-list is product-hostile for BYOK; prefer `https:` (and local bridge hosts) over `*`.
- Avoid `unsafe-eval`.
- Do not add `unsafe-inline` for scripts.
- Model text is rendered as plain text / pre-wrap, never via `dangerouslySetInnerHTML`.

## Offline / service worker

- Vite PWA registers with `registerType: 'prompt'`. Users must accept updates explicitly.
- App shell and stored learning/review material remain usable offline.
- AI generation fails with explicit offline/network UX when the provider is unreachable.

## Secrets

- API keys never appear in export JSON.
- Prefer session-only credential storage; remember-on-device is opt-in.
- Do not log Authorization headers or dump export files into public issue trackers.
