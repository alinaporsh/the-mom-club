-- Helper function to check if an email already exists in auth.users
-- Used by the mobile app to prevent existing users from going through the "Sign Up" flow again.
-- Returns TRUE if a user with the given email exists, FALSE otherwise.
--
-- IMPORTANT: After running this migration, verify the function exists and has permissions:
--   1. Check in Supabase Dashboard → Database → Functions → email_exists
--   2. Test: SELECT public.email_exists('test@example.com');
--   3. Verify permissions: Check that anon and authenticated roles can execute

CREATE OR REPLACE FUNCTION public.email_exists(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE LOWER(u.email) = LOWER(p_email)
  )
  INTO v_exists;

  RETURN v_exists;
END;
$$;

-- Grant execute permissions to anonymous and authenticated users
-- This allows the function to be called during signup (when user is not authenticated yet)
GRANT EXECUTE ON FUNCTION public.email_exists(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.email_exists(TEXT) TO authenticated;
