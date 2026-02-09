-- Add image_url to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update existing event with image and set logical class time
-- Use a reliable yoga/wellness image URL that matches the format of working images
UPDATE public.events 
SET 
  image_url = 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=600&auto=format&fit=crop',
  starts_at = DATE_TRUNC('day', NOW() + INTERVAL '7 days') + INTERVAL '10 hours'
WHERE title = 'Prenatal Yoga';

-- Also ensure any existing Prenatal Yoga events without images get updated
UPDATE public.events 
SET 
  image_url = 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=600&auto=format&fit=crop',
  starts_at = DATE_TRUNC('day', NOW() + INTERVAL '7 days') + INTERVAL '10 hours'
WHERE title = 'Prenatal Yoga' 
  AND (image_url IS NULL OR image_url = '');

-- Remove duplicate events first (keep the oldest one for each title+instructor+time combination)
DELETE FROM public.events e1
WHERE EXISTS (
  SELECT 1 FROM public.events e2
  WHERE e2.title = e1.title
    AND (e2.instructor = e1.instructor OR (e2.instructor IS NULL AND e1.instructor IS NULL))
    AND e2.id < e1.id
    AND ABS(EXTRACT(EPOCH FROM (e2.starts_at - e1.starts_at))) < 3600
);

-- Add diverse seed events with images and logical class times (only if they don't already exist)
-- Times are set to logical class hours: 10:00, 14:00, 18:00, etc.
INSERT INTO public.events (title, description, starts_at, instructor, location, image_url)
SELECT * FROM (VALUES
  ('Postpartum Recovery Workshop', 'Gentle exercises and recovery tips for new moms. Learn safe movements and techniques to support your body during the postpartum period.', DATE_TRUNC('day', NOW() + INTERVAL '3 days') + INTERVAL '10 hours', 'Sarah Johnson', 'Online', 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=600&auto=format&fit=crop'),
  ('Nutrition for Mom & Baby', 'Learn about healthy eating during pregnancy and breastfeeding. Get practical meal planning tips and nutritional guidance for you and your little one.', DATE_TRUNC('day', NOW() + INTERVAL '5 days') + INTERVAL '14 hours', 'Dr. Emily Chen', 'Community Center', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=600&auto=format&fit=crop'),
  ('Mental Health Support Circle', 'Safe space to discuss postpartum mental health. Connect with other moms and learn coping strategies in a supportive environment.', DATE_TRUNC('day', NOW() + INTERVAL '7 days') + INTERVAL '18 hours', 'Lisa Martinez', 'Online', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop'),
  ('Baby Care Basics', 'Essential skills for new parents: diapering, feeding, sleep schedules, and more. Perfect for expecting and new parents.', DATE_TRUNC('day', NOW() + INTERVAL '10 days') + INTERVAL '11 hours', 'Nurse Amanda', 'Hospital Annex', 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=600&auto=format&fit=crop'),
  ('Prenatal Pilates', 'Low-impact strength training for expecting moms. Build core strength and flexibility safely during pregnancy.', DATE_TRUNC('day', NOW() + INTERVAL '12 days') + INTERVAL '9 hours', 'Jessica Williams', 'Fitness Studio', 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=600&auto=format&fit=crop'),
  ('Breastfeeding Support Group', 'Expert guidance and peer support for breastfeeding moms. Get answers to your questions and connect with other nursing mothers.', DATE_TRUNC('day', NOW() + INTERVAL '14 days') + INTERVAL '15 hours 30 minutes', 'Lactation Consultant Mary', 'Community Center', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=600&auto=format&fit=crop'),
  ('Newborn Sleep Workshop', 'Learn evidence-based techniques for establishing healthy sleep patterns for your baby. Get tips for better nights for the whole family.', DATE_TRUNC('day', NOW() + INTERVAL '16 days') + INTERVAL '19 hours', 'Sleep Consultant Rachel', 'Online', 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=600&auto=format&fit=crop')
) AS v(title, description, starts_at, instructor, location, image_url)
WHERE NOT EXISTS (
  SELECT 1 FROM public.events e 
  WHERE e.title = v.title 
    AND (e.instructor = v.instructor OR (e.instructor IS NULL AND v.instructor IS NULL))
    AND ABS(EXTRACT(EPOCH FROM (e.starts_at - v.starts_at))) < 3600
);
