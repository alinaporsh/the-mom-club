-- Extend user_status enum with a new 'planning' value.
-- This supports users who are still planning and not yet pregnant or a new mom.
-- NOTE: Postgres enums are append-only; this migration must run exactly once.
-- If you are initializing a fresh database, run all migrations in order.

ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'planning';

-- We continue to use the existing baby_age TEXT column on profiles
-- as a generic \"life stage detail\" field:
--   - For status = 'pregnant', store how far along (e.g. '20 weeks', '5 months')
--   - For status = 'new_mom', store the baby's age (e.g. '3 months')
--   - For status = 'planning', leave baby_age NULL

