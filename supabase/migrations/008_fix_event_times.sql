-- Fix event times to use logical class times instead of upload timestamps
-- This migration updates existing events to have proper class times (10:00, 14:00, etc.)

-- Update Prenatal Yoga to 10:00 AM
UPDATE public.events 
SET starts_at = DATE_TRUNC('day', starts_at) + INTERVAL '10 hours'
WHERE title = 'Prenatal Yoga';

-- Update Postpartum Recovery Workshop to 10:00 AM
UPDATE public.events 
SET starts_at = DATE_TRUNC('day', starts_at) + INTERVAL '10 hours'
WHERE title = 'Postpartum Recovery Workshop';

-- Update Nutrition for Mom & Baby to 14:00 (2:00 PM)
UPDATE public.events 
SET starts_at = DATE_TRUNC('day', starts_at) + INTERVAL '14 hours'
WHERE title = 'Nutrition for Mom & Baby';

-- Update Mental Health Support Circle to 18:00 (6:00 PM)
UPDATE public.events 
SET starts_at = DATE_TRUNC('day', starts_at) + INTERVAL '18 hours'
WHERE title = 'Mental Health Support Circle';

-- Update Baby Care Basics to 11:00 AM
UPDATE public.events 
SET starts_at = DATE_TRUNC('day', starts_at) + INTERVAL '11 hours'
WHERE title = 'Baby Care Basics';

-- Update Prenatal Pilates to 9:00 AM
UPDATE public.events 
SET starts_at = DATE_TRUNC('day', starts_at) + INTERVAL '9 hours'
WHERE title = 'Prenatal Pilates';

-- Update Breastfeeding Support Group to 15:30 (3:30 PM)
UPDATE public.events 
SET starts_at = DATE_TRUNC('day', starts_at) + INTERVAL '15 hours 30 minutes'
WHERE title = 'Breastfeeding Support Group';

-- Update Newborn Sleep Workshop to 19:00 (7:00 PM)
UPDATE public.events 
SET starts_at = DATE_TRUNC('day', starts_at) + INTERVAL '19 hours'
WHERE title = 'Newborn Sleep Workshop';
