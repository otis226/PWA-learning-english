/**
 * Dexie migration conventions for this project.
 *
 * 1. Each released schema change is a new integer version on AppDatabase.
 * 2. Never remove historical version() definitions once shipped.
 * 3. Upgrade handlers must be pure/data-safe and covered by tests when they mutate rows.
 * 4. M0 ships DB v1 only; learning tables arrive in later milestones with new versions.
 */
export const DB_MIGRATION_CONVENTIONS = {
  initialVersion: 1,
  documentation:
    'See src/db/schema/app-database.ts version chain and src/db/migrations tests.',
} as const
