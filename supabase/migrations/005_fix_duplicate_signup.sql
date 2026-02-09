-- Fix handle_new_user trigger to handle duplicate signups gracefully
-- This prevents database errors when a user tries to sign up with an email that already exists
-- Also fixes the issue where name field is NOT NULL but trigger wasn't providing it

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Use INSERT ... ON CONFLICT to handle case where profile might already exist
  -- This prevents errors if user somehow already has a profile
  -- Provide a default name since name field is NOT NULL (will be updated during onboarding)
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, 'User')
  ON CONFLICT (id) DO UPDATE
  SET email = COALESCE(EXCLUDED.email, public.profiles.email),
      updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
