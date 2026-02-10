-- Add attendance_mode to events to distinguish online vs in-person classes.
-- Values are treated in the app as:
--   'online'   - fully online / virtual
--   'in_person' - hosted at a physical location
-- NULL means unspecified (the app will infer from location when possible).

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS attendance_mode TEXT;

-- Best-effort backfill: infer online events from the existing location text.
UPDATE public.events
SET attendance_mode = 'online'
WHERE attendance_mode IS NULL
  AND location ILIKE '%online%';

