-- Make name NOT NULL since it's required during onboarding

-- First, ensure all existing profiles have a name
UPDATE public.profiles SET name = 'User' WHERE name IS NULL OR name = '';

-- Now make it NOT NULL
ALTER TABLE public.profiles 
ALTER COLUMN name SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.name IS 'Required: User full name';
