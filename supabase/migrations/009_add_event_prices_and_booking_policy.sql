-- Add per-event pricing and allow any authenticated user to create their own bookings.

-- 1) Pricing: add price_qar to events
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS price_qar NUMERIC(10, 2);

-- Optionally seed sensible prices for existing events.
-- These can be adjusted later directly in the DB.
UPDATE public.events
SET price_qar = 60
WHERE title = 'Prenatal Yoga' AND price_qar IS NULL;

UPDATE public.events
SET price_qar = 70
WHERE title = 'Postpartum Recovery Workshop' AND price_qar IS NULL;

UPDATE public.events
SET price_qar = 55
WHERE title = 'Nutrition for Mom & Baby' AND price_qar IS NULL;

UPDATE public.events
SET price_qar = 40
WHERE title = 'Mental Health Support Circle' AND price_qar IS NULL;

UPDATE public.events
SET price_qar = 50
WHERE title = 'Baby Care Basics' AND price_qar IS NULL;

UPDATE public.events
SET price_qar = 65
WHERE title = 'Prenatal Pilates' AND price_qar IS NULL;

UPDATE public.events
SET price_qar = 45
WHERE title = 'Breastfeeding Support Group' AND price_qar IS NULL;

UPDATE public.events
SET price_qar = 55
WHERE title = 'Newborn Sleep Workshop' AND price_qar IS NULL;


-- 2) Booking policy: allow any authenticated user to insert bookings for themselves.
-- The app will enforce who pays (free vs member) in the UI layer.

-- Original policy only allowed member/admin roles to insert bookings.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bookings'
      AND policyname = 'bookings_insert_member'
  ) THEN
    DROP POLICY "bookings_insert_member" ON public.bookings;
  END IF;
END
$$;

CREATE POLICY "bookings_insert_authenticated" ON public.bookings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

