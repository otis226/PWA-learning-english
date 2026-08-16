/**
 * Dexie migration conventions for this project.
 *
 * 1. Each released schema change is a new integer version on `AppDatabase`.
 * 2. Never remove historical `version()` definitions once shipped — always append.
 * 3. Upgrade handlers must be pure/data-safe and covered by tests when they mutate rows.
 * 4. M0 ships DB v1 only; learning tables arrive in later milestones with new versions.
 * 5. Migration tests use `fake-indexeddb` (see `src/test/setup.ts`) and a version chain:
 *    open prior schema → seed rows → open next schema → assert data + store shape.
 *    Canonical pattern: `src/db/migrations/migration-chain.test.ts`.
 * 6. When adding v2+ in production code, keep the full chain on `AppDatabase` and add a
 *    focused test that upgrades a seeded v1 database (do not wipe user data in upgrades).
 */
export const DB_MIGRATION_CONVENTIONS = {
  initialVersion: 1,
  documentation:
    'See src/db/schema/app-database.ts version chain and src/db/migrations/migration-chain.test.ts.',
} as const
