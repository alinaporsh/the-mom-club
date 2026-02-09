-- Remove duplicate events (keep the oldest one for each title+instructor+time combination)
-- This migration fixes the duplicate events issue caused by migration 006

DELETE FROM public.events e1
WHERE EXISTS (
  SELECT 1 FROM public.events e2
  WHERE e2.title = e1.title
    AND (e2.instructor = e1.instructor OR (e2.instructor IS NULL AND e1.instructor IS NULL))
    AND e2.id < e1.id
    AND ABS(EXTRACT(EPOCH FROM (e2.starts_at - e1.starts_at))) < 3600
);
