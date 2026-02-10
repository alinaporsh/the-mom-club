-- Add simple categorization and audience targeting to events.
-- These fields are used by the mobile app for filtering in the schedule tab.

-- Kind of activity, e.g. 'Fitness', 'Nutrition', 'Support Circle', 'Education'.
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS category TEXT;

-- Primary audience for the event. Uses the existing user_status enum:
--   'pregnant', 'new_mom', 'planning'
-- NULL means the event is for everyone.
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS audience user_status;

-- Optional backfill for seeded events so filters feel useful immediately.
UPDATE public.events
SET category = 'Fitness', audience = 'pregnant'
WHERE title IN ('Prenatal Yoga', 'Prenatal Pilates') AND category IS NULL;

UPDATE public.events
SET category = 'Education', audience = 'new_mom'
WHERE title IN ('Baby Care Basics', 'Newborn Sleep Workshop') AND category IS NULL;

UPDATE public.events
SET category = 'Support Circle', audience = NULL
WHERE title IN ('Mental Health Support Circle', 'Breastfeeding Support Group') AND category IS NULL;

UPDATE public.events
SET category = 'Nutrition', audience = NULL
WHERE title = 'Nutrition for Mom & Baby' AND category IS NULL;

