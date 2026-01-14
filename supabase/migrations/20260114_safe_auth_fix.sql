-- DIAGNOSTIC FIX: Registration "Safe Mode"
-- This script ensures you can ALWAYS sign up, even if there is a database error.
-- It also logs any errors to a special table for us to debug.

-- 1. Create a debug table to see what is failing
CREATE TABLE IF NOT EXISTS public.registration_errors (
    id SERIAL PRIMARY KEY,
    error_message TEXT,
    user_id UUID,
    user_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure basic profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    credits INTEGER DEFAULT 10,
    plan TEXT DEFAULT 'Free',
    subscription_status TEXT DEFAULT 'inactive',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Robust "Safe Mode" Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    err_msg TEXT;
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, name, avatar_url, plan, credits)
    VALUES (
      new.id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'name', ''),
      COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
      'Free',
      10
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email;
  EXCEPTION WHEN OTHERS THEN
    -- Catch the error and log it
    GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
    INSERT INTO public.registration_errors (error_message, user_id, user_email)
    VALUES (err_msg, new.id, new.email);
    -- IMPORTANT: We still return NEW so the signup completes!
  END;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-attach Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Final message
DO $$ 
BEGIN 
  RAISE NOTICE 'Diagnostic Fix Applied. Signup should now work.';
END $$;
